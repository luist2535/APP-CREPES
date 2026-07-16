import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

// Helper: calcular prefijo
function calcularPrefijo(area_registro) {
  const areaSistemas = ['sistemas', 'system', 'it', 'tecnologia', 'tecnología'];
  return areaSistemas.includes((area_registro || '').toLowerCase().trim()) ? 'ST' : 'MT';
}

function generarId(db, prefijo) {
  const row = db.prepare('SELECT ultimo_numero FROM mantenimientos_correlativos WHERE prefijo = ?').get(prefijo);
  const siguiente = (row ? row.ultimo_numero : 1000) + 1;
  db.prepare('UPDATE mantenimientos_correlativos SET ultimo_numero = ? WHERE prefijo = ?').run(siguiente, prefijo);
  return `${prefijo}-${siguiente}`;
}

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const db = getDb();
    const body = await request.json();

    const {
      tipo_inspeccion,
      area_id,
      pdv_id,
      fecha_inspeccion,
      hora_inicio,
      hora_fin,
      observaciones_generales,
      hallazgos // array de objetos: {tipo_mantenimiento, area_registro, area_hallazgo, equipo_id, descripcion, prioridad}
    } = body;

    if (!tipo_inspeccion || !fecha_inspeccion || !hallazgos || !hallazgos.length) {
      return NextResponse.json(
        { error: 'Tipo de inspección, fecha y al menos un hallazgo son obligatorios.' },
        { status: 400 }
      );
    }

    // Registrar la inspección
    const inspeccionResult = db.prepare(`
      INSERT INTO inspecciones (tipo_inspeccion, area_id, pdv_id, user_id, fecha_inspeccion, hora_inicio, hora_fin, observaciones_generales)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tipo_inspeccion, area_id || null, pdv_id || null, user.id,
      fecha_inspeccion, hora_inicio || null, hora_fin || null, observaciones_generales || null
    );
    const inspeccion_id = inspeccionResult.lastInsertRowid;

    // Crear un ticket de mantenimiento por cada hallazgo
    const ticketsCreados = [];
    for (const hallazgo of hallazgos) {
      const prefijo = calcularPrefijo(hallazgo.area_registro || tipo_inspeccion);
      const id = generarId(db, prefijo);
      const numero_correlativo = parseInt(id.split('-')[1]);

      db.prepare(`
        INSERT INTO mantenimientos (
          id, prefijo, numero_correlativo, tipo_mantenimiento, area_registro,
          area_hallazgo, equipo_id, descripcion, fecha_evidencia, prioridad,
          user_id_registro, inspeccion_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, prefijo, numero_correlativo,
        hallazgo.tipo_mantenimiento || 'Correctivo',
        hallazgo.area_registro || tipo_inspeccion,
        hallazgo.area_hallazgo || null,
        hallazgo.equipo_id || null,
        hallazgo.descripcion,
        fecha_inspeccion,
        hallazgo.prioridad || 'Media',
        user.id,
        inspeccion_id
      );

      // Historial del ticket
      db.prepare(`
        INSERT INTO historial_mantenimientos (mantenimiento_id, user_id, accion, estado_nuevo, detalles_cambio)
        VALUES (?, ?, 'CREACION', 'Pendiente', ?)
      `).run(id, user.id, JSON.stringify({ origen: 'inspeccion', inspeccion_id }));

      // Vincular hallazgo a inspección
      db.prepare(`
        INSERT INTO inspecciones_hallazgos (inspeccion_id, mantenimiento_id, descripcion)
        VALUES (?, ?, ?)
      `).run(inspeccion_id, id, hallazgo.descripcion);

      ticketsCreados.push(id);
    }

    return NextResponse.json({
      inspeccion_id,
      tickets_creados: ticketsCreados,
      message: `Inspección registrada. Se generaron ${ticketsCreados.length} ticket(s): ${ticketsCreados.join(', ')}`
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/inspecciones error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const db = getDb();
    const inspecciones = db.prepare(`
      SELECT i.*, u.nombre as inspector_nombre,
        COUNT(ih.id) as total_hallazgos
      FROM inspecciones i
      LEFT JOIN users u ON i.user_id = u.id
      LEFT JOIN inspecciones_hallazgos ih ON ih.inspeccion_id = i.id
      GROUP BY i.id
      ORDER BY i.fecha_inspeccion DESC
    `).all();

    return NextResponse.json({ inspecciones });
  } catch (error) {
    console.error('GET /api/inspecciones error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
