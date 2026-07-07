const { getDb } = require('./src/lib/db');
const db = getDb();

try {
  console.log('⚡ Verificando e instalando plantilla BPM...');
  
  // Check if plantilla already exists
  const existingPlantilla = db.prepare('SELECT id FROM plantillas WHERE nombre = ? AND area_id = ?').get('Lista de Chequeo BPM', 4);
  if (existingPlantilla) {
    console.log(`ℹ️ La plantilla "Lista de Chequeo BPM" ya existe (ID: ${existingPlantilla.id}). Omitiendo creación.`);
    process.exit(0);
  }

  // 1. Check or create tipo_visita for BPM
  let tipoVisita = db.prepare('SELECT id FROM tipos_visita WHERE nombre = ? AND area_id = ?').get('Lista de Chequeo BPM', 4);
  let tipoVisitaId;
  if (!tipoVisita) {
    const tipoResult = db.prepare(
      'INSERT INTO tipos_visita (area_id, nombre, activo) VALUES (?, ?, 1)'
    ).run(4, 'Lista de Chequeo BPM');
    tipoVisitaId = tipoResult.lastInsertRowid;
    console.log('Created tipo_visita ID:', tipoVisitaId);
  } else {
    tipoVisitaId = tipoVisita.id;
    console.log('Using existing tipo_visita ID:', tipoVisitaId);
  }

  // 2. Create plantilla with the full BPM checklist structure
  const campos = JSON.stringify([{
    tipo: 'simple_checklist',
    code: 'DCM-F-DPR-25',
    columnas: [],
    secciones: [
      {
        nombre: 'Instalaciones y Edificaciones',
        filas: [
          'Los techos, paredes están libres de humedades y completamente lisas, los pisos están en buen estado.',
          'Las partes altas (techos, tuberías y ductos de ventilación, campana, lamparas) están limpios, en buen estado y libres de goteo.',
          'Los puntos de higiene de manos están con recursos completos y en buenas condiciones'
        ]
      },
      {
        nombre: 'Equipos y Utensilios',
        filas: [
          'Los utensilios de la cocina caliente están en buen estado (sin roturas y sin oxido)',
          'Los utensilios de la cocina fría están en buen estado (sin roturas, quemones u oxido) y las griferías están limpias y en buen estado',
          'Los cuartos fríos y cuartos de congelación se encuentran funcionando adecuadamente o se han tomado las acciones correctivas del caso',
          'Los equipos de procesamiento (despulpadoras, cutter, licuadoras) en cocina fría están en buen estado',
          'Los equipos de procesamiento (despulpadoras, cutter, licuadoras) en cocina caliente están en buen estado',
          'Los equipos y utensilios de procesamiento (espátulas, moldes de conos, coneras, jarras, teteros, licuadoras) en conos y repostería se encuentran en buen estado',
          'Las máquinas clippeadoras de las secciones cumplen con la presión de vacío establecida'
        ]
      },
      {
        nombre: 'Personal Manipulador',
        filas: [
          'Todo el personal cumple con las normas de higiene personal, petos, gorro y/o cachucha debidamente puesto, uñas limpias, cortas y sin esmalte, no usan maquillaje, no usan joyas',
          'El manejo de guantes es el apropiado y se usan según el color establecido',
          'El personal evita hablar, toser y estornudar sobre los alimentos y es evidente el buen estado de salud',
          'Se observa con frecuencia que el personal manipulador higieniza correctamente sus manos',
          'Todo visitante que ingresa a las áreas de manipulación llevan la dotación completa (bata, gorro, tapabocas y botas desechables)'
        ]
      },
      {
        nombre: 'Requisitos Higiénicos de Fabricación',
        filas: [
          'Se hace desinfección adecuada de frutas y hortalizas',
          'Los productos cocinados alcanzan temperaturas mínimas de 75°C',
          'El tiempo entre cocción y empaque de los productos es menor de 10 min',
          'El proceso de empaque se hace de forma ágil y rápida previniendo la contaminación cruzada',
          'Se hace limpieza y desinfección de la boquilla, embudo, jarra y mesón de la máquina clippeadora antes del empaque de cada producto',
          'El cuarto de hielo se encuentra limpio y el hielo sobre estibas',
          'Las supertinas cargadas con productos no exceden la capacidad máxima de 300Kg',
          'El descargue de las supertinas y tinas se hace bajo los parámetros establecidos (a temperaturas entre 0°C y 4°C)',
          'El baño de hielo de las supertinas y tinas se mantiene con cloro residual entre 0,3 y 2mg/L',
          'El baño de hielo de las tinas de enfriamiento se mantiene a 0°C',
          'La medición de temperatura de los productos se realiza de manera correcta',
          'El personal de cocina y de empaque respeta la barrera física del platero evitando la contaminación cruzada',
          'Las carnes y pollos beneficiados son almacenadas con bolsa tina',
          'Las materias primas que ingresan a la cocina llegan plenamente identificadas',
          'Las cavas de mariscos y pulpas están limpias y aptas para el despacho',
          'Los pasillos en la cocina fría se encuentran despejados'
        ]
      },
      {
        nombre: 'Saneamiento',
        filas: [
          'Los baños y vestieres de empleadas están limpios y ordenados',
          'El cuarto y los gabinetes de limpieza se encuentran limpios y con los utensilios de limpieza en orden',
          'Se identifica un correcto uso de productos químicos y en las concentraciones establecidas; Las botellas aspersoras para soluciones de limpieza están limpias y rotuladas',
          'Las botellas aspersoras y utensilios de aseo se almacenan adecuadamente',
          'Los habladores están limpios, a la vista y con información actualizada',
          'Las paredes y pisos de las áreas se mantienen limpios y lo más escurridos posibles',
          'Los utensilios están limpios. Hay evidencia de blanqueo de menaje',
          'El manejo de las toallas desechables y la Wypall es higiénico y previene la contaminación cruzada',
          'Se evidencia en la cocina caliente la desinfección de superficies y/o utensilios durante la jornada',
          'Se evidencia en la cocina fría la desinfección de superficies y/o utensilios durante la jornada',
          'Se evidencia clara separación de escobas de pisos y las de paredes',
          'Se evidencia en crepería y repostería la desinfección de superficies, equipos y utensilios',
          'Se evidencia identificación y separación de la espuma lava vasos para limpieza de utensilios de las de sifones'
        ]
      },
      {
        nombre: 'Almacenamiento, Transportes, Comercialización y Distribución',
        filas: [
          'Las materias primas o insumos almacenados en la bodega están sobre estibas o estanterías',
          'Los cuartos fríos permanecen cerrados',
          'Las materias primas/productos almacenados son del mismo tipo de tal forma que se previene la contaminación cruzada',
          'La distancia entre las canastillas y las paredes de los cuartos fríos es superior a 5 cm',
          'Los productos terminados están almacenados a una temperatura inferior a 4ºC',
          'Las materias primas o insumos almacenados en la bodega están sobre estibas o estanterías',
          'Las materias primas y/o productos terminados almacenados en cuartos fríos o de congelación están sobre estibas o estanterías',
          'El área de despachos está limpia y en orden',
          'Los furgones están limpios',
          'Las canastillas del mercado entregado por producción tienen canastilla base',
          'El almacenamiento del mercado en los furgones se hace de tal forma que no se vea afectada la inocuidad de los productos',
          'El área de almacenamiento de productos químicos se encuentra limpia y en orden'
        ]
      },
      {
        nombre: 'Registros',
        filas: [
          'Los registros de temperatura de cuartos fríos y de congelación se encuentran completamente diligenciados',
          'Los formatos de cocción y/o preparación son diligenciados en tiempo real',
          'Los formatos de empaque son diligenciados durante el tiempo del empaque',
          'Los formatos de desinfección de frutas y verduras son diligenciados en tiempo real'
        ]
      }
    ]
  }]);

  const plantillaResult = db.prepare(
    'INSERT INTO plantillas (area_id, tipo_visita_id, nombre, campos, version, activa) VALUES (?, ?, ?, ?, 1, 1)'
  ).run(4, tipoVisitaId, 'Lista de Chequeo BPM', campos);

  console.log('✅ Created plantilla ID:', plantillaResult.lastInsertRowid);
  console.log('🎉 Done! BPM Checklist added to Calidad area.');
} catch (error) {
  console.error('❌ Error in BPM checklist migration:', error);
  process.exit(1);
}
