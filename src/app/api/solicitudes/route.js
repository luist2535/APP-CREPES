import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { sendNotificationEmail } from '@/lib/email';

export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const db = getDb();
    const rolId = parseInt(user.rol_id);

    // Fetch pdv_id directly from database for session robustness
    const dbUser = db.prepare('SELECT pdv_id FROM users WHERE id = ?').get(user.id);
    const activePdvId = dbUser ? dbUser.pdv_id : null;

    let query = `
      SELECT s.*, p.nombre as pdv_nombre, a.nombre as area_nombre, u.nombre as creador_nombre
      FROM solicitudes_visita s
      JOIN pdv p ON s.pdv_id = p.id
      JOIN areas a ON s.area_id = a.id
      JOIN users u ON s.user_id = u.id
    `;
    const params = [];

    if (rolId === 17) {
      // PDV Account: only see their own requests
      query += ` WHERE s.pdv_id = ?`;
      params.push(activePdvId);
    } else if (rolId === 4 || rolId === 12) {
      // Mantenimiento: see Maintenance requests
      query += ` WHERE s.area_id = 3`;
    } else if (rolId === 9 || rolId === 16) {
      // Sistemas: see Systems requests
      query += ` WHERE s.area_id = 7`;
    }

    query += ` ORDER BY s.fecha_solicitud DESC`;

    const solicitudes = db.prepare(query).all(...params);
    return NextResponse.json({ solicitudes });
  } catch (error) {
    console.error('Error en GET api/solicitudes:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const db = getDb();
    const body = await request.json();
    const { area_id, titulo, descripcion, urgencia } = body;

    if (!area_id || !titulo || !descripcion || !urgencia) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios' }, { status: 400 });
    }

    const rolId = parseInt(user.rol_id);
    
    // Fetch pdv_id directly from the database for safety
    const dbUser = db.prepare('SELECT pdv_id FROM users WHERE id = ?').get(user.id);
    let pdv_id = dbUser ? dbUser.pdv_id : null;

    // If Admin/Coordinator creates a request, they can specify pdv_id in body
    if (rolId === 1 || rolId === 2) {
      pdv_id = body.pdv_id || pdv_id;
    }

    if (!pdv_id) {
      return NextResponse.json({ error: 'El usuario no tiene un Punto de Venta asignado.' }, { status: 400 });
    }

    // Insert request
    const stmt = db.prepare(`
      INSERT INTO solicitudes_visita (pdv_id, user_id, area_id, titulo, descripcion, urgencia, estado)
      VALUES (?, ?, ?, ?, ?, ?, 'pendiente')
    `);
    const result = stmt.run(pdv_id, user.id, parseInt(area_id), titulo, descripcion, urgencia);
    const solicitudId = result.lastInsertRowid;

    // Fetch details for email notification
    const pdvInfo = db.prepare("SELECT nombre FROM pdv WHERE id = ?").get(pdv_id);
    const areaInfo = db.prepare("SELECT nombre FROM areas WHERE id = ?").get(parseInt(area_id));

    // Find Jefe of that area to send email
    let jefeRolId = null;
    if (parseInt(area_id) === 3) jefeRolId = 4; // Mantenimiento -> Supervisor Mantenimiento
    if (parseInt(area_id) === 7) jefeRolId = 9; // Sistemas -> Jefe Sistemas

    if (jefeRolId) {
      const jefes = db.prepare("SELECT email, nombre FROM users WHERE rol_id = ?").all(jefeRolId);
      
      for (const jefe of jefes) {
        if (jefe.email) {
          const urgenciaText = urgencia === 'urgente' ? '🚨 URGENTE' : '📋 REVISIÓN';
          const emailSubject = `${urgenciaText} Solicitud de Visita en PDV: ${pdvInfo.nombre}`;
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #E8DDD4; padding: 20px; border-radius: 8px;">
              <h2 style="color: #6B3A2A; margin-top: 0;">🥞 Crepes en Punto</h2>
              <p>Hola <strong>${jefe.nombre}</strong>,</p>
              <p>Se ha recibido una nueva solicitud de soporte técnico de un Punto de Venta con prioridad <strong style="color: ${urgencia === 'urgente' ? '#DC2626' : '#D97706'}">${urgencia.toUpperCase()}</strong>:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <tr>
                  <td style="padding: 8px; font-weight: bold; background: #F5EDE4; width: 150px; border: 1px solid #E8DDD4;">Punto de Venta:</td>
                  <td style="padding: 8px; background: #F5EDE4; border: 1px solid #E8DDD4;">${pdvInfo.nombre}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: bold; border: 1px solid #E8DDD4;">Asunto / Título:</td>
                  <td style="padding: 8px; border: 1px solid #E8DDD4;">${titulo}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: bold; background: #F5EDE4; border: 1px solid #E8DDD4;">Área Solicitada:</td>
                  <td style="padding: 8px; background: #F5EDE4; border: 1px solid #E8DDD4;">${areaInfo.nombre}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: bold; border: 1px solid #E8DDD4;">Urgencia:</td>
                  <td style="padding: 8px; font-weight: bold; color: ${urgencia === 'urgente' ? '#DC2626' : '#D97706'}; border: 1px solid #E8DDD4;">${urgencia.toUpperCase()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: bold; background: #F5EDE4; border: 1px solid #E8DDD4;">Detalles:</td>
                  <td style="padding: 8px; background: #F5EDE4; border: 1px solid #E8DDD4;">${descripcion}</td>
                </tr>
              </table>
              <p>Por favor, ingresa al panel de administración para programar y asignar esta visita en el calendario.</p>
              <a href="http://localhost:3000/solicitudes" style="display: inline-block; background: #6B3A2A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">Ver Solicitudes de Soporte 📋</a>
            </div>
          `;
          sendNotificationEmail({ to: jefe.email, subject: emailSubject, html: emailHtml })
            .catch(err => console.error("Error al enviar email de solicitud:", err));
        }
      }
    }

    const ticketCode = 'TK-' + String(solicitudId).padStart(5, '0');
    return NextResponse.json({ success: true, message: `Solicitud registrada correctamente. Tu número de ticket es: ${ticketCode}`, id: solicitudId, ticket_code: ticketCode });
  } catch (error) {
    console.error('Error en POST api/solicitudes:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const db = getDb();
    const body = await request.json();
    const { id, action } = body;

    if (!id || !action) {
      return NextResponse.json({ error: 'ID y acción son requeridos' }, { status: 400 });
    }

    if (action === 'rechazar') {
      db.prepare("UPDATE solicitudes_visita SET estado = 'rechazada' WHERE id = ?").run(parseInt(id));
      return NextResponse.json({ success: true, message: 'Solicitud rechazada con éxito.' });
    }

    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (error) {
    console.error('Error en PUT api/solicitudes:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    
    // Only Admin (1) and Coordinator (2) can delete requests
    const rolId = parseInt(user.rol_id);
    if (rolId !== 1 && rolId !== 2) {
      return NextResponse.json({ error: 'No autorizado para eliminar solicitudes' }, { status: 403 });
    }

    const db = getDb();
    const { searchParams } = new URL(request.url);
    const idsStr = searchParams.get('ids');
    if (!idsStr) return NextResponse.json({ error: 'Faltan IDs' }, { status: 400 });
    
    const ids = idsStr.split(',').map(id => parseInt(id));
    
    const stmt = db.prepare("DELETE FROM solicitudes_visita WHERE id = ?");
    const deleteTx = db.transaction((idsToDelete) => {
      for (const id of idsToDelete) {
        stmt.run(id);
      }
    });
    deleteTx(ids);
    
    return NextResponse.json({ success: true, message: 'Solicitudes eliminadas correctamente.' });
  } catch (error) {
    console.error('Error en DELETE api/solicitudes:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}
