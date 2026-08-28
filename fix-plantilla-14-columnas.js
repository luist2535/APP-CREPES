/**
 * Migration: Fix plantilla id=14 (Verificación L&D Despachos)
 * 
 * This script updates the plantilla to include per-section columnas.
 * Section 0: CUARTO PRODUCTO TERMINADO, CARNES, POLLO, LACTEOS, CUARTO DE FRUVER, TRANSITO
 * Section 1: HELADOS, PULPAS, MARISCOS, CITRICOS, DESPACHOS, CANASTAS
 * 
 * Run: node fix-plantilla-14-columnas.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database', 'crepes.db');
const db = new Database(DB_PATH);

console.log('=== Fixing Plantilla 14: Adding per-section columnas ===\n');

const current = db.prepare('SELECT campos, version, historial_versiones FROM plantillas WHERE id = 14').get();
if (!current) {
  console.error('ERROR: Plantilla id=14 not found!');
  process.exit(1);
}

// Show current state
const currentCampos = JSON.parse(current.campos);
console.log('Current secciones:');
if (currentCampos[0] && currentCampos[0].secciones) {
  currentCampos[0].secciones.forEach((s, i) => {
    console.log(`  Sec ${i}: "${s.nombre}" - columnas: [${(s.columnas || []).join(', ')}] - filas: ${(s.filas || []).length}`);
  });
}

// The correct structure with per-section columnas
const correctedCampos = [{
  "tipo": "matrix",
  "code": "DCM-F-DPR-23",
  "columnas": [
    "CUARTO PRODUCTO TERMINADO",
    "CARNES",
    "POLLO",
    "LACTEOS",
    "CUARTO DE FRUVER",
    "TRANSITO"
  ],
  "secciones": [
    {
      "nombre": "CUARTOS FRÍOS",
      "columnas": [
        "CUARTO PRODUCTO TERMINADO",
        "CARNES",
        "POLLO",
        "LACTEOS",
        "CUARTO DE FRUVER",
        "TRANSITO"
      ],
      "filas": [
        "Puertas de acceso",
        "Paredes / polipanel",
        "Lamparas",
        "Techos (partes altas)",
        "Estibas plásticas",
        "Pisos",
        "Evaporadores",
        "Cortinas plásticas",
        "Canastas en orden"
      ]
    },
    {
      "nombre": "CUARTOS FRÍOS (Despachos)",
      "columnas": [
        "HELADOS",
        "PULPAS",
        "MARISCOS",
        "CITRICOS",
        "DESPACHOS",
        "CANASTAS"
      ],
      "filas": [
        "Puertas de acceso",
        "Paredes / Paredes polipanel",
        "Lamparas",
        "Ventanas",
        "Techos (partes altas)",
        "Canecas",
        "Atomizador",
        "Gel",
        "Estibas plásticas",
        "Pisos",
        "Evaporadores",
        "Cortinas plasticas",
        "Cortina de aire",
        "punto de Higiene",
        "Sifón",
        "Ventilador",
        "Tapa Enchufes/ interruptores",
        "Hidrolavadora",
        "Canastas en orden"
      ]
    }
  ]
}];

// Save backup in historial
let historial = [];
try {
  historial = JSON.parse(current.historial_versiones || '[]');
} catch (e) {
  historial = [];
}

historial.push({
  version: current.version || 1,
  fecha: new Date().toISOString(),
  usuario: 'Sistema (migración sec.columnas)',
  nombre: 'Verificación L&D Despachos',
  descripcion: '',
  campos: currentCampos,
  nota: 'Respaldo antes de agregar columnas por sección (HELADOS, PULPAS, etc.)'
});

const newVersion = (current.version || 1) + 1;

db.prepare('UPDATE plantillas SET campos = ?, version = ?, historial_versiones = ? WHERE id = 14')
  .run(JSON.stringify(correctedCampos), newVersion, JSON.stringify(historial));

// Verify
const updated = db.prepare('SELECT campos FROM plantillas WHERE id = 14').get();
const parsed = JSON.parse(updated.campos);
console.log('\n=== UPDATED ===');
console.log('New version:', newVersion);
parsed[0].secciones.forEach((s, i) => {
  console.log(`  Sec ${i}: "${s.nombre}" - columnas: [${(s.columnas || []).join(', ')}] - filas: ${s.filas.length}`);
});

db.close();
console.log('\n✅ Plantilla 14 updated successfully with per-section columnas!');
console.log('The server application should now show the correct tabs for each section.');
