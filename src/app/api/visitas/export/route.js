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

    if (!visit.campos) {
      return NextResponse.json({ error: 'Esta visita no posee un formulario checklist' }, { status: 400 });
    }

    const templateConfig = JSON.parse(visit.campos)[0];
    if (!templateConfig || !templateConfig.code) {
      return NextResponse.json({ error: 'Código de plantilla no configurado' }, { status: 400 });
    }

    const templateFileName = `${templateConfig.code}.xlsx`;
    const templatePath = path.join(process.cwd(), 'public', 'templates', templateFileName);

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: `Plantilla original ${templateFileName} no encontrada en el servidor` }, { status: 404 });
    }

    // 4. Load Excel template
    const workbook = new Excel.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const sheet = workbook.worksheets[0];

    const answers = JSON.parse(visit.datos_formulario || '{}');

    // 5. Fill Auditor Name and Date in Row 4
    const row4 = sheet.getRow(4);
    row4.eachCell({ includeEmpty: true }, (cell) => {
      const val = cell.value ? String(cell.value) : '';
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

    // 6. Map Columns for SI, NO, NA and sub-areas
    const isMatrix = templateConfig.tipo === 'matrix';

    // Find column mapping from sheet
    const colMappings = []; // Array of { subArea: string, type: 'SI'|'NO'|'NA'|'OBSERVACIONES', colNumber: number }

    if (isMatrix) {
      // Matrix: CONOS, REPOSTERÍA, etc. are on Row 5, and SI, NO, NA headers on Row 6 or 7
      const row5 = sheet.getRow(5);
      const subAreas = [];
      row5.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const val = cell.value ? String(cell.value).trim() : '';
        if (val !== '' && val !== 'ASPECTO' && val !== 'ASPECTOS' && colNumber >= 3) {
          if (!subAreas.some(sa => sa.name === val)) {
            subAreas.push({ name: val, startCol: colNumber });
          }
        }
      });

      subAreas.forEach((sa, idx) => {
        const endCol = idx < subAreas.length - 1 ? subAreas[idx + 1].startCol - 1 : sheet.columnCount;
        for (let c = sa.startCol; c <= endCol; c++) {
          const headerText6 = sheet.getRow(6).getCell(c).value || '';
          const headerText7 = sheet.getRow(7).getCell(c).value || '';
          const type = String(headerText7 || headerText6).trim().toUpperCase();
          if (type === 'SI' || type === 'NO' || type === 'NA') {
            colMappings.push({
              subArea: sa.name,
              type,
              colNumber: c
            });
          }
        }
      });
    } else {
      // Simple Checklist: SI, NO, NA, OBSERVACIONES columns
      for (let c = 3; c <= Math.min(sheet.columnCount, 15); c++) {
        const headerText6 = sheet.getRow(6).getCell(c).value || '';
        const headerText7 = sheet.getRow(7).getCell(c).value || '';
        const type = String(headerText7 || headerText6).trim().toUpperCase();
        if (type === 'SI' || type === 'NO' || type === 'NA') {
          colMappings.push({
            subArea: 'EVALUACION',
            type,
            colNumber: c
          });
        } else if (type.includes('OBSERVAC') || String(headerText6).trim().toUpperCase().includes('OBSERVAC')) {
          colMappings.push({
            subArea: 'EVALUACION',
            type: 'OBSERVACIONES',
            colNumber: c
          });
        }
      }
    }

    // 7. Write answers to checklist rows
    let commentRowIndex = -1;

    for (let r = 8; r <= sheet.rowCount; r++) {
      const cellA = sheet.getRow(r).getCell(1);
      const cellB = sheet.getRow(r).getCell(2);

      const valA = cellA.value ? String(cellA.value).trim() : '';
      const valB = cellB.value ? String(cellB.value).trim() : '';

      if (valA === 'COMENTARIOS:' || valA.startsWith('COMENTARIOS') || valA.includes('Observaciones')) {
        commentRowIndex = r;
      }

      if (valA === 'TOTAL' || valA === 'PARA DILIGENCIAMIENTO' || valA === 'CÓDIGO:' || valA.includes('Responsable')) {
        // End of items rows
        break;
      }

      if (valB !== '' && valB !== 'TOTAL' && valB !== '% POR AREA') {
        const itemName = valB;

        // Process answers based on type
        if (isMatrix) {
          // Find answers for this item in each sub-area
          templateConfig.columnas.forEach((subArea) => {
            const answerKey = `${itemName}__${subArea}`;
            const userAns = answers[answerKey]; // 'SI', 'NO', or 'NA'
            if (userAns) {
              // Find matching column in mapping
              const targetCol = colMappings.find(m => m.subArea === subArea && m.type === userAns);
              if (targetCol) {
                // Write 'X' in that cell
                sheet.getRow(r).getCell(targetCol.colNumber).value = 'X';
              }
            }
          });
        } else {
          // Simple Checklist: find answer for this item
          const userAns = answers[itemName]; // 'SI', 'NO', or 'NA'

          if (userAns) {
            const targetCol = colMappings.find(m => m.subArea === 'EVALUACION' && m.type === userAns);
            if (targetCol) {
              sheet.getRow(r).getCell(targetCol.colNumber).value = 'X';
            }
          }
        }
      }
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
    let totalAspectos = 0;
    let satisfactorios = 0;
    let noSatisfactorios = 0;
    let noAplica = 0;

    if (templateConfig.secciones) {
      templateConfig.secciones.forEach(sec => {
        if (sec.filas) {
          sec.filas.forEach(fila => {
            if (isMatrix && templateConfig.columnas) {
              templateConfig.columnas.forEach(col => {
                totalAspectos++;
                const val = answers[`${fila}__${col}`];
                if (val === 'SI') satisfactorios++;
                else if (val === 'NO') noSatisfactorios++;
                else if (val === 'NA') noAplica++;
              });
            } else {
              totalAspectos++;
              const val = answers[fila] || (templateConfig.columnas && templateConfig.columnas[0] ? answers[`${fila}__${templateConfig.columnas[0]}`] : null);
              if (val === 'SI') satisfactorios++;
              else if (val === 'NO') noSatisfactorios++;
              else if (val === 'NA') noAplica++;
            }
          });
        }
      });
    }

    const denominador = totalAspectos - noAplica;
    const calificacionPorcentaje = denominador > 0 ? Math.round((satisfactorios / denominador) * 100) : (totalAspectos > 0 ? 100 : 0);

    // Populate score table cells on main worksheet (only in the bottom scoring summary section)
    for (let r = 15; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      let masters = [];
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
          if (masters[i + 1]) {
            masters[i + 1].cell.value = totalAspectos;
          }
          if (masters[i + 2] && !masters[i + 2].val.toUpperCase().includes('CALIFICAC') && !masters[i + 2].val.toUpperCase().includes('RECOMEND')) {
            masters[i + 2].cell.value = `${totalAspectos > 0 ? 100 : 0}%`;
          }
        } else if (vUp === 'SATISFACTORIO:' || vUp === 'SATISFACTORIO' || vUp === 'SATISFACTORIO ') {
          if (masters[i + 1]) {
            masters[i + 1].cell.value = satisfactorios;
          }
          if (masters[i + 2] && !masters[i + 2].val.toUpperCase().includes('RECOMEND') && !masters[i + 2].val.toUpperCase().includes('SATISF')) {
            masters[i + 2].cell.value = `${totalAspectos > 0 ? Math.round((satisfactorios / totalAspectos) * 100) : 0}%`;
          }
        } else if (vUp.includes('NO SATISF')) {
          if (masters[i + 1]) {
            masters[i + 1].cell.value = noSatisfactorios;
          }
          if (masters[i + 2] && !masters[i + 2].val.toUpperCase().includes('RECOMEND') && !masters[i + 2].val.toUpperCase().includes('APLICA')) {
            masters[i + 2].cell.value = `${totalAspectos > 0 ? Math.round((noSatisfactorios / totalAspectos) * 100) : 0}%`;
          }
        } else if (vUp === 'NO APLICA:' || vUp === 'NO APLICA' || vUp === 'NO APLICA ') {
          if (masters[i + 1]) {
            masters[i + 1].cell.value = noAplica;
          }
          if (masters[i + 2] && !masters[i + 2].val.toUpperCase().includes('RECOMEND')) {
            masters[i + 2].cell.value = `${totalAspectos > 0 ? Math.round((noAplica / totalAspectos) * 100) : 0}%`;
          }
        } else if (vUp.includes('CALIFICAC')) {
          if (masters[i + 1] && !masters[i + 1].val.toUpperCase().includes('RECOMEND')) {
            masters[i + 1].cell.value = `${calificacionPorcentaje}%`;
          } else {
            m.cell.value = `CALIFICACIÓN= ${calificacionPorcentaje}%`;
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

    if (templateConfig && templateConfig.secciones) {
      templateConfig.secciones.forEach((sec) => {
        const secName = sec.nombre || 'General';

        if (sec.filas) {
          sec.filas.forEach((fila) => {
            if (hasSubTabs) {
              templateConfig.columnas.forEach((col) => {
                const answerKey = `${fila}__${col}`;
                const userAns = answers[answerKey] || 'Sin responder';
                const userObs = answers[`${answerKey}__obs`] || answers[`${answerKey}_obs`] || '';

                if (userObs && String(userObs).trim() !== '') {
                  count++;
                  const newRow = obsSheet.addRow({
                    num: count,
                    seccion: secName,
                    subarea: col,
                    item: fila,
                    estado: userAns === 'SI' ? '🟢 CUMPLE' : (userAns === 'NO' ? '❌ NO CUMPLE' : (userAns === 'NA' ? '🔘 N/A' : userAns)),
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
              const defaultColKey = (templateConfig.tipo === 'matrix' && templateConfig.columnas && templateConfig.columnas[0]) ? `${fila}__${templateConfig.columnas[0]}` : fila;
              const userAns = answers[defaultColKey] || answers[fila] || 'Sin responder';
              const userObs = answers[`${defaultColKey}__obs`] || answers[`${fila}__obs`] || answers[`${fila}_obs`] || '';

              if (userObs && String(userObs).trim() !== '') {
                count++;
                const newRow = obsSheet.addRow({
                  num: count,
                  seccion: secName,
                  item: fila,
                  estado: userAns === 'SI' ? '🟢 CUMPLE' : (userAns === 'NO' ? '❌ NO CUMPLE' : (userAns === 'NA' ? '🔘 N/A' : userAns)),
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

    // 10. Generate file buffer and return as response
    const buffer = await workbook.xlsx.writeBuffer();

    const fileName = `Visita_Calidad_${templateConfig.code}_${visit.pdv_nombre.replace(/\s+/g, '_')}_${visit.fecha}.xlsx`;

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
