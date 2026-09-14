import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import Excel from 'exceljs';

// ============================================
// GET — List actas or get detail by ID
// ============================================
export async function GET(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');

    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const db = getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action');

    // Detail by ID
    if (id) {
      const acta = db.prepare(`
        SELECT a.*, 
               u1.nombre as creador_nombre,
               u2.nombre as firmador_nombre
        FROM actas_entrega a
        LEFT JOIN users u1 ON a.creado_por = u1.id
        LEFT JOIN users u2 ON a.firmado_por = u2.id
        WHERE a.id = ?
      `).get(parseInt(id));

      if (!acta) {
        return NextResponse.json({ error: 'Acta no encontrada' }, { status: 404 });
      }

      // Parse equipos JSON
      try { acta.equipos_lista = JSON.parse(acta.equipos); } catch (e) { acta.equipos_lista = []; }

      // If download requested, generate Excel
      if (action === 'download') {
        return generateExcel(acta);
      }

      return NextResponse.json({ acta });
    }

    // List all actas
    const estado = searchParams.get('estado');
    let query = `
      SELECT a.id, a.fecha, a.quien_recibe, a.cedula_recibe, a.cargo, a.area, a.ciudad,
             a.tipo_ubicacion, a.estado, a.observaciones, a.nombre_entrega,
             a.created_at, a.updated_at, a.fecha_firma,
             u1.nombre as creador_nombre,
             u2.nombre as firmador_nombre
      FROM actas_entrega a
      LEFT JOIN users u1 ON a.creado_por = u1.id
      LEFT JOIN users u2 ON a.firmado_por = u2.id
    `;
    const params = [];
    if (estado) {
      query += ' WHERE a.estado = ?';
      params.push(estado);
    }
    query += ' ORDER BY a.created_at DESC';

    const actas = db.prepare(query).all(...params);

    // Count equipos for each acta
    actas.forEach(a => {
      try {
        const eqs = JSON.parse(a.equipos || '[]');
        // We don't have full equipos in list query, but we can add count if needed
      } catch (e) {}
    });

    return NextResponse.json({ actas });
  } catch (error) {
    console.error('Acta Entrega GET error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// ============================================
// POST — Create new acta (Jefe saves it)
// ============================================
export async function POST(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');

    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const db = getDb();
    const body = await request.json();

    const {
      fecha,
      quienRecibe,
      cedula,
      cargo,
      area,
      ciudad,
      tipoUbicacion,
      equipos,
      observaciones,
    } = body;

    if (!quienRecibe || !cedula) {
      return NextResponse.json({ error: 'Nombre y cédula del receptor son obligatorios' }, { status: 400 });
    }
    if (!equipos || equipos.length === 0) {
      return NextResponse.json({ error: 'Debe agregar al menos un equipo' }, { status: 400 });
    }

    const result = db.prepare(`
      INSERT INTO actas_entrega (fecha, quien_recibe, cedula_recibe, cargo, area, ciudad, tipo_ubicacion, equipos, observaciones, estado, creado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?)
    `).run(
      fecha || new Date().toISOString().split('T')[0],
      quienRecibe,
      cedula,
      cargo || '',
      area || '',
      ciudad || '',
      tipoUbicacion || 'pdv',
      JSON.stringify(equipos.filter(eq => eq.descripcion && eq.descripcion.trim())),
      observaciones || '',
      user.id
    );

    return NextResponse.json({ 
      message: 'Acta creada exitosamente',
      id: Number(result.lastInsertRowid)
    });
  } catch (error) {
    console.error('Acta Entrega POST error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// ============================================
// PUT — Add signatures & mark as signed (Auxiliar)
// ============================================
export async function PUT(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');

    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const db = getDb();
    const body = await request.json();

    const { id, nombreEntrega, cedulaEntrega, firmaEntrega, firmaRecibe } = body;

    if (!id) return NextResponse.json({ error: 'ID del acta requerido' }, { status: 400 });

    const acta = db.prepare('SELECT id, estado FROM actas_entrega WHERE id = ?').get(parseInt(id));
    if (!acta) return NextResponse.json({ error: 'Acta no encontrada' }, { status: 404 });

    db.prepare(`
      UPDATE actas_entrega 
      SET nombre_entrega = ?,
          cedula_entrega = ?,
          firma_entrega = ?,
          firma_recibe = ?,
          estado = 'firmada',
          fecha_firma = datetime('now', 'localtime'),
          firmado_por = ?,
          updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(
      nombreEntrega || '',
      cedulaEntrega || '',
      firmaEntrega || null,
      firmaRecibe || null,
      user.id,
      parseInt(id)
    );

    return NextResponse.json({ message: 'Acta firmada exitosamente' });
  } catch (error) {
    console.error('Acta Entrega PUT error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// ============================================
// DELETE — Delete an acta
// ============================================
export async function DELETE(request) {
  try {
    const { getUserFromRequest } = require('@/lib/auth');
    const { getDb } = require('@/lib/db');

    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const db = getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    db.prepare('DELETE FROM actas_entrega WHERE id = ?').run(parseInt(id));
    return NextResponse.json({ message: 'Acta eliminada' });
  } catch (error) {
    console.error('Acta Entrega DELETE error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// ============================================
// EXCEL GENERATOR — Fixed signature placement
// ============================================
async function generateExcel(acta) {
  const templatePath = path.join(process.cwd(), 'public', 'templates', 'TEC-F-03.xlsx');
  if (!fs.existsSync(templatePath)) {
    return NextResponse.json({ error: 'Plantilla TEC-F-03.xlsx no encontrada' }, { status: 500 });
  }

  const wb = new Excel.Workbook();
  await wb.xlsx.readFile(templatePath);
  const ws = wb.worksheets[0];

  const equipos = acta.equipos_lista || [];

  // ---- HEADER DATA ----
  const fechaEntrega = acta.fecha ? new Date(acta.fecha + 'T12:00:00') : new Date();
  ws.getCell('C5').value = fechaEntrega;
  ws.getCell('C5').numFmt = 'DD/MM/YYYY';
  ws.getCell('H5').value = acta.cedula_recibe || '';

  ws.getCell('C6').value = (acta.quien_recibe || '').toUpperCase();
  ws.getCell('H6').value = (acta.cargo || '').toUpperCase();

  if (acta.tipo_ubicacion === 'oficinas') {
    ws.getCell('K6').value = 'OFICINAS ADM / LOG  : ___X___';
    ws.getCell('K7').value = 'PUNTOS DE VENTA   : _______';
  } else {
    ws.getCell('K6').value = 'OFICINAS ADM / LOG  : _______';
    ws.getCell('K7').value = 'PUNTOS DE VENTA   : ___X___';
  }

  ws.getCell('C7').value = (acta.area || '').toUpperCase();
  ws.getCell('H7').value = (acta.ciudad || '').toUpperCase();

  // ---- EQUIPMENT TABLE (Rows 12-25) ----
  const startRow = 12;
  const maxEquipos = 14;
  
  // Primero limpiamos TODAS las filas de equipos de la plantilla por si tienen datos quemados
  for (let i = 0; i < maxEquipos; i++) {
    const row = startRow + i;
    const colsToClear = ['B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T'];
    colsToClear.forEach(col => {
      ws.getCell(`${col}${row}`).value = '';
    });
  }

  const equiposList = equipos.slice(0, maxEquipos);

  equiposList.forEach((eq, i) => {
    const row = startRow + i;
    ws.getCell(`B${row}`).value = eq.descripcion || '';
    ws.getCell(`C${row}`).value = eq.tipo || '';
    ws.getCell(`D${row}`).value = eq.placa || '';
    ws.getCell(`E${row}`).value = eq.marca || '';
    ws.getCell(`F${row}`).value = eq.modelo || '';
    ws.getCell(`G${row}`).value = eq.serie || '';
    ws.getCell(`H${row}`).value = eq.placaMonitor || 'N/A';
    ws.getCell(`I${row}`).value = eq.serieMonitor || 'N/A';
    ws.getCell(`J${row}`).value = eq.nombrePC || 'N/A';
    ws.getCell(`K${row}`).value = eq.ipPC || 'N/A';

    if (eq.soW11) ws.getCell(`L${row}`).value = 'X';
    if (eq.soW10) ws.getCell(`M${row}`).value = 'X';
    if (eq.soW08) ws.getCell(`N${row}`).value = 'X';
    if (eq.antivirus) ws.getCell(`O${row}`).value = 'X';
    if (eq.anydesk) ws.getCell(`P${row}`).value = 'X';
    if (eq.aloha) ws.getCell(`Q${row}`).value = 'X';
    if (eq.erpSiesa) ws.getCell(`R${row}`).value = 'X';
    if (eq.office) ws.getCell(`S${row}`).value = 'X';
    if (eq.libreOffice) ws.getCell(`T${row}`).value = 'X';

    const dataCols = ['B','C','D','E','F','G','H','I','J','K'];
    dataCols.forEach(col => {
      const cell = ws.getCell(`${col}${row}`);
      cell.font = { name: 'Arial', size: 9 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });
  });

  // ---- OBSERVATIONS (Row 33) ----
  // Limpiar valor por defecto de la plantilla
  ws.getCell('B33').value = '';
  if (acta.observaciones) {
    ws.getCell('B33').value = acta.observaciones;
  }
  // Agrandar la fila de observaciones y permitir wrap text por si escriben mucho
  ws.getRow(33).height = 45;
  ws.getCell('B33').alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

  // ---- SIGNATURES ----
  // Template structure (1-indexed rows):
  //   Row 41: "FIRMA QUIEN ENTREGA:" (B) / line (D) / "FIRMA QUIEN RECIBE:" (H) / line (J)
  //   Row 42: "NOMBRE QUIEN ENTREGA:" / name / "NOMBRE QUIEN RECIBE:" / name
  //   Row 43: "NUMERO DE CEDULA:" / number / "NUMERO DE CEDULA:" / number
  //
  // Signatures go ABOVE the "FIRMA" label, in the empty rows 38-40
  // ExcelJS uses 0-indexed rows: row 38 in Excel = index 37

  // Quien Entrega: Name & Cedula
  if (acta.nombre_entrega) {
    ws.getCell('D42').value = acta.nombre_entrega;
    ws.getCell('D42').font = { name: 'Arial', size: 10 };
  }
  if (acta.cedula_entrega) {
    ws.getCell('D43').value = acta.cedula_entrega;
    ws.getCell('D43').font = { name: 'Arial', size: 10 };
  }

  // Quien Recibe: Name & Cedula
  ws.getCell('J42').value = acta.quien_recibe || '';
  ws.getCell('J42').font = { name: 'Arial', size: 10 };
  ws.getCell('J43').value = acta.cedula_recibe || '';
  ws.getCell('J43').font = { name: 'Arial', size: 10 };

  // Insert signature IMAGES
  // For "Quien Entrega" - place above D41 line, spanning D38:F40 area
  // ExcelJS 0-indexed: col D=3, row 38=37, row 40=39
  if (acta.firma_entrega) {
    try {
      const base64Data = acta.firma_entrega.replace(/^data:image\/\w+;base64,/, '');
      const firmaBuffer = Buffer.from(base64Data, 'base64');
      const imageId = wb.addImage({
        buffer: firmaBuffer,
        extension: 'png',
      });
      ws.addImage(imageId, {
        tl: { col: 3.0, row: 36.5 },
        br: { col: 6.5, row: 40.0 },
        editAs: 'oneCell',
      });
    } catch (e) {
      console.error('Error inserting entrega signature:', e);
    }
  }

  // For "Quien Recibe" - place above J41 line, spanning J38:N40 area
  // ExcelJS 0-indexed: col J=9, row 38=37, row 40=39
  if (acta.firma_recibe) {
    try {
      const base64Data = acta.firma_recibe.replace(/^data:image\/\w+;base64,/, '');
      const firmaBuffer = Buffer.from(base64Data, 'base64');
      const imageId = wb.addImage({
        buffer: firmaBuffer,
        extension: 'png',
      });
      ws.addImage(imageId, {
        tl: { col: 9.0, row: 36.5 },
        br: { col: 14.0, row: 40.0 },
        editAs: 'oneCell',
      });
    } catch (e) {
      console.error('Error inserting recibe signature:', e);
    }
  }

  // Remove second sheet if exists
  if (wb.worksheets.length > 1) {
    wb.removeWorksheet(wb.worksheets[1].id);
  }

  // Generate buffer
  const buffer = await wb.xlsx.writeBuffer();

  const fechaStr = (acta.fecha || new Date().toISOString().split('T')[0]);
  const nombreLimpio = (acta.quien_recibe || 'entrega').replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').replace(/\s+/g, '_').substring(0, 30);
  const filename = `Acta_Entrega_${nombreLimpio}_${fechaStr}.xlsx`;

  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
