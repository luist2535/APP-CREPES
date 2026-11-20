import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest, hasActionPermission } from '@/lib/auth';

// Roles que pueden gestionar plantillas de checklist
const ROLES_JEFE = [1, 4, 9]; // Admin, Jefe Mantenimiento, Jefe Sistemas

export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const db = getDb();
    const { searchParams } = new URL(request.url);
    const area_registro = searchParams.get('area_registro');
    const tipo_mantenimiento = searchParams.get('tipo_mantenimiento');
    const equipo_id = searchParams.get('equipo_id');

    let query = `
      SELECT cp.*, u.nombre as creado_por_nombre
      FROM checklist_plantillas cp
      LEFT JOIN users u ON cp.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (area_registro) {
      query += ' AND cp.area_registro = ?';
      params.push(area_registro);
    }
    if (tipo_mantenimiento) {
      query += ' AND cp.tipo_mantenimiento = ?';
      params.push(tipo_mantenimiento);
    }
    if (equipo_id) {
      query += ' AND (cp.equipo_id = ? OR cp.equipo_id IS NULL)';
      params.push(equipo_id);
    }

    query += ' ORDER BY cp.created_at DESC';

    const plantillas = db.prepare(query).all(...params);

    // Parsear items JSON
    const plantillasParsed = plantillas.map(p => ({
      ...p,
      items: typeof p.items === 'string' ? JSON.parse(p.items) : p.items
    }));

    return NextResponse.json({ plantillas: plantillasParsed });
  } catch (error) {
    console.error('GET /api/mantenimientos/checklist-plantillas error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const db = getDb();
    const rolInt = parseInt(user.rol_id || 0);
    const esJefe = ROLES_JEFE.includes(rolInt) || hasActionPermission(user, 'mantenimiento', 'gestionar_tablero', db);

    if (!esJefe) {
      return NextResponse.json({ error: 'Solo jefes pueden crear plantillas de checklist' }, { status: 403 });
    }

    const body = await request.json();
    const { nombre, area_registro, tipo_mantenimiento, equipo_id, items } = body;

    if (!nombre || !area_registro || !tipo_mantenimiento || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Nombre, área de registro, tipo de mantenimiento e items (array) son obligatorios.' },
        { status: 400 }
      );
    }

    // Validar estructura de items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.texto || typeof item.texto !== 'string') {
        return NextResponse.json(
          { error: `Item ${i + 1}: 'texto' es obligatorio y debe ser string.` },
          { status: 400 }
        );
      }
      if (typeof item.obligatorio !== 'boolean') {
        return NextResponse.json(
          { error: `Item ${i + 1}: 'obligatorio' es obligatorio y debe ser boolean.` },
          { status: 400 }
        );
      }
      if (typeof item.orden !== 'number') {
        return NextResponse.json(
          { error: `Item ${i + 1}: 'orden' es obligatorio y debe ser número.` },
          { status: 400 }
        );
      }
    }

    const itemsJson = JSON.stringify(items);

    const result = db.prepare(`
      INSERT INTO checklist_plantillas (nombre, area_registro, tipo_mantenimiento, equipo_id, items, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(nombre, area_registro, tipo_mantenimiento, equipo_id || null, itemsJson, user.id);

    const nuevaPlantilla = db.prepare(`
      SELECT cp.*, u.nombre as creado_por_nombre
      FROM checklist_plantillas cp
      LEFT JOIN users u ON cp.created_by = u.id
      WHERE cp.id = ?
    `).get(result.lastInsertRowid);

    return NextResponse.json({
      plantilla: {
        ...nuevaPlantilla,
        items: typeof nuevaPlantilla.items === 'string' ? JSON.parse(nuevaPlantilla.items) : nuevaPlantilla.items
      },
      message: 'Plantilla de checklist creada exitosamente'
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/mantenimientos/checklist-plantillas error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const db = getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de plantilla requerido' }, { status: 400 });
    }

    const rolInt = parseInt(user.rol_id || 0);
    const esJefe = ROLES_JEFE.includes(rolInt) || hasActionPermission(user, 'mantenimiento', 'gestionar_tablero', db);

    if (!esJefe) {
      return NextResponse.json({ error: 'Solo jefes pueden actualizar plantillas de checklist' }, { status: 403 });
    }

    const plantilla = db.prepare('SELECT * FROM checklist_plantillas WHERE id = ?').get(id);
    if (!plantilla) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const { nombre, area_registro, tipo_mantenimiento, equipo_id, items } = body;

    if (!nombre || !area_registro || !tipo_mantenimiento || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Nombre, área de registro, tipo de mantenimiento e items (array) son obligatorios.' },
        { status: 400 }
      );
    }

    // Validar estructura de items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.texto || typeof item.texto !== 'string') {
        return NextResponse.json(
          { error: `Item ${i + 1}: 'texto' es obligatorio y debe ser string.` },
          { status: 400 }
        );
      }
      if (typeof item.obligatorio !== 'boolean') {
        return NextResponse.json(
          { error: `Item ${i + 1}: 'obligatorio' es obligatorio y debe ser boolean.` },
          { status: 400 }
        );
      }
      if (typeof item.orden !== 'number') {
        return NextResponse.json(
          { error: `Item ${i + 1}: 'orden' es obligatorio y debe ser número.` },
          { status: 400 }
        );
      }
    }

    const itemsJson = JSON.stringify(items);

    db.prepare(`
      UPDATE checklist_plantillas
      SET nombre = ?, area_registro = ?, tipo_mantenimiento = ?, equipo_id = ?, items = ?
      WHERE id = ?
    `).run(nombre, area_registro, tipo_mantenimiento, equipo_id || null, itemsJson, id);

    const plantillaActualizada = db.prepare(`
      SELECT cp.*, u.nombre as creado_por_nombre
      FROM checklist_plantillas cp
      LEFT JOIN users u ON cp.created_by = u.id
      WHERE cp.id = ?
    `).get(id);

    return NextResponse.json({
      plantilla: {
        ...plantillaActualizada,
        items: typeof plantillaActualizada.items === 'string' ? JSON.parse(plantillaActualizada.items) : plantillaActualizada.items
      },
      message: 'Plantilla de checklist actualizada exitosamente'
    });
  } catch (error) {
    console.error('PUT /api/mantenimientos/checklist-plantillas error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const db = getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de plantilla requerido' }, { status: 400 });
    }

    const rolInt = parseInt(user.rol_id || 0);
    const esJefe = ROLES_JEFE.includes(rolInt) || hasActionPermission(user, 'mantenimiento', 'gestionar_tablero', db);

    if (!esJefe) {
      return NextResponse.json({ error: 'Solo jefes pueden eliminar plantillas de checklist' }, { status: 403 });
    }

    const plantilla = db.prepare('SELECT * FROM checklist_plantillas WHERE id = ?').get(id);
    if (!plantilla) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });
    }

    db.prepare('DELETE FROM checklist_plantillas WHERE id = ?').run(id);

    return NextResponse.json({ message: 'Plantilla eliminada exitosamente' });
  } catch (error) {
    console.error('DELETE /api/mantenimientos/checklist-plantillas error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}