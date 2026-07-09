import { NextResponse } from 'next/server';

// Roles that can access reports (Admin, Coordinadores, Jefes y Visualizador)
const REPORT_ALLOWED_ROLES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export async function GET(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');

    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const db = getDb();
    const { hasPermission } = require('@/lib/auth');
    if (!hasPermission(user, 'reportes', db)) {
      return NextResponse.json({ error: 'Sin permisos para acceder a reportes' }, { status: 403 });
    }
    const rolInt = parseInt(user.rol_id);
    const { searchParams } = new URL(request.url);
    const area_id = searchParams.get('area_id');
    const categoria_id = searchParams.get('categoria_id');
    const ciudad_id = searchParams.get('ciudad_id');
    const estado = searchParams.get('estado');
    const fecha_desde = searchParams.get('fecha_desde');
    const fecha_hasta = searchParams.get('fecha_hasta');

    // Build dynamic query with optional filters
    let conditions = ['1=1'];
    const params = [];

    // Area chiefs only see their area's data (not admin or coordinator)
    const FULL_ACCESS_ROLES = [1, 2, 8]; // Admin, Coordinator, Visualizador
    if (!FULL_ACCESS_ROLES.includes(rolInt)) {
      // Determine user's area
      const areaMap = {
        3: 2, 11: 2,      // SST
        4: 3, 12: 3,      // Mantenimiento
        5: 4, 13: 4,      // Calidad
        6: 5, 14: 5,      // VRH
        7: 6, 15: 6,      // Formación
        9: 7, 16: 7,      // Sistemas
        10: 1             // Aux Operaciones
      };
      const userAreaId = areaMap[rolInt];
      if (userAreaId) {
        conditions.push('v.area_id = ?');
        params.push(userAreaId);
      }
    }

    if (area_id) {
      conditions.push('v.area_id = ?');
      params.push(parseInt(area_id));
    }
    if (categoria_id) {
      conditions.push('(v.categoria_id = ? OR cat.padre_id = ?)');
      params.push(parseInt(categoria_id), parseInt(categoria_id));
    }
    const { getUserAssignedCityId } = require('@/lib/auth');
    const assignedCityId = getUserAssignedCityId(user, db);
    if (assignedCityId && rolInt !== 17) {
      conditions.push('c.id = ?');
      params.push(assignedCityId);
    } else if (ciudad_id) {
      conditions.push('c.id = ?');
      params.push(parseInt(ciudad_id));
    }
    if (estado) {
      conditions.push('v.estado = ?');
      params.push(estado);
    }
    if (fecha_desde) {
      conditions.push('v.fecha >= ?');
      params.push(fecha_desde);
    }
    if (fecha_hasta) {
      conditions.push('v.fecha <= ?');
      params.push(fecha_hasta);
    }

    const whereClause = conditions.join(' AND ');

    // Main report query
    const visitas = db.prepare(`
      SELECT 
        v.id, v.fecha, v.hora_inicio, v.hora_fin, v.estado,
        v.observaciones, v.hallazgos, v.acciones_correctivas,
        v.datos_formulario, v.repuestos, v.firma_auxiliar, v.firma_jefe, v.comentarios_jefe,
        v.firma_pdv, v.solicitante_nombre, v.equipo_id,
        v.created_at,
        p.nombre as pdv_nombre,
        c.nombre as ciudad_nombre,
        a.nombre as area_nombre, a.color as area_color,
        tv.nombre as tipo_visita_nombre,
        u.nombre as creador_nombre,
        resp.nombre as responsable_nombre,
        cat.nombre as categoria_nombre,
        cat_padre.nombre as categoria_padre_nombre,
        e.nombre as equipo_nombre, e.marca as equipo_marca, e.modelo as equipo_modelo
      FROM visitas v
      JOIN pdv p ON v.pdv_id = p.id
      JOIN ciudades c ON p.ciudad_id = c.id
      JOIN areas a ON v.area_id = a.id
      LEFT JOIN tipos_visita tv ON v.tipo_visita_id = tv.id
      JOIN users u ON v.user_id = u.id
      LEFT JOIN users resp ON v.responsable_id = resp.id
      LEFT JOIN categorias_visita cat ON v.categoria_id = cat.id
      LEFT JOIN categorias_visita cat_padre ON cat.padre_id = cat_padre.id
      LEFT JOIN equipos e ON v.equipo_id = e.id
      WHERE ${whereClause}
      ORDER BY v.fecha DESC, v.created_at DESC
      LIMIT 1000
    `).all(...params);

    // Summary by area
    const resumenPorArea = db.prepare(`
      SELECT 
        a.id as area_id, a.nombre as area_nombre, a.color as area_color,
        COUNT(v.id) as total,
        SUM(CASE WHEN v.estado = 'cerrada' THEN 1 ELSE 0 END) as cerradas,
        SUM(CASE WHEN v.estado = 'finalizada' THEN 1 ELSE 0 END) as finalizadas,
        SUM(CASE WHEN v.estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN v.estado = 'en_progreso' THEN 1 ELSE 0 END) as en_progreso,
        SUM(CASE WHEN v.estado = 'devuelta' THEN 1 ELSE 0 END) as devueltas
      FROM areas a
      LEFT JOIN visitas v ON v.area_id = a.id
        ${fecha_desde ? 'AND v.fecha >= ?' : ''}
        ${fecha_hasta ? 'AND v.fecha <= ?' : ''}
      WHERE a.activa = 1
      GROUP BY a.id
      ORDER BY total DESC
    `).all(...[
      ...(fecha_desde ? [fecha_desde] : []),
      ...(fecha_hasta ? [fecha_hasta] : [])
    ]);

    // Summary by category (for the filtered area/categories)
    const resumenPorCategoria = db.prepare(`
      SELECT 
        cat.id, cat.nombre as categoria_nombre, 
        cat_padre.nombre as padre_nombre,
        a.nombre as area_nombre,
        COUNT(v.id) as total,
        SUM(CASE WHEN v.estado IN ('cerrada','finalizada') THEN 1 ELSE 0 END) as completadas
      FROM categorias_visita cat
      LEFT JOIN categorias_visita cat_padre ON cat.padre_id = cat_padre.id
      LEFT JOIN areas a ON cat.area_id = a.id
      LEFT JOIN visitas v ON v.categoria_id = cat.id
        ${fecha_desde ? 'AND v.fecha >= ?' : ''}
        ${fecha_hasta ? 'AND v.fecha <= ?' : ''}
      WHERE cat.activa = 1 AND cat.padre_id IS NOT NULL
      GROUP BY cat.id
      HAVING total > 0
      ORDER BY total DESC
      LIMIT 50
    `).all(...[
      ...(fecha_desde ? [fecha_desde] : []),
      ...(fecha_hasta ? [fecha_hasta] : [])
    ]);

    // All areas and categories for filter dropdowns
    const areas = db.prepare('SELECT * FROM areas WHERE activa = 1').all();
    const categorias = db.prepare(`
      SELECT c.*, p.nombre as padre_nombre 
      FROM categorias_visita c 
      LEFT JOIN categorias_visita p ON c.padre_id = p.id 
      WHERE c.activa = 1
      ORDER BY c.area_id, c.padre_id NULLS FIRST, c.nombre
    `).all();
    const ciudades = db.prepare('SELECT * FROM ciudades WHERE activa = 1').all();

    return NextResponse.json({
      visitas,
      resumenPorArea,
      resumenPorCategoria,
      areas,
      categorias,
      ciudades,
      total: visitas.length
    });
  } catch (error) {
    console.error('Reportes GET error:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}
