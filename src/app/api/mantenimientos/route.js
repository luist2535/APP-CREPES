import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest, hasActionPermission, getUserAssignedCityId } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

// Roles que pueden asignar tickets
const ROLES_JEFE = [1, 4, 9]; // Admin, Jefe Mantenimiento, Jefe Sistemas

// Determina el prefijo automáticamente según el área de registro
function calcularPrefijo(area_registro) {
  const areaSistemas = ['sistemas', 'system', 'it', 'tecnologia', 'tecnología'];
  return areaSistemas.includes((area_registro || '').toLowerCase().trim()) ? 'ST' : 'MT';
}

// Genera el siguiente ID correlativo (MT-1001, ST-1001, etc.)
function generarId(db, prefijo) {
  const row = db.prepare('SELECT ultimo_numero FROM mantenimientos_correlativos WHERE prefijo = ?').get(prefijo);
  const siguiente = (row ? row.ultimo_numero : 1000) + 1;
  db.prepare('UPDATE mantenimientos_correlativos SET ultimo_numero = ? WHERE prefijo = ?').run(siguiente, prefijo);
  return `${prefijo}-${siguiente}`;
}

export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const db = getDb();
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const prefijo = searchParams.get('prefijo');
    const tipo = searchParams.get('tipo');
    const area = searchParams.get('area');
    const tecnico_id = searchParams.get('tecnico_id');
    const prioridad = searchParams.get('prioridad');
    const equipo_id = searchParams.get('equipo_id');
    const fecha_desde = searchParams.get('fecha_desde');
    const fecha_hasta = searchParams.get('fecha_hasta');
    const search = searchParams.get('search');

    let query = `
      SELECT m.*,
        ur.nombre as usuario_registro_nombre,
        ua.nombre as responsable_asignacion_nombre,
        ut.nombre as tecnico_nombre,
        e.nombre as equipo_nombre, e.pdv_id as equipo_pdv_id,
        p.nombre as pdv_nombre, c.nombre as ciudad_nombre
      FROM mantenimientos m
      LEFT JOIN users ur ON m.user_id_registro = ur.id
      LEFT JOIN users ua ON m.responsable_asignacion_id = ua.id
      LEFT JOIN users ut ON m.tecnico_id = ut.id
      LEFT JOIN equipos e ON m.equipo_id = e.id
      LEFT JOIN pdv p ON p.id = COALESCE(m.pdv_id, e.pdv_id, ur.pdv_id)
      LEFT JOIN ciudades c ON p.ciudad_id = c.id
      WHERE 1=1
    `;
    const params = [];

    const assignedCityId = getUserAssignedCityId(user, db);
    const rolInt = parseInt(user.rol_id || 0);
    const rolNombre = (user.rol_nombre || user.rol || '').toLowerCase();
    const esJefe = ROLES_JEFE.includes(rolInt) || hasActionPermission(user, 'mantenimiento', 'gestionar_tablero', db);

    if (assignedCityId && rolInt !== 1 && !Boolean(user.permisos_adicionales?.['mantenimiento.gestionar_tablero']?.permitido)) {
      query += ' AND (p.ciudad_id = ? OR p.ciudad_id IS NULL)';
      params.push(assignedCityId);
    }

    if (!esJefe) {
      if (rolInt === 12 || rolNombre.includes('mantenimiento')) {
        // Solo visualizar los tickets que le hayan sido asignados
        query += ' AND m.tecnico_id = ?';
        params.push(user.id);
      } else if (rolInt === 5 || rolInt === 13 || rolNombre.includes('calidad')) {
        // Sistemas de Calidad solo ven y generan tickets cuando identifican hallazgo (sus propios registros)
        query += ' AND m.user_id_registro = ?';
        params.push(user.id);
      }
    }

    if (estado) { query += ' AND m.estado = ?'; params.push(estado); }
    if (prefijo) { query += ' AND m.prefijo = ?'; params.push(prefijo); }
    if (tipo) { query += ' AND m.tipo_mantenimiento = ?'; params.push(tipo); }
    if (area) { query += ' AND m.area_registro = ?'; params.push(area); }
    if (tecnico_id) { query += ' AND m.tecnico_id = ?'; params.push(parseInt(tecnico_id)); }
    if (prioridad) { query += ' AND m.prioridad = ?'; params.push(prioridad); }
    if (equipo_id) { query += ' AND m.equipo_id = ?'; params.push(equipo_id); }
    if (fecha_desde) { query += ' AND DATE(m.fecha_registro) >= ?'; params.push(fecha_desde); }
    if (fecha_hasta) { query += ' AND DATE(m.fecha_registro) <= ?'; params.push(fecha_hasta); }
    if (search) {
      query += ' AND (m.id LIKE ? OR m.descripcion LIKE ? OR m.area_hallazgo LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY m.fecha_registro DESC';

    const mantenimientos = db.prepare(query).all(...params);

    // Estadísticas rápidas
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'Pendiente' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN estado = 'Asignado' THEN 1 ELSE 0 END) as asignados,
        SUM(CASE WHEN estado = 'En proceso' THEN 1 ELSE 0 END) as en_proceso,
        SUM(CASE WHEN estado = 'Finalizado' THEN 1 ELSE 0 END) as finalizados,
        SUM(CASE WHEN estado = 'Cancelado' THEN 1 ELSE 0 END) as cancelados,
        SUM(CASE WHEN prefijo = 'MT' THEN 1 ELSE 0 END) as total_mt,
        SUM(CASE WHEN prefijo = 'ST' THEN 1 ELSE 0 END) as total_st,
        SUM(CASE WHEN fecha_programada < DATE('now') AND estado NOT IN ('Finalizado','Cancelado') THEN 1 ELSE 0 END) as vencidos
      FROM mantenimientos
    `).get();

    // Técnicos por área:
    // rol 12 = Auxiliar Mantenimiento → tickets MT
    // rol 16 = Auxiliar Sistemas → tickets ST
    // rol 1 (admin) y jefes (4,9) pueden ejecutar cualquiera
    const tecnicosMT = db.prepare(`
      SELECT u.id, u.nombre, u.rol_id, r.nombre as rol_nombre
      FROM users u
      JOIN roles r ON u.rol_id = r.id
      WHERE u.activo = 1 AND u.rol_id IN (1, 4, 12)
      ORDER BY u.nombre
    `).all();

    const tecnicosST = db.prepare(`
      SELECT u.id, u.nombre, u.rol_id, r.nombre as rol_nombre
      FROM users u
      JOIN roles r ON u.rol_id = r.id
      WHERE u.activo = 1 AND u.rol_id IN (1, 9, 16)
      ORDER BY u.nombre
    `).all();

    return NextResponse.json({ mantenimientos, stats, tecnicosMT, tecnicosST });
  } catch (error) {
    console.error('GET /api/mantenimientos error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const db = getDb();
    
    const contentType = request.headers.get('content-type') || '';
    let body = {};
    let fileUrls = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
      
      const files = formData.getAll('evidencias');
      if (files && files.length > 0) {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'mantenimientos');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        
        for (const file of files) {
          if (file.name && file.size > 0) {
            const ext = path.extname(file.name) || '.jpg';
            const fileName = `${Date.now()}-${Math.round(Math.random()*1E9)}${ext}`;
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

    const {
      tipo_mantenimiento,
      area_registro,
      area_hallazgo,
      equipo_id,
      pdv_id,
      descripcion,
      fecha_evidencia,
      prioridad,
      observaciones
    } = body;

    if (!tipo_mantenimiento || !area_registro || !descripcion || !fecha_evidencia) {
      return NextResponse.json(
        { error: 'Tipo, área de registro, descripción y fecha de evidencia son obligatorios.' },
        { status: 400 }
      );
    }

    const prefijo = calcularPrefijo(area_registro);
    const id = generarId(db, prefijo);
    const numero_correlativo = parseInt(id.split('-')[1]);
    const evidenciasJson = JSON.stringify(fileUrls);
    const pdvIdFinal = pdv_id ? parseInt(pdv_id) : null;

    // Resolver el equipo_id real si se proveyó uno
    let equipo_id_real = null;
    if (equipo_id && equipo_id.trim() !== '') {
      const cleanedId = equipo_id.trim();
      const equipo = db.prepare(`
        SELECT id FROM equipos
        WHERE LOWER(id) = LOWER(?)
           OR LOWER(json_extract(datos_tecnicos, '$.sticker')) = LOWER(?)
           OR LOWER(serie) = LOWER(?)
      `).get(cleanedId, cleanedId, cleanedId);

      if (!equipo) {
        return NextResponse.json(
          { error: `El equipo con código "${cleanedId}" no se encuentra registrado en la base de datos. Por favor, verifícalo o selecciona la opción "Locativo".` },
          { status: 400 }
        );
      }
      equipo_id_real = equipo.id;
    }

    db.prepare(`
      INSERT INTO mantenimientos (
        id, prefijo, numero_correlativo, tipo_mantenimiento, area_registro,
        area_hallazgo, equipo_id, pdv_id, descripcion, fecha_evidencia, prioridad,
        observaciones, user_id_registro, evidencias
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, prefijo, numero_correlativo, tipo_mantenimiento, area_registro,
      area_hallazgo || null, equipo_id_real, pdvIdFinal, descripcion, fecha_evidencia,
      prioridad || 'Media', observaciones || null, user.id, evidenciasJson
    );

    // Registrar en historial de auditoría
    db.prepare(`
      INSERT INTO historial_mantenimientos (mantenimiento_id, user_id, accion, estado_nuevo, detalles_cambio)
      VALUES (?, ?, 'CREACION', 'Pendiente', ?)
    `).run(id, user.id, JSON.stringify({ tipo: tipo_mantenimiento, area: area_registro, prioridad: prioridad || 'Media', evidencias_adjuntas: fileUrls.length }));

    const nuevo = db.prepare('SELECT * FROM mantenimientos WHERE id = ?').get(id);
    return NextResponse.json({ mantenimiento: nuevo, message: `Ticket ${id} creado exitosamente` }, { status: 201 });
  } catch (error) {
    console.error('POST /api/mantenimientos error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
