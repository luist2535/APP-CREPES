/**
 * Plantillas de correo para notificaciones de mantenimiento.
 * Cada función retorna HTML listo para enviar.
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function ticketLink(ticketId) {
  return `${BASE_URL}/mantenimiento?tab=ejecucion&openTicket=${encodeURIComponent(ticketId)}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function priorityColor(prioridad) {
  switch (prioridad) {
    case 'Crítica': return '#DC2626';
    case 'Alta': return '#EA580C';
    case 'Media': return '#D97706';
    case 'Baja': return '#2563EB';
    default: return '#6B7280';
  }
}

function estadoColor(estado) {
  switch (estado) {
    case 'Finalizado': return '#059669';
    case 'En proceso': return '#D97706';
    case 'Por Aprobar': return '#2563EB';
    case 'Asignado': return '#7C3AED';
    case 'Cancelado': return '#DC2626';
    default: return '#92400E';
  }
}

function ticketRow(label, value) {
  return `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #E5D8CC; font-weight: 600; color: #4A2C20; width: 180px;">${label}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #E5D8CC; color: #2C1810;">${value}</td>
    </tr>
  `;
}

function wrapper(html) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin: 0; padding: 0; font-family: 'Outfit', 'Inter', system-ui, sans-serif; background: #F8F5F0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 24px;">
      <tr>
        <td style="background: #fff; border-radius: 16px; border: 1px solid #E5D8CC; overflow: hidden; box-shadow: 0 4px 16px rgba(61,35,20,0.08);">
          <!-- Header -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background: linear-gradient(135deg, #3D2314 0%, #4A2C20 100%); padding: 24px; text-align: center;">
                <div style="font-size: 2rem; line-height: 1;">☕</div>
                <h1 style="margin: 12px 0 4px; color: #fff; font-size: 1.5rem; font-weight: 800;">Crepes & Waffles®</h1>
                <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 0.9rem;">Sistema de Gestión Operativa</p>
              </td>
            </tr>
          </table>

          <!-- Content -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 28px 32px;">
                ${html}
              </td>
            </tr>
          </table>

          <!-- Footer -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background: #FAF6F0; border-top: 1px solid #E5D8CC; padding: 16px 32px; text-align: center;">
                <p style="margin: 0 0 8px; font-size: 0.8rem; color: #888;">
                  Este es un correo automático, por favor no responder.
                </p>
                <p style="margin: 0; font-size: 0.75rem; color: #AAA;">
                  Crepes & Waffles® — Sistema de Gestión Operativa v2.0
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

/**
 * Notificación: Ticket asignado a técnico
 */
export function templateAsignacion({ ticket, tecnico, asignadoPor }) {
  const html = `
    <h2 style="margin: 0 0 8px; color: #2C1810; font-size: 1.25rem;">📋 Nuevo Ticket Asignado</h2>
    <p style="margin: 0 0 20px; color: #4A2C20; font-size: 0.95rem; line-height: 1.5;">
      Hola <strong>${tecnico}</strong>, se te ha asignado un nuevo ticket de mantenimiento.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #E5D8CC; border-radius: 10px; overflow: hidden; margin-bottom: 20px;">
      ${ticketRow('ID', `<span style="background: #FFFBEB; color: #92400E; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-family: monospace;">${ticket.id}</span>`)}
      ${ticketRow('Tipo', ticket.tipo_mantenimiento)}
      ${ticketRow('Área', ticket.area_registro)}
      ${ticketRow('Prioridad', `<span style="background: ${priorityColor(ticket.prioridad)}20; color: ${priorityColor(ticket.prioridad)}; padding: 4px 10px; border-radius: 6px; font-weight: 700;">${ticket.prioridad}</span>`)}
      ${ticketRow('Estado', `<span style="background: ${estadoColor(ticket.estado)}20; color: ${estadoColor(ticket.estado)}; padding: 4px 10px; border-radius: 6px; font-weight: 700;">${ticket.estado}</span>`)}
      ${ticketRow('Descripción', ticket.descripcion)}
      ${ticketRow('Equipo', ticket.equipo_nombre || 'Locativo / Sin equipo')}
      ${ticketRow('PDV / Ubicación', ticket.pdv_nombre || ticket.area_hallazgo || '—')}
      ${ticketRow('Fecha programada', formatDate(ticket.fecha_programada))}
      ${ticketRow('Asignado por', asignadoPor)}
    </table>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${ticketLink(ticket.id)}" style="display: inline-block; background: #3D2314; color: #fff; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 0.95rem; text-decoration: none; box-shadow: 0 4px 12px rgba(61,35,20,0.3);">
        🛠️ Ver y Ejecutar Ticket
      </a>
    </div>

    <p style="margin: 20px 0 0; font-size: 0.8rem; color: #888; text-align: center;">
      Fecha de asignación: ${formatDateTime(new Date().toISOString())}
    </p>
  `;
  return wrapper(html);
}

/**
 * Notificación: Ticket vencido (overdue)
 */
export function templateVencido({ ticket, tecnico, diasVencido }) {
  const html = `
    <h2 style="margin: 0 0 8px; color: #DC2626; font-size: 1.25rem;">⚠️ Ticket Vencido</h2>
    <p style="margin: 0 0 20px; color: #4A2C20; font-size: 0.95rem; line-height: 1.5;">
      Hola <strong>${tecnico}</strong>, el siguiente ticket tiene la fecha programada vencida hace <strong>${diasVencido} día(s)</strong>.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #FCA5A5; border-radius: 10px; overflow: hidden; margin-bottom: 20px; background: #FEF2F2;">
      ${ticketRow('ID', `<span style="background: #FEE2E2; color: #DC2626; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-family: monospace;">${ticket.id}</span>`)}
      ${ticketRow('Tipo', ticket.tipo_mantenimiento)}
      ${ticketRow('Prioridad', `<span style="background: ${priorityColor(ticket.prioridad)}20; color: ${priorityColor(ticket.prioridad)}; padding: 4px 10px; border-radius: 6px; font-weight: 700;">${ticket.prioridad}</span>`)}
      ${ticketRow('Estado', `<span style="background: ${estadoColor(ticket.estado)}20; color: ${estadoColor(ticket.estado)}; padding: 4px 10px; border-radius: 6px; font-weight: 700;">${ticket.estado}</span>`)}
      ${ticketRow('Descripción', ticket.descripcion)}
      ${ticketRow('Fecha programada', `${formatDate(ticket.fecha_programada)} <span style="color: #DC2626; font-weight: 700;">(vencida)</span>`)}
      ${ticketRow('Días de retraso', `<strong style="color: #DC2626;">${diasVencido}</strong>`)}
    </table>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${ticketLink(ticket.id)}" style="display: inline-block; background: #DC2626; color: #fff; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 0.95rem; text-decoration: none; box-shadow: 0 4px 12px rgba(220,38,38,0.3);">
        🚨 Atender Urgentemente
      </a>
    </div>
  `;
  return wrapper(html);
}

/**
 * Notificación: Ticket enviado a aprobación (Por Aprobar)
 */
export function templateParaAprobacion({ ticket, tecnico, jefe }) {
  const html = `
    <h2 style="margin: 0 0 8px; color: #2563EB; font-size: 1.25rem;">🔍 Ticket Pendiente de Aprobación</h2>
    <p style="margin: 0 0 20px; color: #4A2C20; font-size: 0.95rem; line-height: 1.5;">
      Hola <strong>${jefe}</strong>, el técnico <strong>${tecnico}</strong> ha finalizado el trabajo y solicita tu revisión.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #BFDBFE; border-radius: 10px; overflow: hidden; margin-bottom: 20px; background: #EFF6FF;">
      ${ticketRow('ID', `<span style="background: #DBEAFE; color: #1E40AF; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-family: monospace;">${ticket.id}</span>`)}
      ${ticketRow('Tipo', ticket.tipo_mantenimiento)}
      ${ticketRow('Prioridad', `<span style="background: ${priorityColor(ticket.prioridad)}20; color: ${priorityColor(ticket.prioridad)}; padding: 4px 10px; border-radius: 6px; font-weight: 700;">${ticket.prioridad}</span>`)}
      ${ticketRow('Estado', `<span style="background: #DBEAFE; color: #1E40AF; padding: 4px 10px; border-radius: 6px; font-weight: 700;">Por Aprobar</span>`)}
      ${ticketRow('Técnico', tecnico)}
      ${ticketRow('Descripción', ticket.descripcion)}
      ${ticketRow('Solución aplicada', ticket.solucion_aplicada || '—')}
      ${ticketRow('Fecha finalización', formatDateTime(ticket.fecha_real_finalizacion))}
    </table>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${ticketLink(ticket.id)}" style="display: inline-block; background: #2563EB; color: #fff; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 0.95rem; text-decoration: none; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">
        🔍 Revisar y Aprobar
      </a>
    </div>
  `;
  return wrapper(html);
}

/**
 * Notificación: Ticket aprobado y finalizado
 */
export function templateAprobado({ ticket, tecnico, creador, aprobadoPor }) {
  const html = `
    <h2 style="margin: 0 0 8px; color: #059669; font-size: 1.25rem;">✅ Ticket Aprobado y Finalizado</h2>
    <p style="margin: 0 0 20px; color: #4A2C20; font-size: 0.95rem; line-height: 1.5;">
      El ticket ha sido <strong>aprobado por ${aprobadoPor}</strong> y queda oficialmente finalizado.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #A7F3D0; border-radius: 10px; overflow: hidden; margin-bottom: 20px; background: #ECFDF5;">
      ${ticketRow('ID', `<span style="background: #D1FAE5; color: #065F46; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-family: monospace;">${ticket.id}</span>`)}
      ${ticketRow('Tipo', ticket.tipo_mantenimiento)}
      ${ticketRow('Estado', `<span style="background: #D1FAE5; color: #065F46; padding: 4px 10px; border-radius: 6px; font-weight: 700;">Finalizado</span>`)}
      ${ticketRow('Técnico ejecutor', tecnico)}
      ${ticketRow('Reportado por', creador)}
      ${ticketRow('Descripción', ticket.descripcion)}
      ${ticketRow('Solución aplicada', ticket.solucion_aplicada || '—')}
      ${ticketRow('Fecha inicio', formatDateTime(ticket.fecha_inicio_ejecucion))}
      ${ticketRow('Fecha fin', formatDateTime(ticket.fecha_real_finalizacion))}
      ${ticketRow('Tiempo ejecución', ticket.tiempo_ejecucion_minutos ? `${ticket.tiempo_ejecucion_minutos} min` : '—')}
      ${ticketRow('Aprobado por', aprobadoPor)}
      ${ticketRow('Fecha aprobación', formatDateTime(ticket.fecha_aprobacion))}
    </table>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${ticketLink(ticket.id)}" style="display: inline-block; background: #059669; color: #fff; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 0.95rem; text-decoration: none; box-shadow: 0 4px 12px rgba(5,150,105,0.3);">
        📄 Ver Detalle Completo
      </a>
    </div>
  `;
  return wrapper(html);
}

/**
 * Notificación: Ticket devuelto al técnico para corrección
 */
export function templateDevuelto({ ticket, tecnico, jefe, motivo }) {
  const html = `
    <h2 style="margin: 0 0 8px; color: #EA580C; font-size: 1.25rem;">🔄 Ticket Devuelto para Corrección</h2>
    <p style="margin: 0 0 20px; color: #4A2C20; font-size: 0.95rem; line-height: 1.5;">
      Hola <strong>${tecnico}</strong>, el ticket ha sido devuelto por <strong>${jefe}</strong> para que realices correcciones.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #FED7AA; border-radius: 10px; overflow: hidden; margin-bottom: 20px; background: #FFF7ED;">
      ${ticketRow('ID', `<span style="background: #FFEDD5; color: #9A3412; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-family: monospace;">${ticket.id}</span>`)}
      ${ticketRow('Estado', `<span style="background: #FFEDD5; color: #9A3412; padding: 4px 10px; border-radius: 6px; font-weight: 700;">En proceso (devuelto)</span>`)}
      ${ticketRow('Motivo de devolución', `<div style="background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 6px; padding: 12px; color: #92400E;">${motivo}</div>`)}
      ${ticketRow('Descripción original', ticket.descripcion)}
    </table>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${ticketLink(ticket.id)}" style="display: inline-block; background: #D97706; color: #fff; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 0.95rem; text-decoration: none; box-shadow: 0 4px 12px rgba(217,119,6,0.3);">
        🛠️ Continuar Trabajo
      </a>
    </div>
  `;
  return wrapper(html);
}

export { BASE_URL, ticketLink, formatDate, formatDateTime, priorityColor, estadoColor };