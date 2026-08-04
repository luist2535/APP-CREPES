import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import Excel from 'exceljs';

export async function GET(request) {
  try {
    // 1. Authenticate user
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Extract visit ID from query params
    const { searchParams } = new URL(request.url);
    const visitId = searchParams.get('id');
    if (!visitId) {
      return NextResponse.json({ error: 'ID de visita es requerido' }, { status: 400 });
    }

    // 3. Query visit details from DB
    const db = getDb();
    const { getUserAssignedCityId } = require('@/lib/auth');
    const assignedCityId = getUserAssignedCityId(user, db);

    const visit = db.prepare(`
      SELECT v.*, p.campos, p.nombre as plantilla_nombre, 
             u.nombre as auditor_nombre, pdv.nombre as pdv_nombre, pdv.ciudad_id as pdv_ciudad_id
      FROM visitas v
      LEFT JOIN plantillas p ON v.plantilla_id = p.id
      LEFT JOIN users u ON v.user_id = u.id
      LEFT JOIN pdv ON v.pdv_id = pdv.id
      WHERE v.id = ?
    `).get(parseInt(visitId));

    if (!visit) {
      return NextResponse.json({ error: 'Visita no encontrada' }, { status: 404 });
    }

    if (assignedCityId && visit.pdv_ciudad_id && parseInt(visit.pdv_ciudad_id) !== assignedCityId) {
      return NextResponse.json({ error: 'No autorizado para exportar visitas de otra ciudad' }, { status: 403 });
    }

    const rawCampos = visit.campos_personalizados || visit.campos;
    if (!rawCampos) {
      return NextResponse.json({ error: 'Esta visita no posee un formulario checklist o campos configurados' }, { status: 400 });
    }

    const templateConfig = JSON.parse(rawCampos)[0] || {};
    const templateFileName = templateConfig.code ? `${templateConfig.code}.xlsx` : null;
    const templatePath = templateFileName ? path.join(process.cwd(), 'public', 'templates', templateFileName) : null;

    if (!templateConfig.code || !fs.existsSync(templatePath)) {
      // ---------------------------------------------------------
      // FALLBACK: EXPORTACIÓN GENÉRICA
      // ---------------------------------------------------------
      const workbook = new Excel.Workbook();
      const sheet = workbook.addWorksheet('Resultados de Visita');
      
      sheet.columns = [
        { header: 'SECCIÓN', key: 'seccion', width: 25 },
        { header: 'SUB-ÁREA', key: 'subarea', width: 20 },
        { header: 'ÍTEM / PREGUNTA', key: 'item', width: 50 },
        { header: 'RESPUESTA', key: 'respuesta', width: 15 },
        { header: 'OBSERVACIONES', key: 'obs', width: 40 }
      ];
      
      sheet.getRow(1).font = { bold: true };
      
      const answers = JSON.parse(visit.datos_formulario || '{}');
      const hasSubTabs = templateConfig.tipo === 'matrix' && templateConfig.columnas && templateConfig.columnas.length > 0;
      
      if (templateConfig.secciones) {
        templateConfig.secciones.forEach((sec, sIdx) => {
          const secName = sec.nombre || 'General';
          if (sec.filas) {
            sec.filas.forEach((fila) => {
              let base = fila;
              if (templateConfig.secciones.length > 1) base = `${fila}__sec_${sIdx}`;
              
              if (hasSubTabs) {
                 templateConfig.columnas.forEach((col) => {
                    const answerKey = `${base}__${col}`;
                    const fallbackKey = `${fila}__${col}`;
                    const userAns = answers[answerKey] || answers[fallbackKey] || 'Sin responder';
                    const userObs = answers[`${answerKey}__obs`] || answers[`${answerKey}_obs`] || answers[`${fallbackKey}__obs`] || answers[`${fallbackKey}_obs`] || '';
                    sheet.addRow({ seccion: secName, subarea: col, item: fila, respuesta: userAns, obs: userObs });
                 });
              } else {
                 let defaultColKey = base;
                 if (templateConfig.tipo === 'matrix' && templateConfig.columnas && templateConfig.columnas[0]) {
                    defaultColKey = `${base}__${templateConfig.columnas[0]}`;
                 }
                 const fallbackColKey = (templateConfig.tipo === 'matrix' && templateConfig.columnas && templateConfig.columnas[0]) ? `${fila}__${templateConfig.columnas[0]}` : fila;
                 
                 const userAns = answers[defaultColKey] || answers[base] || answers[fallbackColKey] || answers[fila] || 'Sin responder';
                 const userObs = answers[`${defaultColKey}__obs`] || answers[`${base}__obs`] || answers[`${base}_obs`] || answers[`${fallbackColKey}__obs`] || answers[`${fila}__obs`] || answers[`${fila}_obs`] || '';
                 sheet.addRow({ seccion: secName, subarea: 'N/A', item: fila, respuesta: userAns, obs: userObs });
              }
            });
          }
        });
      }
      
      const buffer = await workbook.xlsx.writeBuffer();
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Disposition': `attachment; filename="Reporte_Generico_Visita_${visitId}.xlsx"`,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });
    }

    // 4. Load Excel template
    const workbook = new Excel.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const sheet = workbook.worksheets[0];

    const answers = JSON.parse(visit.datos_formulario || '{}');

    // 5. Fill Auditor Name and Date in Row 4
    const getCellValueStr = (cell) => {
      if (!cell || cell.value === null || cell.value === undefined) return '';
      if (typeof cell.value === 'object') {
        if (cell.value.richText) return cell.value.richText.map(t => t.text).join('');
        if (cell.value.formula) return String(cell.value.result || '');
      }
      return String(cell.value);
    };

    const row4 = sheet.getRow(4);
    row4.eachCell({ includeEmpty: true }, (cell) => {
      const val = getCellValueStr(cell);
      if (val.includes('VERIFICACIÓN REALIZADA POR') || val.includes('AUDITOR')) {
        cell.value = val.replace(/_____+/, visit.auditor_nombre);
      }
      if (val.includes('FECHA')) {
        const formattedDate = new Date(visit.fecha).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        cell.value = val.replace(/_____+/, formattedDate);
      }
    });

    // 6. Map Columns for SI, NO, NA, 1-5 (BPM scale) and sub-areas
    const isMatrix = templateConfig.tipo === 'matrix';

    // Helper: detect if a header value is a valid answer type (SI/NO/NA or numeric 1-5 or N/A)
    const VALID_ANSWER_TYPES = new Set(['SI', 'NO', 'NA', 'N/A', '1', '2', '3', '4', '5']);
    const normalizeHeaderType = (raw) => {
      const t = String(raw || '').trim().toUpperCase();
      if (t === 'N/A') return 'NA';
      return t;
    };

    // Detect BPM (1-5 scale) from template columns
    const isBPMScale = Array.isArray(templateConfig.columnas) &&
      templateConfig.columnas.some(c => {
        const u = String(c || '').toUpperCase();
        return u === 'SATISFACTORIO' || ['1','2','3','4','5'].includes(u);
      });

    // Find column mapping from sheet
    // Array of { subArea: string, type: 'SI'|'NO'|'NA'|'1'|'2'|'3'|'4'|'5'|'OBSERVACIONES', colNumber: number }
    const colMappings = [];

    // Scan rows 5-7 for headers — supports both classic (SI/NO/NA) and BPM (1-5/NA/OBSERVACIONES)
    const scanColHeaders = (startCol, endCol, subAreaName) => {
      for (let c = startCol; c <= endCol; c++) {
        // Try rows 7 → 6 → 5 for the header label
        const h7 = getCellValueStr(sheet.getRow(7).getCell(c));
        const h6 = getCellValueStr(sheet.getRow(6).getCell(c));
        const h5 = getCellValueStr(sheet.getRow(5).getCell(c));
        const raw = h7 || h6 || h5;
        const type = normalizeHeaderType(raw);
        if (VALID_ANSWER_TYPES.has(type)) {
          colMappings.push({ subArea: subAreaName, type, colNumber: c });
        } else if (type.includes('OBSERVAC')) {
          colMappings.push({ subArea: subAreaName, type: 'OBSERVACIONES', colNumber: c });
        }
      }
    };

    if (isMatrix && !isBPMScale) {
      // Classic matrix: sub-areas in Row 5 (CONOS, REPOSTERÍA, etc.), SI/NO/NA in rows 6-7
      const row5 = sheet.getRow(5);
      const subAreas = [];
      row5.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const val = getCellValueStr(cell).trim();
        if (val !== '' && val !== 'ASPECTO' && val !== 'ASPECTOS' && colNumber >= 3) {
          if (!subAreas.some(sa => sa.name === val)) {
            subAreas.push({ name: val, startCol: colNumber });
          }
        }
      });
      subAreas.forEach((sa, idx) => {
        const endCol = idx < subAreas.length - 1 ? subAreas[idx + 1].startCol - 1 : sheet.columnCount;
        scanColHeaders(sa.startCol, endCol, sa.name);
      });
    } else {
      // Simple checklist or BPM: scan columns 2-20 for SI/NO/NA/1-5/OBSERVACIONES headers
      scanColHeaders(2, Math.min(sheet.columnCount, 20), 'EVALUACION');
    }

    // 7. Write answers to checklist rows
    let commentRowIndex = -1;

    // Helper: Normalize strings for robust comparison (removes accents, extra spaces, lowercase)
    const normalizeString = (str) => {
      if (!str) return '';
      return String(str)
        .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[.,;:()\[\]{}¿?¡!"'\-]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    // Helper: get answer by key (normalized)
    const normalizedAnswers = {};
    for (const key in answers) {
      normalizedAnswers[normalizeString(key)] = answers[key];
    }
    const getAns = (k) => normalizedAnswers[normalizeString(k)];

    // Helper: resolve answer and observation for a plantilla fila item
    // Uses the stored plantilla key (fila name + optional sec index), NOT the Excel cell text
    const resolveAnsByFila = (fila, sIdx, multiSec) => {
      const base = multiSec ? `${fila}__sec_${sIdx}` : fila;
      let ans = '';
      let obs = '';

      if (isBPMScale) {
        // BPM: answer stored directly on base key (no column suffix)
        ans = getAns(base) || getAns(fila) || '';
        // Also try with first column key in case it was stored that way
        if (!ans && templateConfig.columnas && templateConfig.columnas[0] &&
            !['1','2','3','4','5','NA','N/A','SATISFACTORIO','OBSERVACIONES'].includes(String(templateConfig.columnas[0]).toUpperCase())) {
          ans = getAns(`${base}__${templateConfig.columnas[0]}`) || getAns(`${fila}__${templateConfig.columnas[0]}`) || '';
        }
        obs = getAns(`${base}__obs`) || getAns(`${base}_obs`) || getAns(`${fila}__obs`) || getAns(`${fila}_obs`) || '';
      } else if (isMatrix && templateConfig.columnas && templateConfig.columnas[0]) {
        // Matrix-as-checklist: try with column suffix
        const colKey = `${base}__${templateConfig.columnas[0]}`;
        const fallColKey = `${fila}__${templateConfig.columnas[0]}`;
        ans = getAns(colKey) || getAns(base) || getAns(fallColKey) || getAns(fila) || '';
        obs = getAns(`${colKey}__obs`) || getAns(`${colKey}_obs`) || getAns(`${base}__obs`) || getAns(`${base}_obs`) || getAns(`${fila}__obs`) || '';
      } else {
        ans = getAns(base) || getAns(fila) || '';
        obs = getAns(`${base}__obs`) || getAns(`${base}_obs`) || getAns(`${fila}__obs`) || getAns(`${fila}_obs`) || '';
      }

      return { ans: String(ans || '').trim(), obs: String(obs || '').trim() };
    };

    // Pre-build section names set (for Excel header row detection) and plantilla item list
    const multiSec = templateConfig.secciones && templateConfig.secciones.length > 1;
    const sectionNames = new Set();
    const plantillaItems = [];
    if (templateConfig.secciones) {
      templateConfig.secciones.forEach((sec, sIdx) => {
        if (sec.nombre) sectionNames.add(normalizeString(sec.nombre));
        if (sec.filas) {
          sec.filas.forEach(fila => {
            const filaUpper = String(fila || '').trim().toUpperCase();
            if (filaUpper === 'ASPECTO' || filaUpper === 'ASPECTOS' || filaUpper === '') return;
            plantillaItems.push({ fila, sIdx });
          });
        }
      });
    }

    // --- STRATEGY: Template-driven positional filling ---
    // Pre-scan the Excel to identify which rows are checklist items (data rows),
    // skipping headers, section headers, and footer rows.
    // Then fill them in the same order as the plantilla secciones/filas.

    // Step A: collect candidate data row numbers from the Excel
    const SKIP_B_VALUES = new Set(['TOTAL', '% POR AREA', 'ASPECTO', 'ASPECTOS', 'OBSERVACIONES', 'NA', 'N/A']);
    const STOP_A_VALUES = ['TOTAL', 'PARA DILIGENCIAMIENTO', 'CÓDIGO:', 'Responsable', 'COMENTARIOS'];
    const SECTION_HEADER_RE = /^[A-ZÁÉÍÓÚÑÜ\s]{4,}$/; // all-caps 4+ chars → section header

    const dataRowNumbers = [];
    for (let r = 6; r <= sheet.rowCount; r++) {
      const cellA = sheet.getRow(r).getCell(1);
      const cellB = sheet.getRow(r).getCell(2);

      const valA = getCellValueStr(cellA).trim();
      const valB = getCellValueStr(cellB).trim();

      // Detect comment/stop rows
      if (valA === 'COMENTARIOS:' || valA.startsWith('COMENTARIOS') || valA.includes('Observaciones adicionales')) {
        commentRowIndex = r;
      }
      if (STOP_A_VALUES.some(s => valA.includes(s))) break;

      if (valB === '' || SKIP_B_VALUES.has(valB.toUpperCase())) continue;

      // Skip rows where B looks like a section header:
      // 1) The normalized valB matches a known section name from the plantilla
      // 2) Col A is non-empty in same row (section name often in col A on BPM sheets)
      // 3) Col B is all-uppercase 4+ chars (generic all-caps header)
      const valBUpper = valB.toUpperCase();
      const isSectionByName = sectionNames.has(normalizeString(valB));
      const isAllCapsHeader = SECTION_HEADER_RE.test(valB) && valB.length > 3 && valB === valBUpper;
      // We do NOT skip just because Col A has text. In many templates, Col A is a merged category cell spanning all questions.
      if (isSectionByName || isAllCapsHeader) continue;

      dataRowNumbers.push(r);
    }

    // Step B: fill Excel rows positionally
    // If counts match, pair by index. If they differ, fall back to text-based matching as best-effort.
    const usePositional = dataRowNumbers.length === plantillaItems.length;

    if (usePositional) {
      plantillaItems.forEach(({ fila, sIdx }, idx) => {
        const r = dataRowNumbers[idx];
        if (!r) return;

        if (isMatrix && !isBPMScale) {
          // Classic matrix: write X for each sub-area
          templateConfig.columnas.forEach((subArea) => {
            const base = multiSec ? `${fila}__sec_${sIdx}` : fila;
            const colKey = `${base}__${subArea}`;
            const fallKey = `${fila}__${subArea}`;
            const userAns = getAns(colKey) || getAns(fallKey) || '';
            if (userAns) {
              const targetCol = colMappings.find(m => m.subArea.trim().toUpperCase() === subArea.trim().toUpperCase() && m.type === userAns.toUpperCase());
              if (targetCol) sheet.getRow(r).getCell(targetCol.colNumber).value = 'X';
            }
          });
        } else {
          // BPM or simple checklist
          const { ans: userAns, obs: userObs } = resolveAnsByFila(fila, sIdx, multiSec);
          if (userAns) {
            const normalizedAns = userAns === 'N/A' ? 'NA' : userAns.toUpperCase();
            const targetCol = colMappings.find(m => m.subArea === 'EVALUACION' && m.type === normalizedAns);
            if (targetCol) sheet.getRow(r).getCell(targetCol.colNumber).value = 'X';
          }
          if (userObs) {
            const obsCol = colMappings.find(m => m.subArea === 'EVALUACION' && m.type === 'OBSERVACIONES');
            if (obsCol) sheet.getRow(r).getCell(obsCol.colNumber).value = userObs;
          }
        }
      });
    } else {
      // Fallback: text-based matching (original logic, normalized)
      const resolveAnsByText = (itemName, subArea) => {
        const multiSec2 = templateConfig.secciones && templateConfig.secciones.length > 1;
        
        const normItem = normalizeString(itemName);
        let matchedItemName = itemName;
        
        let foundExact = false;
        for (const k in normalizedAnswers) {
          if (k === normItem || k.startsWith(normItem + '__')) { foundExact = true; break; }
        }
        
        if (!foundExact) {
           const targetWords = new Set(normItem.split(' ').filter(w => w.length > 3));
           let bestKey = null;
           let maxScore = 0;
           for (const k in normalizedAnswers) {
              const baseKey = k.split('__')[0];
              const kWords = new Set(baseKey.split(' ').filter(w => w.length > 3));
              let matchCount = 0;
              for (const w of kWords) {
                 if (targetWords.has(w)) matchCount++;
              }
              if (matchCount > maxScore && matchCount >= 3) {
                 maxScore = matchCount;
                 bestKey = baseKey;
              }
           }
           if (bestKey) matchedItemName = bestKey;
        }

        let ans = '';
        let obs = '';
        if (subArea) {
          ans = getAns(`${matchedItemName}__${subArea}`) || '';
          obs = getAns(`${matchedItemName}__${subArea}__obs`) || getAns(`${matchedItemName}__${subArea}_obs`) || '';
          if (!ans && multiSec2) {
            for (let i = 0; i < templateConfig.secciones.length; i++) {
              const k = `${matchedItemName}__sec_${i}__${subArea}`;
              if (getAns(k)) { ans = getAns(k); obs = getAns(`${k}__obs`) || getAns(`${k}_obs`) || obs; break; }
            }
          }
        } else {
          ans = getAns(matchedItemName) || '';
          obs = getAns(`${matchedItemName}__obs`) || getAns(`${matchedItemName}_obs`) || '';
          if (!ans && templateConfig.secciones) {
            for (let i = 0; i < templateConfig.secciones.length; i++) {
              const k = `${matchedItemName}__sec_${i}`;
              if (getAns(k)) { ans = getAns(k); obs = getAns(`${k}__obs`) || getAns(`${k}_obs`) || obs; break; }
              const colKey = templateConfig.columnas && templateConfig.columnas[0] ? `${k}__${templateConfig.columnas[0]}` : null;
              if (colKey && getAns(colKey)) { ans = getAns(colKey); obs = getAns(`${colKey}__obs`) || getAns(`${colKey}_obs`) || obs; break; }
            }
          }
          if (!ans && templateConfig.columnas && templateConfig.columnas[0]) {
            const colKey = `${matchedItemName}__${templateConfig.columnas[0]}`;
            if (getAns(colKey)) { ans = getAns(colKey); obs = getAns(`${colKey}__obs`) || getAns(`${colKey}_obs`) || obs; }
          }
        }
        return { ans: String(ans || '').trim(), obs: String(obs || '').trim() };
      };

      dataRowNumbers.forEach(r => {
        const cellB = sheet.getRow(r).getCell(2);
        const valB = getCellValueStr(cellB).trim();
        if (!valB) return;
        const itemName = valB;

        if (isMatrix && !isBPMScale) {
          templateConfig.columnas.forEach((subArea) => {
            const { ans: userAns } = resolveAnsByText(itemName, subArea);
            if (userAns) {
              const targetCol = colMappings.find(m => m.subArea.trim().toUpperCase() === subArea.trim().toUpperCase() && m.type === userAns.toUpperCase());
              if (targetCol) sheet.getRow(r).getCell(targetCol.colNumber).value = 'X';
            }
          });
        } else {
          const { ans: userAns, obs: userObs } = resolveAnsByText(itemName,
            isBPMScale && templateConfig.columnas && templateConfig.columnas[0] &&
            !['1','2','3','4','5','NA','N/A','SATISFACTORIO','OBSERVACIONES'].includes(String(templateConfig.columnas[0]).toUpperCase())
              ? templateConfig.columnas[0] : null);
          if (userAns) {
            const normalizedAns = userAns === 'N/A' ? 'NA' : userAns.toUpperCase();
            const targetCol = colMappings.find(m => m.subArea === 'EVALUACION' && m.type === normalizedAns);
            if (targetCol) sheet.getRow(r).getCell(targetCol.colNumber).value = 'X';
          }
          if (userObs) {
            const obsCol = colMappings.find(m => m.subArea === 'EVALUACION' && m.type === 'OBSERVACIONES');
            if (obsCol) sheet.getRow(r).getCell(obsCol.colNumber).value = userObs;
          }
        }
      });
    }

    // 8. Write general observations/comments at the bottom of main sheet
    if (commentRowIndex !== -1 && visit.observaciones) {
      const cellObs = sheet.getRow(commentRowIndex).getCell(2);
      if (cellObs.value === null || String(cellObs.value).trim() === '') {
        cellObs.value = visit.observaciones;
      } else {
        sheet.getRow(commentRowIndex + 1).getCell(1).value = `Observaciones: ${visit.observaciones}`;
      }
    }

    // Calculate Quality Checklist Score
    // For BPM (1-5 scale): compute sumPuntaje and count respondidos to get average
    // For classic (SI/NO): compute satisfactorios vs noSatisfactorios
    let totalAspectos = 0;
    let satisfactorios = 0;  // SI responses OR numeric responses >= 1
    let noSatisfactorios = 0; // NO responses
    let noAplica = 0;
    let sumPuntaje = 0;       // Sum of numeric scores (BPM scale 1-5)
    let respondidosBPM = 0;  // Count of items with a numeric answer (for BPM average)

    if (templateConfig.secciones) {
      templateConfig.secciones.forEach((sec, sIdx) => {
        if (sec.filas) {
          sec.filas.forEach(fila => {
            let base = fila;
            if (templateConfig.secciones.length > 1) base = `${fila}__sec_${sIdx}`;

            if (isBPMScale) {
              // BPM: single answer per row (the numeric value 1-5 or NA)
              const colKey = templateConfig.columnas && templateConfig.columnas[0] ? `${base}__${templateConfig.columnas[0]}` : base;
              const val = answers[colKey] || answers[base] || answers[fila] || '';
              const vStr = String(val).trim().toUpperCase();
              totalAspectos++;
              if (vStr === 'NA' || vStr === 'N/A') {
                noAplica++;
              } else {
                const num = parseInt(vStr, 10);
                if (!isNaN(num) && num >= 1 && num <= 5) {
                  respondidosBPM++;
                  sumPuntaje += num;
                  satisfactorios++; // count any numeric answer as "responded"
                }
              }
            } else if (isMatrix && templateConfig.columnas) {
              templateConfig.columnas.forEach(col => {
                totalAspectos++;
                const val = answers[`${base}__${col}`] || answers[`${fila}__${col}`];
                const vUp = String(val || '').trim().toUpperCase();
                if (vUp === 'SI') satisfactorios++;
                else if (vUp === 'NO') noSatisfactorios++;
                else if (vUp === 'NA' || vUp === 'N/A') noAplica++;
              });
            } else {
              totalAspectos++;
              let defaultColKey = base;
              if (templateConfig.tipo === 'matrix' && templateConfig.columnas && templateConfig.columnas[0]) {
                defaultColKey = `${base}__${templateConfig.columnas[0]}`;
              }
              const fallbackColKey = (templateConfig.tipo === 'matrix' && templateConfig.columnas && templateConfig.columnas[0]) ? `${fila}__${templateConfig.columnas[0]}` : fila;
              const val = answers[defaultColKey] || answers[base] || answers[fallbackColKey] || answers[fila];
              const vUp = String(val || '').trim().toUpperCase();
              if (vUp === 'SI') satisfactorios++;
              else if (vUp === 'NO') noSatisfactorios++;
              else if (vUp === 'NA' || vUp === 'N/A') noAplica++;
            }
          });
        }
      });
    }

    const denominador = totalAspectos - noAplica;
    // For BPM: use avg score out of 5 → percentage. For classic: satisfactorios / denominador
    const promedioBPM = respondidosBPM > 0 ? (sumPuntaje / respondidosBPM) : 0;
    const calificacionPorcentaje = isBPMScale
      ? (respondidosBPM > 0 ? Math.round((promedioBPM / 5) * 100) : 0)
      : (denominador > 0 ? Math.round((satisfactorios / denominador) * 100) : (totalAspectos > 0 ? 100 : 0));

    // Populate score table cells on main worksheet (summary section at the bottom)
    for (let r = 12; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const masters = [];
      for (let c = 1; c <= sheet.columnCount; c++) {
        const cell = row.getCell(c);
        if (!cell.isMerged || cell.master === cell) {
          let v = '';
          if (cell.value) {
            if (typeof cell.value === 'object' && cell.value.richText) {
              v = cell.value.richText.map(t => t.text).join('');
            } else {
              v = String(cell.value);
            }
          }
          masters.push({ cell, col: c, address: cell.address, val: v.trim() });
        }
      }

      for (let i = 0; i < masters.length; i++) {
        const m = masters[i];
        const vUp = m.val.toUpperCase();

        if (vUp.includes('TOTAL ASPECTOS')) {
          if (masters[i + 1]) masters[i + 1].cell.value = totalAspectos;
          if (masters[i + 2] && !masters[i + 2].val.toUpperCase().includes('CALIFICAC') && !masters[i + 2].val.toUpperCase().includes('RECOMEND')) {
            masters[i + 2].cell.value = `${totalAspectos > 0 ? 100 : 0}%`;
          }
        } else if (isBPMScale && (vUp.includes('PROMEDIO') || vUp === 'PUNTAJE' || vUp.includes('PUNTAJE PROM'))) {
          // BPM: show average score
          if (masters[i + 1]) masters[i + 1].cell.value = promedioBPM > 0 ? promedioBPM.toFixed(1) : '-';
        } else if (vUp === 'SATISFACTORIO:' || vUp === 'SATISFACTORIO' || vUp === 'SATISFACTORIO ') {
          if (isBPMScale) {
            // For BPM, "SATISFACTORIO" row shows count of responded items and avg score
            if (masters[i + 1]) masters[i + 1].cell.value = respondidosBPM;
            if (masters[i + 2] && !masters[i + 2].val.toUpperCase().includes('RECOMEND') && !masters[i + 2].val.toUpperCase().includes('SATISF')) {
              masters[i + 2].cell.value = promedioBPM > 0 ? `Prom: ${promedioBPM.toFixed(1)}/5` : '-';
            }
          } else {
            if (masters[i + 1]) masters[i + 1].cell.value = satisfactorios;
            if (masters[i + 2] && !masters[i + 2].val.toUpperCase().includes('RECOMEND') && !masters[i + 2].val.toUpperCase().includes('SATISF')) {
              masters[i + 2].cell.value = `${totalAspectos > 0 ? Math.round((satisfactorios / totalAspectos) * 100) : 0}%`;
            }
          }
        } else if (!isBPMScale && vUp.includes('NO SATISF')) {
          if (masters[i + 1]) masters[i + 1].cell.value = noSatisfactorios;
          if (masters[i + 2] && !masters[i + 2].val.toUpperCase().includes('RECOMEND') && !masters[i + 2].val.toUpperCase().includes('APLICA')) {
            masters[i + 2].cell.value = `${totalAspectos > 0 ? Math.round((noSatisfactorios / totalAspectos) * 100) : 0}%`;
          }
        } else if (vUp === 'NO APLICA:' || vUp === 'NO APLICA' || vUp === 'NO APLICA ' || vUp === 'N/A:' || vUp === 'NA:') {
          if (masters[i + 1]) masters[i + 1].cell.value = noAplica;
          if (masters[i + 2] && !masters[i + 2].val.toUpperCase().includes('RECOMEND')) {
            masters[i + 2].cell.value = `${totalAspectos > 0 ? Math.round((noAplica / totalAspectos) * 100) : 0}%`;
          }
        } else if (vUp.includes('CALIFICAC') || vUp.includes('% CALIFICAC') || vUp === 'RESULTADO') {
          const scoreLabel = isBPMScale
            ? `${calificacionPorcentaje}% (Prom ${promedioBPM.toFixed(1)}/5)`
            : `${calificacionPorcentaje}%`;
          if (masters[i + 1] && !masters[i + 1].val.toUpperCase().includes('RECOMEND')) {
            masters[i + 1].cell.value = scoreLabel;
          } else {
            m.cell.value = `CALIFICACIÓN= ${scoreLabel}`;
          }
        }
      }
    }

    // 9. Generate Observations Summary Worksheet (Segunda Hoja)
    const obsSheet = workbook.addWorksheet('Resumen de Observaciones', {
      views: [{ showGridLines: true }]
    });

    const hasSubTabs = isMatrix && templateConfig.columnas && templateConfig.columnas.length > 0 && !templateConfig.columnas.some(c => c.toUpperCase().includes('SATISFACTORIO') || c.toUpperCase().includes('OBSERVACION') || c === 'NA' || c === 'N/A');

    if (hasSubTabs) {
      obsSheet.columns = [
        { header: 'No.', key: 'num', width: 6 },
        { header: 'Sección / Categoría', key: 'seccion', width: 24 },
        { header: 'Sub-área', key: 'subarea', width: 18 },
        { header: 'Ítem / Aspecto Evaluado', key: 'item', width: 38 },
        { header: 'Estado', key: 'estado', width: 14 },
        { header: 'Observación Registrada', key: 'obs', width: 48 },
        { header: 'Registrado Por & Fecha', key: 'auditor', width: 28 }
      ];
    } else {
      obsSheet.columns = [
        { header: 'No.', key: 'num', width: 6 },
        { header: 'Sección / Categoría', key: 'seccion', width: 26 },
        { header: 'Ítem / Aspecto Evaluado', key: 'item', width: 42 },
        { header: 'Estado', key: 'estado', width: 14 },
        { header: 'Observación Registrada', key: 'obs', width: 50 },
        { header: 'Registrado Por & Fecha', key: 'auditor', width: 28 }
      ];
    }

    // Add Banner Title in Row 1 & Subtitle in Row 2
    obsSheet.spliceRows(1, 0, [], [], []);

    const totalCols = hasSubTabs ? 7 : 6;
    obsSheet.mergeCells(1, 1, 1, totalCols);
    const titleCell = obsSheet.getCell(1, 1);
    titleCell.value = '📋 REGISTRO Y RESUMEN DE OBSERVACIONES POR ÍTEM';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B3A2A' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    obsSheet.getRow(1).height = 32;

    obsSheet.mergeCells(2, 1, 2, totalCols);
    const metaCell = obsSheet.getCell(2, 1);
    const formattedDateMeta = new Date(visit.fecha).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    metaCell.value = `Formulario: ${visit.plantilla_nombre || templateConfig.nombre || 'Checklist de Calidad'}  |  Sucursal/PDV: ${visit.pdv_nombre || 'N/A'}  |  Auditor: ${visit.auditor_nombre || 'N/A'}  |  Fecha: ${formattedDateMeta}`;
    metaCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF334155' } };
    metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    metaCell.alignment = { vertical: 'middle', horizontal: 'center' };
    obsSheet.getRow(2).height = 24;

    // Row 4 is table header
    const headerRow = obsSheet.getRow(4);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF64748B' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    });

    // Collect Observations
    let count = 0;
    const auditorDateStr = `${visit.auditor_nombre || 'Auditor'} (${new Date(visit.fecha).toLocaleDateString('es-ES')})`;

    // Helper: label for answer value in the observations summary
    const labelAns = (val) => {
      const v = String(val || '').trim().toUpperCase();
      if (v === 'SI') return '🟢 CUMPLE';
      if (v === 'NO') return '❌ NO CUMPLE';
      if (v === 'NA' || v === 'N/A') return '🔘 N/A';
      if (['1','2','3','4','5'].includes(v)) return `⭐ Puntaje: ${v}/5`;
      return val || 'Sin responder';
    };

    if (templateConfig && templateConfig.secciones) {
      templateConfig.secciones.forEach((sec, sIdx) => {
        const secName = sec.nombre || 'General';

        if (sec.filas) {
          sec.filas.forEach((fila) => {
            let base = fila;
            if (templateConfig.secciones.length > 1) base = `${fila}__sec_${sIdx}`;

            if (hasSubTabs) {
              // Classic matrix with real sub-area tabs
              templateConfig.columnas.forEach((col) => {
                const answerKey = `${base}__${col}`;
                const fallbackKey = `${fila}__${col}`;
                const userAns = answers[answerKey] || answers[fallbackKey] || '';
                const userObs = answers[`${answerKey}__obs`] || answers[`${answerKey}_obs`] || answers[`${fallbackKey}__obs`] || answers[`${fallbackKey}_obs`] || '';

                if (userObs && String(userObs).trim() !== '') {
                  count++;
                  const newRow = obsSheet.addRow({
                    num: count,
                    seccion: secName,
                    subarea: col,
                    item: fila,
                    estado: labelAns(userAns),
                    obs: String(userObs).trim(),
                    auditor: auditorDateStr
                  });
                  newRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    cell.font = { name: 'Arial', size: 10, color: { argb: 'FF334155' } };
                    cell.border = {
                      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                    };
                    cell.alignment = { vertical: 'middle', wrapText: true };
                    if (colNumber === 1 || colNumber === 5) cell.alignment.horizontal = 'center';
                  });
                  newRow.height = 24;
                }
              });
            } else {
              // Simple checklist or BPM (1-5): one answer + obs per row
              let defaultColKey = base;
              if (templateConfig.tipo === 'matrix' && templateConfig.columnas && templateConfig.columnas[0]) {
                defaultColKey = `${base}__${templateConfig.columnas[0]}`;
              }
              const fallbackColKey = (templateConfig.tipo === 'matrix' && templateConfig.columnas && templateConfig.columnas[0]) ? `${fila}__${templateConfig.columnas[0]}` : fila;

              const userAns = answers[defaultColKey] || answers[base] || answers[fallbackColKey] || answers[fila] || '';
              const userObs = answers[`${defaultColKey}__obs`] || answers[`${base}__obs`] || answers[`${base}_obs`] || answers[`${fallbackColKey}__obs`] || answers[`${fila}__obs`] || answers[`${fila}_obs`] || '';

              if (userObs && String(userObs).trim() !== '') {
                count++;
                const newRow = obsSheet.addRow({
                  num: count,
                  seccion: secName,
                  item: fila,
                  estado: labelAns(userAns),
                  obs: String(userObs).trim(),
                  auditor: auditorDateStr
                });
                newRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                  cell.font = { name: 'Arial', size: 10, color: { argb: 'FF334155' } };
                  cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                  };
                  cell.alignment = { vertical: 'middle', wrapText: true };
                  if (colNumber === 1 || colNumber === 4) cell.alignment.horizontal = 'center';
                });
                newRow.height = 24;
              }
            }
          });
        }
      });
    }

    if (count === 0) {
      const emptyRow = obsSheet.addRow({
        num: '-',
        seccion: 'N/A',
        subarea: hasSubTabs ? 'N/A' : undefined,
        item: 'No se registraron observaciones adicionales para los ítems de este formulario.',
        estado: '-',
        obs: 'Sin novedades.',
        auditor: auditorDateStr
      });
      emptyRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF94A3B8' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      emptyRow.height = 24;
    }

    if (visit.observaciones && String(visit.observaciones).trim() !== '') {
      obsSheet.addRow([]);
      const genHeaderRow = obsSheet.addRow(['📌 OBSERVACIONES GENERALES DE LA VISITA']);
      obsSheet.mergeCells(genHeaderRow.number, 1, genHeaderRow.number, totalCols);
      const genHeaderCell = obsSheet.getCell(genHeaderRow.number, 1);
      genHeaderCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF6B3A2A' } };
      genHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF8F5' } };
      genHeaderRow.height = 24;

      const genTextRow = obsSheet.addRow([String(visit.observaciones).trim()]);
      obsSheet.mergeCells(genTextRow.number, 1, genTextRow.number, totalCols);
      const genTextCell = obsSheet.getCell(genTextRow.number, 1);
      genTextCell.font = { name: 'Arial', size: 10, color: { argb: 'FF334155' } };
      genTextCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      genTextRow.height = 40;
    }

    // 10. Generate file buffer
    const buffer = await workbook.xlsx.writeBuffer();

    const verNum = visit.version_checklist || visit.plantilla_version || 1;
    const pdvLimpio = visit.pdv_nombre.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
    const fileName = `Visita_Calidad_${templateConfig.code}_v${verNum}_${pdvLimpio}_${visit.fecha}.xlsx`;

    // 11. Guardar automáticamente en las carpetas y repositorio del servidor (Calidad)
    try {
      const timestamp = Date.now();
      const savedFileName = `${timestamp}_${fileName}`;
      const uploadDir = path.join(process.cwd(), 'public', 'archivos', 'excel');
      await fs.promises.mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, savedFileName);
      await fs.promises.writeFile(filePath, Buffer.from(buffer));

      try {
        db.prepare('ALTER TABLE archivos_repositorio ADD COLUMN tipo_documento TEXT').run();
      } catch (e) {}

      db.prepare(`
        INSERT INTO archivos_repositorio (
          nombre_original, nombre_guardado, ruta_archivo, tipo_archivo, 
          extension, tamano_bytes, categoria, referencia_id, user_id, observaciones, tipo_documento
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        fileName, 
        savedFileName, 
        `/archivos/excel/${savedFileName}`, 
        'excel', 
        'xlsx', 
        buffer.byteLength || buffer.length || 0, 
        'calidad_checklist', 
        visit.id ? String(visit.id) : null, 
        user.id, 
        `Exportación de Checklist de Calidad ID #${visit.id} - ${visit.pdv_nombre} (${visit.fecha}) [Checklist v${verNum}]`,
        'Checklist Calidad Excel'
      );
    } catch (saveErr) {
      console.error('Error guardando copia del Excel en repositorio:', saveErr);
    }

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });

  } catch (error) {
    console.error('Error al exportar visita a Excel:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}
