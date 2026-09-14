import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { generateToken, comparePassword, getUserCustomPermissions, checkRateLimit, recordLoginAttempt } = require('@/lib/auth');
const { logAudit } = require('@/lib/audit');

export async function POST(request) {
  try {
    // --- Rate Limiting Persistente (SQLite) ---
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || request.headers.get('x-real-ip') 
      || 'unknown';
    
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Demasiados intentos fallidos. Intente de nuevo en ${rateCheck.retryAfter} minutos.` },
        { status: 429 }
      );
    }
    // -------------------------------------
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
      // Registrar intento de login fallido
      logAudit({
        usuario: email,
        rol: 'Desconocido',
        accion: 'Login Fallido',
        modulo: 'Autenticación',
        descripcion: 'Intento de inicio de sesión fallido. Credenciales incorrectas.',
        registro_afectado: null,
        request
      });
      // Registrar intento fallido en rate limiter persistente
      recordLoginAttempt(ip, email, false);
      
      return NextResponse.json(
        { error: 'Credenciales incorrectas' },
        { status: 401 }
      );
    }
    
    // Login exitoso — registrar y limpiar rate limit
    recordLoginAttempt(ip, email, true);
    
    if (user.debe_cambiar_password === 1) {
      return NextResponse.json({
        requirePasswordChange: true,
        message: 'Debe cambiar su contraseña por defecto'
      });
    }

    const token = generateToken(user);
    const customPerms = getUserCustomPermissions(user.rol_id, db);
    
    // Actualizar último login
    db.prepare("UPDATE users SET ultimo_login = datetime('now', 'localtime') WHERE id = ?").run(user.id);

    // Registrar inicio de sesión exitoso en audit
    logAudit({
      usuario: user.nombre,
      rol: user.rol_nombre || 'Sin Rol',
      accion: 'Login',
      modulo: 'Autenticación',
      descripcion: 'Inició sesión exitosamente en el sistema.',
      registro_afectado: 'USR-' + user.id,
      request
    });
    
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
      }
    });
    
    // Cookie segura: secure=true cuando se sirve sobre HTTPS (Cloudflare tunnel)
    const isSecure = request.url.startsWith('https://') || request.headers.get('x-forwarded-proto') === 'https';
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 28800, // 8 hours
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

