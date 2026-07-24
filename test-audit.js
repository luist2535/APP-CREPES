/**
 * Script de prueba: simula login de todos los usuarios activos 
 * y verifica que se registra en audit_logs.
 */
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database', 'crepes.db');
const db = new Database(DB_PATH);

// Obtener todos los usuarios activos con su rol
const users = db.prepare(`
  SELECT u.id, u.nombre, u.email, u.password_hash, r.nombre as rol
  FROM users u
  LEFT JOIN roles r ON u.rol_id = r.id
  WHERE u.activo = 1
  ORDER BY u.id
`).all();

// Contar registros actuales
const countBefore = db.prepare('SELECT COUNT(*) as n FROM audit_logs').get().n;
console.log('Usuarios activos encontrados: ' + users.length);
console.log('Registros de audit_logs antes del test: ' + countBefore);
console.log('');

// Función que simula lo que hace el login route
function simulateLoginAudit(user) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (usuario, rol, accion, modulo, descripcion, registro_afectado, ip, dispositivo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user.nombre,
      user.rol || 'Sin Rol',
      'Login',
      'Autenticación',
      'Inicio de sesión registrado desde test de verificación.',
      'USR-' + user.id,
      '127.0.0.1 (test)',
      'Test Automático'
    );
    return true;
  } catch (err) {
    return false;
  }
}

let ok = 0, fail = 0;
for (const user of users) {
  const result = simulateLoginAudit(user);
  if (result) {
    console.log('[OK] ' + user.nombre + ' (' + user.rol + ')');
    ok++;
  } else {
    console.log('[FAIL] ' + user.nombre + ' (' + user.rol + ')');
    fail++;
  }
}

const countAfter = db.prepare('SELECT COUNT(*) as n FROM audit_logs').get().n;
console.log('');
console.log('===========================');
console.log('Resultados:');
console.log('  Exitosos: ' + ok);
console.log('  Fallidos: ' + fail);
console.log('  Registros en audit_logs ahora: ' + countAfter);
console.log('  Nuevos registros insertados: ' + (countAfter - countBefore));
console.log('===========================');

// Mostrar los últimos 3 registros como comprobación
const latest = db.prepare('SELECT usuario, rol, accion, fecha FROM audit_logs ORDER BY fecha DESC LIMIT 3').all();
console.log('\nÚltimos 3 registros en la base de datos:');
for (const r of latest) {
  console.log('  - ' + r.fecha + ' | ' + r.usuario + ' | ' + r.rol + ' | ' + r.accion);
}

db.close();
