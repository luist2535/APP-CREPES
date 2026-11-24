import { NextResponse } from 'next/server';
const { getUserFromRequest } = require('@/lib/auth');
const { buildCalidadAnalytics } = require('@/lib/calidadAnalytics');
const ExcelJS = require('exceljs');

export const dynamic = 'force-dynamic';

/**
 * GET /api/reportes/calidad-comportamiento/export
 * Genera un Excel profesional con visualizaciones en celda (data bars, color scales)
 * usando exceljs - compatible con ExcelJS 4.4.0
 */
export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const pdvId = searchParams.get('pdv_id') || 'all';
    const ciudadId = searchParams.get('ciudad_id') || 'all';
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const areaFiltro = searchParams.get('area') || 'all';
    const subareaFiltro = searchParams.get('subarea') || 'all';
    const itemFiltro = searchParams.get('item') || 'all';

    const {
      rawHistorial,
      timelineMap,
      rankingPdv,
      evolucionPorSeccion,
      evaluaciones_por_periodo,
      topHallazgos,
      allAreasSet,
      allSubareasSet,
      allItemsSet,
      summary
    } = buildCalidadAnalytics({
      pdvId,
      ciudadId,
      fechaInicio,
      fechaFin,
      areaFiltro,
      subareaFiltro,
      itemFiltro,
      syncDb: false
    });

    const totalAlertas = summary.alertas_activas;
    const promedioGeneral = summary.promedio_general;
    const global_mes_actual = summary.puntaje_mes_actual;
    const global_mes_anterior = summary.puntaje_mes_anterior;
    const mes_actual_label = summary.mes_actual_label;
    const mes_anterior_label = summary.mes_anterior_label;

    // ========================================
    // VARIABLES PARA EXCEL
    // ========================================
    const seccionesOrdenadas = [...evolucionPorSeccion].sort((a, b) => b.puntaje_promedio - a.puntaje_promedio);
    const timelineData = Object.values(timelineMap).sort((a, b) => a.mes.localeCompare(b.mes));
    const uniqueSections = [...new Set(timelineData.flatMap(t => Object.keys(t.secciones)))].sort();

    // ========================================
    // GENERAR EXCEL PROFESIONAL CON EXCELJS
    // ========================================
    console.log('DEBUG: Starting Excel generation');
    console.log('DEBUG: rawHistorial.length:', rawHistorial.length);
    console.log('DEBUG: evolucionPorSeccion.length:', evolucionPorSeccion.length);
    console.log('DEBUG: rankingPdv.length:', rankingPdv.length);
    console.log('DEBUG: timelineData.length:', timelineData.length);
    console.log('DEBUG: evaluaciones_por_periodo.length:', evaluaciones_por_periodo.length);
    console.log('DEBUG: seccionesOrdenadas.length:', seccionesOrdenadas.length);
    console.log('DEBUG: uniqueSections.length:', uniqueSections.length);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Sistema CREPES - Módulo de Calidad';
    wb.created = new Date();

    // ========================================
    // ESTILOS REUTILIZABLES
    // ========================================
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
    };

    const titleStyle = { font: { bold: true, size: 14, color: { argb: 'FF1F4E79' } }, alignment: { horizontal: 'center' } };
    const subtitleStyle = { font: { bold: true, size: 11, color: { argb: 'FF2E75B6' } } };
    const kpiLabelStyle = { font: { bold: true, size: 10 }, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true } };
    const dataStyle = {
      border: { top: { style: 'thin', color: { argb: 'FFD9E2F3' } }, left: { style: 'thin', color: { argb: 'FFD9E2F3' } }, bottom: { style: 'thin', color: { argb: 'FFD9E2F3' } }, right: { style: 'thin', color: { argb: 'FFD9E2F3' } } },
      alignment: { vertical: 'middle' }
    };
    const numberStyle = { ...dataStyle, numFmt: '0.0"%"', alignment: { ...dataStyle.alignment, horizontal: 'center' } };
    const pctStyle = { ...dataStyle, numFmt: '0.0%', alignment: { ...dataStyle.alignment, horizontal: 'center' } };
    const goodFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
    const warningFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
    const badFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
    const goodFont = { color: { argb: 'FF006100' }, bold: true };
    const warningFont = { color: { argb: 'FF9C6500' }, bold: true };
    const badFont = { color: { argb: 'FF9C0006' }, bold: true };
    const neutralFill = { type: 'pattern', pattern: 'solid', fgColor: 'FFEAF0FA' };

    // Función helper para aplicar estilo condicional de puntaje
    function applyScoreStyle(cell, score) {
      if (score >= 90) { cell.fill = goodFill; cell.font = goodFont; }
      else if (score >= 75) { cell.fill = warningFill; cell.font = warningFont; }
      else { cell.fill = badFill; cell.font = badFont; }
    }

    // Función helper para aplicar color de tendencia
    function applyTrendStyle(cell, diff) {
      if (diff > 0.1) { cell.fill = goodFill; cell.font = goodFont; }
      else if (diff < -0.1) { cell.fill = badFill; cell.font = badFont; }
      else { cell.fill = warningFill; cell.font = warningFont; }
    }

    // ========================================
    // HOJA 1: DASHBOARD EJECUTIVO
    // ========================================
    const wsDashboard = wb.addWorksheet('Dashboard Ejecutivo', {
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
      views: [{ state: 'frozen', xSplit: 1, ySplit: 4 }]
    });
    wsDashboard.columns = [
      { width: 5 }, { width: 28 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }
    ];

    // Título dinámico según el Área y Sub-Área seleccionada
    const areaDisplay = areaFiltro === 'all' ? 'TODAS LAS ÁREAS DE CALIDAD (BPM & L&D)' : areaFiltro.toUpperCase();
    const subareaDisplay = subareaFiltro === 'all' ? 'Todas las Sub-Áreas' : subareaFiltro;
    const itemDisplay = itemFiltro === 'all' ? 'Todos los Ítems' : itemFiltro;
    const conceptoGlobal = promedioGeneral >= 90 ? 'FAVORABLE' : promedioGeneral >= 75 ? 'CONDICIONADO' : 'CRÍTICO';

    wsDashboard.mergeCells('B2:I2');
    wsDashboard.getCell('B2').value = `📊 INFORME EJECUTIVO DE CALIDAD — ${areaDisplay}${subareaFiltro !== 'all' ? ' › ' + subareaFiltro.toUpperCase() : ''}`;
    wsDashboard.getCell('B2').style = titleStyle;
    wsDashboard.getRow(2).height = 30;

    // Subtítulo con fechas y filtros aplicados
    wsDashboard.mergeCells('B3:I3');
    wsDashboard.getCell('B3').value = `Periodo: ${fechaInicio || 'Inicio'} al ${fechaFin || 'Fin'}  |  Área: ${areaFiltro === 'all' ? 'Todas' : areaFiltro}  |  Sub-Área: ${subareaDisplay}  |  Ítem: ${itemDisplay}  |  Concepto Sanitario: ${conceptoGlobal} (${promedioGeneral}%)`;
    wsDashboard.getCell('B3').style = { font: { bold: true, size: 10, color: { argb: 'FF1F4E79' } }, alignment: { horizontal: 'center' } };

    // KPIs principales (fila 5-7)
    const kpis = [
      { label: `PROMEDIO (${conceptoGlobal})`, value: promedioGeneral, suffix: '%', color: promedioGeneral >= 90 ? 'good' : promedioGeneral >= 75 ? 'warning' : 'bad' },
      { label: 'CONFORMES (SÍ) / HALLAZGOS (NO)', value: `${summary.total_conformes_si || 0} SÍ / ${summary.total_hallazgos_no || 0} NO`, suffix: '', color: (summary.total_hallazgos_no || 0) > 0 ? 'warning' : 'good' },
      { label: 'SECCIONES / SUB-ÁREAS', value: evolucionPorSeccion.length, suffix: '', color: 'neutral' },
      { label: 'PDVs EVALUADOS', value: rankingPdv.length, suffix: '', color: 'neutral' },
      { label: 'ALERTAS DE CAÍDA', value: totalAlertas, suffix: '', color: totalAlertas > 0 ? 'bad' : 'good' },
      { label: 'MES ACTUAL (' + mes_actual_label + ')', value: global_mes_actual, suffix: '%', color: global_mes_actual >= 90 ? 'good' : global_mes_actual >= 75 ? 'warning' : 'bad' },
      { label: 'MES ANTERIOR (' + mes_anterior_label + ')', value: global_mes_anterior, suffix: '%', color: global_mes_anterior >= 90 ? 'good' : global_mes_anterior >= 75 ? 'warning' : 'bad' },
      { label: 'VARIACIÓN GLOBAL', value: Math.round((global_mes_actual - global_mes_anterior) * 10) / 10, suffix: ' pts', color: global_mes_actual >= global_mes_anterior ? 'good' : 'bad' }
    ];

    kpis.forEach((kpi, i) => {
      const c = String.fromCharCode(66 + i); // B, C, D...
      wsDashboard.mergeCells(`${c}5:${c}6`);
      wsDashboard.getCell(`${c}5`).value = kpi.label;
      wsDashboard.getCell(`${c}5`).style = { ...kpiLabelStyle, fill: neutralFill, border: { top: { style: 'medium' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } };

      const valCell = wsDashboard.getCell(`${c}7`);
      valCell.value = kpi.value + (kpi.suffix || '');
      valCell.style = {
        font: { bold: true, size: 20, color: {
          argb: kpi.color === 'good' ? 'FF006100' : kpi.color === 'bad' ? 'FF9C0006' : kpi.color === 'warning' ? 'FF9C6500' : 'FF1F4E79'
        }},
        alignment: { horizontal: 'center', vertical: 'middle' }
      };
      valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kpi.color === 'good' ? 'FFC6EFCE' : kpi.color === 'bad' ? 'FFFFC7CE' : kpi.color === 'warning' ? 'FFFFEB9C' : 'FFEAF0FA' } };
      valCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'medium' }, right: { style: 'thin' } };
      wsDashboard.getRow(7).height = 40;
    });

    // ========================================
    // TABLA 1: DESEMPEÑO POR SECCIÓN (con Data Bars)
    // ========================================
    const chartStartRow = 10;
    wsDashboard.mergeCells(`B${chartStartRow}:I${chartStartRow}`);
    wsDashboard.getCell(`B${chartStartRow}`).value = '📈 DESEMPEÑO PROMEDIO POR SECCIÓN / SUB-ÁREA (Barras en celda = Data Bars)';
    wsDashboard.getCell(`B${chartStartRow}`).style = subtitleStyle;

    const chartDataStartRow = chartStartRow + 2;
    const headersSec = ['Sección / Sub-Área', 'Puntaje Promedio', 'Concepto Sanitario', 'Visitas', 'Conformes (SÍ) / Hallazgos (NO)', 'Alertas', 'Mejor PDV', 'Peor PDV'];
    headersSec.forEach((h, i) => {
      const cell = wsDashboard.getCell(chartDataStartRow - 1, i + 2);
      cell.value = h;
      cell.style = headerStyle;
    });

    seccionesOrdenadas.forEach((s, i) => {
      const r = chartDataStartRow + i;
      wsDashboard.getCell(r, 2).value = s.seccion_nombre;
      wsDashboard.getCell(r, 2).style = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: 'left' } };
      wsDashboard.getCell(r, 3).value = s.puntaje_promedio;
      wsDashboard.getCell(r, 3).style = numberStyle;
      applyScoreStyle(wsDashboard.getCell(r, 3), s.puntaje_promedio);

      const concCell = wsDashboard.getCell(r, 4);
      concCell.value = s.concepto_sanitario || (s.puntaje_promedio >= 90 ? 'Favorable' : s.puntaje_promedio >= 75 ? 'Condicionado' : 'Crítico');
      concCell.style = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: 'center' } };
      applyScoreStyle(concCell, s.puntaje_promedio);

      wsDashboard.getCell(r, 5).value = s.visitas_evaluadas;
      wsDashboard.getCell(r, 5).style = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: 'center' } };

      wsDashboard.getCell(r, 6).value = `✓ ${s.total_si || 0} SÍ  /  ✕ ${s.total_no || 0} NO`;
      wsDashboard.getCell(r, 6).style = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: 'center' }, font: (s.total_no > 0 ? badFont : goodFont) };

      wsDashboard.getCell(r, 7).value = s.caidas_recientes;
      wsDashboard.getCell(r, 7).style = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: 'center' } };
      if (s.caidas_recientes > 0) { wsDashboard.getCell(r, 7).fill = badFill; wsDashboard.getCell(r, 7).font = badFont; }
      wsDashboard.getCell(r, 8).value = `${s.mejor_pdv.nombre} (${s.mejor_pdv.puntaje}%)`;
      wsDashboard.getCell(r, 8).style = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: 'left' } };
      wsDashboard.getCell(r, 9).value = `${s.peor_pdv.nombre} (${s.peor_pdv.puntaje}%)`;
      wsDashboard.getCell(r, 9).style = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: 'left' } };
    });

    // Data Bars en columna C (Puntaje Promedio) - visualización en celda
    if (seccionesOrdenadas.length > 0) {
      wsDashboard.addConditionalFormatting({
        ref: `C${chartDataStartRow}:C${chartDataStartRow + seccionesOrdenadas.length - 1}`,
        rules: [{
          type: 'dataBar',
          cfvo: [{ type: 'num', value: 0 }, { type: 'num', value: 100 }],
          border: true,
          barColor: 'FF2E75B6',
          showValue: true
        }]
      });
    }

    // ========================================
    // TABLA 2: EVOLUCIÓN TEMPORAL (con Color Scale)
    // ========================================
    const timelineStartRow = chartDataStartRow + seccionesOrdenadas.length + 3;

    wsDashboard.mergeCells(`B${timelineStartRow}:I${timelineStartRow}`);
    wsDashboard.getCell(`B${timelineStartRow}`).value = '📅 EVOLUCIÓN TEMPORAL MENSUAL POR SECCIÓN (Color Scale: Rojo→Verde = Crítico→Excelente)';
    wsDashboard.getCell(`B${timelineStartRow}`).style = subtitleStyle;

    const tlHeaderRow = timelineStartRow + 2;
    wsDashboard.getCell(`B${tlHeaderRow}`).value = 'Mes';
    wsDashboard.getCell(`B${tlHeaderRow}`).style = headerStyle;
    uniqueSections.forEach((sec, i) => {
      const c = String.fromCharCode(67 + i);
      wsDashboard.getCell(`${c}${tlHeaderRow}`).value = sec;
      wsDashboard.getCell(`${c}${tlHeaderRow}`).style = headerStyle;
    });

    timelineData.forEach((t, idx) => {
      const r = tlHeaderRow + 1 + idx;
      wsDashboard.getCell(`B${r}`).value = t.mes;
      wsDashboard.getCell(`B${r}`).style = dataStyle;
      uniqueSections.forEach((sec, i) => {
        const c = String.fromCharCode(67 + i);
        const cell = wsDashboard.getCell(`${c}${r}`);
        if (t.secciones[sec]) {
          cell.value = Math.round((t.secciones[sec].suma / t.secciones[sec].count) * 10) / 10;
          cell.style = numberStyle;
        } else {
          cell.value = null;
          cell.style = dataStyle;
        }
      });
    });

    // Color Scale en las celdas de puntajes mensuales
    if (timelineData.length > 0 && uniqueSections.length > 0) {
      const lastCol = String.fromCharCode(67 + uniqueSections.length - 1);
      wsDashboard.addConditionalFormatting({
        ref: `C${tlHeaderRow + 1}:${lastCol}${tlHeaderRow + timelineData.length}`,
        rules: [{
          type: 'colorScale',
          cfvo: [{ type: 'min' }, { type: 'percentile', value: 50 }, { type: 'max' }],
          color: ['FF9C0006', 'FFFFEB9C', 'FF006100'] // Rojo → Amarillo → Verde
        }]
      });
    }

    // Auto-filtro
    wsDashboard.autoFilter = { from: { row: chartDataStartRow - 1, column: 2 }, to: { row: chartDataStartRow + seccionesOrdenadas.length - 1, column: 7 } };

    // ========================================
    // HOJA 2: RANKING PDV
    // ========================================
    const wsRanking = wb.addWorksheet('Ranking PDV', {
      pageSetup: { orientation: 'landscape' },
      views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }]
    });
    wsRanking.columns = [
      { width: 8 }, { width: 38 }, { width: 18 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 18 }
    ];

    // Título
    wsRanking.mergeCells('A1:K1');
    wsRanking.getCell('A1').value = '🏆 RANKING GERENCIAL - PUNTOS DE VENTA (MES ANTERIOR vs ACTUAL)';
    wsRanking.getCell('A1').style = titleStyle;
    wsRanking.getRow(1).height = 30;

    // Cabeceras
    const rankHeaders = ['Puesto', 'Punto de Venta', 'Ciudad', 'Mes Anterior (%)', 'Mes Actual (%)', 'Diferencia (Pts)', 'Variación (%)', 'Tendencia', 'Total Eval.', 'Secc. Alerta', 'Estado'];
    rankHeaders.forEach((h, i) => {
      const cell = wsRanking.getCell(3, i + 1);
      cell.value = h;
      cell.style = headerStyle;
    });
    wsRanking.getRow(3).height = 25;

    // Datos
    rankingPdv.forEach((p, idx) => {
      const r = 4 + idx;
      wsRanking.getCell(r, 1).value = idx + 1;
      wsRanking.getCell(r, 2).value = p.pdv_nombre;
      wsRanking.getCell(r, 3).value = p.ciudad_nombre;
      wsRanking.getCell(r, 4).value = p.puntaje_mes_anterior;
      wsRanking.getCell(r, 5).value = p.puntaje_mes_actual;
      wsRanking.getCell(r, 6).value = p.diferencia_puntos;
      wsRanking.getCell(r, 7).value = p.variacion_porcentual / 100;
      wsRanking.getCell(r, 8).value = p.tendencia;
      wsRanking.getCell(r, 9).value = p.total_evaluaciones;
      wsRanking.getCell(r, 10).value = p.secciones_en_alerta;
      wsRanking.getCell(r, 11).value = p.puntaje_mes_actual >= 90 ? 'Excelente' : p.puntaje_mes_actual >= 75 ? 'Regular' : 'Crítico';

      [1,2,3,4,5,6,7,8,9,10,11].forEach(c => {
        const cell = wsRanking.getCell(r, c);
        cell.style = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: c <= 3 ? 'left' : 'center' } };
        if (c === 4 || c === 5) cell.numFmt = '0.0"%"';
        if (c === 7) cell.numFmt = '0.0%';
      });

      // Color condicional en Mes Actual
      applyScoreStyle(wsRanking.getCell(r, 5), p.puntaje_mes_actual);

      // Color en diferencia
      applyTrendStyle(wsRanking.getCell(r, 6), p.diferencia_puntos);

      // Color en tendencia
      const cellTend = wsRanking.getCell(r, 8);
      if (p.tendencia === 'Mejoró') { cellTend.fill = goodFill; cellTend.font = goodFont; }
      else if (p.tendencia === 'Disminuyó') { cellTend.fill = badFill; cellTend.font = badFont; }
      else { cellTend.fill = warningFill; cellTend.font = warningFont; }

      // Color en estado
      const cellEstado = wsRanking.getCell(r, 11);
      if (cellEstado.value === 'Excelente') { cellEstado.fill = goodFill; cellEstado.font = goodFont; }
      else if (cellEstado.value === 'Regular') { cellEstado.fill = warningFill; cellEstado.font = warningFont; }
      else { cellEstado.fill = badFill; cellEstado.font = badFont; }
    });

    // Data Bars en Mes Actual y Mes Anterior
    if (rankingPdv.length > 0) {
      wsRanking.addConditionalFormatting({
        ref: `D4:E${3 + rankingPdv.length}`,
        rules: [{
          type: 'dataBar',
          cfvo: [{ type: 'num', value: 0 }, { type: 'num', value: 100 }],
          border: true,
          barColor: 'FF2E75B6',
          showValue: true
        }]
      });

      // Data Bars en Diferencia (con colores positivos/negativos)
      wsRanking.addConditionalFormatting({
        ref: `F4:F${3 + rankingPdv.length}`,
        rules: [{
          type: 'dataBar',
          cfvo: [{ type: 'num', value: -100 }, { type: 'num', value: 100 }],
          border: true,
          barColor: 'FF006100', // Verde para positivos
          barNegativeColor: 'FF9C0006', // Rojo para negativos
          barNegativeBorderColor: 'FF9C0006',
          showValue: true
        }]
      });
    }

    wsRanking.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3 + rankingPdv.length, column: 11 } };

    // ========================================
    // HOJA 3: COMPORTAMIENTO POR SECCIÓN
    // ========================================
    const wsSecciones = wb.addWorksheet('Comportamiento por Sección', { views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }] });
    wsSecciones.columns = [
      { width: 42 }, { width: 18 }, { width: 20 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 34 }, { width: 34 }
    ];

    wsSecciones.mergeCells('A1:I1');
    wsSecciones.getCell('A1').value = '🔬 ANÁLISIS DETALLADO POR SECCIÓN / SUB-ÁREA (CONCEPTO SANITARIO Y CONFORMIDAD)';
    wsSecciones.getCell('A1').style = titleStyle;

    const secHeaders = ['Sección / Sub-Área', 'Puntaje Promedio (%)', 'Concepto Sanitario', 'Visitas Eval.', 'Conformes (SÍ)', 'Hallazgos (NO)', 'Caídas Recientes', 'Mejor PDV (Puntaje)', 'Peor PDV (Puntaje)'];
    secHeaders.forEach((h, i) => {
      const cell = wsSecciones.getCell(3, i + 1);
      cell.value = h;
      cell.style = headerStyle;
    });

    seccionesOrdenadas.forEach((s, idx) => {
      const r = 4 + idx;
      wsSecciones.getCell(r, 1).value = s.seccion_nombre;
      wsSecciones.getCell(r, 1).style = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: 'left' } };
      wsSecciones.getCell(r, 2).value = s.puntaje_promedio;
      wsSecciones.getCell(r, 2).style = numberStyle;
      applyScoreStyle(wsSecciones.getCell(r, 2), s.puntaje_promedio);

      const cellConcepto = wsSecciones.getCell(r, 3);
      cellConcepto.value = s.concepto_sanitario || (s.puntaje_promedio >= 90 ? 'Favorable' : s.puntaje_promedio >= 75 ? 'Condicionado' : 'Crítico');
      cellConcepto.style = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: 'center' } };
      applyScoreStyle(cellConcepto, s.puntaje_promedio);

      wsSecciones.getCell(r, 4).value = s.visitas_evaluadas;
      wsSecciones.getCell(r, 4).style = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: 'center' } };

      wsSecciones.getCell(r, 5).value = s.total_si || 0;
      wsSecciones.getCell(r, 5).style = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: 'center' }, font: goodFont };

      wsSecciones.getCell(r, 6).value = s.total_no || 0;
      wsSecciones.getCell(r, 6).style = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: 'center' }, font: (s.total_no > 0 ? badFont : dataStyle.font) };

      wsSecciones.getCell(r, 7).value = s.caidas_recientes;
      wsSecciones.getCell(r, 7).style = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: 'center' } };
      if (s.caidas_recientes > 0) { wsSecciones.getCell(r, 7).fill = badFill; wsSecciones.getCell(r, 7).font = badFont; }

      wsSecciones.getCell(r, 8).value = `${s.mejor_pdv.nombre} (${s.mejor_pdv.puntaje}%)`;
      wsSecciones.getCell(r, 8).style = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: 'left' } };
      wsSecciones.getCell(r, 9).value = `${s.peor_pdv.nombre} (${s.peor_pdv.puntaje}%)`;
      wsSecciones.getCell(r, 9).style = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: 'left' } };
    });

    // Data Bars en Puntaje Promedio
    if (seccionesOrdenadas.length > 0) {
      wsSecciones.addConditionalFormatting({
        ref: `B4:B${3 + seccionesOrdenadas.length}`,
        rules: [{
          type: 'dataBar',
          cfvo: [{ type: 'num', value: 0 }, { type: 'num', value: 100 }],
          border: true,
          barColor: 'FF2E75B6',
          showValue: true
        }]
      });
    }

    wsSecciones.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3 + seccionesOrdenadas.length, column: 9 } };

    // ========================================
    // HOJA 4: PARETO DE HALLAZGOS CRÍTICOS (NO CONFORMIDADES)
    // ========================================
    const wsPareto = wb.addWorksheet('Top Hallazgos Críticos', { views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }] });
    wsPareto.columns = [
      { width: 8 }, { width: 24 }, { width: 26 }, { width: 42 }, { width: 16 }, { width: 16 }, { width: 18 }, { width: 28 }, { width: 55 }
    ];

    wsPareto.mergeCells('A1:I1');
    wsPareto.getCell('A1').value = '🚨 PARETO DE NO CONFORMIDADES Y HALLAZGOS RECURRENTES (PLAN DE ACCIÓN CALIDAD)';
    wsPareto.getCell('A1').style = titleStyle;

    const paretoHeaders = ['#', 'Área / Formato', 'Sub-Área / Sección', 'Ítem / Aspecto Evaluado', 'Incumplimientos (NO)', 'Veces Evaluado', '% Incumplimiento', 'PDVs Afectados', 'Observaciones Recientes del Auditor'];
    paretoHeaders.forEach((h, i) => {
      const cell = wsPareto.getCell(3, i + 1);
      cell.value = h;
      cell.style = headerStyle;
    });

    (topHallazgos || []).forEach((h, idx) => {
      const r = 4 + idx;
      wsPareto.getCell(r, 1).value = idx + 1;
      wsPareto.getCell(r, 2).value = h.area_nombre;
      wsPareto.getCell(r, 3).value = h.subarea_nombre;
      wsPareto.getCell(r, 4).value = h.item_nombre;
      wsPareto.getCell(r, 5).value = h.total_fallos;
      wsPareto.getCell(r, 6).value = h.total_evaluaciones;
      wsPareto.getCell(r, 7).value = h.tasa_fallo;
      wsPareto.getCell(r, 8).value = (h.pdvs_afectados || []).join(', ');
      wsPareto.getCell(r, 9).value = (h.observaciones_recientes || []).join(' | ') || 'Sin observación escrita';

      [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(c => {
        const cell = wsPareto.getCell(r, c);
        cell.style = { ...dataStyle, alignment: { vertical: 'middle', horizontal: [1, 5, 6, 7].includes(c) ? 'center' : 'left', wrapText: c === 9 } };
      });
      wsPareto.getCell(r, 5).fill = badFill;
      wsPareto.getCell(r, 5).font = badFont;
      wsPareto.getCell(r, 7).numFmt = '0.0"%"';
      if (h.tasa_fallo >= 50) {
        wsPareto.getCell(r, 7).fill = badFill;
        wsPareto.getCell(r, 7).font = badFont;
      } else if (h.tasa_fallo >= 25) {
        wsPareto.getCell(r, 7).fill = warningFill;
        wsPareto.getCell(r, 7).font = warningFont;
      }
    });

    if ((topHallazgos || []).length > 0) {
      wsPareto.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3 + topHallazgos.length, column: 9 } };
    }

    // ========================================
    // HOJA 5: HISTORIAL Y ALERTAS
    // ========================================
    const wsHistorial = wb.addWorksheet('Historial y Alertas', { views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }] });
    wsHistorial.columns = [
      { width: 10 }, { width: 14 }, { width: 30 }, { width: 15 }, { width: 34 }, { width: 32 },
      { width: 14 }, { width: 18 }, { width: 14 }, { width: 12 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 55 }
    ];

    wsHistorial.mergeCells('A1:N1');
    wsHistorial.getCell('A1').value = '📜 TRAZABILIDAD LONGITUDINAL, CONCEPTO SANITARIO Y DETALLE DE HALLAZGOS';
    wsHistorial.getCell('A1').style = titleStyle;

    const histHeaders = ['Visita ID', 'Fecha', 'Punto de Venta', 'Ciudad', 'Plantilla', 'Sección', 'Puntaje (%)', 'Concepto Sanitario', 'Anterior (%)', 'Variación', 'SI', 'NO', 'N/A', 'Hallazgos y Observaciones Registradas'];
    histHeaders.forEach((h, i) => {
      const cell = wsHistorial.getCell(3, i + 1);
      cell.value = h;
      cell.style = headerStyle;
    });

    const historialOrdenado = [...rawHistorial].sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
    historialOrdenado.forEach((h, idx) => {
      const r = 4 + idx;
      wsHistorial.getCell(r, 1).value = h.visita_id;
      wsHistorial.getCell(r, 2).value = h.fecha;
      wsHistorial.getCell(r, 3).value = h.pdv_nombre;
      wsHistorial.getCell(r, 4).value = h.ciudad_nombre;
      wsHistorial.getCell(r, 5).value = h.plantilla_nombre;
      wsHistorial.getCell(r, 6).value = h.seccion_nombre;
      wsHistorial.getCell(r, 7).value = h.puntaje;
      wsHistorial.getCell(r, 8).value = h.concepto_sanitario || (h.puntaje >= 90 ? 'Favorable' : h.puntaje >= 75 ? 'Condicionado' : 'Crítico');
      wsHistorial.getCell(r, 9).value = h.puntaje_anterior !== null ? h.puntaje_anterior : 'Primera';
      wsHistorial.getCell(r, 10).value = h.puntaje_anterior !== null ? h.diferencia : '—';
      wsHistorial.getCell(r, 11).value = h.preguntas_si;
      wsHistorial.getCell(r, 12).value = h.preguntas_no;
      wsHistorial.getCell(r, 13).value = h.preguntas_na;
      wsHistorial.getCell(r, 14).value = h.hallazgos_resumen || (h.preguntas_no > 0 ? `${h.preguntas_no} hallazgo(s) sin observación` : '100% Conforme');

      [1,2,3,4,5,6,7,8,9,10,11,12,13,14].forEach(c => {
        const cell = wsHistorial.getCell(r, c);
        cell.style = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: (c <= 6 || c === 14) ? 'left' : 'center' } };
        if (c === 7 || c === 9) cell.numFmt = '0.0"%"';
      });

      // Highlight alertas
      if (h.alerta_disminucion) {
        [1,2,3,4,5,6,7,8,9,10,11,12,13,14].forEach(c => {
          const cell = wsHistorial.getCell(r, c);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF0F0' } };
        });
        wsHistorial.getCell(r, 10).fill = badFill;
        wsHistorial.getCell(r, 10).font = badFont;
      }

      // Color puntaje y concepto
      applyScoreStyle(wsHistorial.getCell(r, 7), h.puntaje);
      applyScoreStyle(wsHistorial.getCell(r, 8), h.puntaje);
    });

    wsHistorial.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3 + historialOrdenado.length, column: 14 } };

    // ========================================
    // HOJA 5: COMPARADOR DE PERIODOS
    // ========================================
    if (evaluaciones_por_periodo.length >= 2) {
      const wsComparador = wb.addWorksheet('Comparador Periodos', { views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }] });
      wsComparador.columns = [ { width: 45 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 } ];

      wsComparador.mergeCells('A1:F1');
      wsComparador.getCell('A1').value = '⚖️ COMPARADOR HISTÓRICO ENTRE PERIODOS';
      wsComparador.getCell('A1').style = titleStyle;

      // Mostrar los periodos disponibles
      wsComparador.getCell('A3').value = 'Periodos disponibles:';
      wsComparador.getCell('A3').style = { font: { bold: true, size: 11 } };
      evaluaciones_por_periodo.forEach((p, i) => {
        wsComparador.getCell(4 + i, 1).value = p.periodo;
        wsComparador.getCell(4 + i, 2).value = p.puntaje_promedio;
        wsComparador.getCell(4 + i, 2).numFmt = '0.0"%"';
        wsComparador.getCell(4 + i, 2).style = dataStyle;
        wsComparador.getCell(4 + i, 3).value = p.total_evaluaciones;
        wsComparador.getCell(4 + i, 3).style = dataStyle;
      });

      // Comparativa detallada del primer vs segundo periodo
      const pA = evaluaciones_por_periodo[0];
      const pB = evaluaciones_por_periodo[1];
      const compStartRow = 4 + evaluaciones_por_periodo.length + 2;

      wsComparador.mergeCells(`A${compStartRow}:F${compStartRow}`);
      wsComparador.getCell(`A${compStartRow}`).value = `Comparativa: ${pA.periodo} (${pA.puntaje_promedio}%) vs ${pB.periodo} (${pB.puntaje_promedio}%)`;
      wsComparador.getCell(`A${compStartRow}`).style = subtitleStyle;

      const compHeaders = ['Sub-Área', `Puntaje ${pA.periodo} (%)`, `Puntaje ${pB.periodo} (%)`, 'Diferencia (Pts)', 'Variación (%)', 'Tendencia'];
      compHeaders.forEach((h, i) => {
        const cell = wsComparador.getCell(compStartRow + 2, i + 1);
        cell.value = h;
        cell.style = headerStyle;
      });

      const allSections = [...new Set([...pA.desglose_subareas.map(s => s.seccion_nombre), ...pB.desglose_subareas.map(s => s.seccion_nombre)])].sort();
      allSections.forEach((sec, idx) => {
        const r = compStartRow + 3 + idx;
        const stA = pA.desglose_subareas.find(s => s.seccion_nombre === sec);
        const stB = pB.desglose_subareas.find(s => s.seccion_nombre === sec);
        const scoreA = stA ? stA.puntaje : null;
        const scoreB = stB ? stB.puntaje : null;
        const diff = (scoreA !== null && scoreB !== null) ? Math.round((scoreA - scoreB) * 10) / 10 : null;
        const varPct = (scoreB !== null && scoreB > 0 && diff !== null) ? diff / scoreB : null;
        const tendencia = diff !== null ? (diff > 0.1 ? '🟢 Mejoró' : diff < -0.1 ? '🔴 Disminuyó' : '🟡 Se mantuvo') : 'Sin datos';

        wsComparador.getCell(r, 1).value = sec;
        wsComparador.getCell(r, 2).value = scoreA;
        wsComparador.getCell(r, 3).value = scoreB;
        wsComparador.getCell(r, 4).value = diff;
        wsComparador.getCell(r, 5).value = varPct;
        wsComparador.getCell(r, 6).value = tendencia;

        [1,2,3,4,5,6].forEach(c => {
          const cell = wsComparador.getCell(r, c);
          cell.style = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: c === 1 ? 'left' : 'center' } };
          if (c === 2 || c === 3) cell.numFmt = '0.0"%"';
          if (c === 5) cell.numFmt = '0.0%';
        });

        if (diff !== null) {
          applyTrendStyle(wsComparador.getCell(r, 4), diff);
        }
      });

      // Data Bars en Puntajes A y B
      if (allSections.length > 0) {
        wsComparador.addConditionalFormatting({
          ref: `B${compStartRow + 3}:C${compStartRow + 2 + allSections.length}`,
          rules: [{
            type: 'dataBar',
            cfvo: [{ type: 'num', value: 0 }, { type: 'num', value: 100 }],
            border: true,
            barColor: 'FF2E75B6',
            showValue: true
          }]
        });

        // Data Bars en Diferencia
        wsComparador.addConditionalFormatting({
          ref: `D${compStartRow + 3}:D${compStartRow + 2 + allSections.length}`,
          rules: [{
            type: 'dataBar',
            cfvo: [{ type: 'num', value: -100 }, { type: 'num', value: 100 }],
            border: true,
            barColor: 'FF006100',
            barNegativeColor: 'FF9C0006',
            barNegativeBorderColor: 'FF9C0006',
            showValue: true
          }]
        });
      }

      wsComparador.autoFilter = { from: { row: compStartRow + 2, column: 1 }, to: { row: compStartRow + 2 + allSections.length, column: 6 } };
    }

    // ========================================
    // HOJA 6: RESUMEN KPIs
    // ========================================
    const wsKPIs = wb.addWorksheet('Resumen KPIs');
    wsKPIs.columns = [ { width: 50 }, { width: 40 } ];

    wsKPIs.mergeCells('A1:B1');
    wsKPIs.getCell('A1').value = '📋 RESUMEN DE INDICADORES CLAVE (KPIs)';
    wsKPIs.getCell('A1').style = titleStyle;

    const kpiData = [
      { label: 'Puntaje Promedio General', value: `${promedioGeneral}%` },
      { label: 'Total Visitas Analizadas', value: rawHistorial.length.toString() },
      { label: 'Secciones Evaluadas', value: evolucionPorSeccion.length.toString() },
      { label: 'PDVs Analizados', value: rankingPdv.length.toString() },
      { label: 'Alertas de Disminución Activas', value: totalAlertas.toString() },
      { label: 'Mes Actual (' + mes_actual_label + ')', value: `${global_mes_actual}%` },
      { label: 'Mes Anterior (' + mes_anterior_label + ')', value: `${global_mes_anterior}%` },
      { label: 'Diferencia Global (Pts)', value: `${Math.round((global_mes_actual - global_mes_anterior) * 10) / 10} pts` },
      { label: 'Variación Global (%)', value: `${Math.round(((global_mes_actual - global_mes_anterior) / (global_mes_anterior || 1)) * 100 * 10) / 10}%` },
      { label: 'Áreas Disponibles', value: [...allAreasSet].join(', ') },
      { label: 'Sub-áreas Disponibles', value: [...allSubareasSet].join(', ') },
      { label: 'Ítems Disponibles', value: [...allItemsSet].join(', ') },
      { label: 'Filtro Área Aplicado', value: areaFiltro },
      { label: 'Filtro Sub-área Aplicado', value: subareaFiltro },
      { label: 'Filtro Ítem Aplicado', value: itemFiltro },
      { label: 'Fecha Inicio Filtro', value: fechaInicio || 'Sin filtro' },
      { label: 'Fecha Fin Filtro', value: fechaFin || 'Sin filtro' },
      { label: 'Fecha de Generación', value: new Date().toLocaleString('es-ES') },
      { label: 'Generado por', value: user.nombre || user.email }
    ];

    kpiData.forEach((kpi, idx) => {
      const r = 3 + idx;
      wsKPIs.getCell(r, 1).value = kpi.label;
      wsKPIs.getCell(r, 1).style = { font: { bold: true, size: 11 }, border: { bottom: { style: 'thin', color: { argb: 'FFD9E2F3' } } } };
      wsKPIs.getCell(r, 2).value = kpi.value;
      wsKPIs.getCell(r, 2).style = { font: { size: 11, color: { argb: 'FF2E75B6' } }, alignment: { horizontal: 'center' }, border: { bottom: { style: 'thin', color: { argb: 'FFD9E2F3' } } } };
    });

    // ========================================
    // GENERAR BUFFER Y RETORNAR
    // ========================================
    const buffer = await wb.xlsx.writeBuffer();
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const safeAreaSlug = areaFiltro === 'all' ? 'Todas_las_Areas' : areaFiltro.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
    const safeSubSlug = subareaFiltro === 'all' ? '' : `_${subareaFiltro.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_')}`;
    const fileName = `Informe_Calidad_${safeAreaSlug}${safeSubSlug}_${dateStr}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': buffer.length.toString()
      }
    });

  } catch (error) {
    console.error('Error exportando calidad-comportamiento:', error);
    return NextResponse.json({ error: 'Error al exportar análisis de calidad: ' + error.message }, { status: 500 });
  }
}