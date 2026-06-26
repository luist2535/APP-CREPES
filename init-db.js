const { getDb } = require('./src/lib/db.js');

try {
  console.log('🗄️ Iniciando conexión e inicialización de SQLite...');
  const db = getDb();
  
  // Realizar una consulta de prueba para verificar
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const pdvCount = db.prepare('SELECT COUNT(*) as count FROM pdv').get().count;
  
  console.log(`✅ Base de datos lista.`);
  console.log(`   - Usuarios sembrados: ${userCount}`);
  console.log(`   - Puntos de Venta (PDVs): ${pdvCount}`);
  
  process.exit(0);
} catch (error) {
  console.error('❌ Error inicializando base de datos:', error);
  process.exit(1);
}
