import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');
    
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const ciudadId = searchParams.get('ciudad_id');
    
    let query = `
      SELECT p.*, e.nombre as estado_nombre, e.color as estado_color, e.icono as estado_icono,
             c.nombre as ciudad_nombre
      FROM pdv p
      LEFT JOIN estados_pdv e ON p.estado_id = e.id
      LEFT JOIN ciudades c ON p.ciudad_id = c.id
      WHERE p.activo = 1
    `;
    const params = [];
    
    if (ciudadId) {
      query += ' AND p.ciudad_id = ?';
      params.push(ciudadId);
    }
    
    query += ' ORDER BY c.nombre, p.nombre';
    
    const pdvs = db.prepare(query).all(...params);
    const ciudades = db.prepare('SELECT * FROM ciudades WHERE activa = 1 ORDER BY nombre').all();
    const estados = db.prepare('SELECT * FROM estados_pdv WHERE activo = 1').all();
    
    return NextResponse.json({ pdvs, ciudades, estados });
  } catch (error) {
    console.error('PDV error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');
    
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    const { pdv_id, estado_id, observacion } = await request.json();
    
    if (!pdv_id || !estado_id) {
      return NextResponse.json({ error: 'PDV y estado son requeridos' }, { status: 400 });
    }
    
    const db = getDb();
    const pdv = db.prepare('SELECT * FROM pdv WHERE id = ?').get(pdv_id);
    
    if (!pdv) {
      return NextResponse.json({ error: 'PDV no encontrado' }, { status: 404 });
    }
    
    const now = new Date();
    const fecha = now.toISOString().split('T')[0];
    const hora = now.toTimeString().split(' ')[0];
    
    // Registrar cambio en historial
    db.prepare(`
      INSERT INTO historial_estados (pdv_id, estado_anterior_id, estado_nuevo_id, user_id, fecha, hora, observacion)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(pdv_id, pdv.estado_id, estado_id, user.id, fecha, hora, observacion || null);
    
    // Actualizar estado del PDV
    db.prepare('UPDATE pdv SET estado_id = ? WHERE id = ?').run(estado_id, pdv_id);
    
    const updatedPdv = db.prepare(`
      SELECT p.*, e.nombre as estado_nombre, e.color as estado_color, e.icono as estado_icono,
             c.nombre as ciudad_nombre
      FROM pdv p
      LEFT JOIN estados_pdv e ON p.estado_id = e.id
      LEFT JOIN ciudades c ON p.ciudad_id = c.id
      WHERE p.id = ?
    `).get(pdv_id);
    
    return NextResponse.json({ pdv: updatedPdv, message: 'Estado actualizado correctamente' });
  } catch (error) {
    console.error('PDV update error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
