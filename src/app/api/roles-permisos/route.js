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
    const roles = db.prepare('SELECT id, nombre, descripcion, activo FROM roles WHERE activo = 1 ORDER BY id').all();
    const customPermissionsRows = db.prepare(`
      SELECT id, rol_id, modulo, permitido, otorgado_por, updated_at 
      FROM roles_permisos_adicionales
    `).all();

    return NextResponse.json({
      roles,
      customPermissions: customPermissionsRows,
      defaultPermissions: DEFAULT_ROLE_PERMISSIONS,
      modules: MODULE_DEFINITIONS
    });
  } catch (error) {
    console.error('Error in GET /api/roles-permisos:', error);
    return NextResponse.json({ error: 'Error obteniendo roles y permisos' }, { status: 500 });
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
      return NextResponse.json({ error: 'No tienes permisos de administrador para modificar permisos' }, { status: 403 });
    }

    const body = await request.json();
    const { rol_id, modulo, permitido } = body;

    if (!rol_id || !modulo) {
      return NextResponse.json({ error: 'El rol_id y el módulo son obligatorios' }, { status: 400 });
    }

    const valPermitido = permitido ? 1 : 0;
    const otorgadoPor = `${user.nombre || 'Administrador'} (ID: ${user.id})`;

    db.prepare(`
      INSERT INTO roles_permisos_adicionales (rol_id, modulo, permitido, otorgado_por, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(rol_id, modulo) DO UPDATE SET
        permitido = excluded.permitido,
        otorgado_por = excluded.otorgado_por,
        updated_at = CURRENT_TIMESTAMP
    `).run(parseInt(rol_id), modulo, valPermitido, otorgadoPor);

    return NextResponse.json({ success: true, message: 'Permiso modificado exitosamente' });
  } catch (error) {
    console.error('Error in POST /api/roles-permisos:', error);
    return NextResponse.json({ error: 'Error al actualizar permiso personalizado' }, { status: 500 });
  }
}
