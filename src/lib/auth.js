const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("CRITICAL ERROR: JWT_SECRET environment variable is not set. Authentication will fail.");
  // Uncomment the following line in strict production:
  // throw new Error("JWT_SECRET environment variable is not set.");
}
const JWT_EXPIRES_IN = '8h'; // Alineado con maxAge de la cookie (28800s = 8h)

function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      rol_id: user.rol_id,
      nombre: user.nombre,
      ciudad_id: user.ciudad_id,
      pdv_id: user.pdv_id
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function getUserFromRequest(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split('; ').filter(Boolean).map(c => {
      const [key, ...rest] = c.split('=');
      return [key, rest.join('=')];
    })
  );
  
  const token = cookies['auth-token'];
  if (!token) return null;
  
  const decoded = verifyToken(token);
  if (!decoded) return null;

  // Verificar si el token fue revocado (logout)
  try {
    const crypto = require('crypto');
    const { getDb } = require('@/lib/db');
    const db = getDb();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const revoked = db.prepare('SELECT id FROM revoked_tokens WHERE token_hash = ?').get(tokenHash);
    if (revoked) return null;
  } catch (e) {
    // Si falla la verificación de revocación, permitir (no bloquear por error de DB)
  }

  return decoded;
}

/**
 * Revoca un token JWT (lo invalida antes de su expiración natural)
 */
function revokeToken(token) {
  try {
    const crypto = require('crypto');
    const { getDb } = require('@/lib/db');
    const db = getDb();
    const decoded = jwt.decode(token);
    if (!decoded) return;
    
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(decoded.exp * 1000).toISOString();
    
    db.prepare(
      'INSERT OR IGNORE INTO revoked_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)'
    ).run(tokenHash, decoded.id || null, expiresAt);

    // Limpiar tokens expirados (mantenimiento)
    db.prepare("DELETE FROM revoked_tokens WHERE expires_at < datetime('now', 'localtime')").run();
  } catch (e) {
    console.error('Error revocando token:', e);
  }
}

/**
 * Rate limiting persistente usando SQLite
 * @returns {{ allowed: boolean, remaining: number, retryAfter: number }}
 */
function checkRateLimit(ip, email, maxAttempts = 5, windowMinutes = 15) {
  try {
    const { getDb } = require('@/lib/db');
    const db = getDb();
    
    // Contar intentos fallidos en la ventana de tiempo
    const count = db.prepare(`
      SELECT COUNT(*) as c FROM login_attempts 
      WHERE ip = ? AND success = 0 
      AND created_at > datetime('now', 'localtime', ?)
    `).get(ip, `-${windowMinutes} minutes`);
    
    const attempts = count?.c || 0;
    
    if (attempts >= maxAttempts) {
      // Calcular cuándo se libera
      const oldest = db.prepare(`
        SELECT created_at FROM login_attempts 
        WHERE ip = ? AND success = 0 
        AND created_at > datetime('now', 'localtime', ?)
        ORDER BY created_at ASC LIMIT 1
      `).get(ip, `-${windowMinutes} minutes`);
      
      return { allowed: false, remaining: 0, retryAfter: windowMinutes };
    }
    
    return { allowed: true, remaining: maxAttempts - attempts, retryAfter: 0 };
  } catch (e) {
    return { allowed: true, remaining: 5, retryAfter: 0 }; // Fail open
  }
}

/**
 * Registra un intento de login en la tabla persistente
 */
function recordLoginAttempt(ip, email, success) {
  try {
    const { getDb } = require('@/lib/db');
    const db = getDb();
    db.prepare(
      'INSERT INTO login_attempts (ip, email, success) VALUES (?, ?, ?)'
    ).run(ip, email || null, success ? 1 : 0);
    
    // Si fue exitoso, limpiar intentos fallidos previos de esa IP
    if (success) {
      db.prepare(
        "DELETE FROM login_attempts WHERE ip = ? AND success = 0"
      ).run(ip);
    }
    
    // Limpiar registros antiguos (más de 1 hora)
    db.prepare(
      "DELETE FROM login_attempts WHERE created_at < datetime('now', 'localtime', '-1 hour')"
    ).run();
  } catch (e) {
    console.error('Error registrando intento de login:', e);
  }
}

function getUserAssignedCityId(user, db) {
  if (!user || !user.id) return null;
  let ciudadId = user.ciudad_id ? parseInt(user.ciudad_id) : null;
  let ciudadNombre = user.ciudad_nombre || '';

  if (db && user.id) {
    try {
      const row = db.prepare(`
        SELECT u.ciudad_id, c.nombre as ciudad_nombre 
        FROM users u 
        LEFT JOIN ciudades c ON u.ciudad_id = c.id 
        WHERE u.id = ?
      `).get(user.id);
      if (row) {
        ciudadId = row.ciudad_id ? parseInt(row.ciudad_id) : null;
        ciudadNombre = row.ciudad_nombre || '';
      }
    } catch (e) {}
  }

  if (!ciudadId || isNaN(ciudadId)) return null;
  const nom = ciudadNombre.toLowerCase();
  if (nom.includes('nacional') || nom.includes('todas') || nom === 'colombia') {
    return null;
  }
  return ciudadId;
}

const DEFAULT_ROLE_PERMISSIONS = {
  1: ['dashboard', 'territorial', 'calendario', 'visitas', 'bloqueos', 'equipos', 'mantenimiento', 'solicitudes', 'reportes', 'archivos', 'admin', 'actas_entrega', 'plantillas'],
  2: ['dashboard', 'territorial', 'calendario', 'visitas', 'bloqueos', 'equipos', 'mantenimiento', 'solicitudes', 'reportes', 'archivos', 'actas_entrega', 'plantillas'],
  3: ['dashboard', 'calendario', 'visitas', 'reportes', 'archivos'],
  4: ['dashboard', 'calendario', 'visitas', 'equipos', 'mantenimiento', 'solicitudes', 'reportes', 'archivos', 'actas_entrega'],
  5: ['dashboard', 'calendario', 'visitas', 'mantenimiento', 'reportes', 'archivos', 'plantillas'],
  6: ['dashboard', 'calendario', 'visitas', 'reportes', 'archivos'],
  7: ['dashboard', 'calendario', 'visitas', 'reportes', 'archivos'],
  8: ['dashboard', 'territorial', 'calendario', 'reportes', 'archivos'],
  9: ['dashboard', 'calendario', 'visitas', 'equipos', 'mantenimiento', 'solicitudes', 'reportes', 'archivos', 'actas_entrega'],
  10: ['dashboard', 'calendario', 'visitas', 'archivos'],
  11: ['dashboard', 'calendario', 'visitas', 'archivos'],
  12: ['dashboard', 'calendario', 'visitas', 'equipos', 'mantenimiento', 'solicitudes', 'archivos', 'actas_entrega'],
  13: ['dashboard', 'calendario', 'visitas', 'mantenimiento', 'archivos', 'plantillas'],
  14: ['dashboard', 'calendario', 'visitas', 'archivos'],
  15: ['dashboard', 'calendario', 'visitas', 'archivos'],
  16: ['dashboard', 'calendario', 'visitas', 'equipos', 'mantenimiento', 'solicitudes', 'archivos', 'actas_entrega'],
  17: ['dashboard', 'calendario', 'visitas', 'solicitudes', 'archivos']
};

const MODULE_DEFINITIONS = [
  { key: 'dashboard', nombre: 'Dashboard Principal', icon: '📊', desc: 'Vista general de indicadores y estadísticas' },
  { key: 'visitas', nombre: 'Checklists e Inspecciones', icon: '📋', desc: 'Realización y consulta de auditorías y visitas' },
  { key: 'calendario', nombre: 'Calendario y Programación', icon: '📅', desc: 'Cronograma de inspecciones y agendas del equipo' },
  { key: 'mantenimiento', nombre: 'Tickets y Órdenes de Mantenimiento', icon: '🛠️', desc: 'Gestión de tickets, hojas de vida de equipos, asignación y modo visita' },
  { key: 'equipos', nombre: 'Escanear / Hoja de Vida', icon: '📷', desc: 'Escaneo QR de equipos y consulta técnica' },
  { key: 'solicitudes', nombre: 'Solicitudes de Visita', icon: '🎟️', desc: 'Creación y atención de tickets o solicitudes' },
  { key: 'reportes', nombre: 'Analítica y Reportes', icon: '📈', desc: 'Exportaciones de Excel y reportes estadísticos' },
  { key: 'territorial', nombre: 'Gestión Territorial / Mapa', icon: '🗺️', desc: 'Mapa interactivo y distribución por zonas' },
  { key: 'bloqueos', nombre: 'Bloqueos de Horario', icon: '⏰', desc: 'Restricciones y bloqueos en el calendario de agendas' },
  { key: 'archivos', nombre: 'Repositorio Documental', icon: '📁', desc: 'Biblioteca de documentos, manuales y evidencias' },
  { key: 'actas_entrega', nombre: 'Actas de Entrega de Equipos', icon: '📝', desc: 'Creación y gestión de actas digitales TEC-F-03' },
  { key: 'plantillas', nombre: 'Plantillas de Visitas', icon: '⚙️', desc: 'Edición y configuración de ítems o checklists' },
  { key: 'admin', nombre: 'Configuración del Sistema', icon: '⚙️', desc: 'Administración de usuarios, PDVs y áreas funcionales' }
];

const GRANULAR_MODULE_ACTIONS = {
  mantenimiento: [
    { key: 'exportar_excel', label: 'Exportar reportes de mantenimiento a Excel' },
    { key: 'ver_asignados', label: 'Modo Visita: Ver y ejecutar solo los tickets asignados (Técnicos de Mantenimiento)' },
    { key: 'crear_hallazgo', label: 'Crear nuevos tickets / reportar hallazgos (Sistemas de Calidad)' },
    { key: 'gestionar_tablero', label: 'Acceso al Tablero general y vista de todos los tickets' },
    { key: 'asignar_tickets', label: 'Acceso a pestaña Asignación para distribuir y supervisar tickets' },
    { key: 'ver_indicadores', label: 'Acceso a Indicadores (KPIs) y Alertas de mantenimiento' },
    { key: 'generar_pdf', label: 'Generar e imprimir reporte PDF del mantenimiento' }
  ],
  archivos: [
    { key: 'ver_fotos', label: 'Ver fotografías' },
    { key: 'subir_fotos', label: 'Subir fotografías' },
    { key: 'ver_documentos', label: 'Ver documentos' },
    { key: 'subir_documentos', label: 'Subir documentos' },
    { key: 'descargar_documentos', label: 'Descargar documentos' },
    { key: 'eliminar_documentos', label: 'Eliminar documentos' },
    { key: 'ver_evidencias_pdv', label: 'Visualizar evidencias por punto de venta' },
    { key: 'admin_carpetas', label: 'Administrar carpetas' },
    { key: 'editar_archivos', label: 'Editar archivos' },
    { key: 'compartir_archivos', label: 'Compartir archivos' }
  ],
  visitas: [
    { key: 'crear', label: 'Crear / Programar inspecciones' },
    { key: 'evaluar', label: 'Realizar y responder checklists' },
    { key: 'editar', label: 'Editar visitas existentes' },
    { key: 'eliminar', label: 'Eliminar visitas' },
    { key: 'firmar_tecnico', label: 'Firmar como Técnico / Auxiliar' },
    { key: 'firmar_jefe', label: 'Autorizar / Firmar como Jefe' },
    { key: 'exportar', label: 'Exportar checklist a Excel/PDF' }
  ],
  reportes: [
    { key: 'ver_kpis', label: 'Ver indicadores gerenciales (KPIs)' },
    { key: 'ver_detalle', label: 'Ver detalle individual por visita' },
    { key: 'exportar_excel', label: 'Exportar reportes a Excel' },
    { key: 'exportar_pdf', label: 'Exportar reportes a PDF' },
    { key: 'calidad_avanzado', label: 'Acceder a Analítica Avanzada y Comportamiento de Calidad' }
  ],
  solicitudes: [
    { key: 'crear', label: 'Crear nuevas solicitudes / tickets' },
    { key: 'gestionar', label: 'Atender y cambiar estado de solicitudes' },
    { key: 'eliminar', label: 'Eliminar solicitudes' }
  ],
  equipos: [
    { key: 'escanear', label: 'Escanear códigos QR' },
    { key: 'editar_hoja_vida', label: 'Editar hoja de vida y especificaciones de equipos' },
    { key: 'eliminar', label: 'Eliminar equipos del catálogo' }
  ]
};

function getUserCustomPermissions(rolId, db) {
  if (!rolId || !db) return {};
  try {
    const rows = db.prepare('SELECT modulo, permitido, otorgado_por, updated_at FROM roles_permisos_adicionales WHERE rol_id = ?').all(parseInt(rolId));
    const result = {};
    rows.forEach(r => {
      result[r.modulo] = {
        permitido: Boolean(r.permitido),
        otorgado_por: r.otorgado_por || 'Administrador',
        updated_at: r.updated_at
      };
    });
    return result;
  } catch (e) {
    return {};
  }
}

function hasPermission(user, modulo, db) {
  if (!user || !user.rol_id) return false;
  const rolInt = parseInt(user.rol_id);
  if (rolInt === 1) return true; // Administrador tiene acceso total

  // Check database for custom role overrides first
  if (db) {
    try {
      const custom = db.prepare('SELECT permitido FROM roles_permisos_adicionales WHERE rol_id = ? AND modulo = ?').get(rolInt, modulo);
      if (custom) {
        return Boolean(custom.permitido);
      }
    } catch (e) {}
  }

  // Check default permissions
  const defaults = DEFAULT_ROLE_PERMISSIONS[rolInt] || [];
  return defaults.includes(modulo);
}

function hasActionPermission(user, modulo, accion, db) {
  if (!user || !user.rol_id) return false;
  const rolInt = parseInt(user.rol_id);
  if (rolInt === 1) return true; // Administrador maestro tiene acceso total

  // First verify general module access
  if (!hasPermission(user, modulo, db)) return false;

  // Check if there's a specific action override in roles_permisos_adicionales (key: `${modulo}.${accion}`)
  if (db) {
    try {
      const actionKey = `${modulo}.${accion}`;
      const customAction = db.prepare('SELECT permitido FROM roles_permisos_adicionales WHERE rol_id = ? AND modulo = ?').get(rolInt, actionKey);
      if (customAction !== undefined && customAction !== null) {
        return Boolean(customAction.permitido);
      }
    } catch (e) {}
  }

  // Reglas específicas por módulo si no existe override en base de datos
  if (modulo === 'mantenimiento') {
    if (accion === 'exportar_excel') {
      // Solo Admin (1), Supervisor/Jefe Mantenimiento (4), Jefe Sistemas (9)
      return [1, 4, 9].includes(rolInt);
    }
    if (accion === 'ver_asignados' || accion === 'crear_hallazgo') {
      return true; // Todos los roles que acceden a mantenimiento pueden ver sus tareas o crear hallazgos
    }
    if (accion === 'gestionar_tablero' || accion === 'ver_indicadores') {
      // Si es Auxiliar de Mantenimiento (12) o Sistemas de Calidad (5, 13), por defecto NO ven el tablero completo ni indicadores
      if (rolInt === 12 || rolInt === 5 || rolInt === 13) return false;
      return true;
    }
    if (accion === 'asignar_tickets') {
      return [1, 4, 9].includes(rolInt);
    }
  }

  // By default, if the user has general access to the module and no specific action denial exists,
  // we grant standard read/create/export actions unless it's a sensitive action (eliminar, admin_carpetas, firmar_jefe)
  const sensitiveActions = ['eliminar', 'eliminar_documentos', 'admin_carpetas', 'firmar_jefe'];
  if (sensitiveActions.includes(accion)) {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9].includes(rolInt);
  }

  return true;
}

module.exports = { 
  generateToken, 
  verifyToken, 
  hashPassword, 
  comparePassword, 
  getUserFromRequest, 
  getUserAssignedCityId,
  DEFAULT_ROLE_PERMISSIONS,
  MODULE_DEFINITIONS,
  GRANULAR_MODULE_ACTIONS,
  getUserCustomPermissions,
  hasPermission,
  hasActionPermission,
  revokeToken,
  checkRateLimit,
  recordLoginAttempt
};
