const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'crepes-en-punto-secret-key-2024-change-in-production';
const JWT_EXPIRES_IN = '24h';

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
  
  return verifyToken(token);
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
  1: ['dashboard', 'territorial', 'calendario', 'visitas', 'bloqueos', 'equipos', 'solicitudes', 'reportes', 'archivos', 'admin'],
  2: ['dashboard', 'territorial', 'calendario', 'visitas', 'bloqueos', 'equipos', 'solicitudes', 'reportes', 'archivos'],
  3: ['dashboard', 'calendario', 'visitas', 'reportes', 'archivos'],
  4: ['dashboard', 'calendario', 'visitas', 'equipos', 'solicitudes', 'reportes', 'archivos'],
  5: ['dashboard', 'calendario', 'visitas', 'reportes', 'archivos'],
  6: ['dashboard', 'calendario', 'visitas', 'reportes', 'archivos'],
  7: ['dashboard', 'calendario', 'visitas', 'reportes', 'archivos'],
  8: ['dashboard', 'territorial', 'calendario', 'reportes', 'archivos'],
  9: ['dashboard', 'calendario', 'visitas', 'equipos', 'solicitudes', 'reportes', 'archivos'],
  10: ['dashboard', 'calendario', 'visitas', 'archivos'],
  11: ['dashboard', 'calendario', 'visitas', 'archivos'],
  12: ['dashboard', 'calendario', 'visitas', 'equipos', 'solicitudes', 'archivos'],
  13: ['dashboard', 'calendario', 'visitas', 'archivos'],
  14: ['dashboard', 'calendario', 'visitas', 'archivos'],
  15: ['dashboard', 'calendario', 'visitas', 'archivos'],
  16: ['dashboard', 'calendario', 'visitas', 'equipos', 'solicitudes', 'archivos'],
  17: ['dashboard', 'calendario', 'visitas', 'solicitudes', 'archivos']
};

const MODULE_DEFINITIONS = [
  { key: 'dashboard', nombre: 'Dashboard Principal', icon: '📊', desc: 'Vista general de indicadores y estadísticas' },
  { key: 'visitas', nombre: 'Checklists e Inspecciones', icon: '📋', desc: 'Realización y consulta de auditorías y visitas' },
  { key: 'calendario', nombre: 'Calendario y Programación', icon: '📅', desc: 'Cronograma de inspecciones y agendas del equipo' },
  { key: 'equipos', nombre: 'Escanear / Mantenimiento', icon: '📷', desc: 'Escaneo QR de equipos, repositorios y hojas de vida' },
  { key: 'solicitudes', nombre: 'Solicitudes de Visita', icon: '🎟️', desc: 'Creación y atención de tickets o solicitudes' },
  { key: 'reportes', nombre: 'Analítica y Reportes', icon: '📈', desc: 'Exportaciones de Excel y reportes estadísticos' },
  { key: 'territorial', nombre: 'Gestión Territorial / Mapa', icon: '🗺️', desc: 'Mapa interactivo y distribución por zonas' },
  { key: 'bloqueos', nombre: 'Bloqueos de Horario', icon: '⏰', desc: 'Restricciones y bloqueos en el calendario de agendas' },
  { key: 'archivos', nombre: 'Repositorio Documental', icon: '📁', desc: 'Biblioteca de documentos, manuales y evidencias' },
  { key: 'admin', nombre: 'Configuración del Sistema', icon: '⚙️', desc: 'Administración de usuarios, PDVs y áreas funcionales' }
];

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

module.exports = { 
  generateToken, 
  verifyToken, 
  hashPassword, 
  comparePassword, 
  getUserFromRequest, 
  getUserAssignedCityId,
  DEFAULT_ROLE_PERMISSIONS,
  MODULE_DEFINITIONS,
  getUserCustomPermissions,
  hasPermission
};
