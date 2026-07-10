import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDb } from '@/lib/db';
import { getUserFromRequest, getUserAssignedCityId } from '@/lib/auth';
import Excel from 'exceljs';

export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const areaId = searchParams.get('area_id');
    const pdvId = searchParams.get('pdv_id');

    const db = getDb();
    const assignedCityId = getUserAssignedCityId(user, db);

    let query = `
      SELECT v.*, 
             p.nombre as pdv_nombre, p.ciudad_id as pdv_ciudad_id, c.nombre as ciudad_nombre,
             u.nombre as auditor_nombre,
             a.nombre as area_nombre, a.color as area_color,
             tv.nombre as tipo_visita_nombre,
             resp.nombre as responsable_nombre
      FROM visitas v
      LEFT JOIN pdv p ON v.pdv_id = p.id
      LEFT JOIN ciudades c ON p.ciudad_id = c.id
      LEFT JOIN users u ON v.user_id = u.id
      LEFT JOIN areas a ON v.area_id = a.id
      LEFT JOIN tipos_visita tv ON v.tipo_visita_id = tv.id
      LEFT JOIN users resp ON v.responsable_id = resp.id
      WHERE 1=1
    `;
    const params = [];

    if (assignedCityId && parseInt(user.rol_id) !== 1) {
      query += ' AND p.ciudad_id = ?';
      params.push(assignedCityId);
    }
    if (areaId && areaId !== 'all') {
      query += ' AND v.area_id = ?';
      params.push(parseInt(areaId));
    }
    if (pdvId && pdvId !== 'all') {
      query += ' AND v.pdv_id = ?';
      params.push(parseInt(pdvId));
    }

    query += ' ORDER BY v.fecha DESC, v.hora_inicio DESC';
    const visitas = db.prepare(query).all(...params);

    const workbook = new Excel.Workbook();
    const sheet = workbook.addWorksheet('Historial de Visitas', {
      views: [{ showGridLines: true }]
    });

    sheet.columns = [
      { header: 'No.', key: 'num', width: 6 },
      { header: 'Fecha', key: 'fecha', width: 14 },
      { header: 'Sucursal / PDV', key: 'pdv', width: 26 },
      { header: 'Ciudad', key: 'ciudad', width: 16 },
      { header: 'Área Inspectora', key: 'area', width: 22 },
      { header: 'Tipo de Visita', key: 'tipo', width: 22 },
      { header: 'Auditor / Inspector', key: 'auditor', width: 26 },
      { header: 'Responsable PDV', key: 'responsable', width: 24 },
      { header: 'Estado', key: 'estado', width: 16 },
      { header: 'Versión Checklist', key: 'version_checklist', width: 18 },
      { header: 'Observaciones Generales', key: 'observaciones', width: 45 }
    ];

    sheet.spliceRows(1, 0, [], []);
    sheet.mergeCells('A1:K1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = '📋 REPORTE E HISTORIAL GENERAL DE VISITAS OPERATIVAS';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B3A2A' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 32;

    sheet.mergeCells('A2:K2');
    const metaCell = sheet.getCell('A2');
    const nowStr = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    metaCell.value = `Generado por: ${user.nombre || 'Usuario'} | Fecha de exportación: ${nowStr} | Total registros: ${visitas.length}`;
    metaCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF334155' } };
    metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    metaCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(2).height = 24;

    const headerRow = sheet.getRow(4);
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

    visitas.forEach((v, idx) => {
      const row = sheet.addRow({
        num: idx + 1,
        fecha: v.fecha || '',
        pdv: v.pdv_nombre || 'Desconocido',
        ciudad: v.ciudad_nombre || '',
        area: v.area_nombre || '',
        tipo: v.tipo_visita_nombre || 'General',
        auditor: v.auditor_nombre || 'N/A',
        responsable: v.responsable_nombre || 'N/A',
        estado: v.estado ? v.estado.toUpperCase() : '',
        version_checklist: `v${v.version_checklist || 1}`,
        observaciones: v.observaciones || ''
      });

      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.font = { name: 'Arial', size: 10, color: { argb: 'FF334155' } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
        cell.alignment = { vertical: 'middle', wrapText: true };
        if (colNum === 1 || colNum === 2 || colNum === 9) cell.alignment.horizontal = 'center';
      });
      row.height = 24;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Reporte_Visitas_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Guardar automáticamente en las carpetas del servidor y repositorio documental
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
        'calidad_reporte_general', 
        null, 
        user.id, 
        `Reporte General de Visitas de Calidad exportado el ${new Date().toLocaleDateString('es-ES')}`,
        'Reporte General Visitas Excel'
      );
    } catch (saveErr) {
      console.error('Error guardando copia del Reporte General en repositorio:', saveErr);
    }

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
  } catch (error) {
    console.error('Error al exportar general de visitas:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}
