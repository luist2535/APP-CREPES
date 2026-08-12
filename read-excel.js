const XLSX = require('xlsx');
const path = require('path');

const wb = XLSX.readFile(path.resolve(__dirname, '..', 'Matriz de frecuencia de verificación de BPM - MACRO.xlsm'));

// Check each sheet's column offset pattern
const detailSheets = [
  '1. Prev_Frecuencias almacén',
  '2. Prev_Frecu Caliente (dia)',
  '3. Prev_Frecuenc Calient(noche)',
  '7. Prev_Frecuencia Comedor',
  '4. Prev_Frecuencia Despachos',
  '5. Prev_Frecuencia Transportes'
];

detailSheets.forEach(sheetName => {
  const ws = wb.Sheets[sheetName];
  if (!ws) return;
  
  const range = XLSX.utils.decode_range(ws['!ref']);
  console.log('\n=== ' + sheetName + ' ===');
  console.log('Range: ' + ws['!ref']);
  
  // Find which column has the descriptions (check A and B)
  let descCol = -1;
  for (let r = 6; r <= 15; r++) {
    for (let c = 0; c <= 2; c++) {
      const cell = ws[XLSX.utils.encode_cell({r, c})];
      if (cell && typeof cell.v === 'string' && cell.v.length > 20) {
        descCol = c;
        break;
      }
    }
    if (descCol >= 0) break;
  }
  console.log('Description column: ' + XLSX.utils.encode_col(descCol) + ' (index ' + descCol + ')');
  
  // Find first week header position
  for (let c = 0; c <= 10; c++) {
    for (let r = 4; r <= 7; r++) {
      const cell = ws[XLSX.utils.encode_cell({r, c})];
      if (cell && String(cell.v).startsWith('SEMANA 1')) {
        console.log('First SEMANA header at: ' + XLSX.utils.encode_col(c) + (r+1) + ' (col ' + c + ', row ' + (r+1) + ')');
      }
      if (cell && String(cell.v) === 'Obtenidos') {
        console.log('First "Obtenidos" at: ' + XLSX.utils.encode_col(c) + (r+1) + ' (col ' + c + ', row ' + (r+1) + ')');
        break;
      }
    }
  }
  
  // Find where "Totales" column is for first week
  for (let c = 0; c <= 10; c++) {
    const r = 6; // row 7 typically
    const cell = ws[XLSX.utils.encode_cell({r, c})];
    if (cell && String(cell.v) === 'Totales') {
      console.log('First "Totales" at: col ' + XLSX.utils.encode_col(c) + ' (index ' + c + ')');
      break;
    }
  }
  
  // Check a few item rows to see formula patterns
  for (let r = 7; r <= 12; r++) {
    for (let c = descCol + 1; c <= descCol + 6; c++) {
      const cell = ws[XLSX.utils.encode_cell({r, c})];
      if (cell && (cell.f || cell.v)) {
        const addr = XLSX.utils.encode_col(c) + (r+1);
        console.log('  ' + addr + ': v=' + cell.v + (cell.f ? ' f=' + cell.f : '') + ' t=' + cell.t);
      }
    }
  }
  
  // Count total rows with items (have value 5 in totales column for week 1)
  let itemCount = 0;
  let categoryCount = 0;
  const totalesCol = descCol + 2; // Typically 2 columns after description
  
  for (let r = 7; r <= range.e.r; r++) {
    const descCell = ws[XLSX.utils.encode_cell({r, c: descCol})];
    // Check if this row has a number 5 (totales) - it's an item row
    // Check multiple possible totales columns
    for (let tc = descCol + 1; tc <= descCol + 3; tc++) {
      const tCell = ws[XLSX.utils.encode_cell({r, c: tc})];
      if (tCell && tCell.v === 5 && descCell) {
        itemCount++;
        break;
      }
    }
    // Check if this is a category row (has AVERAGE formula)
    for (let fc = descCol + 1; fc <= descCol + 5; fc++) {
      const fCell = ws[XLSX.utils.encode_cell({r, c: fc})];
      if (fCell && fCell.f && fCell.f.includes('AVERAGE') && descCell) {
        categoryCount++;
        console.log('  Category row ' + (r+1) + ': ' + String(descCell.v).substring(0, 50));
        break;
      }
    }
  }
  console.log('Total items: ' + itemCount + ', Categories: ' + categoryCount);
});
