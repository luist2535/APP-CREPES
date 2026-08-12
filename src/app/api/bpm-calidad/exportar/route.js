import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

const bpmExcel = require('@/lib/bpm-excel');

/**
 * GET /api/bpm-calidad/exportar
 * Genera y descarga el Excel con los valores llenados desde la BD.
 * El template original nunca se modifica, se genera una copia con valores.
 */
export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const db = getDb();

    // Obtener TODAS las calificaciones
    const allCalificaciones = db.prepare(`
      SELECT area, row_number, semana_numero, valor
      FROM bpm_calificaciones
      ORDER BY area, row_number, semana_numero
    `).all();

    // Generar el Excel llenado
    const buffer = await bpmExcel.generateFilledExcel(allCalificaciones);

    // Nombre del archivo con fecha
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const fileName = `Matriz_BPM_Calidad_${dateStr}.xlsm`;

    // Retornar como descarga
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.ms-excel.sheet.macroEnabled.12',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': buffer.length.toString()
      }
    });

  } catch (error) {
    console.error('GET /api/bpm-calidad/exportar error:', error);
    return NextResponse.json({ error: 'Error al exportar: ' + error.message }, { status: 500 });
  }
}
