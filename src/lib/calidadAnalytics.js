const { getDb } = require('./db');

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
  const norm = String(texto).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const sk of SECTION_KEYWORDS) {
    for (const kw of sk.keywords) {
      const normKw = kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (norm.includes(normKw)) return sk.seccion;
    }
  }
  return 'Área General / Operativa';
}

function getConceptoSanitario(puntaje) {
  if (puntaje >= 90) return 'Favorable';
  if (puntaje >= 75) return 'Condicionado';
  return 'Crítico';
}

/**
 * Extrae los ítems evaluados de una visita de Calidad respetando al 100% la lógica oficial de visitas/page.js:
 * - Matrices con columnas de Sub-Áreas (ej. Cocina Caliente, Cocina Fría, Despachos)
 * - Matrices con columnas SATISFACTORIO / NA / OBSERVACIONES (ej. Comedor, Baños y Lockers) donde las sub-áreas son las secciones
 * - Checklists simples por secciones (ej. Almacén con 5 sub-áreas)
 * - Lista de Chequeo BPM con calificación numérica 1 a 5 (puntaje = valor / 5)
 * - Excluye formatos que no son listas de chequeo de cumplimiento (ej. "Cuadro hallazgos")
 */
function extractVisitItems(v) {
  let answers = {};
  try {
    answers = typeof v.datos_formulario === 'string' ? JSON.parse(v.datos_formulario) : (v.datos_formulario || {});
  } catch (e) {
    return { areaName: null, visitItems: [] };
  }

  let templateConfig = [];
  try {
    templateConfig = typeof v.plantilla_campos === 'string' ? JSON.parse(v.plantilla_campos) : (v.plantilla_campos || []);
  } catch (e) {
    templateConfig = [];
  }

  const rawPlantillaNombre = v.plantilla_nombre || 'Área General';
  // Excluir formatos que no son listas de chequeo de evaluación (ej. Cuadro hallazgos)
  if (/cuadro\s+hallazgos/i.test(rawPlantillaNombre)) {
    return { areaName: null, visitItems: [] };
  }

  const areaName = rawPlantillaNombre
    .replace(/Verificaci[oó]n (de )?L&D /i, '')
    .replace(/Lista de chequeo /i, '')
    .trim();

  const visitItems = [];
  const rootItem = Array.isArray(templateConfig) && templateConfig.length > 0 ? templateConfig[0] : null;

  if (rootItem && (rootItem.tipo === 'matrix' || rootItem.tipo === 'simple_checklist') && Array.isArray(rootItem.secciones)) {
    const globalCols = Array.isArray(rootItem.columnas) ? rootItem.columnas : [];
    const isGenericSatCol = (c) => {
      const cStr = String(c || '').toUpperCase().trim();
      return cStr.includes('SATISFACTORIO') || cStr.includes('OBSERVACION') || cStr === 'NA' || cStr === 'N/A';
    };

    let hasSubareaTabs = globalCols.length > 0 && !globalCols.some(isGenericSatCol);
    const allTabs = new Set();
    if (hasSubareaTabs) globalCols.forEach(c => allTabs.add(c));

    rootItem.secciones.forEach(sec => {
      if (Array.isArray(sec.columnas) && sec.columnas.length > 0) {
        const secHasTabs = !sec.columnas.some(isGenericSatCol);
        if (secHasTabs) {
          hasSubareaTabs = true;
          sec.columnas.forEach(c => allTabs.add(c));
        }
      }
    });

    const isBPMScaleGlobal =
      String(rawPlantillaNombre).toUpperCase().includes('BPM') ||
      (Array.isArray(globalCols) && globalCols.some(c => ['1', '2', '3', '4', '5'].includes(String(c || '').trim())));

    const hasMultiSec = rootItem.secciones.length > 1;

    if (hasSubareaTabs && allTabs.size > 0) {
      // Caso 1: Las columnas son las Sub-Áreas (ej. COCINA CALIENTE, SALSAS FRIAS, CARNES, POLLO, CONOS...)
      Array.from(allTabs).forEach(col => {
        const secName = String(col).trim();
        rootItem.secciones.forEach((sec, sIdx) => {
          let secHasCol = false;
          if (Array.isArray(sec.columnas) && sec.columnas.length > 0) {
            secHasCol = sec.columnas.includes(col);
          } else if (globalCols.length > 0) {
            secHasCol = globalCols.includes(col);
          }
          if (!secHasCol || !Array.isArray(sec.filas)) return;

          sec.filas.forEach(fila => {
            const itemName = String(fila || '').trim();
            const filaUpper = itemName.toUpperCase();
            if (!itemName || filaUpper === 'ASPECTO' || filaUpper === 'ASPECTOS') return;

            const baseKey = hasMultiSec ? `${itemName}__sec_${sIdx}` : itemName;
            const rawVal = answers[`${baseKey}__${col}`] ?? answers[`${itemName}__${col}`] ?? answers[`${fila}__sec_${sIdx}__${col}`];
            const obsVal =
              answers[`${baseKey}__${col}__obs`] ||
              answers[`${baseKey}__obs`] ||
              answers[`${itemName}__${col}__obs`] ||
              '';
            const parsed = normalizeAnswerValue(rawVal, isBPMScaleGlobal);
            if (parsed) {
              visitItems.push({ areaName, secName, itemName, ...parsed, obs: String(obsVal || '').trim() });
            }
          });
        });
      });
    } else {
      // Caso 2: Las secciones son las Sub-Áreas (ej. Almacén -> ALMACEN, MATERIAS PRIMAS, RECIBO...; Baños -> MUJERES, HOMBRES; BPM -> 7 secciones)
      rootItem.secciones.forEach((sec, sIdx) => {
        const secName = String(sec.nombre || sec.titulo || `Sección ${sIdx + 1}`).trim();
        if (!Array.isArray(sec.filas)) return;

        sec.filas.forEach((fila, rIdx) => {
          const itemName = String(fila || '').trim();
          const filaUpper = itemName.toUpperCase();
          if (!itemName || filaUpper === 'ASPECTO' || filaUpper === 'ASPECTOS') return;

          const baseKey = hasMultiSec ? `${itemName}__sec_${sIdx}` : itemName;
          const rawBaseKey = hasMultiSec ? `${fila}__sec_${sIdx}` : fila;
          const firstCol = globalCols[0];

          let rawVal =
            (firstCol ? (answers[`${baseKey}__${firstCol}`] ?? answers[`${rawBaseKey}__${firstCol}`] ?? answers[`${itemName}__${firstCol}`]) : undefined) ??
            answers[baseKey] ??
            answers[rawBaseKey] ??
            answers[itemName] ??
            answers[`q_${sIdx}_${rIdx}`];

          // En matrices con columnas SATISFACTORIO / NA donde marcan la columna NA
          if ((!rawVal || rawVal === '') && globalCols.includes('NA')) {
            const naColVal = answers[`${baseKey}__NA`] ?? answers[`${rawBaseKey}__NA`];
            if (naColVal === 'SI' || naColVal === 'NA' || naColVal === true) rawVal = 'NA';
          }

          const obsVal =
            answers[`${baseKey}__obs`] ||
            answers[`${rawBaseKey}__obs`] ||
            answers[`${baseKey}__OBSERVACIONES`] ||
            (firstCol ? answers[`${baseKey}__${firstCol}__obs`] : '') ||
            '';

          const parsed = normalizeAnswerValue(rawVal, isBPMScaleGlobal);
          if (parsed) {
            visitItems.push({ areaName, secName, itemName, ...parsed, obs: String(obsVal || '').trim() });
          }
        });
      });
    }
  } else if (Array.isArray(templateConfig) && templateConfig.length > 0) {
    // Plantilla plana de campos
    templateConfig.forEach((item, itemIdx) => {
      if (item.tipo === 'checkbox' || item.tipo === 'radio' || item.tipo === 'select' || item.label) {
        const secName = item.seccion || categorizarPregunta(item.label || item.nombre);
        const itemName = (item.label || item.nombre || `Pregunta ${itemIdx + 1}`).replace(/__sec_\d+.*$/, '').trim();
        const rawVal = answers[item.nombre || `item_${itemIdx}`];
        const parsed = normalizeAnswerValue(rawVal, false);
        if (parsed) {
          visitItems.push({ areaName, secName, itemName, ...parsed, obs: '' });
        }
      }
    });
  }

  // Fallback si la plantilla no tenía estructura pero hay respuestas válidas en el JSON
  if (visitItems.length === 0 && Object.keys(answers).length > 0) {
    const isBPM = String(rawPlantillaNombre).toUpperCase().includes('BPM');
    const secNamesMap = {};
    if (rootItem && Array.isArray(rootItem.secciones)) {
      rootItem.secciones.forEach((s, idx) => {
        secNamesMap[`sec_${idx}`] = String(s.nombre || s.titulo || `Sección ${idx + 1}`).trim();
      });
    }

    Object.entries(answers).forEach(([key, rawVal]) => {
      if (key.endsWith('__obs') || key.endsWith('__OBSERVACIONES') || key === 'compromisos') return;
      const parsed = normalizeAnswerValue(rawVal, isBPM);
      if (!parsed) return;

      let itemName = key;
      let secName = null;
      if (key.includes('__sec_')) {
        const parts = key.split('__');
        itemName = parts[0].trim();
        const secToken = parts[1].trim(); // sec_0
        const colToken = parts[2] ? parts[2].trim() : null;
        if (colToken && !['SATISFACTORIO', 'NA', 'N/A', 'OBSERVACIONES'].includes(colToken.toUpperCase())) {
          secName = colToken;
        } else {
          secName = secNamesMap[secToken] || categorizarPregunta(itemName);
        }
      } else {
        secName = categorizarPregunta(itemName);
      }

      const obsVal = answers[`${key}__obs`] || '';
      visitItems.push({ areaName, secName, itemName, ...parsed, obs: String(obsVal || '').trim() });
    });
  }

  return { areaName, visitItems };
}

/**
 * Normaliza un valor de respuesta a { status: 'SI' | 'NO' | 'NA', weightEarned, weightMax }
 * - En L&D (SI/NO/NA): SI = 1/1, NO = 0/1, NA = 0/0
 * - En BPM (escala 1..5): 4 o 5 cuenta como Cumple (SI) con peso exacto num/5; 1..3 cuenta como Hallazgo/Oportunidad de mejora (NO) con peso exacto num/5
 */
function normalizeAnswerValue(rawVal, isBPMScale) {
  if (rawVal === undefined || rawVal === null || rawVal === '') return null;
  if (typeof rawVal === 'object') return null;

  const vUp = String(rawVal).trim().toUpperCase();
  if (!vUp) return null;

  if (vUp === 'NA' || vUp === 'N/A' || vUp === 'NO APLICA') {
    return { status: 'NA', weightEarned: 0, weightMax: 0, rawScore: null };
  }

  if (isBPMScale) {
    const num = Number(vUp);
    if (!Number.isNaN(num) && num >= 1 && num <= 5) {
      // En escala BPM 1..5: puntaje porcentual exacto = (num / 5) * 100
      // Calificaciones <= 3 se marcan como hallazgo/oportunidad de mejora ('NO') para alertas y Pareto
      return {
        status: num >= 4 ? 'SI' : 'NO',
        weightEarned: num,
        weightMax: 5,
        rawScore: num
      };
    }
  }

  if (vUp === 'SI' || vUp === 'SÍ' || vUp === 'TRUE' || vUp === 'CUMPLE' || rawVal === true) {
    return { status: 'SI', weightEarned: 1, weightMax: 1, rawScore: null };
  }
  if (vUp === 'NO' || vUp === 'FALSE' || vUp === 'NO CUMPLE' || rawVal === false) {
    return { status: 'NO', weightEarned: 0, weightMax: 1, rawScore: null };
  }

  return null;
}

function buildCalidadAnalytics({ pdvId = 'all', ciudadId = 'all', fechaInicio = null, fechaFin = null, areaFiltro = 'all', subareaFiltro = 'all', itemFiltro = 'all', syncDb = false }) {
  const db = getDb();

  let query = `
    SELECT v.id, v.pdv_id, p.nombre as pdv_nombre, p.ciudad_id, c.nombre as ciudad_nombre,
           v.fecha, v.plantilla_id, pl.nombre as plantilla_nombre, pl.campos as plantilla_campos,
           v.datos_formulario, v.estado
    FROM visitas v
    JOIN pdv p ON p.id = v.pdv_id
    LEFT JOIN ciudades c ON c.id = p.ciudad_id
    LEFT JOIN plantillas pl ON pl.id = v.plantilla_id
    WHERE (v.area_id = 4 OR pl.nombre LIKE '%BPM%' OR pl.nombre LIKE '%Calidad%' OR pl.nombre LIKE '%Inspección%' OR pl.nombre LIKE '%Check list%' OR pl.nombre LIKE '%L&D%')
      AND (pl.nombre IS NULL OR pl.nombre NOT LIKE '%Cuadro hallazgos%')
      AND v.datos_formulario IS NOT NULL AND v.datos_formulario != '{}'
  `;

  const queryParams = [];
  if (pdvId && pdvId !== 'all') {
    query += ` AND v.pdv_id = ?`;
    queryParams.push(parseInt(pdvId, 10));
  }
  if (ciudadId && ciudadId !== 'all') {
    query += ` AND p.ciudad_id = ?`;
    queryParams.push(parseInt(ciudadId, 10));
  }
  if (fechaInicio && fechaInicio !== 'undefined' && fechaInicio !== 'null') {
    query += ` AND v.fecha >= ?`;
    queryParams.push(fechaInicio);
  }
  if (fechaFin && fechaFin !== 'undefined' && fechaFin !== 'null') {
    query += ` AND v.fecha <= ?`;
    queryParams.push(fechaFin);
  }

  query += ` ORDER BY v.fecha ASC, v.id ASC`;
  const visitasRows = db.prepare(query).all(...queryParams);

  const rawHistorial = [];
  const previousScoresMap = {};
  const allAreasSet = new Set();
  const allSubareasSet = new Set();
  const allItemsSet = new Set();

  // Mapa para Pareto de Hallazgos Críticos (Top Ítems con más incumplimientos)
  const hallazgosMap = {};
  const visitasUnicasSet = new Set();

  for (const v of visitasRows) {
    const { areaName, visitItems } = extractVisitItems(v);
    if (!areaName || visitItems.length === 0) continue;

    const agrupacionStats = {};

    visitItems.forEach(item => {
      const { secName, itemName, status, weightEarned, weightMax, obs, rawScore } = item;

      allAreasSet.add(areaName);
      if (areaFiltro === 'all' || areaName === areaFiltro) {
        allSubareasSet.add(secName);
        if (subareaFiltro === 'all' || secName === subareaFiltro) {
          allItemsSet.add(itemName);
        }
      }

      if (areaFiltro !== 'all' && areaName !== areaFiltro) return;
      if (subareaFiltro !== 'all' && secName !== subareaFiltro) return;
      if (itemFiltro !== 'all' && itemName !== itemFiltro) return;

      visitasUnicasSet.add(v.id);

      let agrupacion_nombre = areaName;
      if (areaFiltro !== 'all') agrupacion_nombre = secName;
      if (subareaFiltro !== 'all') agrupacion_nombre = itemName;

      if (!agrupacionStats[agrupacion_nombre]) {
        agrupacionStats[agrupacion_nombre] = {
          si: 0,
          no: 0,
          na: 0,
          weightEarned: 0,
          weightMax: 0,
          hallazgosDetalle: []
        };
      }

      const st = agrupacionStats[agrupacion_nombre];
      if (status === 'SI') st.si++;
      else if (status === 'NO') {
        st.no++;
        const detalleStr = obs
          ? `${itemName} (${secName}): ${obs}`
          : rawScore !== null
            ? `${itemName} (${secName} - Calif: ${rawScore}/5)`
            : `${itemName} (${secName})`;
        if (st.hallazgosDetalle.length < 8) st.hallazgosDetalle.push(detalleStr);
      } else if (status === 'NA') {
        st.na++;
      }

      st.weightEarned += weightEarned;
      st.weightMax += weightMax;

      // Alimentar Pareto de Hallazgos por ítem específico
      if (status === 'SI' || status === 'NO') {
        const hKey = `${areaName}||${secName}||${itemName}`;
        if (!hallazgosMap[hKey]) {
          hallazgosMap[hKey] = {
            area_nombre: areaName,
            subarea_nombre: secName,
            item_nombre: itemName,
            total_evaluaciones: 0,
            total_fallos: 0,
            pdvs_afectados: new Set(),
            ultima_fecha: v.fecha,
            observaciones_recientes: []
          };
        }
        hallazgosMap[hKey].total_evaluaciones++;
        if (status === 'NO') {
          hallazgosMap[hKey].total_fallos++;
          hallazgosMap[hKey].pdvs_afectados.add(v.pdv_nombre || `PDV #${v.pdv_id}`);
          hallazgosMap[hKey].ultima_fecha = v.fecha;
          if (obs && hallazgosMap[hKey].observaciones_recientes.length < 3 && !hallazgosMap[hKey].observaciones_recientes.includes(obs)) {
            hallazgosMap[hKey].observaciones_recientes.push(obs);
          }
        }
      }
    });

    Object.entries(agrupacionStats).forEach(([agrupName, counts]) => {
      const totalEval = counts.si + counts.no;
      if (totalEval === 0 && counts.na === 0) return;

      const puntaje = counts.weightMax > 0
        ? Math.round((counts.weightEarned / counts.weightMax) * 100 * 10) / 10
        : 100;

      const pdvSecKey = `${v.pdv_id}_${agrupName}`;
      const puntajeAnterior = previousScoresMap[pdvSecKey] !== undefined ? previousScoresMap[pdvSecKey] : null;
      const diferencia = puntajeAnterior !== null ? Math.round((puntaje - puntajeAnterior) * 10) / 10 : 0;
      const alertaDisminucion = puntajeAnterior !== null && diferencia < -0.1;

      previousScoresMap[pdvSecKey] = puntaje;

      rawHistorial.push({
        id: `${v.id}_${agrupName.replace(/[^a-zA-Z0-9]/g, '')}`,
        visita_id: v.id,
        pdv_id: v.pdv_id,
        pdv_nombre: v.pdv_nombre || `PDV #${v.pdv_id}`,
        ciudad_id: v.ciudad_id || 1,
        ciudad_nombre: v.ciudad_nombre || 'Sin ciudad',
        fecha: v.fecha,
        plantilla_id: v.plantilla_id,
        plantilla_nombre: v.plantilla_nombre || 'Inspección Calidad',
        seccion_nombre: agrupName,
        puntaje,
        concepto_sanitario: getConceptoSanitario(puntaje),
        puntaje_anterior: puntajeAnterior,
        diferencia,
        alerta_disminucion: alertaDisminucion ? 1 : 0,
        preguntas_si: counts.si,
        preguntas_no: counts.no,
        preguntas_na: counts.na,
        total_items_evaluados: totalEval,
        hallazgos_resumen: counts.hallazgosDetalle.join(' | ')
      });
    });
  }

  // Sincronización opcional con tabla de caché
  if (syncDb && areaFiltro === 'all' && subareaFiltro === 'all') {
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
    } catch (e) {}
  }

  // Métricas agregadas
  const rankingPdvMap = {};
  const seccionEvolMap = {};
  const timelineMap = {};

  let totalItemsSiGlobal = 0;
  let totalItemsNoGlobal = 0;
  let totalItemsNaGlobal = 0;

  rawHistorial.forEach(item => {
    totalItemsSiGlobal += item.preguntas_si;
    totalItemsNoGlobal += item.preguntas_no;
    totalItemsNaGlobal += item.preguntas_na;

    if (!rankingPdvMap[item.pdv_id]) {
      rankingPdvMap[item.pdv_id] = {
        pdv_id: item.pdv_id,
        pdv_nombre: item.pdv_nombre,
        ciudad_nombre: item.ciudad_nombre,
        total_evaluaciones: 0,
        visitas_set: new Set(),
        suma_puntajes: 0,
        secciones_en_alerta: 0,
        total_si: 0,
        total_no: 0,
        secciones_conteo: {}
      };
    }
    const rPdv = rankingPdvMap[item.pdv_id];
    rPdv.total_evaluaciones++;
    rPdv.visitas_set.add(item.visita_id);
    rPdv.suma_puntajes += item.puntaje;
    rPdv.total_si += item.preguntas_si;
    rPdv.total_no += item.preguntas_no;
    if (item.alerta_disminucion) rPdv.secciones_en_alerta++;
    rPdv.secciones_conteo[item.seccion_nombre] = item.puntaje;

    if (!seccionEvolMap[item.seccion_nombre]) {
      seccionEvolMap[item.seccion_nombre] = {
        seccion_nombre: item.seccion_nombre,
        visitas_evaluadas: 0,
        suma_puntajes: 0,
        caidas_recientes: 0,
        total_si: 0,
        total_no: 0,
        total_na: 0,
        pdv_scores: {}
      };
    }
    const sEv = seccionEvolMap[item.seccion_nombre];
    sEv.visitas_evaluadas++;
    sEv.suma_puntajes += item.puntaje;
    sEv.total_si += item.preguntas_si;
    sEv.total_no += item.preguntas_no;
    sEv.total_na += item.preguntas_na;
    if (item.alerta_disminucion) sEv.caidas_recientes++;
    if (!sEv.pdv_scores[item.pdv_nombre]) sEv.pdv_scores[item.pdv_nombre] = [];
    sEv.pdv_scores[item.pdv_nombre].push(item.puntaje);

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
      puntaje_mes_actual = Math.round((currScores.reduce((a, b) => a + b, 0) / currScores.length) * 10) / 10;
    }
    if (sortedMonths.length > 1) {
      const prevScores = monthsMap[sortedMonths[1]];
      puntaje_mes_anterior = Math.round((prevScores.reduce((a, b) => a + b, 0) / prevScores.length) * 10) / 10;
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

    const puntaje_promedio = p.total_evaluaciones > 0 ? Math.round((p.suma_puntajes / p.total_evaluaciones) * 10) / 10 : 0;
    const { visitas_set, ...rest } = p;
    return {
      ...rest,
      visitas_reales: visitas_set.size,
      puntaje_promedio,
      concepto_sanitario: getConceptoSanitario(puntaje_mes_actual),
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

    const totalItems = s.total_si + s.total_no;
    const tasa_incumplimiento = totalItems > 0 ? Math.round((s.total_no / totalItems) * 100 * 10) / 10 : 0;

    return {
      seccion_nombre: s.seccion_nombre,
      puntaje_promedio,
      concepto_sanitario: getConceptoSanitario(puntaje_promedio),
      visitas_evaluadas: s.visitas_evaluadas,
      caidas_recientes: s.caidas_recientes,
      total_si: s.total_si,
      total_no: s.total_no,
      total_na: s.total_na,
      total_items_evaluados: totalItems,
      tasa_incumplimiento,
      mejor_pdv,
      peor_pdv
    };
  }).sort((a, b) => a.puntaje_promedio - b.puntaje_promedio);

  const evolucionTemporal = Object.values(timelineMap).map(t => {
    const result = { mes: t.mes };
    Object.entries(t.secciones).forEach(([sec, stats]) => {
      result[sec] = Math.round((stats.suma / stats.count) * 10) / 10;
    });
    return result;
  }).sort((a, b) => a.mes.localeCompare(b.mes));

  // Top Hallazgos Críticos (Pareto de No Conformidades)
  const topHallazgos = Object.values(hallazgosMap)
    .filter(h => h.total_fallos > 0)
    .map(h => ({
      area_nombre: h.area_nombre,
      subarea_nombre: h.subarea_nombre,
      item_nombre: h.item_nombre,
      total_evaluaciones: h.total_evaluaciones,
      total_fallos: h.total_fallos,
      tasa_fallo: h.total_evaluaciones > 0 ? Math.round((h.total_fallos / h.total_evaluaciones) * 100 * 10) / 10 : 0,
      pdvs_afectados: [...h.pdvs_afectados],
      ultima_fecha: h.ultima_fecha,
      observaciones_recientes: h.observaciones_recientes
    }))
    .sort((a, b) => (b.total_fallos - a.total_fallos) || (b.tasa_fallo - a.tasa_fallo))
    .slice(0, 25);

  const totalAlertas = rawHistorial.filter(h => h.alerta_disminucion).length;
  const promedioGeneral = rawHistorial.length > 0
    ? Math.round((rawHistorial.reduce((acc, curr) => acc + curr.puntaje, 0) / rawHistorial.length) * 10) / 10
    : 0;

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
    global_mes_actual = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  }
  if (globalSortedMonths.length > 1) {
    mes_anterior_label = globalSortedMonths[1];
    const scores = allMonthsMap[globalSortedMonths[1]];
    global_mes_anterior = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  }
  const global_diferencia = Math.round((global_mes_actual - global_mes_anterior) * 10) / 10;
  const global_variacion = global_mes_anterior > 0
    ? Math.round(((global_mes_actual - global_mes_anterior) / global_mes_anterior) * 100 * 10) / 10
    : 0;
  let global_tendencia = 'Se mantuvo';
  if (global_diferencia > 0.1) global_tendencia = 'Mejoró';
  else if (global_diferencia < -0.1) global_tendencia = 'Disminuyó';

  const periodosMap = {};
  rawHistorial.forEach(h => {
    const m = h.fecha ? h.fecha.substring(0, 7) : 'Sin fecha';
    if (!periodosMap[m]) periodosMap[m] = { periodo: m, total: 0, suma: 0, subareas: {} };
    periodosMap[m].total++;
    periodosMap[m].suma += h.puntaje;
    if (!periodosMap[m].subareas[h.seccion_nombre]) {
      periodosMap[m].subareas[h.seccion_nombre] = { suma: 0, count: 0, si: 0, no: 0 };
    }
    periodosMap[m].subareas[h.seccion_nombre].suma += h.puntaje;
    periodosMap[m].subareas[h.seccion_nombre].count++;
    periodosMap[m].subareas[h.seccion_nombre].si += h.preguntas_si;
    periodosMap[m].subareas[h.seccion_nombre].no += h.preguntas_no;
  });

  const evaluaciones_por_periodo = Object.values(periodosMap).map(p => {
    const desglose = Object.entries(p.subareas).map(([sec, st]) => ({
      seccion_nombre: sec,
      puntaje: Math.round((st.suma / st.count) * 10) / 10,
      evaluaciones: st.count,
      total_si: st.si,
      total_no: st.no
    })).sort((a, b) => a.seccion_nombre.localeCompare(b.seccion_nombre));

    return {
      periodo: p.periodo,
      puntaje_promedio: p.total > 0 ? Math.round((p.suma / p.total) * 10) / 10 : 0,
      total_evaluaciones: p.total,
      desglose_subareas: desglose
    };
  }).sort((a, b) => b.periodo.localeCompare(a.periodo));

  const seccionesActivas = evolucionPorSeccion.map(s => s.seccion_nombre).sort();

  return {
    rawHistorial,
    timelineMap,
    rankingPdv,
    evolucionPorSeccion,
    evolucionTemporal,
    evaluaciones_por_periodo,
    topHallazgos,
    allAreasSet,
    allSubareasSet,
    allItemsSet,
    seccionesActivas,
    summary: {
      total_visitas: visitasUnicasSet.size,
      total_evaluaciones_seccion: rawHistorial.length,
      promedio_general: promedioGeneral,
      concepto_sanitario: getConceptoSanitario(promedioGeneral),
      alertas_activas: totalAlertas,
      secciones_evaluadas: evolucionPorSeccion.length,
      pdvs_analizados: rankingPdv.length,
      total_items_evaluados: totalItemsSiGlobal + totalItemsNoGlobal,
      total_conformes_si: totalItemsSiGlobal,
      total_hallazgos_no: totalItemsNoGlobal,
      total_no_aplica_na: totalItemsNaGlobal,
      tasa_incumplimiento_global: (totalItemsSiGlobal + totalItemsNoGlobal) > 0
        ? Math.round((totalItemsNoGlobal / (totalItemsSiGlobal + totalItemsNoGlobal)) * 100 * 10) / 10
        : 0,
      puntaje_mes_anterior: global_mes_anterior,
      puntaje_mes_actual: global_mes_actual,
      diferencia_puntos: global_diferencia,
      variacion_porcentual: global_variacion,
      tendencia: global_tendencia,
      mes_actual_label,
      mes_anterior_label
    }
  };
}

module.exports = {
  buildCalidadAnalytics,
  getConceptoSanitario
};
