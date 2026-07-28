import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { generateToken, comparePassword, getUserCustomPermissions } = require('@/lib/auth');
const bcrypt = require('bcryptjs');
const { logAudit } = require('@/lib/audit');
const { validatePassword } = require('@/lib/security');

export async function POST(request) {
  try {
    const { email, oldPassword, newPassword } = await request.json();
    
    if (!email || !oldPassword || !newPassword) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }
    
    const db = getDb();
    const user = db.prepare(`
      SELECT u.*, r.nombre as rol_nombre, c.nombre as ciudad_nombre
      FROM users u
      LEFT JOIN roles r ON u.rol_id = r.id
      LEFT JOIN ciudades c ON u.ciudad_id = c.id
      WHERE u.email = ? AND u.activo = 1
    `).get(email);
    
    if (!user || !comparePassword(oldPassword, user.password_hash)) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
    }
    
    if (user.debe_cambiar_password !== 1) {
      return NextResponse.json({ error: 'Este usuario no requiere cambio de contraseña' }, { status: 400 });
    }

    const pwValidation = validatePassword(newPassword);
    if (!pwValidation.valid) {
      return NextResponse.json({ error: pwValidation.message }, { status: 400 });
    }


    // Hash the new password
    const newHash = bcrypt.hashSync(newPassword, 10);
    
    // Update the database
    db.prepare('UPDATE users SET password_hash = ?, debe_cambiar_password = 0, ultimo_login = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newHash, user.id);

    // Audit log
    logAudit({
      usuario: user.nombre,
      rol: user.rol_nombre || 'Sin Rol',
      accion: 'Cambio de Contraseña Obligatorio',
      modulo: 'Autenticación',
      descripcion: 'El usuario estableció su propia contraseña tras usar la genérica.',
      registro_afectado: 'USR-' + user.id,
      request
    });

    logAudit({
      usuario: user.nombre,
      rol: user.rol_nombre || 'Sin Rol',
      accion: 'Login',
      modulo: 'Autenticación',
      descripcion: 'Inició sesión exitosamente tras cambiar contraseña.',
      registro_afectado: 'USR-' + user.id,
      request
    });

    const token = generateToken(user);
    const customPerms = getUserCustomPermissions(user.rol_id, db);
    
    const response = NextResponse.json({
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol_id: user.rol_id,
        rol_nombre: user.rol_nombre,
        ciudad_id: user.ciudad_id,
        ciudad_nombre: user.ciudad_nombre,
        permisos_adicionales: customPerms
      },
      message: 'Contraseña actualizada y sesión iniciada exitosamente'
    });
    
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: false, 
      sameSite: 'lax',
      maxAge: 28800, // 8 hours 
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Force change password error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
