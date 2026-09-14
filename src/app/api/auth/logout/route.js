import { NextResponse } from 'next/server';
const { logAudit } = require('@/lib/audit');
const { verifyToken, revokeToken } = require('@/lib/auth');

export async function POST(request) {
  try {
    // Intentar obtener datos del usuario desde el token antes de borrarlo
    const token = request.cookies.get('auth-token')?.value;
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        logAudit({
          usuario: decoded.nombre || decoded.email || 'Usuario',
          rol: decoded.rol_nombre || 'Sin Rol',
          accion: 'Logout',
          modulo: 'Autenticación',
          descripcion: 'Cerró sesión del sistema.',
          registro_afectado: 'USR-' + decoded.id,
          request
        });
      }
      // Revocar el token para que no pueda reutilizarse
      revokeToken(token);
    }
  } catch (e) { /* Silent - no interrumpir el logout */ }

  const isSecure = request.url.startsWith('https://') || request.headers.get('x-forwarded-proto') === 'https';
  const response = NextResponse.json({ message: 'Sesión cerrada' });
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}

