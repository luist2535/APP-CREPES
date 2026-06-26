import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');
    
    const userData = getUserFromRequest(request);
    if (!userData) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    
    const db = getDb();
    const user = db.prepare(`
      SELECT u.id, u.nombre, u.email, u.rol_id, u.ciudad_id, 
             r.nombre as rol_nombre, c.nombre as ciudad_nombre
      FROM users u
      LEFT JOIN roles r ON u.rol_id = r.id
      LEFT JOIN ciudades c ON u.ciudad_id = c.id
      WHERE u.id = ? AND u.activo = 1
    `).get(userData.id);
    
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
