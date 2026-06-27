const { getDb } = require('./src/lib/db.js');
const bcrypt = require('bcryptjs');

try {
  console.log('⚡ Iniciando tercera migración de base de datos...');
  const db = getDb();
  
  // 1. Agregar columna tipo_flujo a areas si no existe
  try {
    db.prepare("ALTER TABLE areas ADD COLUMN tipo_flujo TEXT DEFAULT 'administrativo'").run();
    console.log('✅ Columna "tipo_flujo" añadida a la tabla "areas".');
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('ℹ️ La columna "tipo_flujo" ya existe.');
    } else {
      throw e;
    }
  }

  // 2. Agregar nuevas columnas a visitas si no existen
  const columnsToAdd = [
    { name: 'repuestos', type: 'TEXT' },
    { name: 'firma_auxiliar', type: 'TEXT' },
    { name: 'firma_jefe', type: 'TEXT' },
    { name: 'comentarios_jefe', type: 'TEXT' },
    { name: 'hallazgos', type: 'TEXT' },
    { name: 'acciones_correctivas', type: 'TEXT' },
    { name: 'evento_id', type: 'INTEGER' }
  ];

  for (const col of columnsToAdd) {
    try {
      db.prepare(`ALTER TABLE visitas ADD COLUMN ${col.name} ${col.type}`).run();
      console.log(`✅ Columna "${col.name}" añadida a la tabla "visitas".`);
    } catch (e) {
      if (e.message.includes('duplicate column name')) {
        console.log(`ℹ️ La columna "${col.name}" ya existe.`);
      } else {
        throw e;
      }
    }
  }

  // 3. Insertar el área de Sistemas si no existe
  try {
    const existingArea = db.prepare("SELECT id FROM areas WHERE nombre = 'Sistemas'").get();
    if (!existingArea) {
      db.prepare("INSERT INTO areas (nombre, descripcion, color, tipo_flujo) VALUES ('Sistemas', 'Área de sistemas y soporte técnico', '#4B0082', 'tecnico')").run();
      console.log('✅ Área "Sistemas" creada.');
    } else {
      console.log('ℹ️ El área "Sistemas" ya existe.');
    }
  } catch (e) {
    console.error('Error al verificar/crear el área Sistemas:', e);
  }

  // 4. Configurar tipos de flujo para las áreas
  db.prepare("UPDATE areas SET tipo_flujo = 'tecnico' WHERE nombre IN ('Mantenimiento', 'Sistemas')").run();
  db.prepare("UPDATE areas SET tipo_flujo = 'administrativo' WHERE nombre NOT IN ('Mantenimiento', 'Sistemas')").run();
  console.log('✅ Tipos de flujo actualizados para todas las áreas (Mantenimiento y Sistemas = tecnico, otros = administrativo).');

  // 5. Agregar nuevos roles si no existen
  const rolesToInsert = [
    { id: 9, nombre: 'Jefe de Sistemas', descripcion: 'Jefe de la división de sistemas y soporte', permisos: '{"visitas": true, "dashboard_area": true}' },
    { id: 10, nombre: 'Auxiliar de Operaciones', descripcion: 'Auxiliar de operaciones', permisos: '{"visitas": true}' },
    { id: 11, nombre: 'Auxiliar SST', descripcion: 'Auxiliar de seguridad y salud en el trabajo', permisos: '{"visitas": true}' },
    { id: 12, nombre: 'Auxiliar de Mantenimiento', descripcion: 'Auxiliar de mantenimiento físico', permisos: '{"visitas": true}' },
    { id: 13, nombre: 'Auxiliar de Calidad', descripcion: 'Auxiliar de calidad y aseo', permisos: '{"visitas": true}' },
    { id: 14, nombre: 'Auxiliar VRH', descripcion: 'Auxiliar de recursos humanos', permisos: '{"visitas": true}' },
    { id: 15, nombre: 'Auxiliar Formación', descripcion: 'Auxiliar de capacitación', permisos: '{"visitas": true}' },
    { id: 16, nombre: 'Auxiliar de Sistemas', descripcion: 'Auxiliar técnico de sistemas', permisos: '{"visitas": true}' }
  ];

  for (const r of rolesToInsert) {
    try {
      const existingRole = db.prepare("SELECT id FROM roles WHERE id = ? OR nombre = ?").get(r.id, r.nombre);
      if (!existingRole) {
        db.prepare("INSERT INTO roles (id, nombre, descripcion, permisos) VALUES (?, ?, ?, ?)").run(r.id, r.nombre, r.descripcion, r.permisos);
        console.log(`✅ Rol "${r.nombre}" creado con ID ${r.id}.`);
      } else {
        console.log(`ℹ️ El rol "${r.nombre}" ya existe.`);
      }
    } catch (e) {
      console.error(`Error al insertar rol ${r.nombre}:`, e);
    }
  }

  // 6. Insertar usuarios de prueba para estos roles
  const testUsers = [
    { nombre: 'Jefe de Sistemas', email: 'jefe_sistemas@crepesenpunto.com', rol_id: 9 },
    { nombre: 'Auxiliar de Sistemas', email: 'aux_sistemas@crepesenpunto.com', rol_id: 16 },
    { nombre: 'Auxiliar Mantenimiento', email: 'aux_mante@crepesenpunto.com', rol_id: 12 },
    { nombre: 'Auxiliar Calidad', email: 'aux_calidad@crepesenpunto.com', rol_id: 13 },
    { nombre: 'Auxiliar SST', email: 'aux_sst@crepesenpunto.com', rol_id: 11 }
  ];

  const passHash = bcrypt.hashSync('admin123', 10);
  for (const u of testUsers) {
    try {
      const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(u.email);
      if (!existingUser) {
        db.prepare("INSERT INTO users (nombre, email, password_hash, rol_id, ciudad_id) VALUES (?, ?, ?, ?, NULL)")
          .run(u.nombre, u.email, passHash, u.rol_id);
        console.log(`✅ Usuario de prueba creado: ${u.nombre} (${u.email})`);
      } else {
        console.log(`ℹ️ El usuario de prueba "${u.nombre}" ya existe.`);
      }
    } catch (e) {
      console.error(`Error al crear usuario ${u.nombre}:`, e);
    }
  }

  // 7. Crear un tipo de visita para Sistemas y su plantilla
  try {
    const sistemasArea = db.prepare("SELECT id FROM areas WHERE nombre = 'Sistemas'").get();
    if (sistemasArea) {
      let tipoVisita = db.prepare("SELECT id FROM tipos_visita WHERE area_id = ? AND nombre = ?").get(sistemasArea.id, 'Soporte Técnico');
      if (!tipoVisita) {
        const tvResult = db.prepare("INSERT INTO tipos_visita (area_id, nombre) VALUES (?, 'Soporte Técnico')").run(sistemasArea.id);
        const tvId = tvResult.lastInsertRowid;
        console.log('✅ Tipo de visita "Soporte Técnico" creado para Sistemas.');
        
        // Crear plantilla
        const camposSistemas = JSON.stringify([
          { nombre: 'hardware', tipo: 'checkbox', label: 'Revisión de hardware (CPU, Disco Duro, RAM)', requerido: true },
          { nombre: 'software', tipo: 'checkbox', label: 'Actualización de software y antivirus', requerido: true },
          { nombre: 'redes', tipo: 'checkbox', label: 'Prueba de conectividad de red y cableado', requerido: true },
          { nombre: 'backup', tipo: 'checkbox', label: 'Respaldo de información local realizado', requerido: true },
          { nombre: 'detalles_trabajo', tipo: 'textarea', label: 'Detalles del soporte realizado', requerido: true }
        ]);
        
        db.prepare("INSERT INTO plantillas (area_id, tipo_visita_id, nombre, campos, version) VALUES (?, ?, 'Check list Sistemas', ?, 1)")
          .run(sistemasArea.id, tvId, camposSistemas);
        console.log('✅ Plantilla "Check list Sistemas" creada.');
      }
    }
  } catch (e) {
    console.error('Error al insertar plantilla de sistemas:', e);
  }

  console.log('🎉 Migración 3 completada exitosamente.');
  process.exit(0);
} catch (error) {
  console.error('❌ Error en tercera migración:', error);
  process.exit(1);
}
