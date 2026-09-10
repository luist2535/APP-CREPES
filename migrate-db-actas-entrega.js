// Migration: Create actas_entrega table
const path = require('path');

function run() {
  const dbPath = path.join(__dirname, 'database.sqlite');
  const Database = require('better-sqlite3');
  const db = new Database(dbPath);

  console.log('Creating actas_entrega table...');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS actas_entrega (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      quien_recibe TEXT NOT NULL,
      cedula_recibe TEXT NOT NULL,
      cargo TEXT,
      area TEXT,
      ciudad TEXT,
      tipo_ubicacion TEXT DEFAULT 'pdv',
      equipos TEXT NOT NULL,
      observaciones TEXT,
      estado TEXT DEFAULT 'pendiente',
      creado_por INTEGER,
      nombre_entrega TEXT,
      cedula_entrega TEXT,
      firma_entrega TEXT,
      firma_recibe TEXT,
      fecha_firma TEXT,
      firmado_por INTEGER,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (creado_por) REFERENCES users(id),
      FOREIGN KEY (firmado_por) REFERENCES users(id)
    )
  `);

  console.log('✅ Table actas_entrega created successfully');
  
  // Verify
  const info = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='actas_entrega'").get();
  console.log('Table exists:', !!info);
  
  db.close();
}

run();
