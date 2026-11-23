import { NextResponse } from 'next/server';
const { getUserFromRequest } = require('@/lib/auth');
const { buildCalidadAnalytics } = require('@/lib/calidadAnalytics');

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pdvId = searchParams.get('pdv_id') || 'all';
    const ciudadId = searchParams.get('ciudad_id') || 'all';
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const areaFiltro = searchParams.get('area') || 'all';
    const subareaFiltro = searchParams.get('subarea') || 'all';
    const itemFiltro = searchParams.get('item') || 'all';

    const result = buildCalidadAnalytics({
      pdvId,
      ciudadId,
      fechaInicio,
      fechaFin,
      areaFiltro,
      subareaFiltro,
      itemFiltro,
      syncDb: true
    });

    return NextResponse.json({
      success: true,
      summary: result.summary,
      historial: [...result.rawHistorial].reverse(),
      ranking_pdv: result.rankingPdv,
      evolucion_por_seccion: result.evolucionPorSeccion,
      evolucion_temporal: result.evolucionTemporal,
      evaluaciones_por_periodo: result.evaluaciones_por_periodo,
      top_hallazgos: result.topHallazgos,
      areas_disponibles: [...result.allAreasSet].sort(),
      subareas_disponibles: [...result.allSubareasSet].sort(),
      items_disponibles: [...result.allItemsSet].sort(),
      secciones_disponibles: result.seccionesActivas,
      nivel_drilldown: subareaFiltro !== 'all' ? 'item' : (areaFiltro !== 'all' ? 'subarea' : 'area')
    });
  } catch (error) {
    console.error('Error in GET /api/reportes/calidad-comportamiento:', error);
    return NextResponse.json({ error: 'Error al calcular analítica de calidad' }, { status: 500 });
  }
}
