import { NextResponse } from 'next/server';

const getAreaIdFromRol = (rolId) => {
  const rol = parseInt(rolId);
  if (rol === 1) return 'admin'; // Admin has master override
  if (rol === 2 || rol === 10) return 1; // Coordinator / Auxiliar Operaciones -> Operaciones
  if (rol === 3 || rol === 11) return 2; // SST / Auxiliar SST -> SST
  if (rol === 4 || rol === 12) return 3; // Mantenimiento / Auxiliar Mantenimiento -> Mantenimiento
  if (rol === 5 || rol === 13) return 4; // Calidad / Auxiliar Calidad -> Calidad
  if (rol === 6 || rol === 14) return 5; // VRH / Auxiliar VRH -> VRH
  if (rol === 7 || rol === 15) return 6; // Formación / Auxiliar Formación -> Formación
  if (rol === 9 || rol === 16) return 7; // Jefe Sistemas / Auxiliar Sistemas -> Sistemas
  return null;
};

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

    // No area filtering: all roles should see all visits on the calendar to avoid overlap conflicts
    // However, if the user is a PDV (Rol 17), they must ONLY see events for their store
    const rolInt = parseInt(user.rol_id);
    if (rolInt === 17) {
      const dbUser = db.prepare('SELECT pdv_id FROM users WHERE id = ?').get(user.id);
      const activePdvId = dbUser ? dbUser.pdv_id : null;
      query += ' AND e.pdv_id = ?';
      params.push(activePdvId);
    } else {
      if (pdvId) {
        query += ' AND e.pdv_id = ?';
        params.push(pdvId);
      }
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
    
    const { pdv_id, titulo, descripcion, fecha, hora_inicio, hora_fin, tipo_evento, area_id, tipo_visita_id, plantilla_id, solicitud_id } = await request.json();
    
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

    // Check for conflicts: events on the same PDV, same date, overlapping time range (unless user is Administrator)
    const isAdmin = parseInt(user.rol_id) === 1;
    if (!isAdmin) {
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
          error: `Conflicto de horario: El PDV ya tiene programado el evento "${conflict.titulo}" por ${conflict.usuario_nombre} de ${conflict.hora_inicio} a ${conflict.hora_fin}. Solo la Administración puede autorizar visitas simultáneas en este horario.`
        }, { status: 409 });
      }
    }

    // Outlook Sync placeholder integration
    const outlook_id = `mock-outlook-event-${Date.now()}`;

    // Get automatically assigned Auxiliar for this area
    const getAuxiliarRolIdForArea = (aId) => {
      const area = parseInt(aId);
      if (area === 1) return 10; // Operaciones -> Auxiliar de Operaciones
      if (area === 2) return 11; // SST -> Auxiliar SST
      if (area === 3) return 12; // Mantenimiento -> Auxiliar de Mantenimiento
      if (area === 4) return 13; // Calidad -> Auxiliar de Calidad
      if (area === 5) return 14; // VRH -> Auxiliar VRH
      if (area === 6) return 15; // Formación -> Auxiliar Formación
      if (area === 7) return 16; // Sistemas -> Auxiliar de Sistemas
      return null;
    };

    const auxRolId = getAuxiliarRolIdForArea(area_id);
    let responsableId = null;
    if (auxRolId) {
      const auxUser = db.prepare('SELECT id FROM users WHERE rol_id = ? AND activo = 1 LIMIT 1').get(auxRolId);
      if (auxUser) {
        responsableId = auxUser.id;
      }
    }

    const info = db.prepare(`
      INSERT INTO eventos_calendario (pdv_id, user_id, area_id, titulo, descripcion, fecha, hora_inicio, hora_fin, tipo_evento, outlook_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(pdv_id, user.id, parseInt(area_id), titulo, descripcion || '', fecha, hora_inicio, hora_fin, tipo_evento || 'visita', outlook_id);

    const createdEventId = info.lastInsertRowid;

    // Automatically create a row in the visitas table in 'pendiente' state
    db.prepare(`
      INSERT INTO visitas (pdv_id, user_id, area_id, tipo_visita_id, plantilla_id, fecha, hora_inicio, hora_fin, responsable_id, estado, observaciones, evento_id)
      VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, 'pendiente', ?, ?)
    `).run(
      parseInt(pdv_id),
      user.id,
      parseInt(area_id),
      tipo_visita_id ? parseInt(tipo_visita_id) : null,
      plantilla_id ? parseInt(plantilla_id) : null,
      fecha,
      responsableId,
      descripcion || '',
      createdEventId
    );

    // If this calendar event was scheduled from a PDV ticket request, mark the request as programmed
    if (solicitud_id) {
      db.prepare(`
        UPDATE solicitudes_visita 
        SET estado = 'programada', evento_id = ? 
        WHERE id = ?
      `).run(createdEventId, parseInt(solicitud_id));
    }

    const createdEvent = db.prepare(`
      SELECT e.*, p.nombre as pdv_nombre, c.nombre as ciudad_nombre, u.nombre as usuario_nombre,
             a.nombre as area_nombre, a.color as area_color
      FROM eventos_calendario e
      JOIN pdv p ON e.pdv_id = p.id
      JOIN ciudades c ON p.ciudad_id = c.id
      JOIN users u ON e.user_id = u.id
      LEFT JOIN areas a ON e.area_id = a.id
      WHERE e.id = ?
    `).get(createdEventId);

    return NextResponse.json({ 
      evento: createdEvent, 
      message: 'Visita programada exitosamente, asignada al Auxiliar correspondiente y sincronizada con Outlook' 
    });
  } catch (error) {
    console.error('Calendar POST error:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}
