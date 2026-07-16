const { getDb } = require('./src/lib/db.js');

async function migrar() {
  try {
    console.log('\u26a1 [Migraci\u00f3n 9] Iniciando m\u00f3dulo de Mantenimiento MT/ST...');
    const db = getDb();

    try {
      db.prepare('ALTER TABLE users ADD COLUMN recibir_correos INTEGER DEFAULT 1').run();
      console.log('\u2705 Columna recibir_correos a\u00f1adida a users.');
    } catch (e) {
      console.log('\u2139\ufe0f  recibir_correos ya existe:', e.message);
    }

    db.prepare('CREATE TABLE IF NOT EXISTS mantenimientos_correlativos (prefijo TEXT PRIMARY KEY, ultimo_numero INTEGER DEFAULT 1000)').run();
    db.prepare("INSERT OR IGNORE INTO mantenimientos_correlativos (prefijo, ultimo_numero) VALUES ('MT', 1000)").run();
    db.prepare("INSERT OR IGNORE INTO mantenimientos_correlativos (prefijo, ultimo_numero) VALUES ('ST', 1000)").run();
    console.log('\u2705 Correlativos MT/ST listos.');

    db.prepare(
      'CREATE TABLE IF NOT EXISTS mantenimientos (' +
      'id TEXT PRIMARY KEY,' +
      "prefijo TEXT NOT NULL DEFAULT 'MT'," +
      'numero_correlativo INTEGER NOT NULL,' +
      'tipo_mantenimiento TEXT NOT NULL,' +
      'area_registro TEXT NOT NULL,' +
      'area_hallazgo TEXT,' +
      'equipo_id TEXT,' +
      'descripcion TEXT NOT NULL,' +
      'fecha_evidencia DATE NOT NULL,' +
      'fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,' +
      "prioridad TEXT NOT NULL DEFAULT 'Media'," +
      'fecha_programada DATE,' +
      'responsable_asignacion_id INTEGER,' +
      'tecnico_id INTEGER,' +
      "estado TEXT NOT NULL DEFAULT 'Pendiente'," +
      'solucion_aplicada TEXT,' +
      "evidencias TEXT DEFAULT '[]'," +
      'observaciones TEXT,' +
      'observaciones_asignacion TEXT,' +
      'fecha_inicio_ejecucion DATETIME,' +
      'fecha_real_finalizacion DATETIME,' +
      'tiempo_atencion_minutos INTEGER DEFAULT 0,' +
      'tiempo_ejecucion_minutos INTEGER DEFAULT 0,' +
      'user_id_registro INTEGER NOT NULL,' +
      'inspeccion_id INTEGER,' +
      'created_at DATETIME DEFAULT CURRENT_TIMESTAMP,' +
      'FOREIGN KEY (equipo_id) REFERENCES equipos(id),' +
      'FOREIGN KEY (responsable_asignacion_id) REFERENCES users(id),' +
      'FOREIGN KEY (tecnico_id) REFERENCES users(id),' +
      'FOREIGN KEY (user_id_registro) REFERENCES users(id))'
    ).run();

    ['estado','prefijo','tipo_mantenimiento','equipo_id','fecha_registro','tecnico_id','prioridad'].forEach(col => {
      try { db.prepare('CREATE INDEX IF NOT EXISTS idx_mantenimientos_' + col + ' ON mantenimientos(' + col + ')').run(); } catch(e) {}
    });
    console.log('\u2705 Tabla mantenimientos e \u00edndices creados.');

    db.prepare(
      'CREATE TABLE IF NOT EXISTS inspecciones (' +
      'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      'tipo_inspeccion TEXT NOT NULL,' +
      'area_id INTEGER,' +
      'pdv_id INTEGER,' +
      'user_id INTEGER NOT NULL,' +
      'fecha_inspeccion DATE NOT NULL,' +
      'hora_inicio TIME,' +
      'hora_fin TIME,' +
      'observaciones_generales TEXT,' +
      "estado TEXT DEFAULT 'Completada'," +
      'created_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
    ).run();
    try { db.prepare('CREATE INDEX IF NOT EXISTS idx_inspecciones_fecha ON inspecciones(fecha_inspeccion)').run(); } catch(e) {}
    try { db.prepare('CREATE INDEX IF NOT EXISTS idx_inspecciones_user ON inspecciones(user_id)').run(); } catch(e) {}
    console.log('\u2705 Tabla inspecciones creada.');

    db.prepare(
      'CREATE TABLE IF NOT EXISTS inspecciones_hallazgos (' +
      'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      'inspeccion_id INTEGER NOT NULL,' +
      'mantenimiento_id TEXT NOT NULL,' +
      'descripcion TEXT NOT NULL,' +
      'created_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
    ).run();
    console.log('\u2705 Tabla inspecciones_hallazgos creada.');

    db.prepare(
      'CREATE TABLE IF NOT EXISTS historial_mantenimientos (' +
      'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      'mantenimiento_id TEXT NOT NULL,' +
      'user_id INTEGER NOT NULL,' +
      'accion TEXT NOT NULL,' +
      'estado_anterior TEXT,' +
      'estado_nuevo TEXT,' +
      'detalles_cambio TEXT,' +
      'created_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
    ).run();
    try { db.prepare('CREATE INDEX IF NOT EXISTS idx_hist_mant_id ON historial_mantenimientos(mantenimiento_id)').run(); } catch(e) {}
    try { db.prepare('CREATE INDEX IF NOT EXISTS idx_hist_mant_fecha ON historial_mantenimientos(created_at)').run(); } catch(e) {}
    console.log('\u2705 Tabla historial_mantenimientos creada.');

    console.log('\n\ud83c\udf89 [Migraci\u00f3n 9] M\u00f3dulo de Mantenimiento configurado exitosamente.');
    console.log('   \u2022 Prefijos de tickets: MT-XXXX (Mantenimiento) y ST-XXXX (Sistemas)');
    console.log('   \u2022 Tablas creadas: mantenimientos, inspecciones, inspecciones_hallazgos, historial_mantenimientos');
    console.log('   \u2022 Columna a\u00f1adida: users.recibir_correos\n');

  } catch (error) {
    console.error('\u274c Error en migraci\u00f3n 9:', error);
    process.exit(1);
  }
}

migrar();


