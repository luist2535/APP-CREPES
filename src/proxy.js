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
  '/',
  '/login',
  '/_next',
  '/favicon.ico',
];

export function proxy(request) {
  const { pathname } = request.nextUrl;

  // No interceptar archivos estáticos de Next.js o recursos públicos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/archivos/') || // archivos públicos existentes (compatibilidad)
    pathname.startsWith('/images/') || // carpeta de imágenes públicas
    pathname.startsWith('/templates/') || // plantillas estáticas Excel/PDF
    pathname.startsWith('/uploads/') || // archivos subidos localmente
    pathname.startsWith('/fonts/') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.pdf') ||
    pathname.endsWith('.xlsx') ||
    pathname.endsWith('.csv') ||
    pathname.endsWith('.doc') ||
    pathname.endsWith('.docx') ||
    pathname.endsWith('.mp4') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.woff2')
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
  // Redirigir explícitamente /login a / ya que la página de login está en la raíz
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Nota: PUBLIC_PAGE_ROUTES.some() con '/' coincidiría con todo si no tenemos cuidado,
  // por lo que mejor comprobamos si pathname es exactamente '/' o si empieza con el resto.
  if (pathname === '/' || PUBLIC_PAGE_ROUTES.some(route => route !== '/' && route !== '/login' && pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Para páginas del dashboard, verificar que tenga cookie de sesión
  const token = request.cookies.get('auth-token')?.value;
  if (!token && pathname !== '/' && pathname !== '/login' && !pathname.startsWith('/_next')) {
    const loginUrl = new URL('/', request.url);
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
