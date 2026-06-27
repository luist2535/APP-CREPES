const { getDb } = require('./src/lib/db.js');

try {
  const db = getDb();
  
  const events = db.prepare(`
    SELECT e.id, e.titulo, e.user_id, e.fecha, e.estado
    FROM eventos_calendario e
  `).all();
  
  console.log('📅 EVENTOS DE CALENDARIO:');
  console.log(events);

  console.log('\n👤 USUARIOS EXISTENTES EN DB:');
  const users = db.prepare(`SELECT id, nombre, email FROM users`).all();
  console.log(users);
  
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}
