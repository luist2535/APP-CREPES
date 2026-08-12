/**
 * BPM Excel Utility - Lee estructura del Excel de Matriz BPM
 * y gestiona la exportación con valores llenados.
 * 
 * El Excel ORIGINAL nunca se modifica directamente.
 * Los valores se almacenan en la BD y se inyectan al exportar.
 */
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Path al Excel template (original)
const TEMPLATE_DIR = path.join(process.cwd(), 'data', 'bpm');
const TEMPLATE_PATH = path.join(TEMPLATE_DIR, 'Matriz de frecuencia de verificación de BPM - MACRO.xlsm');
const ORIGINAL_PATH = path.join(process.cwd(), '..', 'Matriz de frecuencia de verificación de BPM - MACRO.xlsm');

// Configuración de cada hoja del Excel
const SHEET_CONFIG = {
  'ALMACÉN': { sheet: '1. Prev_Frecuencias almacén', descCol: 1, obtenidosBaseCol: 3 },
  'COCINA CALIENTE DIA': { sheet: '2. Prev_Frecu Caliente (dia)', descCol: 0, obtenidosBaseCol: 2 },
  'COCINA CALIENTE NOCHE': { sheet: '3. Prev_Frecuenc Calient(noche)', descCol: 0, obtenidosBaseCol: 2 },
  'COMEDOR': { sheet: '7. Prev_Frecuencia Comedor', descCol: 1, obtenidosBaseCol: 3 },
  'DESPACHO': { sheet: '4. Prev_Frecuencia Despachos', descCol: 0, obtenidosBaseCol: 2 },
  'TRANSPORTE': { sheet: '5. Prev_Frecuencia Transportes', descCol: 0, obtenidosBaseCol: 2 },
};

const AREAS_LIST = Object.keys(SHEET_CONFIG);

const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

// Cache de estructura (se lee una sola vez del Excel)
let _structureCache = null;

/**
 * Asegura que el template del Excel exista en data/bpm/
 */
function ensureTemplate() {
  if (!fs.existsSync(TEMPLATE_DIR)) {
    fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
  }
  if (!fs.existsSync(TEMPLATE_PATH)) {
    if (fs.existsSync(ORIGINAL_PATH)) {
      fs.copyFileSync(ORIGINAL_PATH, TEMPLATE_PATH);
      console.log('✅ BPM Excel template copiado a data/bpm/');
    } else {
      throw new Error('No se encontró el archivo Excel BPM original en: ' + ORIGINAL_PATH);
    }
  }
}

/**
 * Calcula el número de semana global (1-48) a partir de mes y semana del mes
 */
function getWeekNumber(mes, semanaMes) {
  const mesIndex = MESES.indexOf(mes.toUpperCase());
  if (mesIndex === -1) throw new Error('Mes inválido: ' + mes);
  if (semanaMes < 1 || semanaMes > 4) throw new Error('Semana del mes debe ser 1-4');
  return mesIndex * 4 + semanaMes;
}

/**
 * Calcula la columna de "Obtenidos" para una semana dada
 */
function getObtenidosCol(config, weekNumber) {
  return config.obtenidosBaseCol + (weekNumber - 1) * 3;
}

/**
 * Lee la estructura del Excel (categorías e ítems con sus filas)
 * Se cachea en memoria para no leer el Excel en cada request
 */
function readStructure() {
  if (_structureCache) return _structureCache;

  ensureTemplate();
  let buf;
  try {
    buf = fs.readFileSync(TEMPLATE_PATH);
  } catch (err) {
    throw new Error('Error al leer el archivo Excel: ' + err.message);
  }
  const wb = XLSX.read(buf, { type: 'buffer', cellFormula: true, bookVBA: true });

  const structure = {};

  for (const [areaName, config] of Object.entries(SHEET_CONFIG)) {
    const ws = wb.Sheets[config.sheet];
    if (!ws) {
      console.warn('⚠️ Hoja no encontrada: ' + config.sheet);
      continue;
    }

    const range = XLSX.utils.decode_range(ws['!ref']);
    const categorias = [];
    let currentCategory = null;

    // Escanear filas desde la fila 7 (0-indexed 6) donde empiezan las categorías y encabezados
    for (let r = 6; r <= range.e.r; r++) {
      const descCell = ws[XLSX.utils.encode_cell({ r, c: config.descCol })];
      if (!descCell || !descCell.v) continue;

      const desc = String(descCell.v).trim();
      if (!desc) continue;

      // Determinar si es fila de categoría (tiene fórmula AVERAGE en la columna %)
      let isCategory = false;
      // Revisar la columna % de la primera semana
      const percentCol = config.obtenidosBaseCol + 2;
      const percentCell = ws[XLSX.utils.encode_cell({ r, c: percentCol })];
      if (percentCell && percentCell.f && percentCell.f.includes('AVERAGE')) {
        isCategory = true;
      }

      // También verificar si NO tiene el valor 5 en la columna Totales (las categorías no tienen)
      const totalesCol = config.obtenidosBaseCol + 1;
      const totalesCell = ws[XLSX.utils.encode_cell({ r, c: totalesCol })];
      const hasTotales = totalesCell && totalesCell.v === 5;

      if (isCategory || (!hasTotales && desc.length > 3)) {
        // Es una fila de categoría
        currentCategory = {
          nombre: desc,
          row: r + 1, // 1-indexed
          items: []
        };
        categorias.push(currentCategory);
      } else if (hasTotales && currentCategory) {
        // Es una fila de ítem
        currentCategory.items.push({
          row: r + 1, // 1-indexed
          descripcion: desc,
          total: 5
        });
      }
    }

    structure[areaName] = {
      sheetName: config.sheet,
      categorias
    };
  }

  _structureCache = structure;
  return structure;
}

/**
 * Obtiene la estructura de un área específica combinada con valores de la BD
 */
function getAreaData(areaName, calificaciones, mes) {
  const allStructure = readStructure();
  const areaStructure = allStructure[areaName];
  if (!areaStructure) throw new Error('Área no válida: ' + areaName);

  const mesIndex = MESES.indexOf(mes.toUpperCase());
  if (mesIndex === -1) throw new Error('Mes no válido: ' + mes);

  const weekStart = mesIndex * 4 + 1;
  const weekEnd = mesIndex * 4 + 4;

  // Crear mapa de calificaciones: { `${row}_${semana}` → valor }
  const calMap = {};
  for (const cal of calificaciones) {
    calMap[`${cal.row_number}_${cal.semana_numero}`] = cal.valor;
  }

  // Combinar estructura con valores
  const categorias = areaStructure.categorias.map(cat => {
    const items = cat.items.map(item => {
      const semanas = {};
      for (let w = weekStart; w <= weekEnd; w++) {
        const val = calMap[`${item.row}_${w}`] || null;
        semanas[w] = {
          obtenido: val,
          total: 5,
          porcentaje: val ? Math.round((val / 5) * 100) : 0
        };
      }
      return { ...item, semanas };
    });

    // Calcular promedios de la categoría
    const promedios = {};
    for (let w = weekStart; w <= weekEnd; w++) {
      const itemsConValor = items.filter(it => it.semanas[w].obtenido !== null);
      if (itemsConValor.length > 0) {
        const avg = itemsConValor.reduce((sum, it) => sum + it.semanas[w].porcentaje, 0) / itemsConValor.length;
        promedios[w] = Math.round(avg);
      } else {
        promedios[w] = 0;
      }
    }

    return { ...cat, items, promedios };
  });

  // Semanas del mes
  const semanas = [];
  for (let w = weekStart; w <= weekEnd; w++) {
    const semanaMes = ((w - 1) % 4) + 1;
    semanas.push({ numero: w, mes: MESES[mesIndex], semanaMes });
  }

  // Calcular estado de completitud por semana
  const totalItems = categorias.reduce((sum, cat) => sum + cat.items.length, 0);
  const semanasEstado = semanas.map(sem => {
    const filled = categorias.reduce((sum, cat) => {
      return sum + cat.items.filter(it => it.semanas[sem.numero].obtenido !== null).length;
    }, 0);
    return {
      ...sem,
      completada: filled === totalItems && totalItems > 0,
      itemsLlenados: filled,
      totalItems,
      porcentaje: totalItems > 0 ? Math.round((filled / totalItems) * 100) : 0
    };
  });

  return {
    area: areaName,
    sheetName: areaStructure.sheetName,
    categorias,
    semanas: semanasEstado,
    totalItems
  };
}

/**
 * Genera un Excel llenado con los valores de la BD para descarga
 * Utiliza exceljs para preservar correctamente las macros (.xlsm)
 */
async function generateFilledExcel(allCalificaciones) {
  ensureTemplate();
  const XlsxPopulate = require('xlsx-populate');
  
  // xlsx-populate will mutate the file in memory while preserving everything
  const wb = await XlsxPopulate.fromFileAsync(TEMPLATE_PATH);

  for (const [areaName, config] of Object.entries(SHEET_CONFIG)) {
    const ws = wb.sheet(config.sheet);
    if (!ws) continue;

    // Filtrar calificaciones de esta área
    const areaCals = allCalificaciones.filter(c => c.area === areaName);

    for (const cal of areaCals) {
      // getObtenidosCol retorna 0-indexed, xlsx-populate usa 1-indexed
      const col = getObtenidosCol(config, cal.semana_numero) + 1;
      const row = cal.row_number; 

      ws.cell(row, col).value(cal.valor);
    }
  }

  // Generar buffer del archivo
  const buffer = await wb.outputAsync();
  return buffer;
}

/**
 * Invalida el cache de estructura (por si se actualiza el template)
 */
function clearCache() {
  _structureCache = null;
}

module.exports = {
  SHEET_CONFIG,
  AREAS_LIST,
  MESES,
  readStructure,
  getAreaData,
  generateFilledExcel,
  getWeekNumber,
  ensureTemplate,
  clearCache,
  TEMPLATE_PATH
};
