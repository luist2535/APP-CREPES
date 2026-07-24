const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/crepes.db');
console.log('Abriendo base de datos en:', dbPath);
const db = new Database(dbPath, { verbose: console.log });

try {
  db.pragma('foreign_keys = OFF');
  // Begin transaction
  db.exec('BEGIN TRANSACTION');

  console.log('Vaciando tablas transaccionales...');
  
  const tables = [
    'inspecciones_hallazgos',
    'historial_mantenimientos',
    'mantenimientos',
    'inspecciones',
    'evidencias',
    'historial_visitas',
    'visitas',
    'eventos_calendario',
    'bloqueos_horario',
    'archivos_repositorio',
    'historial_estados',
    'audit_logs'
  ];

  for (const table of tables) {
    try {
      db.exec(`DELETE FROM ${table}`);
      try {
        db.exec(`DELETE FROM sqlite_sequence WHERE name='${table}'`);
      } catch (e) {}
      console.log(`Tabla ${table} vaciada.`);
    } catch (e) {
      console.log(`Tabla ${table} no existe o no se pudo vaciar:`, e.message);
    }
  }

  // Commit transaction
  db.exec('COMMIT');
  console.log('Base de datos limpiada exitosamente.');
} catch (error) {
  db.exec('ROLLBACK');
  console.error('Error al limpiar la base de datos:', error);
} finally {
  db.close();
}
