import { NextResponse } from 'next/server';
import { ConfidentialClientApplication } from '@azure/msal-node';
const { getDb } = require('@/lib/db');
const { generateToken, getUserCustomPermissions } = require('@/lib/auth');
const { logAudit } = require('@/lib/audit');

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    if (error) {
      console.error(`Error from Microsoft: ${error} - ${errorDescription}`);
      return NextResponse.redirect(new URL('/?error=Acceso denegado por Microsoft', request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/?error=Código de autorización no encontrado', request.url));
    }

    const msalConfig = {
      auth: {
        clientId: process.env.MICROSOFT_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}`,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      }
    };

    const pca = new ConfidentialClientApplication(msalConfig);

    const baseUrl = `${url.protocol}//${url.host}`;
    const redirectUri = `${baseUrl}/api/auth/microsoft/callback`;

    const tokenRequest = {
      code: code,
      scopes: ["user.read", "profile", "email", "openid"],
      redirectUri: redirectUri,
    };

    // Intercambiar código por token
    const response = await pca.acquireTokenByCode(tokenRequest);
    
    // Obtener la información del usuario del token
    const account = response.account;
    
    // Microsoft Entra suele retornar el email en account.username o en idTokenClaims.email / idTokenClaims.preferred_username
    let userEmail = account?.username;
    
    if (!userEmail && account?.idTokenClaims?.email) {
        userEmail = account.idTokenClaims.email;
    }
    
    if (!userEmail && account?.idTokenClaims?.preferred_username) {
        userEmail = account.idTokenClaims.preferred_username;
    }

    if (!userEmail) {
      return NextResponse.redirect(new URL('/?error=No se pudo obtener el correo desde Microsoft', request.url));
    }

    const db = getDb();
    
    // Buscar el usuario por su correo
    const user = db.prepare(`
      SELECT u.*, r.nombre as rol_nombre, c.nombre as ciudad_nombre
      FROM users u
      LEFT JOIN roles r ON u.rol_id = r.id
      LEFT JOIN ciudades c ON u.ciudad_id = c.id
      WHERE LOWER(u.email) = LOWER(?) AND u.activo = 1
    `).get(userEmail);

    if (!user) {
      // Registrar en auditoría el intento fallido por correo no registrado
      logAudit({
        usuario: userEmail,
        rol: 'Desconocido',
        accion: 'Login SSO Fallido',
        modulo: 'Autenticación',
        descripcion: `Intento de inicio de sesión con Microsoft fallido. El correo ${userEmail} no está registrado en el sistema o está inactivo.`,
        registro_afectado: null,
        request
      });
      
      // Si el correo no existe en la base de datos de Crepes en Punto
      return NextResponse.redirect(new URL('/?error=Su cuenta de Microsoft no está registrada en el sistema. Contacte al administrador.', request.url));
    }

    // El usuario existe, procedemos a iniciar sesión
    const token = generateToken(user);
    const customPerms = getUserCustomPermissions(user.rol_id, db);
    
    // Actualizar último login
    db.prepare("UPDATE users SET ultimo_login = datetime('now', 'localtime') WHERE id = ?").run(user.id);

    // Registrar inicio de sesión exitoso en audit
    logAudit({
      usuario: user.nombre,
      rol: user.rol_nombre || 'Sin Rol',
      accion: 'Login SSO Microsoft',
      modulo: 'Autenticación',
      descripcion: 'Inició sesión exitosamente usando Microsoft.',
      registro_afectado: 'USR-' + user.id,
      request
    });

    // Como es un redirect y no podemos devolver un JSON con la respuesta (para guardarlo en localStorage de una),
    // guardaremos la info del usuario en una cookie temporal o pasaremos un flag para que el cliente cargue la info
    // Una forma robusta es generar el token auth-token, y redireccionar al frontend. El frontend verificará `/api/auth/me` automáticamente.
    
    const nextResponse = NextResponse.redirect(new URL('/dashboard', request.url));
    
    nextResponse.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: false, // Permitir conexiones locales HTTP en red local
      sameSite: 'lax',
      maxAge: 28800, // 8 hours
      path: '/',
    });
    
    return nextResponse;

  } catch (error) {
    console.error("Error in Microsoft callback:", error);
    return NextResponse.redirect(new URL('/?error=Ocurrió un error inesperado al procesar el login de Microsoft', request.url));
  }
}
