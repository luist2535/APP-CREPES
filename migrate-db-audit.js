const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'database', 'crepes.db');

console.log('📦 Conectando a la base de datos:', DB_PATH);

try {
  const db = new Database(DB_PATH);
  
  console.log('🚀 Iniciando migración para tabla audit_logs...');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario TEXT NOT NULL,
      rol TEXT NOT NULL,
      accion TEXT NOT NULL,
      modulo TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      registro_afectado TEXT,
      ip TEXT,
      dispositivo TEXT,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ Tabla audit_logs creada o verificada exitosamente.');
  
  db.close();
  console.log('🎉 Migración completada.');
} catch (error) {
  console.error('❌ Error en la migración:', error);
  process.exit(1);
}
