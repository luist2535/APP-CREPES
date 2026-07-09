import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { getUserFromRequest, hasPermission, DEFAULT_ROLE_PERMISSIONS, MODULE_DEFINITIONS } = require('@/lib/auth');

export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = getDb();
    const cargosRows = db.prepare(`
      SELECT r.id, r.nombre, r.descripcion, r.activo, r.permisos,
             COUNT(u.id) as total_usuarios
      FROM roles r
      LEFT JOIN users u ON u.rol_id = r.id AND u.activo = 1
      GROUP BY r.id
      ORDER BY r.id ASC
    `).all();

    const customPermissionsRows = db.prepare(`
      SELECT id, rol_id, modulo, permitido, otorgado_por, updated_at 
      FROM roles_permisos_adicionales
    `).all();

    return NextResponse.json({
      cargos: cargosRows,
      customPermissions: customPermissionsRows,
      defaultPermissions: DEFAULT_ROLE_PERMISSIONS,
      modules: MODULE_DEFINITIONS
    });
  } catch (error) {
    console.error('Error in GET /api/cargos:', error);
    return NextResponse.json({ error: 'Error obteniendo la lista de cargos' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(user, 'admin', db)) {
      return NextResponse.json({ error: 'No tienes permisos de administrador para gestionar cargos' }, { status: 403 });
    }

    const body = await request.json();
    const { action, nombre, descripcion, sourceRolId } = body;

    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre del cargo es obligatorio' }, { status: 400 });
    }

    // Verificar nombre duplicado
    const existing = db.prepare('SELECT id FROM roles WHERE LOWER(nombre) = LOWER(?)').get(nombre.trim());
    if (existing) {
      return NextResponse.json({ error: 'Ya existe un cargo con ese nombre' }, { status: 400 });
    }

    if (action === 'duplicate' && sourceRolId) {
      const sourceRol = db.prepare('SELECT permisos FROM roles WHERE id = ?').get(parseInt(sourceRolId));
      if (!sourceRol) {
        return NextResponse.json({ error: 'El cargo original a duplicar no existe' }, { status: 404 });
      }

      const insertResult = db.prepare(`
        INSERT INTO roles (nombre, descripcion, permisos, activo)
        VALUES (?, ?, ?, 1)
      `).run(nombre.trim(), descripcion || `Copia de Cargo #${sourceRolId}`, sourceRol.permisos || '{}');

      const newRolId = insertResult.lastInsertRowid;

      // Copiar permisos personalizados de roles_permisos_adicionales
      const sourcePermisos = db.prepare('SELECT modulo, permitido, otorgado_por FROM roles_permisos_adicionales WHERE rol_id = ?').all(parseInt(sourceRolId));
      const insertPermiso = db.prepare(`
        INSERT INTO roles_permisos_adicionales (rol_id, modulo, permitido, otorgado_por, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      for (const p of sourcePermisos) {
        insertPermiso.run(newRolId, p.modulo, p.permitido, `${user.nombre} (Duplicado)`);
      }

      return NextResponse.json({
        success: true,
        message: `Cargo duplicado exitosamente con ID #${newRolId}`,
        cargoId: newRolId
      });
    } else {
      // Crear nuevo cargo en blanco o con permisos por defecto en JSON
      const insertResult = db.prepare(`
        INSERT INTO roles (nombre, descripcion, permisos, activo)
        VALUES (?, ?, '{}', 1)
      `).run(nombre.trim(), descripcion || '');

      return NextResponse.json({
        success: true,
        message: 'Nuevo cargo creado exitosamente',
        cargoId: insertResult.lastInsertRowid
      });
    }
  } catch (error) {
    console.error('Error in POST /api/cargos:', error);
    return NextResponse.json({ error: error.message || 'Error al crear o duplicar el cargo' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(user, 'admin', db)) {
      return NextResponse.json({ error: 'No tienes permisos de administrador para editar cargos' }, { status: 403 });
    }

    const body = await request.json();
    const { id, nombre, descripcion, activo } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de cargo requerido' }, { status: 400 });
    }

    if (parseInt(id) === 1 && activo !== undefined && Number(activo) === 0) {
      return NextResponse.json({ error: 'El cargo de Administrador maestro no se puede deshabilitar' }, { status: 400 });
    }

    const currentRol = db.prepare('SELECT * FROM roles WHERE id = ?').get(parseInt(id));
    if (!currentRol) {
      return NextResponse.json({ error: 'El cargo no existe' }, { status: 404 });
    }

    const newNombre = nombre !== undefined ? nombre.trim() : currentRol.nombre;
    const newDesc = descripcion !== undefined ? descripcion.trim() : currentRol.descripcion;
    const newActivo = activo !== undefined ? Number(activo) : currentRol.activo;

    db.prepare(`
      UPDATE roles
      SET nombre = ?, descripcion = ?, activo = ?
      WHERE id = ?
    `).run(newNombre, newDesc, newActivo, parseInt(id));

    return NextResponse.json({ success: true, message: 'Cargo modificado exitosamente' });
  } catch (error) {
    console.error('Error in PUT /api/cargos:', error);
    return NextResponse.json({ error: 'Error al actualizar el cargo' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const db = getDb();
    if (!hasPermission(user, 'admin', db)) {
      return NextResponse.json({ error: 'No tienes permisos de administrador' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || parseInt(id) === 1) {
      return NextResponse.json({ error: 'No se puede eliminar el cargo de Administrador maestro' }, { status: 400 });
    }

    const usersCount = db.prepare('SELECT COUNT(*) as total FROM users WHERE rol_id = ? AND activo = 1').get(parseInt(id));
    if (usersCount && usersCount.total > 0) {
      return NextResponse.json({ error: `No se puede eliminar este cargo porque tiene ${usersCount.total} usuarios asignados. Puedes deshabilitarlo o reasignar los usuarios primero.` }, { status: 400 });
    }

    db.prepare('DELETE FROM roles_permisos_adicionales WHERE rol_id = ?').run(parseInt(id));
    db.prepare('DELETE FROM roles WHERE id = ?').run(parseInt(id));

    return NextResponse.json({ success: true, message: 'Cargo eliminado definitivamente del sistema' });
  } catch (error) {
    console.error('Error in DELETE /api/cargos:', error);
    return NextResponse.json({ error: 'Error al eliminar el cargo' }, { status: 500 });
  }
}
