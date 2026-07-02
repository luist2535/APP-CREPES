import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');
    
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id'); // e.g. 'EQ-1001'
    const pdvId = searchParams.get('pdv_id');

    // Case 1: Fetch list of equipment for a PDV
    if (pdvId) {
      const list = db.prepare(`
        SELECT e.*, p.nombre as pdv_nombre, c.nombre as ciudad_nombre
        FROM equipos e
        JOIN pdv p ON e.pdv_id = p.id
        JOIN ciudades c ON p.ciudad_id = c.id
        WHERE e.pdv_id = ? AND e.activo = 1
        ORDER BY e.nombre
      `).all(parseInt(pdvId));
      return NextResponse.json({ equipos: list });
    }

    // Case 2: Fetch detailed info of a scanned QR
    if (!id) {
      return NextResponse.json({ error: 'ID de equipo, Sticker o QR requerido' }, { status: 400 });
    }

    const cleanedId = id.trim();

    const equipo = db.prepare(`
      SELECT e.*, p.nombre as pdv_nombre, c.nombre as ciudad_nombre
      FROM equipos e
      JOIN pdv p ON e.pdv_id = p.id
      JOIN ciudades c ON p.ciudad_id = c.id
      WHERE (
        LOWER(e.id) = LOWER(?)
        OR LOWER(json_extract(e.datos_tecnicos, '$.sticker')) = LOWER(?)
        OR LOWER(e.serie) = LOWER(?)
      ) AND e.activo = 1
    `).get(cleanedId, cleanedId, cleanedId);

    if (!equipo) {
      return NextResponse.json({ error: 'Equipo no registrado o inactivo en el sistema' }, { status: 404 });
    }

    // Load recent maintenance visits for this specific PDV (since visits are logged per PDV, we can list them)
    // We filter by area_id = 3 (Mantenimiento)
    const mantenimientos = db.prepare(`
      SELECT v.id, v.fecha, v.hora_inicio, v.observaciones, u.nombre as auditor_nombre,
             v.datos_formulario
      FROM visitas v
      JOIN users u ON v.user_id = u.id
      WHERE v.pdv_id = ? AND v.area_id = 3
      ORDER BY v.fecha DESC LIMIT 5
    `).all(equipo.pdv_id);

    return NextResponse.json({ equipo, mantenimientos });
  } catch (error) {
    console.error('Equipos GET error:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}
