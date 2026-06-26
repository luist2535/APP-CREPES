const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(process.cwd(), 'database', 'crepes.db');
const SCHEMA_PATH = path.join(process.cwd(), 'database', 'schema.sql');
const SEED_PATH = path.join(process.cwd(), 'database', 'seed.sql');

let db;

function getDb() {
  if (!db) {
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const isNew = !fs.existsSync(DB_PATH);
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    if (isNew) {
      console.log('🗄️ Inicializando base de datos...');
      const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
      db.exec(schema);

      const bcrypt = require('bcryptjs');
      const seed = fs.readFileSync(SEED_PATH, 'utf-8');
      db.exec(seed);

      // Actualizar passwords con hash real
      const defaultPassword = bcrypt.hashSync('admin123', 10);
      db.prepare('UPDATE users SET password_hash = ?').run(defaultPassword);
      
      console.log('✅ Base de datos creada exitosamente');
      console.log('👤 Usuario: admin@crepesenpunto.com');
      console.log('🔑 Contraseña: admin123');
    }
  }
  return db;
}

module.exports = { getDb };
