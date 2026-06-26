const { getDb } = require('./src/lib/db.js');

try {
  console.log('⚡ Iniciando migración de base de datos...');
  const db = getDb();
  
  // 1. Agregar columna etiqueta a evidencias si no existe
  try {
    db.prepare("ALTER TABLE evidencias ADD COLUMN etiqueta TEXT DEFAULT 'soporte'").run();
    console.log('✅ Columna "etiqueta" añadida exitosamente a la tabla "evidencias".');
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('ℹ️ La columna "etiqueta" ya existe.');
    } else {
      throw e;
    }
  }

  // 2. Crear tabla equipos si no existe
  db.prepare(`
    CREATE TABLE IF NOT EXISTS equipos (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      marca TEXT,
      modelo TEXT,
      serie TEXT,
      pdv_id INTEGER NOT NULL,
      datos_tecnicos TEXT,
      ultimo_mantenimiento DATE,
      proximo_mantenimiento DATE,
      activo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pdv_id) REFERENCES pdv(id)
    )
  `).run();
  console.log('✅ Tabla "equipos" verificada/creada exitosamente.');

  // 3. Crear índice para equipos
  db.prepare('CREATE INDEX IF NOT EXISTS idx_equipos_pdv ON equipos(pdv_id)').run();
  console.log('✅ Índice "idx_equipos_pdv" creado exitosamente.');

  // 4. Sembrar equipos de ejemplo
  const insertEquipo = db.prepare(`
    INSERT OR REPLACE INTO equipos (id, nombre, marca, modelo, serie, pdv_id, datos_tecnicos, ultimo_mantenimiento, proximo_mantenimiento)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    insertEquipo.run('EQ-1001', 'Licuadora Industrial', 'Vitamix', 'The Quiet One', 'VTX-908234-A', 1, '{"potencia":"1800W","voltaje":"110V","capacidad":"2.0 L","velocidades":"Control variable","certificacion":"NSF/SST"}', '2026-05-15', '2026-08-15');
    insertEquipo.run('EQ-1002', 'Congelador Vertical', 'Imbera', 'EV-25-CONG', 'IMB-88374-B', 1, '{"capacidad":"25 CFT","refrigerante":"R290","temperatura":"-18°C a -22°C","voltaje":"115V","corriente":"6.2 A"}', '2026-04-10', '2026-07-10');
    insertEquipo.run('EQ-1003', 'Crepera Eléctrica Doble', 'Krampouz', 'CEBIV4-D', 'KRP-49281-C', 1, '{"diametro_placas":"40 cm x 2","potencia":"3000W x 2","voltaje":"220V Bifásico","termostato":"50°C a 300°C"}', '2026-06-01', '2026-09-01');
    insertEquipo.run('EQ-1004', 'Aire Acondicionado Cocina', 'Carrier', 'Split inverter 24k', 'CAR-10293-D', 1, '{"capacidad":"24000 BTU","eficiencia":"SEER 18","refrigerante":"R410A","corriente":"11.5 A"}', '2026-03-20', '2026-09-20');
    insertEquipo.run('EQ-2001', 'Crepera Eléctrica Doble', 'Krampouz', 'CEBIV4-D', 'KRP-50121-Z', 10, '{"diametro_placas":"40 cm x 2","potencia":"3000W x 2","voltaje":"220V Bifásico","termostato":"50°C a 300°C"}', '2026-05-20', '2026-08-20');
    insertEquipo.run('EQ-3001', 'Licuadora Industrial', 'Vitamix', 'The Quiet One', 'VTX-909543-F', 18, '{"potencia":"1800W","voltaje":"110V","capacidad":"2.0 L","velocidades":"Control variable","certificacion":"NSF/SST"}', '2026-06-10', '2026-09-10');
  })();
  console.log('✅ Datos de equipos sembrados en la base de datos.');
  
  console.log('🎉 Migración completada exitosamente.');
  process.exit(0);
} catch (error) {
  console.error('❌ Error ejecutando migración:', error);
  process.exit(1);
}
