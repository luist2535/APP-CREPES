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
    const areaId = searchParams.get('area_id');
    const getEvidenciasVisitaId = searchParams.get('visita_id');

    // If query is for evidences of a single visit
    if (getEvidenciasVisitaId) {
      const evidencias = db.prepare('SELECT * FROM evidencias WHERE visita_id = ? ORDER BY id').all(parseInt(getEvidenciasVisitaId));
      return NextResponse.json({ evidencias });
    }

    let query = `
      SELECT v.*, p.nombre as pdv_nombre, c.nombre as ciudad_nombre,
             a.nombre as area_nombre, a.color as area_color, a.tipo_flujo as area_tipo_flujo,
             tv.nombre as tipo_visita_nombre,
             u.nombre as usuario_nombre, r.nombre as responsable_nombre,
             r.avatar as responsable_avatar, r.rol_id as responsable_rol_id,
             e.nombre as equipo_nombre, e.marca as equipo_marca, e.modelo as equipo_modelo, e.serie as equipo_serie,
             cat.nombre as categoria_nombre, cat_padre.nombre as categoria_padre_nombre
      FROM visitas v
      JOIN pdv p ON v.pdv_id = p.id
      JOIN ciudades c ON p.ciudad_id = c.id
      JOIN areas a ON v.area_id = a.id
      LEFT JOIN tipos_visita tv ON v.tipo_visita_id = tv.id
      JOIN users u ON v.user_id = u.id
      LEFT JOIN users r ON v.responsable_id = r.id
      LEFT JOIN equipos e ON v.equipo_id = e.id
      LEFT JOIN categorias_visita cat ON v.categoria_id = cat.id
      LEFT JOIN categorias_visita cat_padre ON cat.padre_id = cat_padre.id
      WHERE 1=1
    `;
    const params = [];
    
    // Devolver todas para Admin, pero filtrar para los otros roles
    const rolInt = parseInt(user.rol_id);
    if (rolInt === 17) {
      const dbUser = db.prepare('SELECT pdv_id FROM users WHERE id = ?').get(user.id);
      const activePdvId = dbUser ? dbUser.pdv_id : null;
      query += " AND v.pdv_id = ? AND v.estado IN ('finalizada', 'cerrada', 'completada')";
      params.push(activePdvId);
    } else {
      const isAuxiliar = [10, 11, 12, 13, 14, 15, 16].includes(rolInt);
      if (isAuxiliar) {
        query += ' AND v.responsable_id = ?';
        params.push(user.id);
      } else {
        const userArea = getAreaIdFromRol(user.rol_id);
        if (userArea && userArea !== 'admin') {
          query += ' AND v.area_id = ?';
          params.push(userArea);
        }
      }
    }

    if (pdvId) { query += ' AND v.pdv_id = ?'; params.push(pdvId); }
    if (areaId) { query += ' AND v.area_id = ?'; params.push(areaId); }
    
    query += ' ORDER BY v.created_at DESC LIMIT 100';
    const visitas = db.prepare(query).all(...params);
    const areas = db.prepare('SELECT * FROM areas WHERE activa = 1').all();
    const tiposVisita = db.prepare('SELECT * FROM tipos_visita WHERE activo = 1').all();
    const plantillas = db.prepare('SELECT * FROM plantillas WHERE activa = 1').all();
    // Return all categories (hierarchical) for Mantenimiento (3) and Sistemas (7)
    const categorias = db.prepare(`
      SELECT c.*, p.nombre as padre_nombre
      FROM categorias_visita c
      LEFT JOIN categorias_visita p ON c.padre_id = p.id
      WHERE c.activa = 1
      ORDER BY c.area_id, c.padre_id NULLS FIRST, c.nombre
    `).all();
    return NextResponse.json({ visitas, areas, tiposVisita, plantillas, categorias });
  } catch (error) {
    console.error('Visitas GET error:', error);
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
      evento_id, repuestos, firma_auxiliar, hallazgos, acciones_correctivas, equipo_id,
      categoria_id
    } = body;
    
    if (!pdv_id || !area_id || !tipo_visita_id || !fecha) {
      return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 });
    }
    
    // Insert visit (when directly creating a completed visit, usually by coordinators/admin)
    const result = db.prepare(`
      INSERT INTO visitas (pdv_id, user_id, area_id, tipo_visita_id, plantilla_id, fecha, hora_inicio, hora_fin, datos_formulario, responsable_id, fecha_compromiso, estado, observaciones, repuestos, firma_auxiliar, hallazgos, acciones_correctivas, evento_id, equipo_id, categoria_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completada', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pdv_id, user.id, area_id, tipo_visita_id, plantilla_id || null, 
      fecha, hora_inicio || null, hora_fin || null, 
      JSON.stringify(datos_formulario || {}), 
      responsable_id || null, fecha_compromiso || null, observaciones || null,
      repuestos || null, firma_auxiliar || null, hallazgos || null, acciones_correctivas || null,
      evento_id || null, equipo_id || null, categoria_id || null
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
      db.prepare("UPDATE solicitudes_visita SET estado = 'cerrada' WHERE evento_id = ?").run(parseInt(evento_id));
    }

    db.prepare(`
      INSERT INTO historial_visitas (visita_id, accion, user_id, detalle)
      VALUES (?, 'creada', ?, 'Visita registrada directamente')
    `).run(visitId, user.id);
    
    return NextResponse.json({ id: visitId, message: 'Visita registrada correctamente y evento de calendario completado' });
  } catch (error) {
    console.error('Create visita error:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    
    const db = getDb();
    const { id, action, ...data } = await request.json();

    if (!id || !action) {
      return NextResponse.json({ error: 'ID y acción son requeridos' }, { status: 400 });
    }

    const visit = db.prepare('SELECT * FROM visitas WHERE id = ?').get(id);
    if (!visit) {
      return NextResponse.json({ error: 'Visita no encontrada' }, { status: 404 });
    }

    if (action === 'iniciar') {
      const nowTime = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
      db.prepare("UPDATE visitas SET hora_inicio = ?, estado = 'en_progreso' WHERE id = ?").run(nowTime, id);
      
      db.prepare(`
        INSERT INTO historial_visitas (visita_id, accion, user_id, detalle)
        VALUES (?, 'iniciar_trabajo', ?, ?)
      `).run(id, user.id, `Trabajo iniciado a las ${nowTime}`);
      
      return NextResponse.json({ message: 'Trabajo iniciado correctamente', hora_inicio: nowTime });
    }

    if (action === 'guardar_progreso') {
      const { datos_formulario, observaciones } = data;
      db.prepare(`
        UPDATE visitas 
        SET datos_formulario = ?, observaciones = COALESCE(?, observaciones)
        WHERE id = ?
      `).run(
        JSON.stringify(datos_formulario || {}),
        observaciones || null,
        id
      );
      
      db.prepare(`
        INSERT INTO historial_visitas (visita_id, accion, user_id, detalle)
        VALUES (?, 'guardar_progreso', ?, 'Progreso del formulario guardado temporalmente')
      `).run(id, user.id);

      return NextResponse.json({ message: 'Progreso guardado exitosamente' });
    }

    if (action === 'finalizar') {
      const { 
        datos_formulario, observaciones, evidencias, repuestos, 
        firma_auxiliar, hallazgos, acciones_correctivas, tipo_visita_id, plantilla_id,
        firma_pdv, solicitante_nombre, solicitante_documento, solicitante_telefono, equipo_id,
        categoria_id
      } = data;
      
      const nowTime = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
      
      db.prepare(`
        UPDATE visitas 
        SET hora_fin = ?, datos_formulario = ?, observaciones = ?, repuestos = ?, 
            firma_auxiliar = ?, hallazgos = ?, acciones_correctivas = ?, 
            tipo_visita_id = COALESCE(?, tipo_visita_id), plantilla_id = COALESCE(?, plantilla_id),
            firma_pdv = ?, solicitante_nombre = ?, solicitante_documento = ?, solicitante_telefono = ?,
            equipo_id = ?, categoria_id = COALESCE(?, categoria_id), estado = 'finalizada' 
        WHERE id = ?
      `).run(
        nowTime,
        JSON.stringify(datos_formulario || {}),
        observaciones || null,
        repuestos || null,
        firma_auxiliar || null,
        hallazgos || null,
        acciones_correctivas || null,
        tipo_visita_id || null,
        plantilla_id || null,
        firma_pdv || null,
        solicitante_nombre || null,
        solicitante_documento || null,
        solicitante_telefono || null,
        equipo_id || null,
        categoria_id || null,
        id
      );

      // Eliminar evidencias existentes para esta visita si vamos a sobreescribir
      if (evidencias && evidencias.length > 0) {
        db.prepare('DELETE FROM evidencias WHERE visita_id = ?').run(id);
        const insertEvidencia = db.prepare(`
          INSERT INTO evidencias (visita_id, tipo, ruta_archivo, nombre_archivo, etiqueta)
          VALUES (?, 'foto', ?, ?, ?)
        `);
        for (const ev of evidencias) {
          if (ev.url) {
            insertEvidencia.run(id, ev.url, ev.nombre || 'Archivo', ev.etiqueta || 'soporte');
          }
        }
      }

      db.prepare(`
        INSERT INTO historial_visitas (visita_id, accion, user_id, detalle)
        VALUES (?, 'finalizar_trabajo', ?, ?)
      `).run(id, user.id, `Trabajo finalizado a las ${nowTime}. Esperando aprobación.`);

      return NextResponse.json({ message: 'Visita enviada al Jefe para su aprobación' });
    }

    if (action === 'aprobar') {
      // Block PDV users from approving visits
      if (parseInt(user.rol_id) === 17) {
        return NextResponse.json({ error: 'Los usuarios de Punto de Venta no pueden aprobar visitas.' }, { status: 403 });
      }
      const { firma_jefe, comentarios_jefe } = data;
      
      db.prepare(`
        UPDATE visitas 
        SET firma_jefe = ?, comentarios_jefe = ?, estado = 'cerrada' 
        WHERE id = ?
      `).run(firma_jefe || null, comentarios_jefe || null, id);

      if (visit.evento_id) {
        db.prepare("UPDATE eventos_calendario SET estado = 'completado' WHERE id = ?").run(visit.evento_id);
        db.prepare("UPDATE solicitudes_visita SET estado = 'cerrada' WHERE evento_id = ?").run(visit.evento_id);
      }

      db.prepare(`
        INSERT INTO historial_visitas (visita_id, accion, user_id, detalle)
        VALUES (?, 'aprobar_visita', ?, ?)
      `).run(id, user.id, `Visita aprobada y cerrada. ${comentarios_jefe ? 'Comentarios: ' + comentarios_jefe : ''}`);

      return NextResponse.json({ message: 'Visita aprobada y cerrada exitosamente' });
    }

    if (action === 'devolver') {
      // Block PDV users from returning visits
      if (parseInt(user.rol_id) === 17) {
        return NextResponse.json({ error: 'Los usuarios de Punto de Venta no pueden gestionar visitas.' }, { status: 403 });
      }
      const { comentarios_jefe } = data;

      if (!comentarios_jefe) {
        return NextResponse.json({ error: 'Debe especificar el motivo de devolución en los comentarios' }, { status: 400 });
      }

      db.prepare(`
        UPDATE visitas 
        SET comentarios_jefe = ?, estado = 'devuelta' 
        WHERE id = ?
      `).run(comentarios_jefe, id);

      db.prepare(`
        INSERT INTO historial_visitas (visita_id, accion, user_id, detalle)
        VALUES (?, 'devolver_visita', ?, ?)
      `).run(id, user.id, `Visita devuelta al Auxiliar. Razón: ${comentarios_jefe}`);

      return NextResponse.json({ message: 'Visita devuelta al Auxiliar para correcciones' });
    }

    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (error) {
    console.error('Update visita error:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}
