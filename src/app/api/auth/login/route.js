import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { getDb } = require('@/lib/db');
    const { comparePassword, generateToken } = require('@/lib/auth');
    
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }
    
    const db = getDb();
    const user = db.prepare(`
      SELECT u.*, r.nombre as rol_nombre, c.nombre as ciudad_nombre
      FROM users u
      LEFT JOIN roles r ON u.rol_id = r.id
      LEFT JOIN ciudades c ON u.ciudad_id = c.id
      WHERE u.email = ? AND u.activo = 1
    `).get(email);
    
    if (!user || !comparePassword(password, user.password_hash)) {
      return NextResponse.json(
        { error: 'Credenciales incorrectas' },
        { status: 401 }
      );
    }
    
    const token = generateToken(user);
    
    // Actualizar último login
    db.prepare('UPDATE users SET ultimo_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
    
    const response = NextResponse.json({
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol_id: user.rol_id,
        rol_nombre: user.rol_nombre,
        ciudad_id: user.ciudad_id,
        ciudad_nombre: user.ciudad_nombre,
      }
    });
    
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: false, // Permitir conexiones locales HTTP en red local
      sameSite: 'lax',
      maxAge: 86400, // 24 hours
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
