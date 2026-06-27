const { getDb } = require('./src/lib/db.js');

try {
  console.log('⚡ Iniciando quinta migración de base de datos...');
  const db = getDb();
  
  // 1. Crear tabla configuraciones
  db.prepare(`
    CREATE TABLE IF NOT EXISTS configuraciones (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    )
  `).run();
  console.log('✅ Tabla "configuraciones" creada o verificada con éxito.');

  // 2. Insertar valores semilla de SMTP si no existen
  const defaultSettings = [
    { clave: 'smtp_host', valor: 'smtp.gmail.com' },
    { clave: 'smtp_port', valor: '587' },
    { clave: 'smtp_user', valor: 'notificaciones@crepesenpunto.com' },
    { clave: 'smtp_pass', valor: 'admin123' }
  ];

  for (const s of defaultSettings) {
    try {
      const existing = db.prepare("SELECT clave FROM configuraciones WHERE clave = ?").get(s.clave);
      if (!existing) {
        db.prepare("INSERT INTO configuraciones (clave, valor) VALUES (?, ?)").run(s.clave, s.valor);
        console.log(`✅ Configuración "${s.clave}" inicializada con valor "${s.valor}".`);
      } else {
        console.log(`ℹ️ La configuración "${s.clave}" ya está registrada.`);
      }
    } catch (e) {
      console.error(`Error al insertar configuración ${s.clave}:`, e);
    }
  }

  console.log('🎉 Quinta migración completada exitosamente.');
  process.exit(0);
} catch (error) {
  console.error('❌ Error general en la migración:', error);
  process.exit(1);
}
