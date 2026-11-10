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
console.log('Total visitas:', visitasRows.length);

const rawHistorial = [];
const previousScoresMap = {};

function categorizarPregunta(texto) {
  if (!texto) return 'Área General / Operativa';
  const norm = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
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
  for (const sk of SECTION_KEYWORDS) {
    for (const kw of sk.keywords) {
      const normKw = kw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (norm.includes(normKw)) return sk.seccion;
    }
  }
  return 'Área General / Operativa';
}

for (let i = 0; i < Math.min(5, visitasRows.length); i++) {
  const v = visitasRows[i];
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
            if (val !== undefined) {
              visitItems.push({ areaName, secName, itemName: filaTexto.trim() || `Pregunta ${rowIdx + 1}`, val });
            }
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

  console.log('  Items extraidos:', visitItems.length);

  const agrupacionStats = {};
  visitItems.forEach(item => {
    let agrupacion_nombre = item.secName;
    if (!agrupacionStats[agrupacion_nombre]) agrupacionStats[agrupacion_nombre] = { si: 0, no: 0, na: 0 };
    if (item.val === 'SI' || item.val === true || item.val === 1 || item.val === 'Cumple') agrupacionStats[agrupacion_nombre].si++;
    else if (item.val === 'NO' || item.val === false || item.val === 0 || item.val === 'No Cumple') agrupacionStats[agrupacion_nombre].no++;
    else if (item.val === 'NA' || item.val === 'N/A' || item.val === 'No Aplica') agrupacionStats[agrupacion_nombre].na++;
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
    rawHistorial.push({ visita_id: v.id, pdv_id: v.pdv_id, pdv_nombre: v.pdv_nombre, ciudad_nombre: v.ciudad_nombre, fecha: v.fecha, seccion_nombre: agrupName, puntaje, puntaje_anterior: puntajeAnterior, diferencia, alerta_disminucion: alertaDisminucion ? 1 : 0, preguntas_si: counts.si, preguntas_no: counts.no, preguntas_na: counts.na });
  });
}

console.log('\nTotal items en rawHistorial:', rawHistorial.length);
rawHistorial.forEach(h => console.log(' ', h.seccion_nombre, h.puntaje + '%', h.pdv_nombre));