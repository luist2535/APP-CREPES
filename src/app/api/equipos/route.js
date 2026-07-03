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

    // Load recent maintenance visits for this specific equipment (using equipo_id)
    const mantenimientos = db.prepare(`
      SELECT v.id, v.fecha, v.hora_inicio, v.observaciones, u.nombre as auditor_nombre
      FROM visitas v
      JOIN users u ON v.user_id = u.id
      WHERE v.equipo_id = ? AND v.area_id = 3
      ORDER BY v.fecha DESC LIMIT 5
    `).all(equipo.id);

    // Fetch attached files (evidencias) for each maintenance service
    for (const m of mantenimientos) {
      m.evidencias = db.prepare('SELECT * FROM evidencias WHERE visita_id = ?').all(m.id);
    }

    return NextResponse.json({ equipo, mantenimientos });
  } catch (error) {
    console.error('Equipos GET error:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
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
    
    // Case 1: Register/Create new equipment
    if (body.is_creation) {
      const allowedRoles = [1, 4, 9, 12, 16];
      if (!allowedRoles.includes(parseInt(user.rol_id))) {
        return NextResponse.json({ error: 'No tienes permisos para registrar equipos' }, { status: 403 });
      }
      
      const { id, nombre, pdv_id, marca, modelo, serie, datos_tecnicos, proximo_mantenimiento } = body;
      
      if (!id || !nombre || !pdv_id) {
        return NextResponse.json({ error: 'Faltan datos obligatorios (Código/Sticker, Nombre, Punto de Venta)' }, { status: 400 });
      }
      
      const cleanedId = id.trim();
      
      // Check duplicate primary key
      const duplicate = db.prepare('SELECT id FROM equipos WHERE LOWER(id) = LOWER(?)').get(cleanedId);
      if (duplicate) {
        return NextResponse.json({ error: 'El código/Sticker ya está registrado para otro equipo.' }, { status: 400 });
      }
      
      db.prepare(`
        INSERT INTO equipos (id, nombre, pdv_id, marca, modelo, serie, datos_tecnicos, ultimo_mantenimiento, proximo_mantenimiento, activo)
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, 1)
      `).run(
        cleanedId,
        nombre,
        parseInt(pdv_id),
        marca || null,
        modelo || null,
        serie || null,
        datos_tecnicos || '{}',
        proximo_mantenimiento || null
      );
      
      return NextResponse.json({ message: 'Equipo registrado exitosamente' });
    }
    
    // Case 2: Existing Maintenance log flow
    const { equipo_id, observaciones, proximo_mantenimiento, soportes } = body;
    
    if (!equipo_id || !observaciones || !proximo_mantenimiento) {
      return NextResponse.json({ error: 'Faltan datos obligatorios (Equipo, Observaciones, Próximo Mantenimiento)' }, { status: 400 });
    }
    
    // Check if equipment exists
    const equipo = db.prepare('SELECT id, pdv_id FROM equipos WHERE id = ?').get(equipo_id);
    if (!equipo) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
    }
    
    const hoy = new Date().toISOString().split('T')[0];
    
    // Update equipment dates
    db.prepare('UPDATE equipos SET ultimo_mantenimiento = ?, proximo_mantenimiento = ? WHERE id = ?')
      .run(hoy, proximo_mantenimiento, equipo_id);
      
    // Log a closed visit for this maintenance (area_id = 3, tipo_visita_id = 3)
    const result = db.prepare(`
      INSERT INTO visitas (
        pdv_id, user_id, area_id, tipo_visita_id, plantilla_id, 
        fecha, hora_inicio, hora_fin, responsable_id, estado, 
        observaciones, equipo_id
      ) VALUES (?, ?, 3, 3, NULL, ?, '08:00', '09:00', ?, 'cerrada', ?, ?)
    `).run(
      equipo.pdv_id,
      user.id,
      hoy,
      user.id,
      observaciones,
      equipo_id
    );
    
    const visitId = result.lastInsertRowid;
    
    // Log historical action
    db.prepare(`
      INSERT INTO historial_visitas (visita_id, accion, user_id, detalle)
      VALUES (?, 'finalizar', ?, ?)
    `).run(visitId, user.id, 'Mantenimiento reportado y cerrado desde Inventario/Ficha Técnica');
    
    // Insert uploaded documents/invoices
    if (soportes && Array.isArray(soportes)) {
      const insertStmt = db.prepare(`
        INSERT INTO evidencias (visita_id, tipo, ruta_archivo, nombre_archivo, etiqueta)
        VALUES (?, 'documento', ?, ?, 'soporte')
      `);
      for (const s of soportes) {
        if (s.url) {
          insertStmt.run(visitId, s.url, s.nombre || 'Soporte');
        }
      }
    }
    
    return NextResponse.json({ 
      message: 'Mantenimiento registrado exitosamente', 
      ultimo_mantenimiento: hoy,
      proximo_mantenimiento: proximo_mantenimiento
    });
  } catch (error) {
    console.error('Equipos POST error:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');
    
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    
    // Auth check
    const allowedRoles = [1, 4, 9, 12, 16];
    if (!allowedRoles.includes(parseInt(user.rol_id))) {
      return NextResponse.json({ error: 'No tienes permisos para modificar equipos' }, { status: 403 });
    }
    
    const db = getDb();
    const { id, nombre, pdv_id, marca, modelo, serie, datos_tecnicos, activo } = await request.json();
    
    if (!id || !nombre || !pdv_id) {
      return NextResponse.json({ error: 'Faltan datos obligatorios (Código, Nombre, Punto de Venta)' }, { status: 400 });
    }
    
    // Verify if it exists
    const existing = db.prepare('SELECT id FROM equipos WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'El equipo no existe' }, { status: 404 });
    }
    
    db.prepare(`
      UPDATE equipos 
      SET nombre = ?, pdv_id = ?, marca = ?, modelo = ?, serie = ?, datos_tecnicos = ?, activo = ?
      WHERE id = ?
    `).run(
      nombre,
      parseInt(pdv_id),
      marca || null,
      modelo || null,
      serie || null,
      datos_tecnicos || '{}',
      activo !== undefined ? parseInt(activo) : 1,
      id
    );
    
    return NextResponse.json({ message: 'Equipo actualizado exitosamente' });
  } catch (error) {
    console.error('Equipos PUT error:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}
