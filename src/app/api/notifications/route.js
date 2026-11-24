import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/notifications
 * Devuelve notificaciones en tiempo real según el rol del usuario:
 * - REGLA ESTRICTA: Si el usuario es un Punto de Venta (rol_id === 17), NUNCA se le envían
 *   notificaciones de visitas/auditorías de Calidad (area_id === 4). Solo ve eventos o tickets de
 *   Mantenimiento/Sistemas de su propio PDV.
 * - Jefes / Admin / Técnicos ven actividad reciente de tickets de Mantenimiento/Sistemas y cambios de estado PDV.
 */
export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const db = getDb();
    const rolId = parseInt(user.rol_id);
    const cleanName = (n) => (n ? String(n).replace(/\|/g, '').trim() : 'Sistema');

    const combined = [];

    if (rolId === 17) {
      // Usuario de Punto de Venta (PDV):
      // SOLO ve tickets de Mantenimiento/Sistemas de su PDV y visitas programadas que NO sean de Calidad (area_id != 4)
      const dbUser = db.prepare('SELECT pdv_id FROM users WHERE id = ?').get(user.id);
      const pdvId = dbUser?.pdv_id || null;

      if (pdvId) {
        // 1. Tickets de Mantenimiento/Sistemas de su PDV
        const mantNotifs = db.prepare(`
          SELECT hm.id, hm.created_at, hm.accion, hm.estado_nuevo, hm.mantenimiento_id,
                 u.nombre as usuario, p.nombre as pdv_nombre, m.tipo_mantenimiento, m.area_registro
          FROM historial_mantenimientos hm
          JOIN mantenimientos m ON hm.mantenimiento_id = m.id
          LEFT JOIN users u ON hm.user_id = u.id
          LEFT JOIN equipos e ON m.equipo_id = e.id
          LEFT JOIN users ur ON m.user_id_registro = ur.id
          LEFT JOIN pdv p ON p.id = COALESCE(m.pdv_id, e.pdv_id, ur.pdv_id)
          WHERE COALESCE(m.pdv_id, e.pdv_id, ur.pdv_id) = ?
            AND (m.area_registro IS NULL OR m.area_registro != 'Calidad')
          ORDER BY hm.created_at DESC
          LIMIT 6
        `).all(pdvId);

        mantNotifs.forEach(m => {
          combined.push({
            id: `mant_${m.id}`,
            tipo: 'mantenimiento',
            created_at: m.created_at,
            titulo: `Ticket ${m.mantenimiento_id} (${m.area_registro || 'Mantenimiento'})`,
            mensaje: `Pasó a estado ${m.estado_nuevo || m.accion}`,
            usuario: cleanName(m.usuario),
            pdv_nombre: m.pdv_nombre || 'Tu PDV',
            ciudad_nombre: m.mantenimiento_id,
            estado_nombre: m.estado_nuevo || m.accion,
            estado_color: m.estado_nuevo === 'Finalizado' ? 'green' : m.estado_nuevo === 'Cancelado' ? 'red' : 'yellow',
            link: '/mantenimiento'
          });
        });

        // 2. Visitas programadas para su PDV EXCLUYENDO ESTRICTAMENTE CALIDAD (area_id != 4)
        const calNotifs = db.prepare(`
          SELECT e.id, e.fecha as created_at, e.titulo, e.fecha, e.hora_inicio, e.hora_fin,
                 u.nombre as usuario, p.nombre as pdv_nombre, a.nombre as area_nombre
          FROM eventos_calendario e
          JOIN pdv p ON e.pdv_id = p.id
          LEFT JOIN users u ON e.user_id = u.id
          LEFT JOIN areas a ON e.area_id = a.id
          WHERE e.pdv_id = ?
            AND e.area_id != 4
            AND (a.nombre IS NULL OR a.nombre NOT LIKE '%Calidad%')
            AND e.estado != 'cancelado'
          ORDER BY e.id DESC
          LIMIT 5
        `).all(pdvId);

        calNotifs.forEach(ev => {
          combined.push({
            id: `cal_${ev.id}`,
            tipo: 'calendario',
            created_at: ev.created_at,
            titulo: `Visita de ${ev.area_nombre || 'Mantenimiento'}: ${ev.titulo}`,
            mensaje: `Programada para el ${ev.fecha} (${ev.hora_inicio} - ${ev.hora_fin})`,
            usuario: cleanName(ev.usuario),
            pdv_nombre: ev.pdv_nombre,
            ciudad_nombre: ev.area_nombre || 'Mantenimiento',
            estado_nombre: `Programada (${ev.fecha})`,
            estado_color: 'green',
            link: '/calendario'
          });
        });
      }
    } else {
      // Usuarios Internos (Admin, Jefes, Técnicos):
      // 1. Actividad reciente de Tickets de Mantenimiento/Sistemas relevantes para el usuario
      let mantQuery = `
        SELECT hm.id, hm.created_at, hm.accion, hm.estado_nuevo, hm.mantenimiento_id,
               u.nombre as usuario, COALESCE(p.nombre, 'General') as pdv_nombre,
               m.tecnico_id, m.user_id_registro, m.prefijo
        FROM historial_mantenimientos hm
        JOIN mantenimientos m ON hm.mantenimiento_id = m.id
        LEFT JOIN users u ON hm.user_id = u.id
        LEFT JOIN equipos e ON m.equipo_id = e.id
        LEFT JOIN users ur ON m.user_id_registro = ur.id
        LEFT JOIN pdv p ON p.id = COALESCE(m.pdv_id, e.pdv_id, ur.pdv_id)
      `;
      const mParams = [];
      if (rolId === 12 || rolId === 16) {
        // Técnicos: solo tickets asignados a ellos o creados por ellos
        mantQuery += ` WHERE (m.tecnico_id = ? OR m.user_id_registro = ?)`;
        mParams.push(user.id, user.id);
      }
      mantQuery += ` ORDER BY hm.id DESC LIMIT 6`;

      const mantRows = db.prepare(mantQuery).all(...mParams);
      mantRows.forEach(m => {
        const color =
          m.estado_nuevo === 'Finalizado' ? 'green'
          : m.estado_nuevo === 'Por Aprobar' ? 'orange'
          : m.estado_nuevo === 'Cancelado' ? 'red'
          : 'yellow';
        combined.push({
          id: `mant_${m.id}`,
          tipo: 'mantenimiento',
          created_at: m.created_at,
          titulo: `Ticket ${m.mantenimiento_id}`,
          usuario: cleanName(m.usuario),
          pdv_nombre: m.pdv_nombre,
          ciudad_nombre: `Ticket ${m.mantenimiento_id}`,
          estado_nombre: m.estado_nuevo || m.accion,
          estado_color: color,
          link: '/mantenimiento'
        });
      });

      // 2. Cambios de estado territorial de PDV
      const pdvStates = db.prepare(`
        SELECT h.id, h.created_at, u.nombre as usuario, p.nombre as pdv_nombre, c.nombre as ciudad_nombre,
               en.nombre as estado_nombre, en.color as estado_color
        FROM historial_estados h
        JOIN users u ON h.user_id = u.id
        JOIN pdv p ON h.pdv_id = p.id
        JOIN ciudades c ON p.ciudad_id = c.id
        JOIN estados_pdv en ON h.estado_nuevo_id = en.id
        ORDER BY h.created_at DESC
        LIMIT 4
      `).all();

      pdvStates.forEach(s => {
        combined.push({
          ...s,
          id: `est_${s.id}`,
          tipo: 'territorial',
          usuario: cleanName(s.usuario),
          link: '/territorial'
        });
      });
    }

    return NextResponse.json({
      notifications: combined.slice(0, 8)
    });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
