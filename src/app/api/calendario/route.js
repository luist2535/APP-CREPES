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

// Roles that can override schedule conflicts (Admin + all area chiefs)
const OVERRIDE_ROLES = [1, 2, 3, 4, 5, 6, 7, 9]; // Admin + Coordinador + Jefes de área + Jefe Sistemas

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
    const { sendNotificationEmail } = require('@/lib/email');
    
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    
    const rolInt = parseInt(user.rol_id);
    if (rolInt === 17 || rolInt === 8) {
      return NextResponse.json({ error: 'No autorizado para programar visitas' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      pdv_id, titulo, descripcion, fecha, hora_inicio, hora_fin, 
      tipo_evento, area_id, tipo_visita_id, plantilla_id, 
      solicitud_id, campos_personalizados,
      override_justificacion, // provided when a chief confirms a conflict override
      categoria_id
    } = body;
    
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
    const canOverride = OVERRIDE_ROLES.includes(rolInt);

    // Check for schedule conflicts
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
      // If the user can override conflicts (chief / admin) and provided a justification, allow it
      if (canOverride && override_justificacion) {
        // Allow with justification - will be saved below
      } else if (canOverride && !override_justificacion) {
        // Chief detected conflict but hasn't confirmed yet - send conflict info back to frontend
        return NextResponse.json({
          conflicto: true,
          evento_conflicto: {
            titulo: conflict.titulo,
            usuario_nombre: conflict.usuario_nombre,
            hora_inicio: conflict.hora_inicio,
            hora_fin: conflict.hora_fin
          },
          message: `Conflicto de horario detectado: El PDV ya tiene programado "${conflict.titulo}" de ${conflict.hora_inicio} a ${conflict.hora_fin}. Como Jefe de Área, puedes autorizar esta excepción proporcionando una justificación.`
        }, { status: 409 });
      } else {
        // Regular user - block completely
        return NextResponse.json({
          error: `Conflicto de horario: El PDV ya tiene programado el evento "${conflict.titulo}" por ${conflict.usuario_nombre} de ${conflict.hora_inicio} a ${conflict.hora_fin}. Solo un Jefe de Área o el Administrador puede autorizar visitas en este horario.`
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
    let responsableUser = null;
    if (auxRolId) {
      responsableUser = db.prepare('SELECT id, nombre, email FROM users WHERE rol_id = ? AND activo = 1 LIMIT 1').get(auxRolId);
      if (responsableUser) {
        responsableId = responsableUser.id;
      }
    }

    // Get PDV and area info for email
    const pdvInfo = db.prepare('SELECT p.nombre as pdv_nombre, c.nombre as ciudad_nombre FROM pdv p JOIN ciudades c ON p.ciudad_id = c.id WHERE p.id = ?').get(pdv_id);
    const areaInfo = db.prepare('SELECT nombre FROM areas WHERE id = ?').get(parseInt(area_id));

    const info = db.prepare(`
      INSERT INTO eventos_calendario (pdv_id, user_id, area_id, titulo, descripcion, fecha, hora_inicio, hora_fin, tipo_evento, outlook_id, override_justificacion)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(pdv_id, user.id, parseInt(area_id), titulo, descripcion || '', fecha, hora_inicio, hora_fin, tipo_evento || 'visita', outlook_id, override_justificacion || null);

    const createdEventId = info.lastInsertRowid;

    // Automatically create a row in the visitas table in 'pendiente' state
    db.prepare(`
      INSERT INTO visitas (pdv_id, user_id, area_id, tipo_visita_id, plantilla_id, fecha, hora_inicio, hora_fin, responsable_id, estado, observaciones, evento_id, campos_personalizados, categoria_id)
      VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, 'pendiente', ?, ?, ?, ?)
    `).run(
      parseInt(pdv_id),
      user.id,
      parseInt(area_id),
      tipo_visita_id ? parseInt(tipo_visita_id) : null,
      plantilla_id ? parseInt(plantilla_id) : null,
      fecha,
      responsableId,
      descripcion || '',
      createdEventId,
      campos_personalizados || null,
      categoria_id ? parseInt(categoria_id) : null
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

    // ==========================================
    // F1: Send email notification asynchronously
    // ==========================================
    const emailTargets = [];

    // Notify the assigned auxiliary (responsable)
    if (responsableUser && responsableUser.email) {
      emailTargets.push({
        to: responsableUser.email,
        subject: `📋 Nueva visita programada — ${pdvInfo?.pdv_nombre || 'PDV'} el ${fecha}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fdf8f3; border-radius: 12px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #6B3A2A, #8B6914); padding: 24px; text-align: center;">
              <h1 style="color: #fff; margin: 0; font-size: 22px;">🍫 Crepes en Punto</h1>
              <p style="color: #fde68a; margin: 4px 0 0; font-size: 14px;">Sistema de Gestión Operativa</p>
            </div>
            <div style="padding: 28px;">
              <h2 style="color: #6B3A2A; margin-top: 0;">Nueva visita programada para ti</h2>
              <p style="color: #555;">Hola <strong>${responsableUser.nombre}</strong>, se ha programado una visita que requiere tu atención:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                <tr style="background: #f9f3ed;"><td style="padding: 10px 14px; font-weight: bold; color: #6B3A2A; width: 40%;">📍 PDV</td><td style="padding: 10px 14px; color: #333;">${pdvInfo?.pdv_nombre || 'N/A'} — ${pdvInfo?.ciudad_nombre || ''}</td></tr>
                <tr><td style="padding: 10px 14px; font-weight: bold; color: #6B3A2A;">🗂️ Área</td><td style="padding: 10px 14px; color: #333;">${areaInfo?.nombre || 'N/A'}</td></tr>
                <tr style="background: #f9f3ed;"><td style="padding: 10px 14px; font-weight: bold; color: #6B3A2A;">📅 Fecha</td><td style="padding: 10px 14px; color: #333;">${fecha}</td></tr>
                <tr><td style="padding: 10px 14px; font-weight: bold; color: #6B3A2A;">⏰ Horario</td><td style="padding: 10px 14px; color: #333;">${hora_inicio} – ${hora_fin}</td></tr>
                <tr style="background: #f9f3ed;"><td style="padding: 10px 14px; font-weight: bold; color: #6B3A2A;">📝 Título</td><td style="padding: 10px 14px; color: #333;">${titulo}</td></tr>
                ${descripcion ? `<tr><td style="padding: 10px 14px; font-weight: bold; color: #6B3A2A;">💬 Descripción</td><td style="padding: 10px 14px; color: #333;">${descripcion}</td></tr>` : ''}
                ${override_justificacion ? `<tr style="background: #fef9c3;"><td style="padding: 10px 14px; font-weight: bold; color: #854d0e;">⚠️ Nota</td><td style="padding: 10px 14px; color: #854d0e;">Visita programada con excepción de horario: ${override_justificacion}</td></tr>` : ''}
              </table>
              <p style="color: #555;">Programada por: <strong>${user.nombre}</strong></p>
              <p style="font-size: 12px; color: #999; margin-top: 24px;">Este es un mensaje automático del sistema Crepes en Punto. Por favor no responder.</p>
            </div>
          </div>
        `
      });
    }

    // Also notify PDV users linked to this PDV (Omitir si es área de Calidad / Visita Sorpresa)
    const isCalidadArea = areaInfo?.nombre && areaInfo.nombre.trim().toLowerCase().includes('calidad');
    if (!isCalidadArea) {
      const pdvUsers = db.prepare('SELECT email, nombre FROM users WHERE pdv_id = ? AND rol_id = 17 AND activo = 1').all(parseInt(pdv_id));
      for (const pdvUser of pdvUsers) {
        if (pdvUser.email) {
          emailTargets.push({
            to: pdvUser.email,
            subject: `📋 Visita programada en tu punto de venta — ${fecha}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fdf8f3; border-radius: 12px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #6B3A2A, #8B6914); padding: 24px; text-align: center;">
                  <h1 style="color: #fff; margin: 0; font-size: 22px;">🍫 Crepes en Punto</h1>
                  <p style="color: #fde68a; margin: 4px 0 0; font-size: 14px;">Sistema de Gestión Operativa</p>
                </div>
                <div style="padding: 28px;">
                  <h2 style="color: #6B3A2A; margin-top: 0;">Visita programada en tu punto de venta</h2>
                  <p style="color: #555;">Hola <strong>${pdvUser.nombre}</strong>, se ha programado la siguiente visita en tu PDV:</p>
                  <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                    <tr style="background: #f9f3ed;"><td style="padding: 10px 14px; font-weight: bold; color: #6B3A2A; width: 40%;">🗂️ Área</td><td style="padding: 10px 14px; color: #333;">${areaInfo?.nombre || 'N/A'}</td></tr>
                    <tr><td style="padding: 10px 14px; font-weight: bold; color: #6B3A2A;">📅 Fecha</td><td style="padding: 10px 14px; color: #333;">${fecha}</td></tr>
                    <tr style="background: #f9f3ed;"><td style="padding: 10px 14px; font-weight: bold; color: #6B3A2A;">⏰ Horario</td><td style="padding: 10px 14px; color: #333;">${hora_inicio} – ${hora_fin}</td></tr>
                    <tr><td style="padding: 10px 14px; font-weight: bold; color: #6B3A2A;">📝 Descripción</td><td style="padding: 10px 14px; color: #333;">${titulo}${descripcion ? ': ' + descripcion : ''}</td></tr>
                  </table>
                  <p style="font-size: 12px; color: #999; margin-top: 24px;">Este es un mensaje automático del sistema Crepes en Punto. Por favor no responder.</p>
                </div>
              </div>
            `
          });
        }
      }
    } else {
      console.log(`🔒 [Visita Sorpresa - Calidad] Se omite notificación de correo al PDV ID ${pdv_id} para mantener confidencialidad de la visita de Calidad.`);
    }

    // Fire & forget: send all emails without blocking the response
    Promise.all(emailTargets.map(e => sendNotificationEmail(e))).catch(err => {
      console.error('Error sending visit notification emails:', err);
    });

    return NextResponse.json({ 
      evento: createdEvent, 
      message: 'Visita programada exitosamente, asignada al Auxiliar correspondiente y sincronizada con Outlook' 
    });
  } catch (error) {
    console.error('Calendar POST error:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID de evento requerido' }, { status: 400 });

    const db = getDb();
    const evento = db.prepare('SELECT id, user_id FROM eventos_calendario WHERE id = ?').get(id);
    if (!evento) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });

    if (parseInt(user.rol_id) !== 1 && parseInt(user.rol_id) > 9 && parseInt(evento.user_id) !== parseInt(user.id)) {
      return NextResponse.json({ error: 'No tienes permisos para eliminar este evento' }, { status: 403 });
    }

    const deleteTx = db.transaction(() => {
      const linkedVisits = db.prepare('SELECT id FROM visitas WHERE evento_id = ?').all(id);
      for (const lv of linkedVisits) {
        db.prepare('DELETE FROM evidencias WHERE visita_id = ?').run(lv.id);
        db.prepare('DELETE FROM historial_visitas WHERE visita_id = ?').run(lv.id);
        db.prepare('DELETE FROM visitas WHERE id = ?').run(lv.id);
      }
      db.prepare('DELETE FROM solicitudes_visita WHERE evento_id = ?').run(id);
      db.prepare('DELETE FROM eventos_calendario WHERE id = ?').run(id);
    });
    deleteTx();

    return NextResponse.json({ success: true, message: 'Evento eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar evento de calendario:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}
