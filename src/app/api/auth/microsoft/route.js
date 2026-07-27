import { NextResponse } from 'next/server';
import { ConfidentialClientApplication } from '@azure/msal-node';

export async function GET(request) {
  try {
    const msalConfig = {
      auth: {
        clientId: process.env.MICROSOFT_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}`,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      }
    };

    const pca = new ConfidentialClientApplication(msalConfig);

    // Protocol (http/https) and host from request URL to build dynamic redirect URI
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const redirectUri = `${baseUrl}/api/auth/microsoft/callback`;

    const authCodeUrlParameters = {
      scopes: ["user.read", "profile", "email", "openid"],
      redirectUri: redirectUri,
    };

    // Obtenemos la URL de autorización
    const authUrl = await pca.getAuthCodeUrl(authCodeUrlParameters);

    // Redirigir al usuario al login de Microsoft
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error generating Microsoft auth URL:", error);
    return NextResponse.json({ error: 'Error al inicializar login con Microsoft' }, { status: 500 });
  }
}
