import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');
    
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    
    const db = getDb();
    
    const users = db.prepare(`
      SELECT u.id, u.nombre, u.email, u.rol_id, u.ciudad_id, u.pdv_id, u.activo,
             r.nombre as rol_nombre, c.nombre as ciudad_nombre, p.nombre as pdv_nombre
      FROM users u
      LEFT JOIN roles r ON u.rol_id = r.id
      LEFT JOIN ciudades c ON u.ciudad_id = c.id
      LEFT JOIN pdv p ON u.pdv_id = p.id
      ORDER BY u.nombre
    `).all();

    const roles = db.prepare('SELECT * FROM roles WHERE activo = 1 ORDER BY nombre').all();
    const ciudades = db.prepare('SELECT * FROM ciudades WHERE activa = 1 ORDER BY nombre').all();
    
    return NextResponse.json({ users, roles, ciudades });
  } catch (error) {
    console.error('Users GET error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
