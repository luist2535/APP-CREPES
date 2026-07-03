const { getDb } = require('./src/lib/db.js');

try {
  console.log('⚡ Iniciando sexta migración de base de datos...');
  const db = getDb();
  
  // 1. Agregar columna equipo_id a visitas si no existe
  try {
    db.prepare("ALTER TABLE visitas ADD COLUMN equipo_id TEXT").run();
    console.log('✅ Columna "equipo_id" añadida a la tabla "visitas".');
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('ℹ️ La columna "equipo_id" ya existe.');
    } else {
      throw e;
    }
  }

  console.log('🎉 Sexta migración completada exitosamente.');
  process.exit(0);
} catch (error) {
  console.error('❌ Error general en la migración:', error);
  process.exit(1);
}
