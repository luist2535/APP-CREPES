import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { decrypt } from '@/lib/security';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || parseInt(user.rol_id) !== 1) {
      return NextResponse.json({ error: 'No autorizado. Se requieren permisos de Administrador' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const targetEmail = body.email || user.email || 'luistapias432@gmail.com';

    const db = getDb();
    const configRows = db.prepare("SELECT * FROM configuraciones").all();

    let host = process.env.SMTP_HOST || 'smtp.gmail.com';
    let port = parseInt(process.env.SMTP_PORT || '587');
    let smtpUser = process.env.SMTP_USER || '';
    let smtpPass = process.env.SMTP_PASS || '';

    configRows.forEach((row) => {
      if (row.clave === 'smtp_host') host = row.valor;
      if (row.clave === 'smtp_port') port = parseInt(row.valor);
      if (row.clave === 'smtp_user') smtpUser = row.valor;
      if (row.clave === 'smtp_pass') smtpPass = decrypt(row.valor);
    });

    if (body.smtp_host) host = body.smtp_host;
    if (body.smtp_port) port = parseInt(body.smtp_port);
    if (body.smtp_user) smtpUser = body.smtp_user;
    if (body.smtp_pass) smtpPass = body.smtp_pass;

    if (!smtpUser || !smtpPass) {
      return NextResponse.json({
        error: 'Faltan credenciales SMTP. Por favor ingresa el correo remitente y la contraseña de aplicación.'
      }, { status: 400 });
    }

    // Probar conexión
    const isSecure = port === 465;
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000
    });

    const verifyResult = await new Promise((resolve) => {
      transporter.verify((error, success) => {
        if (error) {
          resolve({ ok: false, error: error.message });
        } else {
          resolve({ ok: true });
        }
      });
    });

    if (!verifyResult.ok) {
      return NextResponse.json({
        success: false,
        error: `Error de conexión SMTP con ${host}:${port}: ${verifyResult.error}. ` +
          `(Nota: Si estás en una red corporativa/Wi-Fi que bloquea puertos SMTP salientes como el 587/465, esta conexión solo funcionará desde el servidor de producción o una red con puertos abiertos).`,
        details: { host, port, user: smtpUser, target: targetEmail }
      }, { status: 502 });
    }

    // Enviar correo de prueba
    const info = await transporter.sendMail({
      from: `"Crepes en Punto" <${smtpUser}>`,
      to: targetEmail,
      subject: '🧪 Prueba de Notificación — Crepes en Punto',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; background: #FFFFFF;">
          <div style="background-color: #3D2314; padding: 22px; text-align: center; color: white;">
            <h2 style="margin: 0; color: #E8DDD4; font-size: 22px;">🥞 Crepes en Punto</h2>
            <p style="margin: 6px 0 0; font-size: 13px; color: #D1C7BD;">Sistema de Gestión Operativa y Control de Calidad</p>
          </div>
          <div style="padding: 26px; color: #2C1810; font-size: 14px; line-height: 1.6;">
            <h3 style="color: #166534; margin-top: 0; font-size: 18px;">✅ ¡Conexión de Correo Exitosa!</h3>
            <p>Hola <strong>${user.nombre || 'Administrador'}</strong>,</p>
            <p>Este es un correo de prueba enviado en tiempo real desde la plataforma <strong>Crepes en Punto</strong> para confirmar que la integración con el servidor de correo Gmail está funcionando a la perfección.</p>
            
            <div style="background: #F0FDF4; border-left: 4px solid #16A34A; padding: 14px 18px; margin: 20px 0; border-radius: 6px; font-size: 13px;">
              <strong style="color: #166534; display: block; margin-bottom: 6px;">📋 Parámetros de la prueba:</strong>
              • <strong>Servidor:</strong> ${host} (Puerto ${port})<br/>
              • <strong>Cuenta Emisora:</strong> ${smtpUser}<br/>
              • <strong>Destinatario:</strong> ${targetEmail}<br/>
              • <strong>Fecha y Hora:</strong> ${new Date().toLocaleString('es-CO')}
            </div>

            <p style="font-size: 13px; color: #475569;">A partir de este momento, todas las alertas de asignación de tickets de mantenimiento, solicitudes de soporte y eventos programados se entregarán a sus respectivos destinatarios.</p>
          </div>
          <div style="background: #F8FAFC; padding: 14px; text-align: center; font-size: 11.5px; color: #94A3B8; border-top: 1px solid #E2E8F0;">
            Crepes & Waffles · Crepes en Punto © 2026
          </div>
        </div>
      `
    });

    return NextResponse.json({
      success: true,
      message: `¡Correo de prueba enviado exitosamente a ${targetEmail}! Revisa tu bandeja de entrada o spam.`,
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Error enviando correo de prueba:', error);
    return NextResponse.json({
      success: false,
      error: `Error al enviar correo: ${error.message}`
    }, { status: 500 });
  }
}
