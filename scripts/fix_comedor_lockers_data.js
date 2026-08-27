const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'database', 'crepes.db');
console.log('Conectando a base de datos:', dbPath);
const db = new Database(dbPath);

console.log('\n========================================');
console.log('CORRIGIENDO DATOS DE VISITAS COMEDOR Y LOCKERS (PLANTILLAS 11 Y 12)');
console.log('========================================\n');

const visitas = db.prepare('SELECT id, plantilla_id, datos_formulario, campos_personalizados FROM visitas WHERE plantilla_id IN (11, 12)').all();
console.log(`Encontradas ${visitas.length} visitas para analizar.`);

let totalFixed = 0;

visitas.forEach(v => {
  let data;
  try {
    data = JSON.parse(v.campos_personalizados || v.datos_formulario || '{}');
  } catch (e) {
    try {
      data = JSON.parse(v.datos_formulario || '{}');
    } catch (e2) {
      console.log(`Visita ID: ${v.id} - No se pudo parsear datos.`);
      return;
    }
  }
  
  let changed = false;
  let changesCount = 0;
  
  // Paso 1: Convertir 1-5 a SI/NO
  Object.keys(data).forEach(key => {
    const val = String(data[key] || '').trim();
    if (['1', '2', '3', '4', '5'].includes(val)) {
      const newVal = parseInt(val) >= 3 ? 'SI' : 'NO';
      data[key] = newVal;
      changed = true;
      changesCount++;
    }
  });

  // Paso 2: Sincronizar keys con el sufijo __SATISFACTORIO
  Object.keys(data).forEach(key => {
    if (key.includes('__obs') || key.includes('__SATISFACTORIO') || key.includes('__NA__') || key.includes('__OBSERVACIONES')) return;
    
    const val = data[key];
    if (val === 'SI' || val === 'NO' || val === 'NA') {
      const satKey = key + '__SATISFACTORIO';
      if (data[satKey] !== val) {
        data[satKey] = val;
        changed = true;
      }
    }
  });
  
  if (changed) {
    totalFixed++;
    console.log(`Visita ID: ${v.id} (Plantilla: ${v.plantilla_id}) -> Corregida (${changesCount} respuestas convertidas)`);
    
    const jsonStr = JSON.stringify(data);
    if (v.campos_personalizados) {
      db.prepare('UPDATE visitas SET campos_personalizados = ? WHERE id = ?').run(jsonStr, v.id);
    }
    db.prepare('UPDATE visitas SET datos_formulario = ? WHERE id = ?').run(jsonStr, v.id);
  }
});

console.log('\n========================================');
console.log(`RESUMEN: ${totalFixed} visitas actualizadas correctamente en la base de datos.`);
console.log('========================================\n');

db.close();
