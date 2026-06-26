const { getDb } = require('./src/lib/db.js');

try {
  const db = getDb();
  const users = db.prepare(`
    SELECT u.id, u.nombre, u.email, u.activo, u.rol_id, u.password_hash, r.nombre as rol_nombre
    FROM users u
    JOIN roles r ON u.rol_id = r.id
  `).all();
  
  console.log('📋 Lista de usuarios en la base de datos:');
  users.forEach(u => {
    console.log(`- ID: ${u.id} | ${u.nombre} | ${u.email} | Activo: ${u.activo} | Rol: ${u.rol_nombre} (${u.rol_id})`);
    console.log(`  Hash: ${u.password_hash.substring(0, 20)}...`);
  });
  
  process.exit(0);
} catch (error) {
  console.error('❌ Error al consultar usuarios:', error);
  process.exit(1);
}
