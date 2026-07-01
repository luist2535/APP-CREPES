import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');
    
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    
    const db = getDb();
    
    // Conteos por estado
    const totalPdv = db.prepare('SELECT COUNT(*) as count FROM pdv WHERE activo = 1').get().count;
    const pdvPorEstado = db.prepare(`
      SELECT e.nombre, e.color, COUNT(p.id) as count 
      FROM pdv p 
      JOIN estados_pdv e ON p.estado_id = e.id 
      WHERE p.activo = 1 
      GROUP BY e.id
    `).all();
    
    // Conteos por ciudad
    const pdvPorCiudad = db.prepare(`
      SELECT c.nombre as ciudad, COUNT(p.id) as total,
        SUM(CASE WHEN e.color = 'green' THEN 1 ELSE 0 END) as activos,
        SUM(CASE WHEN e.color = 'yellow' THEN 1 ELSE 0 END) as advertencia,
        SUM(CASE WHEN e.color = 'red' THEN 1 ELSE 0 END) as criticos
      FROM pdv p
      JOIN ciudades c ON p.ciudad_id = c.id
      JOIN estados_pdv e ON p.estado_id = e.id
      WHERE p.activo = 1
      GROUP BY c.id
    `).all();
    
    // Visitas del mes
    const inicioMes = new Date();
    inicioMes.setDate(1);
    const visitasMes = db.prepare(`
      SELECT COUNT(*) as count FROM visitas WHERE fecha >= ?
    `).get(inicioMes.toISOString().split('T')[0]).count;
    
    // Visitas por área
    const visitasPorArea = db.prepare(`
      SELECT a.nombre as area, COUNT(v.id) as count
      FROM visitas v
      JOIN areas a ON v.area_id = a.id
      GROUP BY a.id
    `).all();
    
    // Bloqueos activos
    const bloqueosActivos = db.prepare(`
      SELECT COUNT(*) as count FROM bloqueos_horario WHERE activo = 1 AND fecha >= date('now')
    `).get().count;
    
    // Visitas pendientes
    const visitasPendientes = db.prepare(`
      SELECT COUNT(*) as count FROM visitas WHERE estado = 'pendiente'
    `).get().count;

    // Agenda de hoy
    const localToday = new Date().toLocaleDateString('sv-SE');
    const agendaHoy = db.prepare(`
      SELECT e.*, p.nombre as pdv_nombre, c.nombre as ciudad_nombre,
             a.nombre as area_nombre, a.color as area_color
      FROM eventos_calendario e
      JOIN pdv p ON e.pdv_id = p.id
      JOIN ciudades c ON p.ciudad_id = c.id
      LEFT JOIN areas a ON e.area_id = a.id
      WHERE e.estado != 'cancelado' AND e.fecha = ?
      ORDER BY e.hora_inicio ASC
    `).all(localToday);
    
    // Últimas actividades
    const ultimasActividades = db.prepare(`
      SELECT h.*, u.nombre as usuario, p.nombre as pdv_nombre, 
             en.nombre as estado_nombre, en.color as estado_color
      FROM historial_estados h
      JOIN users u ON h.user_id = u.id
      JOIN pdv p ON h.pdv_id = p.id
      JOIN estados_pdv en ON h.estado_nuevo_id = en.id
      ORDER BY h.created_at DESC LIMIT 10
    `).all();
    
    return NextResponse.json({
      totalPdv,
      pdvPorEstado,
      pdvPorCiudad,
      visitasMes,
      visitasPorArea,
      bloqueosActivos,
      ultimasActividades,
      visitasPendientes,
      agendaHoy
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
