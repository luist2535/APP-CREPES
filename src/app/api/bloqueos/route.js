import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const db = getDb();
    const bloqueos = db.prepare(`
      SELECT b.*, p.nombre as pdv_nombre, c.nombre as ciudad_nombre,
             m.nombre as motivo_nombre, u.nombre as usuario_nombre
      FROM bloqueos_horario b
      JOIN pdv p ON b.pdv_id = p.id
      JOIN ciudades c ON p.ciudad_id = c.id
      JOIN motivos_bloqueo m ON b.motivo_id = m.id
      JOIN users u ON b.user_id = u.id
      WHERE b.activo = 1
      ORDER BY b.fecha DESC, b.hora_inicio
    `).all();
    const motivos = db.prepare('SELECT * FROM motivos_bloqueo WHERE activo = 1').all();
    return NextResponse.json({ bloqueos, motivos });
  } catch (error) {
    console.error('Bloqueos error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const db = getDb();
    const { pdv_id, fecha, hora_inicio, hora_fin, motivo_id, observacion } = await request.json();
    if (!pdv_id || !fecha || !hora_inicio || !hora_fin || !motivo_id) {
      return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 });
    }

    // Obtener estado anterior antes de actualizar
    const pdv = db.prepare('SELECT estado_id FROM pdv WHERE id = ?').get(pdv_id);
    const estadoAnterior = pdv ? pdv.estado_id : 1;

    const result = db.prepare(`
      INSERT INTO bloqueos_horario (pdv_id, fecha, hora_inicio, hora_fin, motivo_id, observacion, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(pdv_id, fecha, hora_inicio, hora_fin, motivo_id, observacion || null, user.id);

    // Actualizar estado del PDV a Provisional/Bloqueado (estado_id = 2)
    db.prepare('UPDATE pdv SET estado_id = 2 WHERE id = ?').run(pdv_id);
    
    const now = new Date();
    db.prepare(`
      INSERT INTO historial_estados (pdv_id, estado_anterior_id, estado_nuevo_id, user_id, fecha, hora, observacion)
      VALUES (?, ?, 2, ?, ?, ?, ?)
    `).run(pdv_id, estadoAnterior, user.id, now.toISOString().split('T')[0], now.toTimeString().split(' ')[0], 'Bloqueo de horario creado: ' + (observacion || ''));

    return NextResponse.json({ id: result.lastInsertRowid, message: 'Bloqueo creado correctamente' });
  } catch (error) {
    console.error('Create bloqueo error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de bloqueo requerido' }, { status: 400 });
    }

    const bloqueo = db.prepare('SELECT * FROM bloqueos_horario WHERE id = ?').get(id);
    if (!bloqueo) {
      return NextResponse.json({ error: 'Bloqueo no encontrado' }, { status: 404 });
    }

    // Desactivar bloqueo
    db.prepare('UPDATE bloqueos_horario SET activo = 0 WHERE id = ?').run(id);

    // Restaurar el PDV al estado Trabajando en sitio (estado_id = 1)
    db.prepare('UPDATE pdv SET estado_id = 1 WHERE id = ?').run(bloqueo.pdv_id);

    const now = new Date();
    db.prepare(`
      INSERT INTO historial_estados (pdv_id, estado_anterior_id, estado_nuevo_id, user_id, fecha, hora, observacion)
      VALUES (?, 2, 1, ?, ?, ?, ?)
    `).run(bloqueo.pdv_id, user.id, now.toISOString().split('T')[0], now.toTimeString().split(' ')[0], 'Bloqueo de horario finalizado / levantado');

    return NextResponse.json({ message: 'Bloqueo levantado correctamente y PDV restaurado a operación normal' });
  } catch (error) {
    console.error('Delete bloqueo error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

