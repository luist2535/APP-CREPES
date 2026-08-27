const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dbPath = path.join(process.cwd(), 'database', 'crepes.db');
const db = new Database(dbPath);
const folderPath = path.join(process.cwd(), 'HISTORIAL DE VERIFICACION');

const USER_ID = 43; // Hilary G.
const PDV_ID = 17;  // Logika
const AREA_ID = 4;  // Calidad

const mesesTarget = {
  'ENERO': '2026-01-15', 'FEBRERO': '2026-02-15', 'MARZO': '2026-03-15',
  'ABRIL': '2026-04-15', 'MAYO': '2026-05-15', 'JUNIO': '2026-06-15'
};

// Load plantillas
const plantillasMap = {};
db.prepare('SELECT id, tipo_visita_id, campos FROM plantillas WHERE area_id = 4').all().forEach(p => {
  const schema = JSON.parse(p.campos || '[]')[0];
  if (!schema) return;
  const columnas = Array.isArray(schema.columnas) ? schema.columnas : [];
  const hasSubareaTabs = columnas.length > 0 &&
    !columnas.some(c => { const u = String(c||'').toUpperCase(); return u.includes('SATISFACTORIO') || u.includes('OBSERVACION') || u === 'NA' || u === 'N/A'; });
  const isBPMScale = columnas.some(c => { const u = String(c||'').toUpperCase(); return u === 'SATISFACTORIO' || ['1','2','3','4','5'].includes(u); });
  plantillasMap[p.id] = { tipo_visita_id: p.tipo_visita_id, schema, columnas, hasSubareaTabs, isBPMScale };
});

// ======================================================================
// FILE-SPECIFIC PARSERS
// Each returns: { [secIdx::questionName]: { perColumn: {colName: 'SI'|'NO'|'NA'|null}, obs: '' } }
// ======================================================================

// --- PARSER for Almacén (Plantilla 10): Simple SI/NO/NA, SI at col5, NO at col6, NA at col7, Obs at col8 ---
function parseAlmacen(rawData, schema) {
  const answers = {};
  let activeSecIdx = -1;
  for (const row of rawData) {
    if (!row || row.length === 0) continue;
    const col0 = String(row[0] || '').trim();
    const col1 = String(row[1] || '').trim();
    // Section header
    const secMatch = schema.secciones.findIndex(s => s.nombre.trim().toUpperCase() === col0.toUpperCase());
    if (secMatch !== -1) { activeSecIdx = secMatch; }
    if (activeSecIdx === -1) continue;
    const q = col1 || '';
    if (!q || q.toUpperCase() === 'TOTAL' || q.toUpperCase().startsWith('%') || q.toUpperCase().includes('ASPECTO')) continue;
    const schemaQ = schema.secciones[activeSecIdx].filas.find(f => f.trim().toLowerCase() === q.trim().toLowerCase());
    if (!schemaQ) continue;
    let val = null;
    if (row[5] === 1 || row[5] === '1') val = 'SI';
    else if (row[6] === 1 || row[6] === '1') val = 'NO';
    else if (row[7] === 1 || row[7] === '1') val = 'NA';
    let obs = '';
    if (row[8] && typeof row[8] === 'string' && row[8].trim() !== '1') obs = row[8].trim();
    answers[`${activeSecIdx}::${schemaQ}`] = { perColumn: { '_default': val }, obs };
  }
  return answers;
}

// --- PARSER for Comedor & Baños (Plantillas 11, 12): SI at col2, NO at col3 (not used much), NA at col4, Obs at col5 ---
function parseSimpleSINONA(rawData, schema) {
  const answers = {};
  let activeSecIdx = -1;
  for (const row of rawData) {
    if (!row || row.length === 0) continue;
    const col0 = String(row[0] || '').trim();
    const col1 = String(row[1] || '').trim();
    const secMatch = schema.secciones.findIndex(s => s.nombre.trim().toUpperCase() === col0.toUpperCase());
    if (secMatch !== -1) { activeSecIdx = secMatch; }
    if (activeSecIdx === -1) continue;
    const q = col1 || '';
    if (!q || q.toUpperCase() === 'TOTAL' || q.toUpperCase().startsWith('%') || q.toUpperCase().includes('ASPECTO')) continue;
    const schemaQ = schema.secciones[activeSecIdx].filas.find(f => f.trim().toLowerCase() === q.trim().toLowerCase());
    if (!schemaQ) continue;
    let val = null;
    if (row[2] === 1 || row[2] === '1') val = 'SI';
    else if (row[3] === 1 || row[3] === '1') val = 'NO';
    else if (row[4] === 1 || row[4] === '1') val = 'NA';
    // Also check: sometimes ' ' in col2 means skip, and '1' is in col4 for NA
    let obs = '';
    if (row[5] && typeof row[5] === 'string' && row[5].trim() !== '1' && row[5].trim() !== ' ') obs = row[5].trim();
    answers[`${activeSecIdx}::${schemaQ}`] = { perColumn: { '_default': val }, obs };
  }
  return answers;
}

// --- PARSER for multi-column sub-area files (Cocina Fria 9, Cocina Caliente 13, Despachos 14) ---
// Each sub-area gets 3 columns: SI, NO, NA (repeating pattern)
function parseMultiSubArea(rawData, schema) {
  const answers = {};
  const columnas = schema.columnas;
  
  // Find the header row to determine column positions
  let headerRowIdx = -1;
  for (let r = 0; r < rawData.length; r++) {
    const row = rawData[r];
    if (!row) continue;
    // Look for a row containing sub-area names
    const rowStr = row.map(c => String(c||'').trim().toUpperCase()).join('|');
    if (columnas.some(col => rowStr.includes(col.trim().toUpperCase()))) {
      headerRowIdx = r;
      break;
    }
  }
  
  if (headerRowIdx === -1) return answers;
  
  // Map each sub-area column name to its SI/NO/NA column indices
  const colPositions = {}; // colName -> { si: idx, no: idx, na: idx }
  const headerRow = rawData[headerRowIdx];
  
  columnas.forEach(colName => {
    const colNameUpper = colName.trim().toUpperCase();
    for (let c = 0; c < headerRow.length; c++) {
      if (String(headerRow[c] || '').trim().toUpperCase() === colNameUpper ||
          String(headerRow[c] || '').trim().toUpperCase().includes(colNameUpper)) {
        // Found the column header. SI is at c, NO at c+1, NA at c+2 (based on sub-header row)
        colPositions[colName] = { si: c, no: c + 1, na: c + 2 };
        break;
      }
    }
  });
  
  // Now parse data rows
  let activeSecIdx = -1;
  // Data starts after the sub-header rows (headerRowIdx + 2 or so)
  for (let r = headerRowIdx + 2; r < rawData.length; r++) {
    const row = rawData[r];
    if (!row || row.length === 0) continue;
    const col0 = String(row[0] || '').trim();
    const col1 = String(row[1] || '').trim();
    
    // Skip totals and percentage rows
    if (col1.toUpperCase() === 'TOTAL' || col1.toUpperCase().startsWith('% ') || col1.toUpperCase().includes('% POR') || col0.toUpperCase().includes('TOTAL ASPECTOS') || col0.toUpperCase().includes('CALIFICACIÓN') || col0.toUpperCase().includes('COMENTARIOS') || col0.toUpperCase().includes('NOVEDADES')) continue;
    if (!col0 && !col1) continue;
    
    // Check for section header (may appear mid-data for second set of sub-areas)
    const secMatch = schema.secciones.findIndex(s => s.nombre.trim().toUpperCase() === col0.toUpperCase());
    if (secMatch !== -1) {
      activeSecIdx = secMatch;
      // Check if col1 is also a question (section + question on same row)
      if (!col1) continue;
    }
    
    // Re-check for a second set of sub-area headers in col0 = 'ASPECTOS' pattern
    if (col0.toUpperCase() === 'ASPECTOS' || col0.toUpperCase() === 'ASPECTO') {
      // This is a new header row for a different set of sub-areas - re-map column positions
      const newHeaderRow = row;
      columnas.forEach(colName => {
        const colNameUpper = colName.trim().toUpperCase();
        for (let c = 2; c < newHeaderRow.length; c++) {
          if (String(newHeaderRow[c] || '').trim().toUpperCase() === colNameUpper ||
              String(newHeaderRow[c] || '').trim().toUpperCase().includes(colNameUpper)) {
            colPositions[colName] = { si: c, no: c + 1, na: c + 2 };
            break;
          }
        }
      });
      continue;
    }
    
    if (activeSecIdx === -1) continue;
    
    const q = col1 || col0;
    if (!q) continue;
    const schemaQ = schema.secciones[activeSecIdx].filas.find(f => f.trim().toLowerCase() === q.trim().toLowerCase());
    if (!schemaQ) continue;
    
    // Read per-column answers
    const perColumn = {};
    columnas.forEach(colName => {
      const pos = colPositions[colName];
      if (!pos) { perColumn[colName] = null; return; }
      if (row[pos.si] === 1 || row[pos.si] === '1') perColumn[colName] = 'SI';
      else if (row[pos.no] === 1 || row[pos.no] === '1') perColumn[colName] = 'NO';
      else if (row[pos.na] === 1 || row[pos.na] === '1') perColumn[colName] = 'NA';
      else perColumn[colName] = null;
    });
    
    answers[`${activeSecIdx}::${schemaQ}`] = { perColumn, obs: '' };
  }
  return answers;
}

// ======================================================================
// BUILD datos_formulario
// ======================================================================
function buildDatosFormulario(answers, schema, columnas, hasSubareaTabs, isBPMScale) {
  const datos = {};
  
  schema.secciones.forEach((sec, sIdx) => {
    sec.filas.forEach(fila => {
      const key = `${sIdx}::${fila}`;
      const answer = answers[key];
      const baseKey = `${fila}__sec_${sIdx}`;
      
      if (hasSubareaTabs) {
        // Sub-area tabs: each column gets its own answer key
        datos[baseKey] = '';
        datos[`${baseKey}__obs`] = '';
        columnas.forEach(col => {
          let val = null;
          if (answer && answer.perColumn[col] !== undefined) {
            val = answer.perColumn[col];
          }
          // If no answer, mark as NA
          if (!val) val = 'NA';
          datos[`${baseKey}__${col}`] = val;
          datos[`${baseKey}__${col}__obs`] = answer ? (answer.obs || '') : '';
        });
        
      } else if (isBPMScale) {
        // BPM scale: store numeric on base key
        let defaultVal = null;
        if (answer && answer.perColumn['_default'] !== undefined) {
          defaultVal = answer.perColumn['_default'];
        }
        let numericVal;
        if (defaultVal === 'SI') numericVal = '5';
        else if (defaultVal === 'NO') numericVal = '1';
        else numericVal = 'NA'; // Not answered or NA
        
        datos[baseKey] = numericVal;
        datos[`${baseKey}__obs`] = answer ? (answer.obs || '') : '';
        columnas.forEach(col => {
          datos[`${baseKey}__${col}`] = '';
          datos[`${baseKey}__${col}__obs`] = '';
        });
        
      } else {
        // Simple: SI/NO/NA on base key
        let defaultVal = null;
        if (answer && answer.perColumn['_default'] !== undefined) {
          defaultVal = answer.perColumn['_default'];
        }
        if (!defaultVal) defaultVal = 'NA';
        datos[baseKey] = defaultVal;
        datos[`${baseKey}__obs`] = answer ? (answer.obs || '') : '';
      }
    });
  });
  
  return datos;
}

// ======================================================================
// MAIN
// ======================================================================
const fileConfig = [
  { file: 'DCM-F-CPP-17 Verificación L&D Cocina fria (1) (1).xlsx', plantillaId: 9, parser: 'multi' },
  { file: 'DCM-F-CPP-18 Verificacion L&D almacen (2).xlsx', plantillaId: 10, parser: 'almacen' },
  { file: 'DCM-F-CPP-19 Verificación L&D comedor.xlsx', plantillaId: 11, parser: 'simple' },
  { file: 'DCM-F-CPP-20 L&D Baños y Lockers (PND).xlsx', plantillaId: 12, parser: 'simple' },
  { file: 'DCM-F-CPP-21 Verificación de L&D Cocina Caliente (1).xlsx', plantillaId: 13, parser: 'multi' },
  { file: 'DCM-F-CPP-23 Verificacion L&D Despachos (1).xlsx', plantillaId: 14, parser: 'multi' },
];

let insertCount = 0;

for (const cfg of fileConfig) {
  const pData = plantillasMap[cfg.plantillaId];
  if (!pData) { console.log(`No plantilla ${cfg.plantillaId}`); continue; }
  
  const filePath = path.join(folderPath, cfg.file);
  if (!fs.existsSync(filePath)) { console.log(`File not found: ${cfg.file}`); continue; }
  
  const workbook = xlsx.readFile(filePath);
  
  for (const sheetName of workbook.SheetNames) {
    const mes = sheetName.trim().toUpperCase();
    // Handle 'MRZO' typo
    const normalizedMes = mes === 'MRZO' ? 'MARZO' : mes;
    if (!mesesTarget[normalizedMes]) continue;
    
    const fechaStr = mesesTarget[normalizedMes];
    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    let answers;
    if (cfg.parser === 'almacen') {
      answers = parseAlmacen(rawData, pData.schema);
    } else if (cfg.parser === 'simple') {
      answers = parseSimpleSINONA(rawData, pData.schema);
    } else {
      answers = parseMultiSubArea(rawData, pData.schema);
    }
    
    const datos = buildDatosFormulario(answers, pData.schema, pData.columnas, pData.hasSubareaTabs, pData.isBPMScale);
    
    // Count answers
    let answeredCount = 0;
    let totalQ = 0;
    for (const [k, v] of Object.entries(answers)) {
      totalQ++;
      const vals = Object.values(v.perColumn);
      if (vals.some(x => x === 'SI' || x === 'NO')) answeredCount++;
    }
    
    db.prepare(`
      INSERT INTO visitas (pdv_id, user_id, area_id, tipo_visita_id, plantilla_id, fecha, hora_inicio, hora_fin, datos_formulario, responsable_id, estado, version_checklist)
      VALUES (?, ?, ?, ?, ?, ?, '10:00', '10:30', ?, ?, 'cerrada', 1)
    `).run(PDV_ID, USER_ID, AREA_ID, pData.tipo_visita_id, cfg.plantillaId, fechaStr, JSON.stringify(datos), USER_ID);
    
    insertCount++;
    console.log(`✅ ${cfg.file.substring(0, 40)}... -> ${normalizedMes} (P${cfg.plantillaId}) | ${answeredCount}/${totalQ} answered`);
  }
}

console.log(`\n🎉 Migration complete! ${insertCount} visits inserted.`);
