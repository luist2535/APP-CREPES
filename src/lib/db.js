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
    db.pragma('secure_delete = ON'); // Sobreescribe los datos borrados con ceros
    db.pragma('trusted_schema = OFF'); // Evita ejecución de funciones en esquemas no confiables

    db.exec(`
      CREATE TABLE IF NOT EXISTS roles_permisos_adicionales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rol_id INTEGER NOT NULL,
        modulo TEXT NOT NULL,
        permitido INTEGER NOT NULL DEFAULT 1,
        otorgado_por TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(rol_id, modulo),
        FOREIGN KEY (rol_id) REFERENCES roles(id)
      )
    `);

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

    // Migraciones automáticas seguras (si la columna ya existe, SQLite ignorará o capturamos el error)
    try { db.exec('ALTER TABLE users ADD COLUMN deleted INTEGER DEFAULT 0'); } catch (e) {}
    try { db.exec('ALTER TABLE users ADD COLUMN debe_cambiar_password INTEGER DEFAULT 0'); } catch (e) {}
    try { db.exec("UPDATE users SET email = email || '_deleted_' || id WHERE deleted = 1 AND email NOT LIKE '%_deleted_%'"); } catch (e) {}
    try { db.exec('ALTER TABLE visitas ADD COLUMN version_checklist INTEGER DEFAULT 1'); } catch (e) {}
    try { db.exec('ALTER TABLE visitas ADD COLUMN campos_personalizados TEXT'); } catch (e) {}
    try { db.exec('ALTER TABLE visitas ADD COLUMN historial_versiones TEXT DEFAULT "[]"'); } catch (e) {}
    try { db.exec('ALTER TABLE plantillas ADD COLUMN descripcion TEXT'); } catch (e) {}
    try { db.exec('ALTER TABLE plantillas ADD COLUMN historial_versiones TEXT DEFAULT "[]"'); } catch (e) {}
    try { db.exec('ALTER TABLE mantenimientos ADD COLUMN firma_tecnico TEXT'); } catch (e) {}
    try { db.exec('ALTER TABLE mantenimientos ADD COLUMN firma_solicitante TEXT'); } catch (e) {}
    try { db.exec('ALTER TABLE mantenimientos ADD COLUMN checklist_tareas TEXT'); } catch (e) {}
    try { db.exec('ALTER TABLE mantenimientos ADD COLUMN firma_jefe TEXT'); } catch (e) {}
    try { db.exec('ALTER TABLE mantenimientos ADD COLUMN observaciones_aprobacion TEXT'); } catch (e) {}
    try { db.exec('ALTER TABLE mantenimientos ADD COLUMN fecha_aprobacion DATETIME'); } catch (e) {}
    try { db.exec('ALTER TABLE mantenimientos ADD COLUMN pdv_id INTEGER'); } catch (e) {}
    try { db.exec('ALTER TABLE mantenimientos ADD COLUMN categoria_id INTEGER'); } catch (e) {}

    // Tabla de calificaciones BPM (Matriz de frecuencia de verificación)
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS bpm_calificaciones (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          area TEXT NOT NULL,
          row_number INTEGER NOT NULL,
          semana_numero INTEGER NOT NULL,
          valor INTEGER NOT NULL CHECK(valor BETWEEN 1 AND 5),
          user_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(area, row_number, semana_numero),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);
    } catch (e) {}

    // Migración para separar Techos, Paredes y Pisos en plantillas existentes
    try {
      const plantillas = db.prepare("SELECT id, campos FROM plantillas WHERE campos LIKE '%techos, paredes%'").all();
      for (const p of plantillas) {
        if (p.campos) {
          let camposObj = JSON.parse(p.campos);
          let modificado = false;
          if (Array.isArray(camposObj)) {
            camposObj.forEach(c => {
              if (c && Array.isArray(c.secciones)) {
                c.secciones.forEach(sec => {
                  if (sec && Array.isArray(sec.filas)) {
                    const newFilas = [];
                    sec.filas.forEach(fila => {
                      if (typeof fila === 'string' && fila.includes('techos, paredes están libres de humedades')) {
                        newFilas.push('Los techos están libres de humedades, limpios y en buen estado.');
                        newFilas.push('Las paredes están completamente lisas, limpias y libres de humedades.');
                        newFilas.push('Los pisos están limpios, escurridos y en buen estado.');
                        modificado = true;
                      } else {
                        newFilas.push(fila);
                      }
                    });
                    sec.filas = newFilas;
                  }
                });
              }
            });
          }
          if (modificado) {
            db.prepare('UPDATE plantillas SET campos = ? WHERE id = ?').run(JSON.stringify(camposObj), p.id);
          }
        }
      }
    } catch (e) {
      console.error('Error migrando plantillas:', e);
    }

    // Auto-importar activos fijos de Logika si aún no están en la BD
    try {
      const countLogika = db.prepare("SELECT count(*) as c FROM equipos WHERE pdv_id = 17").get();
      if (countLogika && countLogika.c < 50) {
        const excelPath = path.join(process.cwd(), 'MANTENIMIENTO', 'ACTIVOS FIJOS PLANTA LOGIKA (1).xlsx');
        if (fs.existsSync(excelPath)) {
          const XLSX = require('xlsx');
          const wb = XLSX.readFile(excelPath);
          const sheet = wb.Sheets['Sheet1'] || wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          const upsertStmt = db.prepare(`
            INSERT INTO equipos (id, nombre, pdv_id, marca, modelo, serie, datos_tecnicos, ultimo_mantenimiento, proximo_mantenimiento, activo)
            VALUES (@id, @nombre, 17, NULL, NULL, @serie, @datos_tecnicos, NULL, NULL, 1)
            ON CONFLICT(id) DO UPDATE SET
              nombre = excluded.nombre,
              pdv_id = excluded.pdv_id,
              serie = excluded.serie,
              datos_tecnicos = excluded.datos_tecnicos,
              activo = 1
          `);
          const runTx = db.transaction(() => {
            for (let i = 2; i < rows.length; i++) {
              const r = rows[i];
              if (!r || r.length === 0) continue;
              const activoFijo = r[0] != null ? String(r[0]).trim() : '';
              const co = r[1] != null ? String(r[1]).trim() : '';
              const referencia = r[2] != null ? String(r[2]).trim() : '';
              const descripcion = r[3] != null ? String(r[3]).trim() : '';
              const estadoNiif = r[4] != null ? String(r[4]).trim() : '';
              const estado = r[5] != null ? String(r[5]).trim() : '';
              const ubicacion = r[6] != null ? String(r[6]).trim() : '';
              const observacion = r[7] != null ? String(r[7]).trim() : '';
              if (!activoFijo && !referencia && !descripcion) continue;
              const id = activoFijo || referencia || `EQ-LOGIKA-${String(i).padStart(4, '0')}`;
              const nombre = descripcion || (referencia ? `ACTIVO REF. ${referencia}` : `ACTIVO ${id}`);
              const datosTecnicos = {
                activo_fijo: activoFijo,
                referencia: referencia,
                co: co,
                descripcion: descripcion,
                estado_niif: estadoNiif,
                estado: estado || 'OPERATIVO',
                ubicacion: ubicacion || 'PLANTA LOGIKA',
                observacion: observacion,
                sticker: activoFijo || referencia || id,
                hoja_origen: 'ACTIVOS FIJOS PLANTA LOGIKA'
              };
              upsertStmt.run({
                id,
                nombre,
                serie: referencia || null,
                datos_tecnicos: JSON.stringify(datosTecnicos)
              });
            }
          });
          runTx();
          console.log('✅ Activos fijos de Logika auto-importados exitosamente a la base de datos.');
        }
      }
    } catch (e) {
      console.error('Error auto-importando activos fijos de Logika:', e);
    }
  }
  return db;
}

module.exports = { getDb };
