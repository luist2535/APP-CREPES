const { getDb } = require('./src/lib/db.js');
const fs = require('fs/promises');
const path = require('path');

async function migrar() {
  try {
    console.log('⚡ [Migración 8] Iniciando configuración de Repositorio Documental y Carpetas...');
    const db = getDb();
    
    // 1. Crear tabla archivos_repositorio
    db.prepare(`
      CREATE TABLE IF NOT EXISTS archivos_repositorio (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_original TEXT NOT NULL,
        nombre_guardado TEXT NOT NULL,
        ruta_archivo TEXT NOT NULL,
        tipo_archivo TEXT NOT NULL, -- 'excel', 'foto', 'pdf', 'documento', 'otro'
        extension TEXT,
        tamano_bytes INTEGER DEFAULT 0,
        categoria TEXT DEFAULT 'general', -- 'evidencia_visita', 'reporte_excel', 'manual_equipo', 'documento_pdv', 'general'
        referencia_id TEXT, -- Puede ser ID de visita, PDV, Equipo, etc.
        user_id INTEGER,
        observaciones TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `).run();
    
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_archivos_tipo ON archivos_repositorio(tipo_archivo)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_archivos_cat ON archivos_repositorio(categoria)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_archivos_ref ON archivos_repositorio(referencia_id)`).run();
    
    console.log('✅ Tabla "archivos_repositorio" e índices creados con éxito.');

    // 2. Asegurar estructura de carpetas bien organizada en el proyecto
    const baseDir = path.join(process.cwd(), 'public', 'archivos');
    const subcarpetas = ['excel', 'fotos', 'pdf', 'documentos', 'general'];
    
    for (const sub of subcarpetas) {
      const dirPath = path.join(baseDir, sub);
      try {
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`📁 Carpeta asegurada: public/archivos/${sub}`);
      } catch (e) {
        console.error(`Error creando carpeta ${dirPath}:`, e);
      }
    }

    // 3. Importar los archivos actuales en public/uploads a la base de datos si no están registrados
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    try {
      const archivosUploads = await fs.readdir(uploadsDir);
      let importados = 0;
      
      for (const arch of archivosUploads) {
        if (arch === '.gitkeep') continue;
        const filePath = path.join(uploadsDir, arch);
        try {
          const stats = await fs.stat(filePath);
          if (stats.isFile()) {
            const ext = path.extname(arch).toLowerCase().replace('.', '');
            let tipo = 'otro';
            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) tipo = 'foto';
            else if (['xls', 'xlsx', 'csv'].includes(ext)) tipo = 'excel';
            else if (ext === 'pdf') tipo = 'pdf';
            else if (['doc', 'docx', 'txt', 'ppt', 'pptx'].includes(ext)) tipo = 'documento';
            
            const ruta = `/uploads/${arch}`;
            const existente = db.prepare('SELECT id FROM archivos_repositorio WHERE ruta_archivo = ?').get(ruta);
            
            if (!existente) {
              db.prepare(`
                INSERT INTO archivos_repositorio (nombre_original, nombre_guardado, ruta_archivo, tipo_archivo, extension, tamano_bytes, categoria, observaciones)
                VALUES (?, ?, ?, ?, ?, ?, 'evidencia_visita', 'Archivo migrado del directorio anterior')
              `).run(arch, arch, ruta, tipo, ext, stats.size);
              importados++;
            }
          }
        } catch (e) {
          console.warn(`No se pudo procesar archivo ${arch}:`, e.message);
        }
      }
      console.log(`✅ Se registraron ${importados} archivos previos en la base de datos.`);
    } catch (e) {
      console.log('ℹ️ No se encontró directorio public/uploads o estaba vacío.');
    }

    console.log('🎉 Migración 8 completada: Todo organizado por carpetas y respaldado en BD.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración 8:', error);
    process.exit(1);
  }
}

migrar();
