const XLSX = require('xlsx');
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'crepes.db');
const excelPath = path.join(__dirname, '..', 'MANTENIMIENTO', 'ACTIVOS FIJOS PLANTA LOGIKA (1).xlsx');

console.log('Connecting to database:', dbPath);
const db = new Database(dbPath);

console.log('Reading Excel file:', excelPath);
const wb = XLSX.readFile(excelPath);
const sheet = wb.Sheets['Sheet1'] || wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const LOGIKA_PDV_ID = 17; // Logika / Planta de producción

const upsertStmt = db.prepare(`
  INSERT INTO equipos (
    id, nombre, pdv_id, marca, modelo, serie, datos_tecnicos, ultimo_mantenimiento, proximo_mantenimiento, activo
  ) VALUES (
    @id, @nombre, @pdv_id, @marca, @modelo, @serie, @datos_tecnicos, NULL, NULL, 1
  )
  ON CONFLICT(id) DO UPDATE SET
    nombre = excluded.nombre,
    pdv_id = excluded.pdv_id,
    serie = excluded.serie,
    datos_tecnicos = excluded.datos_tecnicos,
    activo = 1
`);

let inserted = 0;
let updated = 0;
let skipped = 0;

const insertMany = db.transaction((items) => {
  for (const item of items) {
    const res = upsertStmt.run(item);
    if (res.changes > 0) inserted++;
  }
});

const itemsToInsert = [];

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

  if (!activoFijo && !referencia && !descripcion) {
    skipped++;
    continue;
  }

  // Primary ID: Use Activo Fijo if present, otherwise Referencia, otherwise generated
  const id = activoFijo || referencia || `EQ-LOGIKA-${String(i).padStart(4, '0')}`;
  
  // Clean description as name
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

  itemsToInsert.push({
    id: id,
    nombre: nombre,
    pdv_id: LOGIKA_PDV_ID,
    marca: null,
    modelo: null,
    serie: referencia || null,
    datos_tecnicos: JSON.stringify(datosTecnicos)
  });
}

console.log(`Processing ${itemsToInsert.length} items from Excel...`);
insertMany(itemsToInsert);

console.log(`✅ Import finished successfully!`);
console.log(`Total processed: ${itemsToInsert.length}`);
console.log(`Inserted/Updated: ${inserted}`);
console.log(`Skipped rows: ${skipped}`);

// Verify count in database
const totalLogika = db.prepare('SELECT count(*) as c FROM equipos WHERE pdv_id = ?').get(LOGIKA_PDV_ID);
console.log(`Total equipos in Logika (PDV 17): ${totalLogika.c}`);
