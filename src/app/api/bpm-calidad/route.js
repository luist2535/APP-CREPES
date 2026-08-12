import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

// Importar utilidades BPM
const bpmExcel = require('@/lib/bpm-excel');

// API Route para leer y guardar calificaciones BPM
export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const area = searchParams.get('area') || 'ALMACÉN';
    const mes = searchParams.get('mes') || bpmExcel.MESES[new Date().getMonth()];
    const anio = parseInt(searchParams.get('anio')) || new Date().getFullYear();

    // Validar área
    if (!bpmExcel.AREAS_LIST.includes(area)) {
      return NextResponse.json({ error: 'Área no válida. Opciones: ' + bpmExcel.AREAS_LIST.join(', ') }, { status: 400 });
    }

    const db = getDb();

    // Obtener calificaciones del mes seleccionado
    const mesIndex = bpmExcel.MESES.indexOf(mes.toUpperCase());
    const weekStart = mesIndex * 4 + 1;
    const weekEnd = mesIndex * 4 + 4;

    const calificaciones = db.prepare(`
      SELECT * FROM bpm_calificaciones
      WHERE area = ? AND semana_numero BETWEEN ? AND ?
      ORDER BY row_number, semana_numero
    `).all(area, weekStart, weekEnd);

    // Combinar estructura del Excel + valores de la BD
    const data = bpmExcel.getAreaData(area, calificaciones, mes);

    return NextResponse.json({
      ...data,
      anio,
      mesSeleccionado: mes,
      areas: bpmExcel.AREAS_LIST,
      meses: bpmExcel.MESES
    });

  } catch (error) {
    console.error('GET /api/bpm-calidad error:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { area, row, semanaNumero, valor } = body;

    // Validaciones
    if (!area || !bpmExcel.AREAS_LIST.includes(area)) {
      return NextResponse.json({ error: 'Área no válida' }, { status: 400 });
    }
    if (!row || row < 1) {
      return NextResponse.json({ error: 'Fila no válida' }, { status: 400 });
    }
    if (!semanaNumero || semanaNumero < 1 || semanaNumero > 48) {
      return NextResponse.json({ error: 'Número de semana no válido (1-48)' }, { status: 400 });
    }

    // Si valor es null, eliminar la calificación
    if (valor === null || valor === undefined || valor === '') {
      const db = getDb();
      db.prepare(`
        DELETE FROM bpm_calificaciones
        WHERE area = ? AND row_number = ? AND semana_numero = ?
      `).run(area, row, semanaNumero);

      return NextResponse.json({
        message: 'Calificación eliminada',
        area,
        row,
        semanaNumero,
        valor: null,
        porcentaje: 0
      });
    }

    const valorNum = parseInt(valor);
    if (isNaN(valorNum) || valorNum < 1 || valorNum > 5) {
      return NextResponse.json({ error: 'El valor debe ser un número entre 1 y 5' }, { status: 400 });
    }

    const db = getDb();

    // Insertar o actualizar (UPSERT)
    db.prepare(`
      INSERT INTO bpm_calificaciones (area, row_number, semana_numero, valor, user_id)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(area, row_number, semana_numero)
      DO UPDATE SET valor = ?, user_id = ?, updated_at = CURRENT_TIMESTAMP
    `).run(area, row, semanaNumero, valorNum, user.id, valorNum, user.id);

    // Calcular estado de completitud de la semana
    const structure = bpmExcel.readStructure();
    const areaStruct = structure[area];
    const totalItems = areaStruct.categorias.reduce((sum, cat) => sum + cat.items.length, 0);

    const filledCount = db.prepare(`
      SELECT COUNT(*) as count FROM bpm_calificaciones
      WHERE area = ? AND semana_numero = ?
    `).get(area, semanaNumero);

    const semanaCompleta = filledCount.count >= totalItems;

    return NextResponse.json({
      message: 'Calificación guardada',
      area,
      row,
      semanaNumero,
      valor: valorNum,
      porcentaje: Math.round((valorNum / 5) * 100),
      semanaCompleta,
      itemsLlenados: filledCount.count,
      totalItems
    });

  } catch (error) {
    console.error('POST /api/bpm-calidad error:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}
