/**
 * migrate-db-7.js
 * Adds: categorias_visita table (hierarchical), categoria_id in visitas,
 *       override_justificacion in eventos_calendario
 * Seeds: ~180 categories for Mantenimiento (area 3) and Sistemas (area 7)
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'database', 'crepes.db');
const PROD_DB = path.join('C:\\', 'ProgramData', 'CrepesApp', 'crepes.db');

function migrate(dbPath) {
  if (!fs.existsSync(dbPath)) {
    console.log(`⚠️  BD no encontrada en: ${dbPath} — omitiendo.`);
    return;
  }
  console.log(`\n🔄 Migrando: ${dbPath}`);
  const db = new Database(dbPath);

  // 1) Create categorias_visita table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categorias_visita (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      padre_id INTEGER,
      area_id INTEGER NOT NULL,
      activa INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (padre_id) REFERENCES categorias_visita(id),
      FOREIGN KEY (area_id) REFERENCES areas(id)
    );
  `);
  console.log('  ✅ Tabla categorias_visita creada/ya existe.');

  // 2) Add categoria_id to visitas
  const visCols = db.prepare("PRAGMA table_info(visitas)").all().map(c => c.name);
  if (!visCols.includes('categoria_id')) {
    db.exec('ALTER TABLE visitas ADD COLUMN categoria_id INTEGER REFERENCES categorias_visita(id)');
    console.log('  ✅ Columna visitas.categoria_id agregada.');
  } else {
    console.log('  ℹ️  visitas.categoria_id ya existe.');
  }

  // 3) Add override_justificacion to eventos_calendario
  const evCols = db.prepare("PRAGMA table_info(eventos_calendario)").all().map(c => c.name);
  if (!evCols.includes('override_justificacion')) {
    db.exec('ALTER TABLE eventos_calendario ADD COLUMN override_justificacion TEXT');
    console.log('  ✅ Columna eventos_calendario.override_justificacion agregada.');
  } else {
    console.log('  ℹ️  eventos_calendario.override_justificacion ya existe.');
  }

  // 4) Seed categories (only if table is empty)
  const existingCount = db.prepare('SELECT COUNT(*) as n FROM categorias_visita').get().n;
  if (existingCount > 0) {
    console.log(`  ℹ️  categorias_visita ya tiene ${existingCount} registros. Omitiendo seed.`);
    db.close();
    return;
  }

  const insertCat = db.prepare(
    'INSERT INTO categorias_visita (nombre, padre_id, area_id) VALUES (?, ?, ?)'
  );

  const insert = db.transaction((categories) => {
    const idMap = {};
    for (const cat of categories) {
      const result = insertCat.run(cat.nombre, cat.padre ? idMap[cat.padre] : null, cat.area_id);
      idMap[cat.key] = result.lastInsertRowid;
    }
  });

  // area_id 3 = Mantenimiento, area_id 7 = Sistemas
  const categories = [
    // ===== MANTENIMIENTO (area 3) =====
    // Root categories
    { key: 'MNT_GAS',     nombre: 'SOPORTE GAS',                     padre: null, area_id: 3 },
    { key: 'MNT_INY',     nombre: 'SOPORTE INYECCION Y EXTRACCION',  padre: null, area_id: 3 },
    { key: 'MNT_HID',     nombre: 'SOPORTE HIDRAULICO O PLOMERIA',   padre: null, area_id: 3 },
    { key: 'MNT_REF',     nombre: 'SOPORTE LINEA REFRIGERACION',     padre: null, area_id: 3 },
    { key: 'MNT_CAL',     nombre: 'SOPORTE LINEA CALIENTE',          padre: null, area_id: 3 },
    { key: 'MNT_AIR',     nombre: 'SOPORTE AIRES ACONDICIONADOS',    padre: null, area_id: 3 },
    { key: 'MNT_LOC',     nombre: 'SOPORTES LOCATIVOS',              padre: null, area_id: 3 },
    { key: 'MNT_ELE',     nombre: 'SOPORTE ELECTRICO',               padre: null, area_id: 3 },
    { key: 'MNT_OTR',     nombre: 'OTROS EQUIPOS',                   padre: null, area_id: 3 },

    // SOPORTE GAS subcategories
    { key: 'GAS_EST',     nombre: 'Estufa',                          padre: 'MNT_GAS', area_id: 3 },
    { key: 'GAS_PLA',     nombre: 'Plancha',                         padre: 'MNT_GAS', area_id: 3 },
    { key: 'GAS_HOR',     nombre: 'Horno',                           padre: 'MNT_GAS', area_id: 3 },
    { key: 'GAS_BAN',     nombre: 'Baño Maria',                      padre: 'MNT_GAS', area_id: 3 },
    { key: 'GAS_CALE',    nombre: 'Calentador',                      padre: 'MNT_GAS', area_id: 3 },
    { key: 'GAS_ENA',     nombre: 'Estufas Enanas',                  padre: 'MNT_GAS', area_id: 3 },
    { key: 'GAS_HRI',     nombre: 'Horno Industrial Rational (Cocina)', padre: 'MNT_GAS', area_id: 3 },
    { key: 'GAS_HCO',     nombre: 'Horno (Conos)',                   padre: 'MNT_GAS', area_id: 3 },
    { key: 'GAS_SAR',     nombre: 'Sarten Basculante',               padre: 'MNT_GAS', area_id: 3 },

    // SOPORTE INYECCION Y EXTRACCION subcategories
    { key: 'INY_INY',     nombre: 'Inyeccion',                       padre: 'MNT_INY', area_id: 3 },
    { key: 'INY_EXT',     nombre: 'Extracción',                      padre: 'MNT_INY', area_id: 3 },

    // SOPORTE HIDRAULICO O PLOMERIA subcategories
    { key: 'HID_TUD',     nombre: 'Tubería de desagüe',              padre: 'MNT_HID', area_id: 3 },
    { key: 'HID_TAP',     nombre: 'Tubería Agua potable',            padre: 'MNT_HID', area_id: 3 },
    { key: 'HID_TAN',     nombre: 'Tubería de Aguas negras',         padre: 'MNT_HID', area_id: 3 },
    { key: 'HID_TAG',     nombre: 'Tuberías de Aguas grises',        padre: 'MNT_HID', area_id: 3 },
    { key: 'HID_LAP',     nombre: 'Lava platos',                     padre: 'MNT_HID', area_id: 3 },
    { key: 'HID_LAM',     nombre: 'Lava Manos',                      padre: 'MNT_HID', area_id: 3 },
    { key: 'HID_ORI',     nombre: 'Orinal',                          padre: 'MNT_HID', area_id: 3 },
    { key: 'HID_DUC',     nombre: 'Ducha',                           padre: 'MNT_HID', area_id: 3 },
    { key: 'HID_INO',     nombre: 'Inodoro',                         padre: 'MNT_HID', area_id: 3 },
    { key: 'HID_SIF',     nombre: 'Sifon',                           padre: 'MNT_HID', area_id: 3 },
    { key: 'HID_DES',     nombre: 'Desagüe',                         padre: 'MNT_HID', area_id: 3 },

    // SOPORTE LINEA REFRIGERACION subcategories
    { key: 'REF_NBA',     nombre: 'Nevera de Barra',                 padre: 'MNT_REF', area_id: 3 },
    { key: 'REF_NPI',     nombre: 'Nevera de Pitas',                 padre: 'MNT_REF', area_id: 3 },
    { key: 'REF_NPL',     nombre: 'Nevera de Plancha',               padre: 'MNT_REF', area_id: 3 },
    { key: 'REF_NCR',     nombre: 'Nevera de Crepes',                padre: 'MNT_REF', area_id: 3 },
    { key: 'REF_LAB',     nombre: 'Labor',                           padre: 'MNT_REF', area_id: 3 },
    { key: 'REF_CAL',     nombre: 'Caleido',                         padre: 'MNT_REF', area_id: 3 },
    { key: 'REF_MCH',     nombre: 'Maquina Chantilly',               padre: 'MNT_REF', area_id: 3 },
    { key: 'REF_NPU',     nombre: 'Nevera y Puertas',                padre: 'MNT_REF', area_id: 3 },
    { key: 'REF_NHE',     nombre: 'Nevera de heladeria',             padre: 'MNT_REF', area_id: 3 },
    { key: 'REF_NDV',     nombre: 'Nevera dos puertas Vertical',     padre: 'MNT_REF', area_id: 3 },
    { key: 'REF_MHI',     nombre: 'Maquina de Hielo',                padre: 'MNT_REF', area_id: 3 },
    { key: 'REF_NAG',     nombre: 'Nevera de Agua',                  padre: 'MNT_REF', area_id: 3 },
    { key: 'REF_SRA',     nombre: 'Sistema de Rack',                 padre: 'MNT_REF', area_id: 3 },
    { key: 'REF_EVA',     nombre: 'Evaporadores',                    padre: 'MNT_REF', area_id: 3 },
    // Evaporadores sub-subcategories
    { key: 'EVA_CFR',     nombre: 'Cuarto Frio',                     padre: 'REF_EVA', area_id: 3 },
    { key: 'EVA_PAS',     nombre: 'Pasillos',                        padre: 'REF_EVA', area_id: 3 },
    { key: 'EVA_ARE',     nombre: 'Areas Especificas',               padre: 'REF_EVA', area_id: 3 },

    // ===== SISTEMAS/TECNOLOGÍA (area 7) =====
    // Root categories
    { key: 'SIS_ACC',     nombre: 'ACCESO',                          padre: null, area_id: 7 },
    { key: 'SIS_ACO',     nombre: 'ACOMPAÑAMIENTO',                  padre: null, area_id: 7 },
    { key: 'SIS_ADE',     nombre: 'ADECUACIÓN',                      padre: null, area_id: 7 },
    { key: 'SIS_CAM',     nombre: 'CÁMARAS Y CORTE DE ENERGIA',      padre: null, area_id: 7 },
    { key: 'SIS_CAR',     nombre: 'CARPETA COMPARTIDA',              padre: null, area_id: 7 },
    { key: 'SIS_CON',     nombre: 'CONECTIVIDAD',                    padre: null, area_id: 7 },
    { key: 'SIS_ESC',     nombre: 'ESCANER',                         padre: null, area_id: 7 },
    { key: 'SIS_FAH',     nombre: 'FALLA HARDWARE',                  padre: null, area_id: 7 },
    { key: 'SIS_FIR',     nombre: 'FIREWALL',                        padre: null, area_id: 7 },
    { key: 'SIS_HAR',     nombre: 'HARDWARE',                        padre: null, area_id: 7 },
    { key: 'SIS_IMP',     nombre: 'IMPRESIÓN',                       padre: null, area_id: 7 },
    { key: 'SIS_PER',     nombre: 'PERMISOS DE ACCESO',              padre: null, area_id: 7 },
    { key: 'SIS_SOF',     nombre: 'SOFTWARE',                        padre: null, area_id: 7 },
    { key: 'SIS_USU',     nombre: 'USUARIO',                         padre: null, area_id: 7 },

    // ACCESO subcategories
    { key: 'ACC_CAR',     nombre: 'Creación de carpeta',             padre: 'SIS_ACC', area_id: 7 },
    { key: 'ACC_SHA',     nombre: 'Sharepoint',                      padre: 'SIS_ACC', area_id: 7 },

    // ACOMPAÑAMIENTO subcategories
    { key: 'ACO_PRO',     nombre: 'Proveedor',                       padre: 'SIS_ACO', area_id: 7 },
    // Proveedor sub-subcategories
    { key: 'PRO_RAC',     nombre: 'Acceso a Racks',                  padre: 'ACO_PRO', area_id: 7 },
    { key: 'PRO_CON',     nombre: 'Configuraciones',                  padre: 'ACO_PRO', area_id: 7 },
    { key: 'PRO_RED',     nombre: 'Instalación de punto de red',     padre: 'ACO_PRO', area_id: 7 },

    // ADECUACIÓN subcategories
    { key: 'ADE_APV',     nombre: 'Apertura de punto de venta',      padre: 'SIS_ADE', area_id: 7 },
    { key: 'ADE_NPT',     nombre: 'Nuevo puesto de trabajo',         padre: 'SIS_ADE', area_id: 7 },
    { key: 'ADE_TPT',     nombre: 'Traslado de puesto de trabajo',   padre: 'SIS_ADE', area_id: 7 },

    // CÁMARAS Y CORTE DE ENERGIA subcategories
    { key: 'CAM_CAM',     nombre: 'Cámaras',                         padre: 'SIS_CAM', area_id: 7 },
    { key: 'CAM_COR',     nombre: 'Corte de energía',                padre: 'SIS_CAM', area_id: 7 },

    // CARPETA COMPARTIDA subcategories
    { key: 'CAR_CRE',     nombre: 'Creación de Carpeta Compartida',  padre: 'SIS_CAR', area_id: 7 },
    { key: 'CAR_PER',     nombre: 'Permisos de acceso a Carpeta Compartida', padre: 'SIS_CAR', area_id: 7 },

    // CONECTIVIDAD subcategories
    { key: 'CON_INT',     nombre: 'Internet',                        padre: 'SIS_CON', area_id: 7 },
    { key: 'INT_SIN',     nombre: 'Sin internet',                    padre: 'CON_INT', area_id: 7 },
    { key: 'CON_LAN',     nombre: 'Lan',                             padre: 'SIS_CON', area_id: 7 },
    { key: 'LAN_SIN',     nombre: 'Sin conexión',                    padre: 'CON_LAN', area_id: 7 },
    { key: 'CON_VPN',     nombre: 'Vpn',                             padre: 'SIS_CON', area_id: 7 },
    { key: 'VPN_ERR',     nombre: 'Error de conexión',               padre: 'CON_VPN', area_id: 7 },
    { key: 'CON_WIF',     nombre: 'Wifi',                            padre: 'SIS_CON', area_id: 7 },
    { key: 'WIF_SIN',     nombre: 'Sin conexión',                    padre: 'CON_WIF', area_id: 7 },

    // ESCANER subcategories
    { key: 'ESC_ATA',     nombre: 'Atasco Escaner',                  padre: 'SIS_ESC', area_id: 7 },
    { key: 'ESC_ERR',     nombre: 'Error de escaner',                padre: 'SIS_ESC', area_id: 7 },

    // FALLA HARDWARE subcategories
    { key: 'FAH_CPO',     nombre: 'Cable de poder',                  padre: 'SIS_FAH', area_id: 7 },
    { key: 'FAH_CRE',     nombre: 'Cable de red',                    padre: 'SIS_FAH', area_id: 7 },
    { key: 'FAH_CVI',     nombre: 'Cable de video',                  padre: 'SIS_FAH', area_id: 7 },
    { key: 'FAH_CAJ',     nombre: 'Cajón monedero',                  padre: 'SIS_FAH', area_id: 7 },
    { key: 'FAH_CHA',     nombre: 'Cargador',                        padre: 'SIS_FAH', area_id: 7 },
    { key: 'FAH_COM',     nombre: 'Computador',                      padre: 'SIS_FAH', area_id: 7 },
    { key: 'FAH_DIA',     nombre: 'Diadema',                         padre: 'SIS_FAH', area_id: 7 },
    { key: 'FAH_IMP',     nombre: 'Impresora',                       padre: 'SIS_FAH', area_id: 7 },
    { key: 'FAH_IMP2',    nombre: 'Impresora PDV',                   padre: 'SIS_FAH', area_id: 7 },
    { key: 'FAH_MON',     nombre: 'Monitor',                         padre: 'SIS_FAH', area_id: 7 },
    { key: 'FAH_MYT',     nombre: 'Mouse y Teclado',                 padre: 'SIS_FAH', area_id: 7 },
    { key: 'FAH_PUN',     nombre: 'Punto de red',                    padre: 'SIS_FAH', area_id: 7 },
    { key: 'FAH_TAB',     nombre: 'Tablet',                          padre: 'SIS_FAH', area_id: 7 },
    { key: 'FAH_UPS',     nombre: 'Ups',                             padre: 'SIS_FAH', area_id: 7 },
    { key: 'FAH_VID',     nombre: 'VideoBeam',                       padre: 'SIS_FAH', area_id: 7 },

    // FIREWALL subcategories
    { key: 'FIR_PER',     nombre: 'Permisos firewall',               padre: 'SIS_FIR', area_id: 7 },

    // HARDWARE subcategories
    { key: 'HAR_ALI',     nombre: 'Alistamiento',                    padre: 'SIS_HAR', area_id: 7 },
    { key: 'ALI_CEL',     nombre: 'Celular',                         padre: 'HAR_ALI', area_id: 7 },
    { key: 'ALI_COM',     nombre: 'Computador',                      padre: 'HAR_ALI', area_id: 7 },
    { key: 'ALI_TAB',     nombre: 'Tablet',                          padre: 'HAR_ALI', area_id: 7 },
    { key: 'ALI_TEL',     nombre: 'Teléfono',                        padre: 'HAR_ALI', area_id: 7 },
    { key: 'HAR_ASI',     nombre: 'Asignación',                      padre: 'SIS_HAR', area_id: 7 },
    { key: 'ASI_CAJ',     nombre: 'Cajón monedero',                  padre: 'HAR_ASI', area_id: 7 },
    { key: 'ASI_CEL',     nombre: 'Celular',                         padre: 'HAR_ASI', area_id: 7 },
    { key: 'ASI_COM',     nombre: 'Computador',                      padre: 'HAR_ASI', area_id: 7 },
    { key: 'ASI_DIA',     nombre: 'Diadema',                         padre: 'HAR_ASI', area_id: 7 },
    { key: 'ASI_GUA',     nombre: 'Guaya',                           padre: 'HAR_ASI', area_id: 7 },
    { key: 'ASI_IMP',     nombre: 'Impresora',                       padre: 'HAR_ASI', area_id: 7 },
    { key: 'ASI_MON',     nombre: 'Monitor',                         padre: 'HAR_ASI', area_id: 7 },
    { key: 'ASI_MYT',     nombre: 'Mouse y Teclado',                 padre: 'HAR_ASI', area_id: 7 },
    { key: 'ASI_PAR',     nombre: 'Parlantes PC',                    padre: 'HAR_ASI', area_id: 7 },
    { key: 'ASI_TAB',     nombre: 'Tablet',                          padre: 'HAR_ASI', area_id: 7 },
    { key: 'ASI_TEL',     nombre: 'Telefono',                        padre: 'HAR_ASI', area_id: 7 },
    { key: 'ASI_TOM',     nombre: 'Tomapedido',                      padre: 'HAR_ASI', area_id: 7 },
    { key: 'HAR_PRE',     nombre: 'Préstamo',                        padre: 'SIS_HAR', area_id: 7 },
    { key: 'PRE_ANT',     nombre: 'Antena WIFI USB',                 padre: 'HAR_PRE', area_id: 7 },
    { key: 'PRE_EQU',     nombre: 'Equipo',                          padre: 'HAR_PRE', area_id: 7 },
    { key: 'PRE_EXT',     nombre: 'Extensión Electrica',             padre: 'HAR_PRE', area_id: 7 },
    { key: 'PRE_MIC',     nombre: 'Micrófono',                       padre: 'HAR_PRE', area_id: 7 },
    { key: 'PRE_MYT',     nombre: 'Mouse y Teclado',                 padre: 'HAR_PRE', area_id: 7 },
    { key: 'PRE_PAR',     nombre: 'Parlantes PC',                    padre: 'HAR_PRE', area_id: 7 },
    { key: 'PRE_PRO',     nombre: 'Proyector',                       padre: 'HAR_PRE', area_id: 7 },
    { key: 'PRE_TEL',     nombre: 'Telón',                           padre: 'HAR_PRE', area_id: 7 },
    { key: 'HAR_REP',     nombre: 'Repotenciar',                     padre: 'SIS_HAR', area_id: 7 },
    { key: 'REP_COM',     nombre: 'Computador',                      padre: 'HAR_REP', area_id: 7 },

    // IMPRESIÓN subcategories
    { key: 'IMP_ATA',     nombre: 'Atasco Impresora',                padre: 'SIS_IMP', area_id: 7 },
    { key: 'IMP_CAM',     nombre: 'Cambio de consumible',            padre: 'SIS_IMP', area_id: 7 },
    { key: 'IMP_COP',     nombre: 'Configurar impresora PDV',        padre: 'SIS_IMP', area_id: 7 },
    { key: 'IMP_CON',     nombre: 'Configurar impresora',            padre: 'SIS_IMP', area_id: 7 },
    { key: 'IMP_FAP',     nombre: 'Falla de impresora PDV',          padre: 'SIS_IMP', area_id: 7 },
    { key: 'IMP_FAL',     nombre: 'Falla de impresora',              padre: 'SIS_IMP', area_id: 7 },

    // PERMISOS DE ACCESO subcategories
    { key: 'PER_BDA',     nombre: 'Base de datos',                   padre: 'SIS_PER', area_id: 7 },
    { key: 'PER_BLO',     nombre: 'Bloqueo de usuario de Windows',   padre: 'SIS_PER', area_id: 7 },
    { key: 'PER_SER',     nombre: 'Servidor',                        padre: 'SIS_PER', area_id: 7 },
    { key: 'SER_SSH',     nombre: 'Ssh /Ftp /Sftp /TerminalServer',  padre: 'PER_SER', area_id: 7 },

    // SOFTWARE subcategories
    { key: 'SOF_BIO',     nombre: 'Acceso Biometrico',               padre: 'SIS_SOF', area_id: 7 },
    { key: 'BIO_EMP',     nombre: 'Error marcación PDV',             padre: 'SOF_BIO', area_id: 7 },
    { key: 'BIO_EMS',     nombre: 'Error marcación Sede Administrativa', padre: 'SOF_BIO', area_id: 7 },
    { key: 'BIO_EVH',     nombre: 'Error visualización Horario',     padre: 'SOF_BIO', area_id: 7 },
    { key: 'SOF_ANT',     nombre: 'Antivirus',                       padre: 'SIS_SOF', area_id: 7 },
    { key: 'ANT_USB',     nombre: 'Desbloqueo de puertos USB',       padre: 'SOF_ANT', area_id: 7 },
    { key: 'ANT_VER',     nombre: 'Error de versión',                padre: 'SOF_ANT', area_id: 7 },
    { key: 'SOF_ACD',     nombre: 'App Claro Directo',               padre: 'SIS_SOF', area_id: 7 },
    { key: 'SOF_CON',     nombre: 'Conferencia',                     padre: 'SIS_SOF', area_id: 7 },
    { key: 'CON_INS',     nombre: 'Instalación (Meet, Teams, Zoom)', padre: 'SOF_CON', area_id: 7 },
    { key: 'SOF_COR',     nombre: 'Correo Electrónico',              padre: 'SIS_SOF', area_id: 7 },
    { key: 'COR_CFS',     nombre: 'Configuración de servidor de correo electrónico', padre: 'SOF_COR', area_id: 7 },
    { key: 'COR_CRE',     nombre: 'Creación correo electronico',     padre: 'SOF_COR', area_id: 7 },
    { key: 'COR_ERR',     nombre: 'Error correo electrónico',        padre: 'SOF_COR', area_id: 7 },
    { key: 'COR_RED',     nombre: 'Redirección Correo Electrónico',  padre: 'SOF_COR', area_id: 7 },
    { key: 'COR_RES',     nombre: 'Respaldo y depuración de correo electronico', padre: 'SOF_COR', area_id: 7 },
    { key: 'SOF_ERP',     nombre: 'ERP',                             padre: 'SIS_SOF', area_id: 7 },
    { key: 'ERP_ACC',     nombre: 'Acceso a ERP',                    padre: 'SOF_ERP', area_id: 7 },
    { key: 'ERP_ERR_EIE', nombre: 'Error Carpeta Exportar / Importar ERP', padre: 'SOF_ERP', area_id: 7 },
    { key: 'ERP_ERR',     nombre: 'Error ERP',                       padre: 'SOF_ERP', area_id: 7 },
    { key: 'ERP_IAD',     nombre: 'Instalación Acceso directo ERP',  padre: 'SOF_ERP', area_id: 7 },
    { key: 'ERP_IPL',     nombre: 'Instalación Pluggin ERP',         padre: 'SOF_ERP', area_id: 7 },
    { key: 'SOF_FE',      nombre: 'FE',                              padre: 'SIS_SOF', area_id: 7 },
    { key: 'FE_ECC',      nombre: 'Error comprobante de consumo',    padre: 'SOF_FE',  area_id: 7 },
    { key: 'FE_ECO',      nombre: 'Error correo electrónico',        padre: 'SOF_FE',  area_id: 7 },
    { key: 'SOF_GRA',     nombre: 'Grabación',                       padre: 'SIS_SOF', area_id: 7 },
    { key: 'GRA_PAN',     nombre: 'Grabar Pantalla',                 padre: 'SOF_GRA', area_id: 7 },
    { key: 'SOF_OFF',     nombre: 'Office',                          padre: 'SIS_SOF', area_id: 7 },
    { key: 'OFF_ERR',     nombre: 'Error',                           padre: 'SOF_OFF', area_id: 7 },
    { key: 'OFF_INS',     nombre: 'Instalación',                     padre: 'SOF_OFF', area_id: 7 },
    { key: 'SOF_POS',     nombre: 'POS',                             padre: 'SIS_SOF', area_id: 7 },
    { key: 'POS_AVE',     nombre: 'Actualización Versión',           padre: 'SOF_POS', area_id: 7 },
    { key: 'POS_BDA',     nombre: 'Base de datos',                   padre: 'SOF_POS', area_id: 7 },
    { key: 'POS_CPR',     nombre: 'Cambio de precios',               padre: 'SOF_POS', area_id: 7 },
    { key: 'POS_CFG',     nombre: 'Configuración',                   padre: 'SOF_POS', area_id: 7 },
    { key: 'POS_CIM',     nombre: 'Configuración de impresoras',     padre: 'SOF_POS', area_id: 7 },
    { key: 'POS_CIX',     nombre: 'Configuración Importador XML',    padre: 'SOF_POS', area_id: 7 },
    { key: 'POS_CCO',     nombre: 'Creación de códigos',             padre: 'SOF_POS', area_id: 7 },
    { key: 'POS_CIT',     nombre: 'Creación Items',                  padre: 'SOF_POS', area_id: 7 },
    { key: 'POS_CMA',     nombre: 'Creación Mapas',                  padre: 'SOF_POS', area_id: 7 },
    { key: 'POS_DIM',     nombre: 'Diseños de Impresión',            padre: 'SOF_POS', area_id: 7 },
    { key: 'POS_ERR',     nombre: 'Error',                           padre: 'SOF_POS', area_id: 7 },
    { key: 'POS_IAM',     nombre: 'Instalación Acceso a Manager',    padre: 'SOF_POS', area_id: 7 },
    { key: 'POS_IAL',     nombre: 'Instalación Aloha',               padre: 'SOF_POS', area_id: 7 },
    { key: 'POS_MIT',     nombre: 'Modificación Items',              padre: 'SOF_POS', area_id: 7 },
    { key: 'POS_MMA',     nombre: 'Modificación Mapas',              padre: 'SOF_POS', area_id: 7 },
    { key: 'POS_PVE',     nombre: 'Planos de Ventas',                padre: 'SOF_POS', area_id: 7 },
    { key: 'POS_RIM',     nombre: 'Redireccionar Impresoras',        padre: 'SOF_POS', area_id: 7 },
    { key: 'POS_SIT',     nombre: 'Situaciones de Cocina',           padre: 'SOF_POS', area_id: 7 },
    { key: 'SOF_SIS',     nombre: 'Sistema Operativo',               padre: 'SIS_SOF', area_id: 7 },
    { key: 'SIS_LEN',     nombre: 'Lentitud',                        padre: 'SOF_SIS', area_id: 7 },
    { key: 'SIS_PAN',     nombre: 'Pantalla Azul',                   padre: 'SOF_SIS', area_id: 7 },
    { key: 'SOF_TEL',     nombre: 'Telefonía',                       padre: 'SIS_SOF', area_id: 7 },
    { key: 'TEL_CFG',     nombre: 'Configuración',                   padre: 'SOF_TEL', area_id: 7 },
    { key: 'TEL_CEX',     nombre: 'Creación de Extensión',           padre: 'SOF_TEL', area_id: 7 },
    { key: 'TEL_EUS',     nombre: 'Eliminación Usuario',             padre: 'SOF_TEL', area_id: 7 },
    { key: 'TEL_ERR',     nombre: 'Error',                           padre: 'SOF_TEL', area_id: 7 },
    { key: 'TEL_ILL',     nombre: 'Informe de llamadas',             padre: 'SOF_TEL', area_id: 7 },
    { key: 'TEL_INS',     nombre: 'Instalación',                     padre: 'SOF_TEL', area_id: 7 },
    { key: 'TEL_RGR',     nombre: 'Recuperación de grabación',       padre: 'SOF_TEL', area_id: 7 },

    // USUARIO subcategories
    { key: 'USU_BLO',     nombre: 'Bloqueo de usuario',              padre: 'SIS_USU', area_id: 7 },
    { key: 'USU_CRE',     nombre: 'Creación de usuario',             padre: 'SIS_USU', area_id: 7 },
    { key: 'USU_DES',     nombre: 'Deshabilitación de usuario',      padre: 'SIS_USU', area_id: 7 },
    { key: 'USU_ELI',     nombre: 'Eliminación Usuario',             padre: 'SIS_USU', area_id: 7 },
    { key: 'USU_MPE',     nombre: 'Modificación de permisos',        padre: 'SIS_USU', area_id: 7 },
    { key: 'USU_MUS',     nombre: 'Modificación de usuario',         padre: 'SIS_USU', area_id: 7 },
  ];

  insert(categories);
  console.log(`  ✅ ${categories.length} categorías sembradas en categorias_visita.`);

  db.close();
  console.log(`  ✅ Migración completada para: ${dbPath}`);
}

// Run on both possible databases
migrate(DB_PATH);
migrate(PROD_DB);

console.log('\n🎉 migrate-db-7.js completado exitosamente.');
