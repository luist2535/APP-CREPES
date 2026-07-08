const nodemailer = require('nodemailer');
const { getDb } = require('./db.js');

/**
 * Sends a notification email asynchronously
 */
async function sendNotificationEmail({ to, subject, html }) {
  console.log(`📨 [Notificación Correo] Intentando enviar a: ${to} | Asunto: ${subject}`);
  
  let host = process.env.SMTP_HOST || 'smtp.gmail.com';
  let port = parseInt(process.env.SMTP_PORT || '587');
  let user = process.env.SMTP_USER || '';
  let pass = process.env.SMTP_PASS || '';

  try {
    const db = getDb();
    const configRows = db.prepare("SELECT * FROM configuraciones").all();
    configRows.forEach((row) => {
      if (row.clave === 'smtp_host') host = row.valor;
      if (row.clave === 'smtp_port') port = parseInt(row.valor);
      if (row.clave === 'smtp_user') user = row.valor;
      if (row.clave === 'smtp_pass') pass = row.valor;
    });
  } catch (e) {
    console.log("ℹ️ Tabla configuraciones no encontrada o vacía, usando env fallback.");
  }

  if (!user || !pass) {
    console.log(`⚠️ SMTP no configurado (falta smtp_user y/o smtp_pass en DB/env). Simulación de envío exitosa.`);
    return true;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 4000, // 4 segundos máximo para conectar
      greetingTimeout: 4000,
      socketTimeout: 4500,
    });

    // Envolver sendMail en Promise.race para garantizar que nunca exceda los 4.5s si el firewall bloquea el puerto
    const info = await Promise.race([
      transporter.sendMail({
        from: `"Crepes en Punto" <${user}>`,
        to,
        subject,
        html,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout de conexión SMTP (4.5s limit): El puerto de correos está bloqueado o el servidor SMTP no responde.')), 4500)
      )
    ]);

    console.log(`✅ Correo enviado con éxito a ${to}. ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.warn(`⚠️ Aviso de Correo no enviado a ${to}: ${error.message}. (La operación principal continúa normalmente sin bloquearse)`);
    return false;
  }
}

module.exports = { sendNotificationEmail };
