const { getDb } = require('./src/lib/db.js');
const db = getDb();

const query = `
  SELECT v.id, v.pdv_id, p.nombre as pdv_nombre, p.ciudad_id, c.nombre as ciudad_nombre,
         v.fecha, v.plantilla_id, pl.nombre as plantilla_nombre, pl.campos as plantilla_campos,
         v.datos_formulario, v.estado
  FROM visitas v
  JOIN pdv p ON p.id = v.pdv_id
  LEFT JOIN ciudades c ON c.id = p.ciudad_id
  LEFT JOIN plantillas pl ON pl.id = v.plantilla_id
  WHERE (v.area_id = 4 OR pl.nombre LIKE '%BPM%' OR pl.nombre LIKE '%Calidad%' OR pl.nombre LIKE '%Inspección%' OR pl.nombre LIKE '%Check list%')
    AND v.datos_formulario IS NOT NULL AND v.datos_formulario != '{}'
  ORDER BY v.fecha ASC, v.id ASC
`;

const visitasRows = db.prepare(query).all();

// SECTION_KEYWORDS
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
  const norm = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const sk of SECTION_KEYWORDS) {
    for (const kw of sk.keywords) {
      const normKw = kw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (norm.includes(normKw)) return sk.seccion;
    }
  }
  return 'Área General / Operativa';
}

// Process first 3 visits
const rawHistorial = [];
const previousScoresMap = {};

for (let vi = 0; vi < Math.min(3, visitasRows.length); vi++) {
  const v = visitasRows[vi];
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
      console.log('Visita', v.id, '- MATRIX:', areaName);
      Object.entries(answers).forEach(([key, val]) => {
        if (val === 'SI' || val === 'NO' || val === 'NA' || typeof val === 'boolean') {
          if (key.includes('__sec_') && key.split('__').length === 3) {
            const parts = key.split('__');
            visitItems.push({ areaName, secName: parts[2].trim(), itemName: parts[0].trim(), val });
          }
        }
      });
    } else if (rootItem && rootItem.secciones && Array.isArray(rootItem.secciones)) {
      console.log('Visita', v.id, '- SECCIONES EXPLICITAS:', areaName);
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
      console.log('Visita', v.id, '- PLANA:', areaName);
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
    console.log('Visita', v.id, '- FALLBACK JSON:', areaName);
    Object.entries(answers).forEach(([key, val]) => {
      if (val === 'SI' || val === 'NO' || val === 'NA' || typeof val === 'boolean') {
        let secName, itemName = key;
        if (key.includes('__sec_') && key.split('__').length === 3) {
          const parts = key.split('__');
          itemName = parts[0].trim();
          secName = parts[2].trim();
        } else {
          secName = categorizarPregunta(key);
        }
        visitItems.push({ areaName, secName, itemName, val });
      }
    });
  }

  console.log('  visitItems extracted:', visitItems.length);
  if (visitItems.length > 0) console.log('  first 3:', visitItems.slice(0, 3));

  const agrupacionStats = {};
  visitItems.forEach(item => {
    const { areaName, secName, itemName, val } = item;
    let agrupacion_nombre = secName;
    if (!agrupacionStats[agrupacion_nombre]) agrupacionStats[agrupacion_nombre] = { si: 0, no: 0, na: 0 };
    if (val === 'SI' || val === true || val === 1 || val === 'Cumple') agrupacionStats[agrupacion_nombre].si++;
    else if (val === 'NO' || val === false || val === 0 || val === 'No Cumple') agrupacionStats[agrupacion_nombre].no++;
    else if (val === 'NA' || val === 'N/A' || val === 'No Aplica') agrupacionStats[agrupacion_nombre].na++;
  });

  console.log('  agrupacionStats:', Object.keys(agrupacionStats));

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

console.log('\nTotal rawHistorial:', rawHistorial.length);
rawHistorial.forEach(h => console.log(' ', h.seccion_nombre, h.puntaje + '%', h.pdv_nombre));