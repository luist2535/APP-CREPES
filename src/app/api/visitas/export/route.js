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
    const visit = db.prepare(`
      SELECT v.*, p.campos, p.nombre as plantilla_nombre, 
             u.nombre as auditor_nombre, pdv.nombre as pdv_nombre
      FROM visitas v
      LEFT JOIN plantillas p ON v.plantilla_id = p.id
      LEFT JOIN users u ON v.user_id = u.id
      LEFT JOIN pdv ON v.pdv_id = pdv.id
      WHERE v.id = ?
    `).get(parseInt(visitId));

    if (!visit) {
      return NextResponse.json({ error: 'Visita no encontrada' }, { status: 404 });
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
        const endCol = idx < subAreas.length - 1 ? subAreas[idx+1].startCol - 1 : sheet.columnCount;
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
          const userObs = answers[`${itemName}__obs`] || answers[`${itemName}_obs`] || '';

          if (userAns) {
            const targetCol = colMappings.find(m => m.subArea === 'EVALUACION' && m.type === userAns);
            if (targetCol) {
              sheet.getRow(r).getCell(targetCol.colNumber).value = 'X';
            }
          }
          
          if (userObs) {
            const targetCol = colMappings.find(m => m.subArea === 'EVALUACION' && m.type === 'OBSERVACIONES');
            if (targetCol) {
              sheet.getRow(r).getCell(targetCol.colNumber).value = userObs;
            }
          }
        }
      }
    }

    // 8. Write general observations/comments at the bottom
    if (commentRowIndex !== -1 && visit.observaciones) {
      const cellObs = sheet.getRow(commentRowIndex).getCell(2);
      if (cellObs.value === null || String(cellObs.value).trim() === '') {
        cellObs.value = visit.observaciones;
      } else {
        sheet.getRow(commentRowIndex + 1).getCell(1).value = `Observaciones: ${visit.observaciones}`;
      }
    }

    // 9. Generate file buffer and return as response
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
