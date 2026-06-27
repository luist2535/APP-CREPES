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
    });

    const info = await transporter.sendMail({
      from: `"Crepes en Punto" <${user}>`,
      to,
      subject,
      html,
    });
    console.log(`✅ Correo enviado con éxito a ${to}. ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('❌ Error al enviar correo de notificación:', error);
    return false;
  }
}

module.exports = { sendNotificationEmail };
