import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { getUserFromRequest } = require('@/lib/auth');
const ExcelJS = require('exceljs');

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

    const db = getDb();

    // Palabras clave para categorizar preguntas
    const SECTION_KEYWORDS = [
      { keywords: ['almacen', 'almacén', 'bodega', 'estante'], seccion: 'Almacén' },
      { keywords: ['materia prima', 'materias primas', 'insumo', 'ingrediente', 'fecha vencimiento', 'rotulado'], seccion: 'Materias primas' },
      { keywords: ['recibo', 'recepcion', 'recepción', 'descargue', 'proveedor'], seccion: 'Recibo y Despacho' },
      { keywords: ['oficina', 'escritorio', 'administrativo', 'archivo'], seccion: 'Oficina' },
      { keywords: ['parqueadero', 'estacionamiento', 'bahia', 'acceso externo'], seccion: 'Parqueadero' },
      { keywords: ['cocina', 'estufa', 'plancha', 'freidora', 'campana', 'caliente', 'preparacion'], seccion: 'Cocina' },
      { keywords: ['comedor', 'mesa', 'silla', 'barra', 'salon', 'salón', 'atencion'], seccion: 'Comedor y Salón' },
      { keywords: ['baño', 'baños', 'sanitario', 'lavamanos', 'jabon', 'toalla'], seccion: 'Baños y Vestidores' },
      { keywords: ['cuarto frio', 'cuarto frío', 'congelacion', 'congelador', 'refrigerador', 'cava', 'temperatura'], seccion: 'Cuartos Fríos y Refrigeración' },
      { keywords: ['manipulador', 'personal', 'uniforme', 'uñas', 'gorro', 'peto', 'higiene manos'], seccion: 'Personal Manipulador' },
      { keywords: ['equipo', 'utensilio', 'licuadora', 'cutter', 'maquina'], seccion: 'Equipos y Utensilios' },
      { keywords: ['instalacion', 'edificacion', 'techo', 'pared', 'piso', 'tuberias', 'drenaje'], seccion: 'Instalaciones y Locativo' },
      { keywords: ['basura', 'residuo', 'caneca', 'punto ecologico', 'plagas'], seccion: 'Saneamiento y Residuos' }
    ];

    function categorizarPregunta(texto) {
      if (!texto) return 'Área General / Operativa';
      const norm = texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      for (const sk of SECTION_KEYWORDS) {
        for (const kw of sk.keywords) {
          const normKw = kw.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
          if (norm.includes(normKw)) return sk.seccion;
        }
      }
      return 'Área General / Operativa';
    }

    // 1. Obtener visitas
    let query = `
      SELECT v.id, v.pdv_id, p.nombre as pdv_nombre, p.ciudad_id, c.nombre as ciudad_nombre,
             v.fecha, v.plantilla_id, pl.nombre as plantilla_nombre, pl.campos as plantilla_campos,
             v.datos_formulario, v.estado
      FROM visitas v
      JOIN pdv p ON p.id = v.pdv_id
      LEFT JOIN ciudades c ON c.id = p.ciudad_id
      LEFT JOIN plantillas pl ON pl.id = v.plantilla_id
      WHERE (v.area_id = 4 OR pl.nombre LIKE '%BPM%' OR pl.nombre LIKE '%Calidad%' OR pl.nombre LIKE '%Inspección%' OR pl.nombre LIKE '%Check list%')
        AND v.datos_formulario IS NOT NULL AND v.datos_formulario != '{}'
    `;

    const queryParams = [];
    if (pdvId && pdvId !== 'all') { query += ` AND v.pdv_id = ?`; queryParams.push(parseInt(pdvId)); }
    if (ciudadId && ciudadId !== 'all') { query += ` AND p.ciudad_id = ?`; queryParams.push(parseInt(ciudadId)); }
    if (fechaInicio && fechaInicio !== 'undefined' && fechaInicio !== 'null') { query += ` AND v.fecha >= ?`; queryParams.push(fechaInicio); }
    if (fechaFin && fechaFin !== 'undefined' && fechaFin !== 'null') { query += ` AND v.fecha <= ?`; queryParams.push(fechaFin); }
    query += ` ORDER BY v.fecha ASC, v.id ASC`;

    const visitasRows = db.prepare(query).all(...queryParams);

    // 2. Procesar datos
    const rawHistorial = [];
    const previousScoresMap = {};
    const allAreasSet = new Set();
    const allSubareasSet = new Set();
    const allItemsSet = new Set();

    for (const v of visitasRows) {
      let answers = {};
      try { answers = typeof v.datos_formulario === 'string' ? JSON.parse(v.datos_formulario) : (v.datos_formulario || {}); }
      catch (e) { continue; }

      let templateConfig = [];
      try { templateConfig = typeof v.plantilla_campos === 'string' ? JSON.parse(v.plantilla_campos) : (v.plantilla_campos || []); }
      catch (e) { templateConfig = []; }

      const rawPlantillaNombre = v.plantilla_nombre || 'Área General';
      const areaName = rawPlantillaNombre.replace(/Verificaci[oó]n (de )?L&D /i, '').replace(/Lista de chequeo /i, '').trim();

      const visitItems = [];

      if (Array.isArray(templateConfig) && templateConfig.length > 0) {
        const rootItem = templateConfig[0];
        if (rootItem && rootItem.tipo === 'matrix') {
          // Matrix: keys like "ItemName__sec_N__ColumnName" or "ItemName__sec_N"
          Object.entries(answers).forEach(([key, val]) => {
            if (val === 'SI' || val === 'NO' || val === 'NA' || typeof val === 'boolean') {
              if (key.includes('__sec_')) {
                const parts = key.split('__');
                if (parts.length >= 3) {
                  // Matrix with column: ItemName__sec_N__ColumnName
                  visitItems.push({ areaName, secName: parts[2].trim(), itemName: parts[0].trim(), val });
                } else if (parts.length === 2) {
                  // Matrix without column or simple_checklist: ItemName__sec_N
                  visitItems.push({ areaName, secName: parts[1].trim(), itemName: parts[0].trim(), val });
                }
              }
            }
          });
        } else if (rootItem && rootItem.secciones && Array.isArray(rootItem.secciones)) {
          rootItem.secciones.forEach((sec, secIdx) => {
            const secName = sec.nombre || `Sección ${secIdx + 1}`;
            if (Array.isArray(sec.filas)) {
              sec.filas.forEach((filaTexto, rowIdx) => {
                const qKey = `q_${secIdx}_${rowIdx}`;
                const val = answers[qKey];
                if (val !== undefined) visitItems.push({ areaName, secName, itemName: filaTexto.trim() || `Pregunta ${rowIdx + 1}`, val });
              });
            }
          });
        } else {
          templateConfig.forEach((item, itemIdx) => {
            if (item.tipo === 'checkbox' || item.tipo === 'radio' || item.tipo === 'select' || item.label) {
              const secName = item.seccion || categorizarPregunta(item.label || item.nombre);
              const itemName = item.label || item.nombre || `Pregunta ${itemIdx + 1}`;
              const val = answers[item.nombre || `item_${itemIdx}`];
              if (val !== undefined) visitItems.push({ areaName, secName, itemName, val });
            }
          });
        }
      }

      if (visitItems.length === 0 && Object.keys(answers).length > 0) {
        Object.entries(answers).forEach(([key, val]) => {
          if (val === 'SI' || val === 'NO' || val === 'NA' || typeof val === 'boolean') {
            let secName, itemName = key;
            if (key.includes('__sec_')) {
              const parts = key.split('__');
              if (parts.length >= 3) {
                itemName = parts[0].trim();
                secName = parts[2].trim();
              } else if (parts.length === 2) {
                itemName = parts[0].trim();
                secName = parts[1].trim();
              }
            } else {
              secName = categorizarPregunta(key);
            }
            visitItems.push({ areaName, secName, itemName, val });
          }
        });
      }

      const agrupacionStats = {};
      visitItems.forEach(item => {
        const { areaName, secName, itemName, val } = item;
        allAreasSet.add(areaName);
        if (areaFiltro === 'all' || areaName === areaFiltro) {
          allSubareasSet.add(secName);
          if (subareaFiltro === 'all' || secName === subareaFiltro) allItemsSet.add(itemName);
        }
        if (areaFiltro !== 'all' && areaName !== areaFiltro) return;
        if (subareaFiltro !== 'all' && secName !== subareaFiltro) return;
        if (itemFiltro !== 'all' && itemName !== itemFiltro) return;

        let agrupacion_nombre = areaName;
        if (areaFiltro !== 'all') agrupacion_nombre = secName;
        if (subareaFiltro !== 'all') agrupacion_nombre = itemName;

        if (!agrupacionStats[agrupacion_nombre]) agrupacionStats[agrupacion_nombre] = { si: 0, no: 0, na: 0 };
        if (val === 'SI' || val === true || val === 1 || val === 'Cumple') agrupacionStats[agrupacion_nombre].si++;
        else if (val === 'NO' || val === false || val === 0 || val === 'No Cumple') agrupacionStats[agrupacion_nombre].no++;
        else if (val === 'NA' || val === 'N/A' || val === 'No Aplica') agrupacionStats[agrupacion_nombre].na++;
      });

      Object.entries(agrupacionStats).forEach(([agrupName, counts]) => {
        const totalEval = counts.si + counts.no;
        if (totalEval === 0 && counts.na === 0) return;
        const puntaje = totalEval > 0 ? Math.round((counts.si / totalEval) * 100 * 10) / 10 : 100;
        const pdvSecKey = `${v.pdv_id}_${agrupName}`;
        const puntajeAnterior = previousScoresMap[pdvSecKey] !== undefined ? previousScoresMap[pdvSecKey] : null;
        const diferencia = puntajeAnterior !== null ? Math.round((puntaje - puntajeAnterior) * 10) / 10 : 0;
        const alertaDisminucion = puntajeAnterior !== null && diferencia < 0;
        previousScoresMap[pdvSecKey] = puntaje;

        rawHistorial.push({
          visita_id: v.id, pdv_id: v.pdv_id, pdv_nombre: v.pdv_nombre || `PDV #${v.pdv_id}`,
          ciudad_id: v.ciudad_id || 1, ciudad_nombre: v.ciudad_nombre || 'Sin ciudad',
          fecha: v.fecha, plantilla_id: v.plantilla_id, plantilla_nombre: v.plantilla_nombre || 'Inspección Calidad',
          seccion_nombre: agrupName, puntaje, puntaje_anterior: puntajeAnterior, diferencia,
          alerta_disminucion: alertaDisminucion ? 1 : 0,
          preguntas_si: counts.si, preguntas_no: counts.no, preguntas_na: counts.na
        });
      });
    }

    // 3. Calcular métricas agregadas
    const rankingPdvMap = {};
    const seccionEvolMap = {};
    const timelineMap = {};

    rawHistorial.forEach(item => {
      if (!rankingPdvMap[item.pdv_id]) {
        rankingPdvMap[item.pdv_id] = { pdv_id: item.pdv_id, pdv_nombre: item.pdv_nombre, ciudad_nombre: item.ciudad_nombre, total_evaluaciones: 0, suma_puntajes: 0, secciones_en_alerta: 0, secciones_conteo: {} };
      }
      rankingPdvMap[item.pdv_id].total_evaluaciones++;
      rankingPdvMap[item.pdv_id].suma_puntajes += item.puntaje;
      if (item.alerta_disminucion) rankingPdvMap[item.pdv_id].secciones_en_alerta++;
      rankingPdvMap[item.pdv_id].secciones_conteo[item.seccion_nombre] = item.puntaje;

      if (!seccionEvolMap[item.seccion_nombre]) {
        seccionEvolMap[item.seccion_nombre] = { seccion_nombre: item.seccion_nombre, visitas_evaluadas: 0, suma_puntajes: 0, caidas_recientes: 0, pdv_scores: {} };
      }
      seccionEvolMap[item.seccion_nombre].visitas_evaluadas++;
      seccionEvolMap[item.seccion_nombre].suma_puntajes += item.puntaje;
      if (item.alerta_disminucion) seccionEvolMap[item.seccion_nombre].caidas_recientes++;
      if (!seccionEvolMap[item.seccion_nombre].pdv_scores[item.pdv_nombre]) {
        seccionEvolMap[item.seccion_nombre].pdv_scores[item.pdv_nombre] = [];
      }
      seccionEvolMap[item.seccion_nombre].pdv_scores[item.pdv_nombre].push(item.puntaje);

      const mesKey = item.fecha ? item.fecha.substring(0, 7) : 'Sin fecha';
      if (!timelineMap[mesKey]) timelineMap[mesKey] = { mes: mesKey, secciones: {} };
      if (!timelineMap[mesKey].secciones[item.seccion_nombre]) timelineMap[mesKey].secciones[item.seccion_nombre] = { suma: 0, count: 0 };
      timelineMap[mesKey].secciones[item.seccion_nombre].suma += item.puntaje;
      timelineMap[mesKey].secciones[item.seccion_nombre].count++;
    });

    const rankingPdv = Object.values(rankingPdvMap).map(p => {
      const allPdvItems = rawHistorial.filter(h => h.pdv_id === p.pdv_id);
      const monthsMap = {};
      allPdvItems.forEach(h => { const m = h.fecha ? h.fecha.substring(0, 7) : 'Sin fecha'; if (!monthsMap[m]) monthsMap[m] = []; monthsMap[m].push(h.puntaje); });
      const sortedMonths = Object.keys(monthsMap).sort().reverse();
      let puntaje_mes_actual = 0, puntaje_mes_anterior = 0;
      if (sortedMonths.length > 0) { const currScores = monthsMap[sortedMonths[0]]; puntaje_mes_actual = Math.round((currScores.reduce((a,b)=>a+b,0) / currScores.length) * 10) / 10; }
      if (sortedMonths.length > 1) { const prevScores = monthsMap[sortedMonths[1]]; puntaje_mes_anterior = Math.round((prevScores.reduce((a,b)=>a+b,0) / prevScores.length) * 10) / 10; }
      else { puntaje_mes_anterior = puntaje_mes_actual; }
      const diferencia_puntos = Math.round((puntaje_mes_actual - puntaje_mes_anterior) * 10) / 10;
      const variacion_porcentual = puntaje_mes_anterior > 0 ? Math.round(((puntaje_mes_actual - puntaje_mes_anterior) / puntaje_mes_anterior) * 100 * 10) / 10 : 0;
      let tendencia = 'Se mantuvo';
      if (diferencia_puntos > 0.1) tendencia = 'Mejoró';
      else if (diferencia_puntos < -0.1) tendencia = 'Disminuyó';
      return { ...p, puntaje_promedio: p.total_evaluaciones > 0 ? Math.round((p.suma_puntajes / p.total_evaluaciones) * 10) / 10 : 0, puntaje_mes_anterior, puntaje_mes_actual, diferencia_puntos, variacion_porcentual, tendencia };
    }).sort((a, b) => b.puntaje_mes_actual - a.puntaje_mes_actual);

    const evolucionPorSeccion = Object.values(seccionEvolMap).map(s => {
      const puntaje_promedio = s.visitas_evaluadas > 0 ? Math.round((s.suma_puntajes / s.visitas_evaluadas) * 10) / 10 : 0;
      let mejor_pdv = { nombre: '-', puntaje: 0 }, peor_pdv = { nombre: '-', puntaje: 100 };
      Object.entries(s.pdv_scores).forEach(([pNombre, scores]) => {
        const avg = Math.round((scores.reduce((a,b)=>a+b,0) / scores.length) * 10) / 10;
        if (avg >= mejor_pdv.puntaje) mejor_pdv = { nombre: pNombre, puntaje: avg };
        if (avg <= peor_pdv.puntaje) peor_pdv = { nombre: pNombre, puntaje: avg };
      });
      return { seccion_nombre: s.seccion_nombre, puntaje_promedio, visitas_evaluadas: s.visitas_evaluadas, caidas_recientes: s.caidas_recientes, mejor_pdv, peor_pdv };
    }).sort((a, b) => a.puntaje_promedio - b.puntaje_promedio);

    const totalAlertas = rawHistorial.filter(h => h.alerta_disminucion).length;
    const promedioGeneral = rawHistorial.length > 0 ? Math.round((rawHistorial.reduce((acc, curr) => acc + curr.puntaje, 0) / rawHistorial.length) * 10) / 10 : 0;

    // Global mes actual vs anterior
    const allMonthsMap = {};
    rawHistorial.forEach(h => { const m = h.fecha ? h.fecha.substring(0, 7) : 'Sin fecha'; if (!allMonthsMap[m]) allMonthsMap[m] = []; allMonthsMap[m].push(h.puntaje); });
    const globalSortedMonths = Object.keys(allMonthsMap).sort().reverse();
    let global_mes_actual = promedioGeneral, global_mes_anterior = promedioGeneral;
    let mes_actual_label = 'Mes Actual', mes_anterior_label = 'Mes Anterior';
    if (globalSortedMonths.length > 0) { mes_actual_label = globalSortedMonths[0]; const scores = allMonthsMap[globalSortedMonths[0]]; global_mes_actual = Math.round((scores.reduce((a,b)=>a+b,0) / scores.length) * 10) / 10; }
    if (globalSortedMonths.length > 1) { mes_anterior_label = globalSortedMonths[1]; const scores = allMonthsMap[globalSortedMonths[1]]; global_mes_anterior = Math.round((scores.reduce((a,b)=>a+b,0) / scores.length) * 10) / 10; }

    // Periodos para comparador
    const periodosMap = {};
    rawHistorial.forEach(h => { const m = h.fecha ? h.fecha.substring(0, 7) : 'Sin fecha'; if (!periodosMap[m]) periodosMap[m] = { periodo: m, total: 0, suma: 0, subareas: {} }; periodosMap[m].total++; periodosMap[m].suma += h.puntaje; if (!periodosMap[m].subareas[h.seccion_nombre]) periodosMap[m].subareas[h.seccion_nombre] = { suma: 0, count: 0 }; periodosMap[m].subareas[h.seccion_nombre].suma += h.puntaje; periodosMap[m].subareas[h.seccion_nombre].count++; });
    const evaluaciones_por_periodo = Object.values(periodosMap).map(p => {
      const desglose = Object.entries(p.subareas).map(([sec, st]) => ({ seccion_nombre: sec, puntaje: Math.round((st.suma / st.count) * 10) / 10, evaluaciones: st.count })).sort((a,b) => a.seccion_nombre.localeCompare(b.seccion_nombre));
      return { periodo: p.periodo, puntaje_promedio: p.total > 0 ? Math.round((p.suma / p.total) * 10) / 10 : 0, total_evaluaciones: p.total, desglose_subareas: desglose };
    }).sort((a,b) => b.periodo.localeCompare(a.periodo));

    // ========================================
    // VARIABLES PARA EXCEL
    // ========================================
    const seccionesOrdenadas = [...evolucionPorSeccion].sort((a,b) => b.puntaje_promedio - a.puntaje_promedio);
    const timelineData = Object.values(timelineMap).sort((a,b) => a.mes.localeCompare(b.mes));
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

    // Título
    wsDashboard.mergeCells('B2:I2');
    wsDashboard.getCell('B2').value = '📊 REPORTE EJECUTIVO - ANALÍTICA DE COMPORTAMIENTO DE CALIDAD';
    wsDashboard.getCell('B2').style = titleStyle;
    wsDashboard.getRow(2).height = 30;

    // Subtítulo con fechas
    wsDashboard.mergeCells('B3:I3');
    wsDashboard.getCell('B3').value = `Periodo: ${fechaInicio || 'Inicio'} al ${fechaFin || 'Fin'}  |  Área: ${areaFiltro}  |  Sub-área: ${subareaFiltro}  |  Generado: ${new Date().toLocaleString('es-ES')}`;
    wsDashboard.getCell('B3').style = { font: { italic: true, size: 10, color: { argb: 'FF666666' } }, alignment: { horizontal: 'center' } };

    // KPIs principales (fila 5-7)
    const kpis = [
      { label: 'PUNTAJE PROMEDIO GENERAL', value: promedioGeneral, suffix: '%', color: promedioGeneral >= 90 ? 'good' : promedioGeneral >= 75 ? 'warning' : 'bad' },
      { label: 'TOTAL VISITAS ANALIZADAS', value: rawHistorial.length, suffix: '', color: 'neutral' },
      { label: 'SECCIONES EVALUADAS', value: evolucionPorSeccion.length, suffix: '', color: 'neutral' },
      { label: 'PDVs ANALIZADOS', value: rankingPdv.length, suffix: '', color: 'neutral' },
      { label: 'ALERTAS DE DISMINUCIÓN', value: totalAlertas, suffix: '', color: totalAlertas > 0 ? 'bad' : 'good' },
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
    const headersSec = ['Sección / Sub-Área', 'Puntaje Promedio', 'Visitas', 'Alertas', 'Mejor PDV', 'Peor PDV'];
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
      wsDashboard.getCell(r, 4).value = s.visitas_evaluadas;
      wsDashboard.getCell(r, 4).style = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: 'center' } };
      wsDashboard.getCell(r, 5).value = s.caidas_recientes;
      wsDashboard.getCell(r, 5).style = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: 'center' } };
      if (s.caidas_recientes > 0) { wsDashboard.getCell(r, 5).fill = badFill; wsDashboard.getCell(r, 5).font = badFont; }
      wsDashboard.getCell(r, 6).value = `${s.mejor_pdv.nombre} (${s.mejor_pdv.puntaje}%)`;
      wsDashboard.getCell(r, 6).style = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: 'left' } };
      wsDashboard.getCell(r, 7).value = `${s.peor_pdv.nombre} (${s.peor_pdv.puntaje}%)`;
      wsDashboard.getCell(r, 7).style = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: 'left' } };
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
      { width: 45 }, { width: 18 }, { width: 15 }, { width: 15 }, { width: 38 }, { width: 38 }
    ];

    wsSecciones.mergeCells('A1:F1');
    wsSecciones.getCell('A1').value = '🔬 ANÁLISIS DETALLADO POR SECCIÓN / SUB-ÁREA';
    wsSecciones.getCell('A1').style = titleStyle;

    const secHeaders = ['Sección / Sub-Área', 'Puntaje Promedio (%)', 'Visitas Evaluadas', 'Caídas Recientes', 'Mejor PDV (Puntaje)', 'Peor PDV (Puntaje)'];
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
      wsSecciones.getCell(r, 3).value = s.visitas_evaluadas;
      wsSecciones.getCell(r, 3).style = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: 'center' } };
      wsSecciones.getCell(r, 4).value = s.caidas_recientes;
      wsSecciones.getCell(r, 4).style = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: 'center' } };
      if (s.caidas_recientes > 0) { wsSecciones.getCell(r, 4).fill = badFill; wsSecciones.getCell(r, 4).font = badFont; }
      wsSecciones.getCell(r, 5).value = `${s.mejor_pdv.nombre} (${s.mejor_pdv.puntaje}%)`;
      wsSecciones.getCell(r, 5).style = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: 'left' } };
      wsSecciones.getCell(r, 6).value = `${s.peor_pdv.nombre} (${s.peor_pdv.puntaje}%)`;
      wsSecciones.getCell(r, 6).style = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: 'left' } };
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

    wsSecciones.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3 + seccionesOrdenadas.length, column: 6 } };

    // ========================================
    // HOJA 4: HISTORIAL Y ALERTAS
    // ========================================
    const wsHistorial = wb.addWorksheet('Historial y Alertas', { views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }] });
    wsHistorial.columns = [
      { width: 10 }, { width: 14 }, { width: 32 }, { width: 15 }, { width: 38 }, { width: 38 },
      { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 15 }, { width: 15 }
    ];

    wsHistorial.mergeCells('A1:L1');
    wsHistorial.getCell('A1').value = '📜 TRAZABILIDAD LONGITUDINAL Y ALERTAS DE DISMINUCIÓN';
    wsHistorial.getCell('A1').style = titleStyle;

    const histHeaders = ['Visita ID', 'Fecha', 'Punto de Venta', 'Ciudad', 'Plantilla', 'Sección', 'Puntaje (%)', 'Anterior (%)', 'Variación', 'SI', 'NO', 'N/A'];
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
      wsHistorial.getCell(r, 8).value = h.puntaje_anterior !== null ? h.puntaje_anterior : 'Primera';
      wsHistorial.getCell(r, 9).value = h.puntaje_anterior !== null ? h.diferencia : '—';
      wsHistorial.getCell(r, 10).value = h.preguntas_si;
      wsHistorial.getCell(r, 11).value = h.preguntas_no;
      wsHistorial.getCell(r, 12).value = h.preguntas_na;

      [1,2,3,4,5,6,7,8,9,10,11,12].forEach(c => {
        const cell = wsHistorial.getCell(r, c);
        cell.style = { ...dataStyle, alignment: { ...dataStyle.alignment, horizontal: c <= 6 ? 'left' : 'center' } };
        if (c === 7 || c === 8) cell.numFmt = '0.0"%"';
      });

      // Highlight alertas
      if (h.alerta_disminucion) {
        [1,2,3,4,5,6,7,8,9,10,11,12].forEach(c => {
          const cell = wsHistorial.getCell(r, c);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF0F0' } };
        });
        wsHistorial.getCell(r, 9).fill = badFill;
        wsHistorial.getCell(r, 9).font = badFont;
      }

      // Color puntaje
      applyScoreStyle(wsHistorial.getCell(r, 7), h.puntaje);
    });

    wsHistorial.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3 + historialOrdenado.length, column: 12 } };

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
    const fileName = `Analisis_Calidad_Comportamiento_${dateStr}.xlsx`;

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