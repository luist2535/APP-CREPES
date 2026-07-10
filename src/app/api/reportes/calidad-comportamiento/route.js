import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { getUserFromRequest } = require('@/lib/auth');

// Palabras clave para categorizar preguntas de plantillas que no tengan secciones declaradas
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
  const norm = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const sk of SECTION_KEYWORDS) {
    for (const kw of sk.keywords) {
      const normKw = kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (norm.includes(normKw)) {
        return sk.seccion;
      }
    }
  }
  return 'Área General / Operativa';
}

export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pdvId = searchParams.get('pdv_id') || 'all';
    const ciudadId = searchParams.get('ciudad_id') || 'all';
    const periodo = searchParams.get('periodo') || 'trimestral'; // mensual | trimestral | semestral | anual | todos
    const seccionFiltro = searchParams.get('seccion') || 'all';

    const db = getDb();

    // 1. Obtener todas las visitas del Área de Calidad (area_id = 4) o cuyas plantillas correspondan a Calidad/Inspecciones/BPM
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
    if (pdvId && pdvId !== 'all') {
      query += ` AND v.pdv_id = ?`;
      queryParams.push(parseInt(pdvId));
    }
    if (ciudadId && ciudadId !== 'all') {
      query += ` AND p.ciudad_id = ?`;
      queryParams.push(parseInt(ciudadId));
    }

    // Filtrar por fechas según periodo si aplica
    if (periodo !== 'todos') {
      const now = new Date();
      let cutoffDate = new Date();
      if (periodo === 'mensual') cutoffDate.setMonth(now.getMonth() - 1);
      else if (periodo === 'trimestral') cutoffDate.setMonth(now.getMonth() - 3);
      else if (periodo === 'semestral') cutoffDate.setMonth(now.getMonth() - 6);
      else if (periodo === 'anual') cutoffDate.setFullYear(now.getFullYear() - 1);
      
      const cutoffStr = cutoffDate.toISOString().split('T')[0];
      query += ` AND v.fecha >= ?`;
      queryParams.push(cutoffStr);
    }

    query += ` ORDER BY v.fecha ASC, v.id ASC`;
    const visitasRows = db.prepare(query).all(...queryParams);

    // 2. Procesar y agrupar por Sección (Sub-área)
    const rawHistorial = [];
    
    // Un mapa temporal de resultados anteriores por clave `${pdv_id}-${seccion_nombre}` para comparar longitudinalmente
    const previousScoresMap = {};

    for (const v of visitasRows) {
      let answers = {};
      try {
        answers = typeof v.datos_formulario === 'string' ? JSON.parse(v.datos_formulario) : (v.datos_formulario || {});
      } catch (e) {
        continue;
      }

      let templateConfig = [];
      try {
        templateConfig = typeof v.plantilla_campos === 'string' ? JSON.parse(v.plantilla_campos) : (v.plantilla_campos || []);
      } catch (e) {
        templateConfig = [];
      }

      // Estructurar ítems y secciones evaluados
      // Mapa seccion_nombre -> { si: 0, no: 0, na: 0 }
      const seccionStats = {};

      if (Array.isArray(templateConfig) && templateConfig.length > 0) {
        const rootItem = templateConfig[0];
        if (rootItem && rootItem.secciones && Array.isArray(rootItem.secciones)) {
          // Plantilla con formato de secciones explícitas (ej. Lista de Chequeo BPM)
          rootItem.secciones.forEach((sec, secIdx) => {
            const secName = sec.nombre || `Sección ${secIdx + 1}`;
            if (!seccionStats[secName]) seccionStats[secName] = { si: 0, no: 0, na: 0 };
            
            if (Array.isArray(sec.filas)) {
              sec.filas.forEach((filaTexto, rowIdx) => {
                const qKey = `q_${secIdx}_${rowIdx}`;
                const ans = answers[qKey];
                if (ans === 'SI' || ans === true || ans === 1 || ans === 'Cumple') seccionStats[secName].si++;
                else if (ans === 'NO' || ans === false || ans === 0 || ans === 'No Cumple') seccionStats[secName].no++;
                else if (ans === 'NA' || ans === 'N/A' || ans === 'No Aplica') seccionStats[secName].na++;
              });
            }
          });
        } else {
          // Plantilla plana de ítems
          templateConfig.forEach((item, itemIdx) => {
            if (item.tipo === 'checkbox' || item.tipo === 'radio' || item.tipo === 'select' || item.label) {
              const secName = item.seccion || categorizarPregunta(item.label || item.nombre);
              if (!seccionStats[secName]) seccionStats[secName] = { si: 0, no: 0, na: 0 };
              const ans = answers[item.nombre || `item_${itemIdx}`];
              if (ans === true || ans === 'SI' || ans === 'Cumple' || ans === 1) seccionStats[secName].si++;
              else if (ans === false || ans === 'NO' || ans === 'No Cumple' || ans === 0) seccionStats[secName].no++;
              else if (ans === 'NA' || ans === 'N/A') seccionStats[secName].na++;
            }
          });
        }
      }

      // Si después de inspeccionar la plantilla no se extrajeron preguntas evaluadas con precisión,
      // revisar directamente las llaves guardadas en answers
      if (Object.keys(seccionStats).length === 0 && Object.keys(answers).length > 0) {
        Object.entries(answers).forEach(([key, val]) => {
          if (val === 'SI' || val === 'NO' || val === 'NA' || typeof val === 'boolean') {
            const secName = categorizarPregunta(key);
            if (!seccionStats[secName]) seccionStats[secName] = { si: 0, no: 0, na: 0 };
            if (val === 'SI' || val === true) seccionStats[secName].si++;
            else if (val === 'NO' || val === false) seccionStats[secName].no++;
            else if (val === 'NA') seccionStats[secName].na++;
          }
        });
      }

      // Calcular puntaje por cada sub-área / sección de esta visita
      Object.entries(seccionStats).forEach(([secName, counts]) => {
        const totalEval = counts.si + counts.no;
        if (totalEval === 0 && counts.na === 0) return; // omitir secciones sin datos

        const puntaje = totalEval > 0 ? Math.round((counts.si / totalEval) * 100 * 10) / 10 : 100;
        const pdvSecKey = `${v.pdv_id}_${secName}`;
        const puntajeAnterior = previousScoresMap[pdvSecKey] !== undefined ? previousScoresMap[pdvSecKey] : null;
        const diferencia = puntajeAnterior !== null ? Math.round((puntaje - puntajeAnterior) * 10) / 10 : 0;
        const alertaDisminucion = puntajeAnterior !== null && diferencia < 0;

        // Actualizar el score anterior para la siguiente visita de esta línea de tiempo
        previousScoresMap[pdvSecKey] = puntaje;

        // Filtrar por sección si el usuario eligió una en particular
        if (seccionFiltro !== 'all' && secName !== seccionFiltro) return;

        rawHistorial.push({
          id: `${v.id}_${secName.replace(/[^a-zA-Z0-9]/g, '')}`,
          visita_id: v.id,
          pdv_id: v.pdv_id,
          pdv_nombre: v.pdv_nombre || `PDV #${v.pdv_id}`,
          ciudad_id: v.ciudad_id || 1,
          ciudad_nombre: v.ciudad_nombre || 'Cartagena',
          fecha: v.fecha,
          plantilla_id: v.plantilla_id,
          plantilla_nombre: v.plantilla_nombre || 'Inspección Calidad',
          seccion_nombre: secName,
          puntaje,
          puntaje_anterior: puntajeAnterior,
          diferencia,
          alerta_disminucion: alertaDisminucion ? 1 : 0,
          preguntas_si: counts.si,
          preguntas_no: counts.no,
          preguntas_na: counts.na
        });
      });
    }

    // 3. Sincronizar en la tabla historial_secciones_calidad (opcional para indexación rápida)
    try {
      const upsertStmt = db.prepare(`
        INSERT OR REPLACE INTO historial_secciones_calidad 
        (visita_id, pdv_id, pdv_nombre, ciudad_id, fecha, plantilla_id, plantilla_nombre, seccion_nombre, puntaje, puntaje_anterior, diferencia, alerta_disminucion, preguntas_si, preguntas_no, preguntas_na)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      db.transaction(() => {
        for (const h of rawHistorial) {
          try {
            upsertStmt.run(
              h.visita_id, h.pdv_id, h.pdv_nombre, h.ciudad_id, h.fecha, h.plantilla_id || null,
              h.plantilla_nombre, h.seccion_nombre, h.puntaje, h.puntaje_anterior, h.diferencia,
              h.alerta_disminucion, h.preguntas_si, h.preguntas_no, h.preguntas_na
            );
          } catch (e) {}
        }
      })();
    } catch (e) {
      console.warn('Sync to historial_secciones_calidad non-blocking warning:', e.message);
    }

    // 4. Calcular Métricas Agregadas Gerenciales (Ranking por PDV y Evolución por Sección)
    const rankingPdvMap = {};
    const seccionEvolMap = {};
    const timelineMap = {}; // { 'YYYY-MM': { count, sum, [seccion]: [scores] } }

    rawHistorial.forEach(item => {
      // Por PDV
      if (!rankingPdvMap[item.pdv_id]) {
        rankingPdvMap[item.pdv_id] = {
          pdv_id: item.pdv_id,
          pdv_nombre: item.pdv_nombre,
          ciudad_nombre: item.ciudad_nombre,
          total_evaluaciones: 0,
          suma_puntajes: 0,
          secciones_en_alerta: 0,
          secciones_conteo: {}
        };
      }
      rankingPdvMap[item.pdv_id].total_evaluaciones++;
      rankingPdvMap[item.pdv_id].suma_puntajes += item.puntaje;
      if (item.alerta_disminucion) rankingPdvMap[item.pdv_id].secciones_en_alerta++;
      rankingPdvMap[item.pdv_id].secciones_conteo[item.seccion_nombre] = item.puntaje;

      // Por Sección
      if (!seccionEvolMap[item.seccion_nombre]) {
        seccionEvolMap[item.seccion_nombre] = {
          seccion_nombre: item.seccion_nombre,
          visitas_evaluadas: 0,
          suma_puntajes: 0,
          caidas_recientes: 0,
          pdv_scores: {}
        };
      }
      seccionEvolMap[item.seccion_nombre].visitas_evaluadas++;
      seccionEvolMap[item.seccion_nombre].suma_puntajes += item.puntaje;
      if (item.alerta_disminucion) seccionEvolMap[item.seccion_nombre].caidas_recientes++;
      
      if (!seccionEvolMap[item.seccion_nombre].pdv_scores[item.pdv_nombre]) {
        seccionEvolMap[item.seccion_nombre].pdv_scores[item.pdv_nombre] = [];
      }
      seccionEvolMap[item.seccion_nombre].pdv_scores[item.pdv_nombre].push(item.puntaje);

      // Por Línea de Tiempo (Año-Mes)
      const mesKey = item.fecha ? item.fecha.substring(0, 7) : 'Sin fecha';
      if (!timelineMap[mesKey]) timelineMap[mesKey] = { mes: mesKey, secciones: {} };
      if (!timelineMap[mesKey].secciones[item.seccion_nombre]) {
        timelineMap[mesKey].secciones[item.seccion_nombre] = { suma: 0, count: 0 };
      }
      timelineMap[mesKey].secciones[item.seccion_nombre].suma += item.puntaje;
      timelineMap[mesKey].secciones[item.seccion_nombre].count++;
    });

    const rankingPdv = Object.values(rankingPdvMap).map(p => {
      const allPdvItems = rawHistorial.filter(h => h.pdv_id === p.pdv_id);
      const monthsMap = {};
      allPdvItems.forEach(h => {
        const m = h.fecha ? h.fecha.substring(0, 7) : 'Sin fecha';
        if (!monthsMap[m]) monthsMap[m] = [];
        monthsMap[m].push(h.puntaje);
      });
      const sortedMonths = Object.keys(monthsMap).sort().reverse();
      
      let puntaje_mes_actual = 0;
      let puntaje_mes_anterior = 0;

      if (sortedMonths.length > 0) {
        const currScores = monthsMap[sortedMonths[0]];
        puntaje_mes_actual = Math.round((currScores.reduce((a,b)=>a+b,0) / currScores.length) * 10) / 10;
      }
      if (sortedMonths.length > 1) {
        const prevScores = monthsMap[sortedMonths[1]];
        puntaje_mes_anterior = Math.round((prevScores.reduce((a,b)=>a+b,0) / prevScores.length) * 10) / 10;
      } else {
        puntaje_mes_anterior = puntaje_mes_actual;
      }

      const diferencia_puntos = Math.round((puntaje_mes_actual - puntaje_mes_anterior) * 10) / 10;
      const variacion_porcentual = puntaje_mes_anterior > 0 
        ? Math.round(((puntaje_mes_actual - puntaje_mes_anterior) / puntaje_mes_anterior) * 100 * 10) / 10 
        : 0;
      let tendencia = 'Se mantuvo';
      if (diferencia_puntos > 0.1) tendencia = 'Mejoró';
      else if (diferencia_puntos < -0.1) tendencia = 'Disminuyó';

      return {
        ...p,
        puntaje_promedio: p.total_evaluaciones > 0 ? Math.round((p.suma_puntajes / p.total_evaluaciones) * 10) / 10 : 0,
        puntaje_mes_anterior,
        puntaje_mes_actual,
        diferencia_puntos,
        variacion_porcentual,
        tendencia
      };
    }).sort((a, b) => b.puntaje_mes_actual - a.puntaje_mes_actual);

    const evolucionPorSeccion = Object.values(seccionEvolMap).map(s => {
      const puntaje_promedio = s.visitas_evaluadas > 0 ? Math.round((s.suma_puntajes / s.visitas_evaluadas) * 10) / 10 : 0;
      let mejor_pdv = { nombre: '-', puntaje: 0 };
      let peor_pdv = { nombre: '-', puntaje: 100 };

      Object.entries(s.pdv_scores).forEach(([pNombre, scores]) => {
        const avg = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
        if (avg >= mejor_pdv.puntaje) mejor_pdv = { nombre: pNombre, puntaje: avg };
        if (avg <= peor_pdv.puntaje) peor_pdv = { nombre: pNombre, puntaje: avg };
      });

      return {
        seccion_nombre: s.seccion_nombre,
        puntaje_promedio,
        visitas_evaluadas: s.visitas_evaluadas,
        caidas_recientes: s.caidas_recientes,
        mejor_pdv,
        peor_pdv
      };
    }).sort((a, b) => a.puntaje_promedio - b.puntaje_promedio); // Ordenado del más bajo al más alto

    const evolucionTemporal = Object.values(timelineMap).map(t => {
      const result = { mes: t.mes };
      Object.entries(t.secciones).forEach(([sec, stats]) => {
        result[sec] = Math.round((stats.suma / stats.count) * 10) / 10;
      });
      return result;
    }).sort((a, b) => a.mes.localeCompare(b.mes));

    const totalAlertas = rawHistorial.filter(h => h.alerta_disminucion).length;
    const promedioGeneral = rawHistorial.length > 0
      ? Math.round((rawHistorial.reduce((acc, curr) => acc + curr.puntaje, 0) / rawHistorial.length) * 10) / 10
      : 0;

    // Global Mes Actual vs Mes Anterior para los 3 Cuadros de la Cabecera
    const allMonthsMap = {};
    rawHistorial.forEach(h => {
      const m = h.fecha ? h.fecha.substring(0, 7) : 'Sin fecha';
      if (!allMonthsMap[m]) allMonthsMap[m] = [];
      allMonthsMap[m].push(h.puntaje);
    });
    const globalSortedMonths = Object.keys(allMonthsMap).sort().reverse();
    let global_mes_actual = promedioGeneral;
    let global_mes_anterior = promedioGeneral;
    let mes_actual_label = 'Mes Actual';
    let mes_anterior_label = 'Mes Anterior';

    if (globalSortedMonths.length > 0) {
      mes_actual_label = globalSortedMonths[0];
      const scores = allMonthsMap[globalSortedMonths[0]];
      global_mes_actual = Math.round((scores.reduce((a,b)=>a+b,0) / scores.length) * 10) / 10;
    }
    if (globalSortedMonths.length > 1) {
      mes_anterior_label = globalSortedMonths[1];
      const scores = allMonthsMap[globalSortedMonths[1]];
      global_mes_anterior = Math.round((scores.reduce((a,b)=>a+b,0) / scores.length) * 10) / 10;
    }
    const global_diferencia = Math.round((global_mes_actual - global_mes_anterior) * 10) / 10;
    const global_variacion = global_mes_anterior > 0 
      ? Math.round(((global_mes_actual - global_mes_anterior) / global_mes_anterior) * 100 * 10) / 10 
      : 0;
    let global_tendencia = 'Se mantuvo';
    if (global_diferencia > 0.1) global_tendencia = 'Mejoró';
    else if (global_diferencia < -0.1) global_tendencia = 'Disminuyó';

    // 5. Estructurar comparativa completa por periodos históricos para el comparador libre
    const periodosMap = {};
    rawHistorial.forEach(h => {
      const m = h.fecha ? h.fecha.substring(0, 7) : 'Sin fecha';
      if (!periodosMap[m]) periodosMap[m] = { periodo: m, total: 0, suma: 0, subareas: {} };
      periodosMap[m].total++;
      periodosMap[m].suma += h.puntaje;
      if (!periodosMap[m].subareas[h.seccion_nombre]) {
        periodosMap[m].subareas[h.seccion_nombre] = { suma: 0, count: 0 };
      }
      periodosMap[m].subareas[h.seccion_nombre].suma += h.puntaje;
      periodosMap[m].subareas[h.seccion_nombre].count++;
    });

    const evaluaciones_por_periodo = Object.values(periodosMap).map(p => {
      const desglose = Object.entries(p.subareas).map(([sec, st]) => ({
        seccion_nombre: sec,
        puntaje: Math.round((st.suma / st.count) * 10) / 10,
        evaluaciones: st.count
      })).sort((a,b) => a.seccion_nombre.localeCompare(b.seccion_nombre));

      return {
        periodo: p.periodo,
        puntaje_promedio: p.total > 0 ? Math.round((p.suma / p.total) * 10) / 10 : 0,
        total_evaluaciones: p.total,
        desglose_subareas: desglose
      };
    }).sort((a,b) => b.periodo.localeCompare(a.periodo));

    return NextResponse.json({
      success: true,
      summary: {
        total_visitas: rawHistorial.length,
        promedio_general: promedioGeneral,
        alertas_activas: totalAlertas,
        secciones_evaluadas: evolucionPorSeccion.length,
        pdvs_analizados: rankingPdv.length,
        puntaje_mes_anterior: global_mes_anterior,
        puntaje_mes_actual: global_mes_actual,
        diferencia_puntos: global_diferencia,
        variacion_porcentual: global_variacion,
        tendencia: global_tendencia,
        mes_actual_label,
        mes_anterior_label
      },
      historial: rawHistorial.reverse(), // Más recientes primero para la tabla
      ranking_pdv: rankingPdv,
      evolucion_por_seccion: evolucionPorSeccion,
      evolucion_temporal: evolucionTemporal,
      evaluaciones_por_periodo: evaluaciones_por_periodo,
      secciones_disponibles: [...new Set(rawHistorial.map(r => r.seccion_nombre))].sort()
    });

  } catch (error) {
    console.error('Error in GET /api/reportes/calidad-comportamiento:', error);
    return NextResponse.json({ error: error.message || 'Error calculando analítica por sección de Calidad' }, { status: 500 });
  }
}
