import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const db = getDb();
    const { searchParams } = new URL(request.url);
    const fecha_desde = searchParams.get('fecha_desde');
    const fecha_hasta = searchParams.get('fecha_hasta');
    const prefijo = searchParams.get('prefijo');
    const equipo_id = searchParams.get('equipo_id');
    const tecnico_id = searchParams.get('tecnico_id');
    const area = searchParams.get('area');

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (prefijo) { whereClause += ' AND prefijo = ?'; params.push(prefijo); }
    if (equipo_id) { whereClause += ' AND equipo_id = ?'; params.push(equipo_id); }
    if (tecnico_id) { whereClause += ' AND tecnico_id = ?'; params.push(parseInt(tecnico_id)); }
    if (area) { whereClause += ' AND area_registro = ?'; params.push(area); }
    if (fecha_desde) { whereClause += ' AND DATE(fecha_registro) >= ?'; params.push(fecha_desde); }
    if (fecha_hasta) { whereClause += ' AND DATE(fecha_registro) <= ?'; params.push(fecha_hasta); }

    // KPIs generales
    const resumen = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'Pendiente' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN estado = 'Asignado' THEN 1 ELSE 0 END) as asignados,
        SUM(CASE WHEN estado = 'En proceso' THEN 1 ELSE 0 END) as en_proceso,
        SUM(CASE WHEN estado = 'Finalizado' THEN 1 ELSE 0 END) as finalizados,
        SUM(CASE WHEN estado = 'Cancelado' THEN 1 ELSE 0 END) as cancelados,
        SUM(CASE WHEN prefijo = 'MT' THEN 1 ELSE 0 END) as total_mt,
        SUM(CASE WHEN prefijo = 'ST' THEN 1 ELSE 0 END) as total_st,
        SUM(CASE WHEN tipo_mantenimiento = 'Preventivo' THEN 1 ELSE 0 END) as preventivos,
        SUM(CASE WHEN tipo_mantenimiento = 'Correctivo' THEN 1 ELSE 0 END) as correctivos,
        SUM(CASE WHEN tipo_mantenimiento = 'Locativo' THEN 1 ELSE 0 END) as locativos,
        SUM(CASE WHEN fecha_programada < DATE('now') AND estado NOT IN ('Finalizado','Cancelado') THEN 1 ELSE 0 END) as vencidos,
        SUM(CASE WHEN prioridad = 'Crítica' AND estado NOT IN ('Finalizado','Cancelado') THEN 1 ELSE 0 END) as criticos_activos,
        ROUND(AVG(CASE WHEN tiempo_atencion_minutos > 0 THEN tiempo_atencion_minutos END), 1) as promedio_tiempo_atencion,
        ROUND(AVG(CASE WHEN tiempo_ejecucion_minutos > 0 THEN tiempo_ejecucion_minutos END), 1) as promedio_tiempo_ejecucion
      FROM mantenimientos ${whereClause}
    `).get(...params);

    // Por tipo
    const porTipo = db.prepare(`
      SELECT tipo_mantenimiento, COUNT(*) as cantidad
      FROM mantenimientos ${whereClause}
      GROUP BY tipo_mantenimiento ORDER BY cantidad DESC
    `).all(...params);

    // Por área
    const porArea = db.prepare(`
      SELECT area_registro, COUNT(*) as cantidad
      FROM mantenimientos ${whereClause}
      GROUP BY area_registro ORDER BY cantidad DESC
    `).all(...params);

    // Por técnico
    const porTecnico = db.prepare(`
      SELECT u.nombre as tecnico, COUNT(*) as cantidad,
        SUM(CASE WHEN m.estado = 'Finalizado' THEN 1 ELSE 0 END) as finalizados,
        ROUND(AVG(CASE WHEN m.tiempo_ejecucion_minutos > 0 THEN m.tiempo_ejecucion_minutos END), 1) as promedio_ejecucion
      FROM mantenimientos m
      LEFT JOIN users u ON m.tecnico_id = u.id
      ${whereClause} AND m.tecnico_id IS NOT NULL
      GROUP BY m.tecnico_id ORDER BY cantidad DESC
    `).all(...params, ...params);

    // Equipos con más fallas (correctivos)
    const equiposConFallas = db.prepare(`
      SELECT e.id, e.nombre as equipo,
        COUNT(*) as total_mantenimientos,
        SUM(CASE WHEN m.tipo_mantenimiento = 'Correctivo' THEN 1 ELSE 0 END) as correctivos,
        SUM(CASE WHEN m.tipo_mantenimiento = 'Preventivo' THEN 1 ELSE 0 END) as preventivos,
        MAX(m.fecha_registro) as ultimo_mantenimiento
      FROM mantenimientos m
      JOIN equipos e ON m.equipo_id = e.id
      ${whereClause} AND m.equipo_id IS NOT NULL
      GROUP BY m.equipo_id ORDER BY correctivos DESC LIMIT 10
    `).all(...params, ...params);

    // Infraestructura con más intervenciones locativas
    const infraestructura = db.prepare(`
      SELECT area_hallazgo, COUNT(*) as intervenciones
      FROM mantenimientos ${whereClause} AND tipo_mantenimiento = 'Locativo' AND area_hallazgo IS NOT NULL
      GROUP BY area_hallazgo ORDER BY intervenciones DESC LIMIT 10
    `).all(...params);

    // Cumplimiento (finalizados vs programados en rango)
    const cumplimiento = db.prepare(`
      SELECT
        COUNT(*) as programados,
        SUM(CASE WHEN estado = 'Finalizado' AND DATE(fecha_real_finalizacion) <= fecha_programada THEN 1 ELSE 0 END) as a_tiempo,
        SUM(CASE WHEN estado = 'Finalizado' AND DATE(fecha_real_finalizacion) > fecha_programada THEN 1 ELSE 0 END) as con_retraso,
        SUM(CASE WHEN estado NOT IN ('Finalizado','Cancelado') AND fecha_programada < DATE('now') THEN 1 ELSE 0 END) as vencidos_sin_finalizar
      FROM mantenimientos ${whereClause} AND fecha_programada IS NOT NULL
    `).get(...params);

    // Por período (últimos 12 meses)
    const porMes = db.prepare(`
      SELECT strftime('%Y-%m', fecha_registro) as mes, COUNT(*) as cantidad,
        SUM(CASE WHEN estado = 'Finalizado' THEN 1 ELSE 0 END) as finalizados
      FROM mantenimientos WHERE fecha_registro >= DATE('now', '-12 months')
      GROUP BY mes ORDER BY mes ASC
    `).all();

    return NextResponse.json({
      resumen, porTipo, porArea, porTecnico,
      equiposConFallas, infraestructura, cumplimiento, porMes
    });
  } catch (error) {
    console.error('GET /api/mantenimientos/reportes error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
