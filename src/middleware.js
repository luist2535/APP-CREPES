import { NextResponse } from 'next/server';

/**
 * Middleware centralizado de seguridad para Crepes App
 * 
 * Protege automáticamente TODAS las rutas /api/ excepto las públicas.
 * Esto evita que una nueva ruta API quede expuesta por olvidar la verificación manual.
 * 
 * La verificación completa del JWT sigue ocurriendo en cada route handler,
 * pero este middleware actúa como primera barrera de defensa.
 */

// Rutas que NO requieren autenticación
const PUBLIC_API_ROUTES = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/microsoft',
  '/api/auth/force-change-password',
];

// Rutas de página que NO requieren autenticación
const PUBLIC_PAGE_ROUTES = [
  '/login',
  '/_next',
  '/favicon.ico',
];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // No interceptar archivos estáticos de Next.js o recursos públicos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/archivos/') || // archivos públicos existentes (compatibilidad)
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js')
  ) {
    return NextResponse.next();
  }

  // Verificar rutas API
  if (pathname.startsWith('/api/')) {
    // Permitir rutas públicas de autenticación
    if (PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
      return NextResponse.next();
    }

    // Verificar que exista la cookie auth-token
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado. Sesión no válida o expirada.' },
        { status: 401 }
      );
    }

    // El token existe — la verificación completa del JWT se hace en cada route handler
    // Este middleware es la primera línea de defensa
    return NextResponse.next();
  }

  // Verificar rutas de páginas (redirigir a login si no autenticado)
  if (PUBLIC_PAGE_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Para páginas del dashboard, verificar que tenga cookie de sesión
  const token = request.cookies.get('auth-token')?.value;
  if (!token && pathname !== '/login' && !pathname.startsWith('/_next')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Proteger todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
