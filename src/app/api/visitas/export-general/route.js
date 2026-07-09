import { NextResponse } from 'next/server';
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
      { header: 'Observaciones Generales', key: 'observaciones', width: 45 }
    ];

    sheet.spliceRows(1, 0, [], []);
    sheet.mergeCells('A1:J1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = '📋 REPORTE Y HISTORIAL GENERAL DE VISITAS OPERATIVAS';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B3A2A' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 32;

    sheet.mergeCells('A2:J2');
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
