const { getDb } = require('./src/lib/db.js');

async function migrar() {
  try {
    console.log('⚡ [Migración 9] Iniciando actualización de nombre DRH y mejoras de esquema de Cargos...');
    const db = getDb();
    
    // 1. Actualizar tabla areas: Vicepresidencia de Recursos Humanos -> Dirección de Recursos Humanos
    const updateArea = db.prepare(`
      UPDATE areas 
      SET nombre = 'Dirección de Recursos Humanos', 
          descripcion = 'Área de Dirección de Recursos Humanos (DRH)' 
      WHERE nombre = 'Vicepresidencia de Recursos Humanos' OR nombre = 'VRH' OR id = 5
    `).run();
    console.log(`✅ Área actualizada en tabla 'areas' (${updateArea.changes} registros modificados).`);

    // 2. Actualizar tabla roles: Auxiliar VRH -> Auxiliar DRH
    const updateRol = db.prepare(`
      UPDATE roles 
      SET nombre = 'Auxiliar DRH', 
          descripcion = 'Auxiliar de Dirección de Recursos Humanos' 
      WHERE id = 14 OR nombre = 'Auxiliar VRH'
    `).run();
    console.log(`✅ Cargo ID 14 actualizado de 'Auxiliar VRH' a 'Auxiliar DRH' (${updateRol.changes} registros modificados).`);

    // 3. Asegurar columna activo en roles si no existiera
    try {
      db.prepare("ALTER TABLE roles ADD COLUMN activo INTEGER DEFAULT 1").run();
      console.log('✅ Columna "activo" añadida a la tabla "roles".');
    } catch (e) {
      if (e.message.includes('duplicate column name')) {
        console.log('ℹ️ La columna "activo" ya existe en la tabla "roles".');
      } else {
        throw e;
      }
    }

    // 4. Crear tabla historial_secciones_calidad si no existe para el Módulo 6
    db.prepare(`
      CREATE TABLE IF NOT EXISTS historial_secciones_calidad (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visita_id INTEGER NOT NULL,
        pdv_id INTEGER NOT NULL,
        pdv_nombre TEXT,
        ciudad_id INTEGER,
        fecha TEXT NOT NULL,
        plantilla_id INTEGER,
        plantilla_nombre TEXT,
        seccion_nombre TEXT NOT NULL,
        puntaje REAL NOT NULL,
        puntaje_anterior REAL,
        diferencia REAL DEFAULT 0,
        alerta_disminucion INTEGER DEFAULT 0,
        preguntas_si INTEGER DEFAULT 0,
        preguntas_no INTEGER DEFAULT 0,
        preguntas_na INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (visita_id) REFERENCES visitas(id),
        FOREIGN KEY (pdv_id) REFERENCES pdv(id)
      )
    `).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_hist_secc_pdv ON historial_secciones_calidad(pdv_id)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_hist_secc_nombre ON historial_secciones_calidad(seccion_nombre)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_hist_secc_fecha ON historial_secciones_calidad(fecha)`).run();
    console.log('✅ Tabla "historial_secciones_calidad" e índices creados con éxito para analítica longitudinal de Calidad.');

    console.log('🎉 Migración 9 completada exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración 9:', error);
    process.exit(1);
  }
}

migrar();
