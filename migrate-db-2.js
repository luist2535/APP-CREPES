const { getDb } = require('./src/lib/db.js');

try {
  console.log('⚡ Iniciando segunda migración (Calendario -> Áreas)...');
  const db = getDb();
  
  // 1. Agregar columna area_id a eventos_calendario si no existe
  try {
    db.prepare("ALTER TABLE eventos_calendario ADD COLUMN area_id INTEGER").run();
    console.log('✅ Columna "area_id" añadida a la tabla "eventos_calendario".');
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('ℹ️ La columna "area_id" ya existe.');
    } else {
      throw e;
    }
  }

  // 2. Vincular restricciones de llave foránea (opcional en SQLite, pero se ejecutará al crear de nuevo)
  console.log('🎉 Segunda migración completada exitosamente.');
  process.exit(0);
} catch (error) {
  console.error('❌ Error en segunda migración:', error);
  process.exit(1);
}
