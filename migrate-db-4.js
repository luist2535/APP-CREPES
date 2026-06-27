const { getDb } = require('./src/lib/db.js');
const bcrypt = require('bcryptjs');

try {
  console.log('⚡ Iniciando cuarta migración de base de datos...');
  const db = getDb();
  
  // 1. Agregar columna pdv_id a users si no existe
  try {
    db.prepare("ALTER TABLE users ADD COLUMN pdv_id INTEGER REFERENCES pdv(id)").run();
    console.log('✅ Columna "pdv_id" añadida a la tabla "users".');
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('ℹ️ La columna "pdv_id" ya existe en la tabla "users".');
    } else {
      throw e;
    }
  }

  // 2. Crear tabla solicitudes_visita si no existe
  db.prepare(`
    CREATE TABLE IF NOT EXISTS solicitudes_visita (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pdv_id INTEGER NOT NULL REFERENCES pdv(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      area_id INTEGER NOT NULL REFERENCES areas(id),
      titulo TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      urgencia TEXT CHECK(urgencia IN ('urgente', 'revisar')) NOT NULL,
      estado TEXT CHECK(estado IN ('pendiente', 'programada', 'rechazada')) DEFAULT 'pendiente',
      fecha_solicitud TEXT DEFAULT CURRENT_TIMESTAMP,
      evento_id INTEGER REFERENCES eventos_calendario(id)
    )
  `).run();
  console.log('✅ Tabla "solicitudes_visita" creada o verificada con éxito.');

  // 3. Agregar rol 17 de Punto de Venta si no existe
  try {
    const existingRole = db.prepare("SELECT id FROM roles WHERE id = 17").get();
    if (!existingRole) {
      db.prepare(`
        INSERT INTO roles (id, nombre, descripcion, permisos)
        VALUES (17, 'Punto de Venta', 'Usuario correspondiente a un Punto de Venta (PDV) específico', '{"visitas": true, "solicitudes": true}')
      `).run();
      console.log('✅ Rol "Punto de Venta" (17) creado.');
    } else {
      console.log('ℹ️ El rol "Punto de Venta" ya existe.');
    }
  } catch (e) {
    console.error('Error al verificar/crear el rol de Punto de Venta:', e);
  }

  // 4. Crear usuarios semilla para los PDVs existentes
  const pdvs = db.prepare("SELECT id, nombre FROM pdv").all();
  console.log(`Encontrados ${pdvs.length} puntos de venta para crear accesos.`);

  const passHash = bcrypt.hashSync('admin123', 10);

  for (const pdv of pdvs) {
    // Generar email amigable, ej: pdv_altoprado@crepesenpunto.com
    const emailPrefix = pdv.nombre.toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `pdv_${emailPrefix}@crepesenpunto.com`;
    const nombre = `PDV ${pdv.nombre}`;

    try {
      const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
      if (!existingUser) {
        db.prepare(`
          INSERT INTO users (nombre, email, password_hash, rol_id, pdv_id, created_at)
          VALUES (?, ?, ?, 17, ?, CURRENT_TIMESTAMP)
        `).run(nombre, email, passHash, pdv.id);
        console.log(`✅ Usuario de prueba creado: ${nombre} (${email})`);
      } else {
        // Asegurar que tenga el rol y pdv_id correcto si ya existe
        db.prepare("UPDATE users SET rol_id = 17, pdv_id = ? WHERE email = ?").run(pdv.id, email);
        console.log(`ℹ️ Usuario de prueba existente actualizado: ${nombre} (${email})`);
      }
    } catch (e) {
      console.error(`Error al insertar usuario para el PDV ${pdv.nombre}:`, e);
    }
  }

  console.log('🎉 Cuarta migración completada exitosamente.');
  process.exit(0);
} catch (error) {
  console.error('❌ Error general en la migración:', error);
  process.exit(1);
}
