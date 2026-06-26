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
    const areaId = searchParams.get('area_id');
    const getEvidenciasVisitaId = searchParams.get('visita_id');

    // If query is for evidences of a single visit
    if (getEvidenciasVisitaId) {
      const evidencias = db.prepare('SELECT * FROM evidencias WHERE visita_id = ? ORDER BY id').all(parseInt(getEvidenciasVisitaId));
      return NextResponse.json({ evidencias });
    }

    let query = `
      SELECT v.*, p.nombre as pdv_nombre, c.nombre as ciudad_nombre,
             a.nombre as area_nombre, tv.nombre as tipo_visita_nombre,
             u.nombre as usuario_nombre, r.nombre as responsable_nombre
      FROM visitas v
      JOIN pdv p ON v.pdv_id = p.id
      JOIN ciudades c ON p.ciudad_id = c.id
      JOIN areas a ON v.area_id = a.id
      JOIN tipos_visita tv ON v.tipo_visita_id = tv.id
      JOIN users u ON v.user_id = u.id
      LEFT JOIN users r ON v.responsable_id = r.id
      WHERE 1=1
    `;
    const params = [];
    if (pdvId) { query += ' AND v.pdv_id = ?'; params.push(pdvId); }
    if (areaId) { query += ' AND v.area_id = ?'; params.push(areaId); }
    query += ' ORDER BY v.created_at DESC LIMIT 100';
    const visitas = db.prepare(query).all(...params);
    const areas = db.prepare('SELECT * FROM areas WHERE activa = 1').all();
    const tiposVisita = db.prepare('SELECT * FROM tipos_visita WHERE activo = 1').all();
    const plantillas = db.prepare('SELECT * FROM plantillas WHERE activa = 1').all();
    return NextResponse.json({ visitas, areas, tiposVisita, plantillas });
  } catch (error) {
    console.error('Visitas error:', error);
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
    const body = await request.json();
    const { 
      pdv_id, area_id, tipo_visita_id, plantilla_id, 
      fecha, hora_inicio, hora_fin, datos_formulario, 
      responsable_id, fecha_compromiso, observaciones, evidencias,
      evento_id
    } = body;
    
    if (!pdv_id || !area_id || !tipo_visita_id || !fecha) {
      return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 });
    }
    
    // Insert visit
    const result = db.prepare(`
      INSERT INTO visitas (pdv_id, user_id, area_id, tipo_visita_id, plantilla_id, fecha, hora_inicio, hora_fin, datos_formulario, responsable_id, fecha_compromiso, estado, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completada', ?)
    `).run(
      pdv_id, user.id, area_id, tipo_visita_id, plantilla_id || null, 
      fecha, hora_inicio || null, hora_fin || null, 
      JSON.stringify(datos_formulario || {}), 
      responsable_id || null, fecha_compromiso || null, observaciones || null
    );

    const visitId = result.lastInsertRowid;

    // Insert evidences if supplied
    if (evidencias && Array.isArray(evidencias)) {
      const insertEvidencia = db.prepare(`
        INSERT INTO evidencias (visita_id, tipo, ruta_archivo, nombre_archivo, etiqueta)
        VALUES (?, 'foto', ?, ?, ?)
      `);
      for (const ev of evidencias) {
        if (ev.url) {
          insertEvidencia.run(visitId, ev.url, ev.nombre || 'Archivo', ev.etiqueta || 'soporte');
        }
      }
    }

    // Mark calendar event as completed if linked
    if (evento_id) {
      db.prepare("UPDATE eventos_calendario SET estado = 'completado' WHERE id = ?").run(parseInt(evento_id));
    }

    db.prepare(`
      INSERT INTO historial_visitas (visita_id, accion, user_id, detalle)
      VALUES (?, 'creada', ?, 'Visita registrada')
    `).run(visitId, user.id);
    
    return NextResponse.json({ id: visitId, message: 'Visita registrada correctamente y evento de calendario completado' });
  } catch (error) {
    console.error('Create visita error:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}
