const { getDb } = require('./src/lib/db.js');
const bcrypt = require('bcryptjs');

try {
  console.log('🔑 Restableciendo contraseñas de usuarios...');
  const db = getDb();
  
  // Generar hash real de bcrypt para 'admin123'
  const defaultPassword = bcrypt.hashSync('admin123', 10);
  
  // Actualizar todos los usuarios en la base de datos
  const result = db.prepare('UPDATE users SET password_hash = ?').run(defaultPassword);
  
  console.log(`✅ Contraseñas actualizadas con éxito.`);
  console.log(`   - Filas afectadas: ${result.changes}`);
  console.log(`   - Contraseña para todos los usuarios: admin123`);
  
  process.exit(0);
} catch (error) {
  console.error('❌ Error al restablecer contraseñas:', error);
  process.exit(1);
}
