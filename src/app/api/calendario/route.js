import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');
    
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const pdvId = searchParams.get('pdv_id');
    const fecha = searchParams.get('fecha'); // Format: YYYY-MM-DD
    
    let query = `
      SELECT e.*, p.nombre as pdv_nombre, c.nombre as ciudad_nombre, u.nombre as usuario_nombre,
             a.nombre as area_nombre, a.color as area_color
      FROM eventos_calendario e
      JOIN pdv p ON e.pdv_id = p.id
      JOIN ciudades c ON p.ciudad_id = c.id
      JOIN users u ON e.user_id = u.id
      LEFT JOIN areas a ON e.area_id = a.id
      WHERE e.estado != 'cancelado'
    `;
    const params = [];
    
    if (pdvId) {
      query += ' AND e.pdv_id = ?';
      params.push(pdvId);
    }
    
    if (fecha) {
      query += ' AND e.fecha = ?';
      params.push(fecha);
    }
    
    query += ' ORDER BY e.fecha ASC, e.hora_inicio ASC';
    
    const eventos = db.prepare(query).all(...params);
    return NextResponse.json({ eventos });
  } catch (error) {
    console.error('Calendar GET error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');
    
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    
    const { pdv_id, titulo, descripcion, fecha, hora_inicio, hora_fin, tipo_evento, area_id } = await request.json();
    
    if (!pdv_id || !titulo || !fecha || !hora_inicio || !hora_fin || !area_id) {
      return NextResponse.json(
        { error: 'PDV, título, fecha, hora de inicio/fin y área son requeridos' },
        { status: 400 }
      );
    }

    // Time validations (6:00 AM to 11:59 PM)
    if (hora_inicio < '06:00' || hora_inicio > '23:59' || hora_fin < '06:00' || hora_fin > '23:59') {
      return NextResponse.json(
        { error: 'El horario de visitas debe ser entre las 06:00 a.m. y las 11:59 p.m.' },
        { status: 400 }
      );
    }

    if (hora_inicio >= hora_fin) {
      return NextResponse.json(
        { error: 'La hora de inicio debe ser anterior a la hora de fin' },
        { status: 400 }
      );
    }
    
    const db = getDb();

    // Check for conflicts: events on the same PDV, same date, overlapping time range
    const conflict = db.prepare(`
      SELECT e.*, u.nombre as usuario_nombre
      FROM eventos_calendario e
      JOIN users u ON e.user_id = u.id
      WHERE e.pdv_id = ? 
        AND e.fecha = ? 
        AND e.estado = 'programado'
        AND e.hora_inicio < ? 
        AND e.hora_fin > ?
    `).get(pdv_id, fecha, hora_fin, hora_inicio);

    if (conflict) {
      return NextResponse.json({
        error: `Conflicto de horario: El PDV ya tiene programado el evento "${conflict.titulo}" por ${conflict.usuario_nombre} en el horario de ${conflict.hora_inicio} a ${conflict.hora_fin}.`
      }, { status: 409 });
    }

    // Outlook Sync placeholder integration
    const outlook_id = `mock-outlook-event-${Date.now()}`;

    const info = db.prepare(`
      INSERT INTO eventos_calendario (pdv_id, user_id, area_id, titulo, descripcion, fecha, hora_inicio, hora_fin, tipo_evento, outlook_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(pdv_id, user.id, parseInt(area_id), titulo, descripcion || '', fecha, hora_inicio, hora_fin, tipo_evento || 'visita', outlook_id);

    const createdEvent = db.prepare(`
      SELECT e.*, p.nombre as pdv_nombre, c.nombre as ciudad_nombre, u.nombre as usuario_nombre,
             a.nombre as area_nombre, a.color as area_color
      FROM eventos_calendario e
      JOIN pdv p ON e.pdv_id = p.id
      JOIN ciudades c ON p.ciudad_id = c.id
      JOIN users u ON e.user_id = u.id
      LEFT JOIN areas a ON e.area_id = a.id
      WHERE e.id = ?
    `).get(info.lastInsertRowid);

    return NextResponse.json({ 
      evento: createdEvent, 
      message: 'Visita programada exitosamente y sincronizada con Outlook' 
    });
  } catch (error) {
    console.error('Calendar POST error:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}
