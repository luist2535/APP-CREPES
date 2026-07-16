import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
// Roles que pueden asignar tickets: Admin(1), Jefe Mantenimiento(4), Jefe Sistemas(9)
const ROLES_JEFE = [1, 4, 9];

export async function GET(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const db = getDb();
    const { id } = await params;

    const mantenimiento = db.prepare(`
      SELECT m.*,
        ur.nombre as usuario_registro_nombre, ur.email as usuario_registro_email,
        ua.nombre as responsable_asignacion_nombre,
        ut.nombre as tecnico_nombre, ut.email as tecnico_email,
        e.nombre as equipo_nombre, e.marca as equipo_marca, e.modelo as equipo_modelo,
        p.nombre as pdv_nombre, c.nombre as ciudad_nombre
      FROM mantenimientos m
      LEFT JOIN users ur ON m.user_id_registro = ur.id
      LEFT JOIN users ua ON m.responsable_asignacion_id = ua.id
      LEFT JOIN users ut ON m.tecnico_id = ut.id
      LEFT JOIN equipos e ON m.equipo_id = e.id
      LEFT JOIN pdv p ON p.id = COALESCE(m.pdv_id, e.pdv_id, ur.pdv_id)
      LEFT JOIN ciudades c ON p.ciudad_id = c.id
      WHERE m.id = ?
    `).get(id);

    if (!mantenimiento) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
    }

    const historial = db.prepare(`
      SELECT h.*, u.nombre as user_nombre
      FROM historial_mantenimientos h
      LEFT JOIN users u ON h.user_id = u.id
      WHERE h.mantenimiento_id = ?
      ORDER BY h.created_at ASC
    `).all(id);

    return NextResponse.json({ mantenimiento, historial });
  } catch (error) {
    console.error('GET /api/mantenimientos/[id] error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const db = getDb();
    const { id } = await params;
    const contentType = request.headers.get('content-type') || '';
    let body = {};
    let fileUrls = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
      
      const files = formData.getAll('evidencias_cierre');
      if (files && files.length > 0) {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'mantenimientos');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        
        for (const file of files) {
          if (file.name && file.size > 0) {
            const ext = path.extname(file.name) || '.jpg';
            const fileName = `cierre-${Date.now()}-${Math.round(Math.random()*1E9)}${ext}`;
            const filePath = path.join(uploadDir, fileName);
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            fs.writeFileSync(filePath, buffer);
            fileUrls.push(`/uploads/mantenimientos/${fileName}`);
          }
        }
      }
    } else {
      body = await request.json();
    }

    const rolId = parseInt(user.rol_id);

    const actual = db.prepare('SELECT * FROM mantenimientos WHERE id = ?').get(id);
    if (!actual) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });

    const accion = body.accion; // 'asignar' | 'iniciar' | 'finalizar' | 'cancelar' | 'editar'

    // ===== ASIGNACIÓN (solo Jefes) =====
    if (accion === 'asignar') {
      if (!ROLES_JEFE.includes(rolId)) {
        return NextResponse.json({ error: 'Solo el Jefe de Mantenimiento o Sistemas puede asignar tickets.' }, { status: 403 });
      }
      const { tecnico_id, fecha_programada, prioridad, observaciones_asignacion, checklist_tareas } = body;
      if (!tecnico_id || !fecha_programada) {
        return NextResponse.json({ error: 'Técnico y fecha programada son obligatorios para asignar.' }, { status: 400 });
      }

      const checklistJson = checklist_tareas ? JSON.stringify(checklist_tareas) : '[]';

      db.prepare(`
        UPDATE mantenimientos 
        SET tecnico_id = ?, fecha_programada = ?, prioridad = ?, observaciones_asignacion = ?, estado = 'Asignado', responsable_asignacion_id = ?, checklist_tareas = ?
        WHERE id = ?
      `).run(tecnico_id, fecha_programada, prioridad || actual.prioridad, observaciones_asignacion || null, user.id, checklistJson, id);

      // Registrar en historial
      db.prepare(`
        INSERT INTO historial_mantenimientos (mantenimiento_id, user_id, accion, estado_anterior, estado_nuevo, detalles_cambio)
        VALUES (?, ?, 'ASIGNACION', ?, 'Asignado', ?)
      `).run(id, user.id, actual.estado, JSON.stringify({ tecnico_id, fecha_programada, prioridad, checklist_count: checklist_tareas?.length || 0 }));

      // Integración con el Calendario
      try {
        // Eliminar evento anterior si es una reasignación
        db.prepare('DELETE FROM eventos_calendario WHERE titulo = ?').run(`Ticket ${id}`);

        // Encontrar pdv_id (del equipo o del usuario que registró)
        let pdv_id = null;
        if (actual.equipo_id) {
          const eq = db.prepare('SELECT pdv_id FROM equipos WHERE id = ?').get(actual.equipo_id);
          if (eq) pdv_id = eq.pdv_id;
        }
        if (!pdv_id) {
          const uReg = db.prepare('SELECT pdv_id FROM users WHERE id = ?').get(actual.user_id_registro);
          if (uReg) pdv_id = uReg.pdv_id;
        }

        if (pdv_id) {
          const area_id = actual.prefijo === 'ST' ? 1 : 2; // 1: Sistemas, 2: Mantenimiento
          db.prepare(`
            INSERT INTO eventos_calendario (
              pdv_id, user_id, area_id, titulo, descripcion, fecha, hora_inicio, hora_fin, tipo_evento, estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            pdv_id, tecnico_id, area_id, 
            `Ticket ${id}`, 
            `${actual.tipo_mantenimiento} - ${actual.descripcion}`, 
            fecha_programada, '08:00', '10:00', // Default a mañana
            'visita', 'programado'
          );
        }
      } catch (calErr) {
        console.error('Error al crear evento en calendario:', calErr);
      }

      return NextResponse.json({ message: 'Ticket asignado exitosamente y evento creado en calendario' });
    }

    // ===== INICIAR EJECUCIÓN =====
    if (accion === 'iniciar') {
      db.prepare(`
        UPDATE mantenimientos SET estado = 'En proceso', fecha_inicio_ejecucion = CURRENT_TIMESTAMP WHERE id = ?
      `).run(id);

      db.prepare(`
        INSERT INTO historial_mantenimientos (mantenimiento_id, user_id, accion, estado_anterior, estado_nuevo)
        VALUES (?, ?, 'INICIO', ?, 'En proceso')
      `).run(id, user.id, actual.estado);

      return NextResponse.json({ message: `Ticket ${id} iniciado` });
    }

    // ===== FINALIZAR (TÉCNICO ENVÍA A APROBACIÓN) =====
    if (accion === 'finalizar') {
      const { solucion_aplicada, observaciones, firma_tecnico, firma_solicitante } = body;
      let { checklist_completado } = body;
      
      if (!solucion_aplicada) {
        return NextResponse.json({ error: 'La solución aplicada es obligatoria' }, { status: 400 });
      }

      if (typeof checklist_completado === 'string') {
        try {
          checklist_completado = JSON.parse(checklist_completado);
        } catch (e) {
          checklist_completado = null;
        }
      }
      
      const detallesCambio = { solucion_aplicada };
      
      // Actualizar checklist si viene
      if (checklist_completado) {
        db.prepare('UPDATE mantenimientos SET checklist_tareas = ? WHERE id = ?').run(JSON.stringify(checklist_completado), id);
        detallesCambio.checklist_actualizado = true;
      }

      // Añadir nuevas evidencias a las existentes
      let evidenciasFinales = actual.evidencias ? JSON.parse(actual.evidencias) : [];
      if (fileUrls.length > 0) {
        evidenciasFinales = [...evidenciasFinales, ...fileUrls];
      }

      db.prepare(`
        UPDATE mantenimientos
        SET estado = 'Por Aprobar', 
            solucion_aplicada = ?, 
            observaciones = COALESCE(?, observaciones), 
            firma_tecnico = COALESCE(?, firma_tecnico),
            firma_solicitante = COALESCE(?, firma_solicitante),
            evidencias = ?,
            fecha_real_finalizacion = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(solucion_aplicada, observaciones || null, firma_tecnico || null, firma_solicitante || null, JSON.stringify(evidenciasFinales), id);

      db.prepare(`
        INSERT INTO historial_mantenimientos (mantenimiento_id, user_id, accion, estado_anterior, estado_nuevo, detalles_cambio)
        VALUES (?, ?, 'SOLUCION', ?, 'Por Aprobar', ?)
      `).run(id, user.id, actual.estado, JSON.stringify(detallesCambio));

      return NextResponse.json({ message: 'Ticket enviado a revisión de Jefe de Mantenimiento (Por Aprobar)' });
    }

    // ===== APROBAR (JEFE DE MANTENIMIENTO) =====
    if (accion === 'aprobar') {
      const { firma_jefe, observaciones_aprobacion } = body;
      if (!firma_jefe) {
        return NextResponse.json({ error: 'La firma del Jefe de Mantenimiento es requerida para cerrar la gestión' }, { status: 400 });
      }

      db.prepare(`
        UPDATE mantenimientos
        SET estado = 'Finalizado',
            firma_jefe = ?,
            observaciones_aprobacion = COALESCE(?, observaciones_aprobacion),
            fecha_aprobacion = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(firma_jefe, observaciones_aprobacion || 'Aprobado por el Jefe de Mantenimiento', id);

      db.prepare(`
        INSERT INTO historial_mantenimientos (mantenimiento_id, user_id, accion, estado_anterior, estado_nuevo, detalles_cambio)
        VALUES (?, ?, 'APROBACION', ?, 'Finalizado', ?)
      `).run(id, user.id, actual.estado, JSON.stringify({ firma_jefe: true, observaciones_aprobacion }));

      return NextResponse.json({ message: 'Ticket aprobado y finalizado exitosamente' });
    }

    // ===== DEVOLVER AL TÉCNICO (RECHAZO DE CIERRE) =====
    if (accion === 'devolver') {
      const { motivo_devolucion } = body;
      if (!motivo_devolucion) {
        return NextResponse.json({ error: 'Debes indicar el motivo por el cual devuelves el ticket al técnico' }, { status: 400 });
      }

      db.prepare(`
        UPDATE mantenimientos
        SET estado = 'En proceso',
            observaciones_aprobacion = ?
        WHERE id = ?
      `).run(`[DEVUELTO POR JEFE PARA CORRECCIÓN]: ${motivo_devolucion}`, id);

      db.prepare(`
        INSERT INTO historial_mantenimientos (mantenimiento_id, user_id, accion, estado_anterior, estado_nuevo, detalles_cambio)
        VALUES (?, ?, 'DEVOLUCION', ?, 'En proceso', ?)
      `).run(id, user.id, actual.estado, JSON.stringify({ motivo_devolucion }));

      return NextResponse.json({ message: 'Ticket devuelto al técnico para continuar su gestión' });
    }

    // ===== CANCELAR =====
    if (accion === 'cancelar') {
      const { motivo } = body;
      db.prepare(`UPDATE mantenimientos SET estado = 'Cancelado', observaciones = COALESCE(?, observaciones) WHERE id = ?`).run(motivo || null, id);

      db.prepare(`
        INSERT INTO historial_mantenimientos (mantenimiento_id, user_id, accion, estado_anterior, estado_nuevo, detalles_cambio)
        VALUES (?, ?, 'CANCELACION', ?, 'Cancelado', ?)
      `).run(id, user.id, actual.estado, JSON.stringify({ motivo }));

      return NextResponse.json({ message: `Ticket ${id} cancelado` });
    }

    // ===== ADJUNTAR EVIDENCIAS =====
    if (accion === 'evidencia') {
      const { evidencias } = body;
      db.prepare(`UPDATE mantenimientos SET evidencias = ? WHERE id = ?`).run(JSON.stringify(evidencias), id);

      db.prepare(`
        INSERT INTO historial_mantenimientos (mantenimiento_id, user_id, accion, detalles_cambio)
        VALUES (?, ?, 'EVIDENCIA', ?)
      `).run(id, user.id, JSON.stringify({ count: evidencias.length }));

      return NextResponse.json({ message: 'Evidencias actualizadas' });
    }

    // ===== EDITAR CAMPOS GENERALES =====
    if (accion === 'editar') {
      const { descripcion, area_hallazgo, prioridad, observaciones } = body;
      const antes = { descripcion: actual.descripcion, area_hallazgo: actual.area_hallazgo, prioridad: actual.prioridad };

      db.prepare(`
        UPDATE mantenimientos SET
          descripcion = COALESCE(?, descripcion),
          area_hallazgo = COALESCE(?, area_hallazgo),
          prioridad = COALESCE(?, prioridad),
          observaciones = COALESCE(?, observaciones)
        WHERE id = ?
      `).run(descripcion || null, area_hallazgo || null, prioridad || null, observaciones || null, id);

      db.prepare(`
        INSERT INTO historial_mantenimientos (mantenimiento_id, user_id, accion, detalles_cambio)
        VALUES (?, ?, 'MODIFICACION', ?)
      `).run(id, user.id, JSON.stringify({ antes, despues: body }));

      return NextResponse.json({ message: 'Ticket actualizado' });
    }

    // ===== GUARDAR AVANCE (CHECKLIST / SOLUCION TEMPORAL) =====
    if (accion === 'guardar_avance') {
      const { solucion_aplicada, observaciones, checklist_completado } = body;
      if (checklist_completado) {
        db.prepare('UPDATE mantenimientos SET checklist_tareas = ? WHERE id = ?').run(
          typeof checklist_completado === 'string' ? checklist_completado : JSON.stringify(checklist_completado),
          id
        );
      }
      if (solucion_aplicada !== undefined || observaciones !== undefined) {
        db.prepare('UPDATE mantenimientos SET solucion_aplicada = COALESCE(?, solucion_aplicada), observaciones = COALESCE(?, observaciones) WHERE id = ?').run(solucion_aplicada || null, observaciones || null, id);
      }
      return NextResponse.json({ message: 'Avance del trabajo guardado correctamente' });
    }

    return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
  } catch (error) {
    console.error('PATCH /api/mantenimientos/[id] error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
