/**
 * Módulo de auditoría del sistema.
 * Llama a `logAudit()` desde cualquier API route para registrar una acción.
 * 
 * Ejemplo de uso:
 *   import { logAudit } from '@/lib/audit';
 *   logAudit({
 *     usuario: user.nombre,
 *     rol: user.rol_nombre,
 *     accion: 'Login',
 *     modulo: 'Autenticación',
 *     descripcion: 'Inició sesión exitosamente',
 *     registro_afectado: 'USR-' + user.id,
 *     request: request  // Para extraer IP y dispositivo automáticamente
 *   });
 */

const { getDb } = require('./db');

/**
 * Registra una acción de auditoría en la base de datos.
 * Es silenciosa: si falla, no interrumpe el flujo principal.
 * 
 * @param {object} params
 * @param {string} params.usuario        - Nombre del usuario que realizó la acción
 * @param {string} params.rol            - Rol del usuario
 * @param {string} params.accion         - Tipo de acción: 'Login', 'Crear', 'Editar', 'Eliminar', etc.
 * @param {string} params.modulo         - Módulo donde ocurrió: 'Autenticación', 'Visitas', 'Equipos', etc.
 * @param {string} params.descripcion    - Descripción clara de lo que ocurrió
 * @param {string} [params.registro_afectado] - ID del registro afectado (ticket, equipo, usuario, etc.)
 * @param {Request} [params.request]     - Request de Next.js para extraer IP y User-Agent
 * @param {string} [params.ip]           - IP manual (si no se pasa request)
 * @param {string} [params.dispositivo]  - Dispositivo/Navegador manual (si no se pasa request)
 */
function logAudit({ usuario, rol, accion, modulo, descripcion, registro_afectado = null, request = null, ip = null, dispositivo = null }) {
  try {
    // Extraer IP y User-Agent del request si está disponible
    if (request) {
      const forwardedFor = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      ip = ip || forwardedFor?.split(',')[0]?.trim() || realIp || '127.0.0.1';
      dispositivo = dispositivo || request.headers.get('user-agent') || 'Desconocido';
      // Simplificar el User-Agent para mostrarlo legible
      dispositivo = parseUserAgent(dispositivo);
    }

    const db = getDb();
    db.prepare(`
      INSERT INTO audit_logs (usuario, rol, accion, modulo, descripcion, registro_afectado, ip, dispositivo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(usuario, rol, accion, modulo, descripcion, registro_afectado, ip, dispositivo);

  } catch (err) {
    // La auditoría nunca debe interrumpir el flujo principal
    console.error('[AUDIT ERROR]', err.message);
  }
}

/**
 * Convierte un User-Agent largo en algo legible.
 * Ejemplo: "Mozilla/5.0 (Windows NT 10.0; Win64) Chrome/126.0" → "Chrome en Windows"
 */
function parseUserAgent(ua) {
  if (!ua) return 'Desconocido';
  
  let browser = 'Navegador';
  let os = 'Sistema';

  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'MacOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return browser + ' en ' + os;
}

module.exports = { logAudit };
