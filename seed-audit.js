const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database', 'crepes.db');
const db = new Database(DB_PATH);

console.log('🌱 Insertando datos semilla de prueba para auditoría...');

const stmt = db.prepare(`
  INSERT INTO audit_logs (usuario, rol, accion, modulo, descripcion, registro_afectado, ip, dispositivo)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const seedData = [
  ['Carlos Ruiz', 'Administrador', 'Login', 'Autenticación', 'Inicio de sesión exitoso desde portal web.', 'USR-045', '192.168.1.105', 'Chrome en Windows 11'],
  ['Ana Gómez', 'Jefe de Calidad', 'Aprobar', 'Visitas', 'Aprobó la visita técnica de control de calidad.', 'VST-891', '190.24.55.12', 'Safari en iPhone 14'],
  ['Luis Franco', 'Técnico', 'Subir Foto', 'Equipos', 'Subió evidencia fotográfica del mantenimiento de nevera.', 'EQP-203', '181.55.10.22', 'App Crepes Android'],
  ['Marta Ríos', 'Coordinador', 'Asignar', 'Solicitudes', 'Asignó el ticket de soporte a Luis Franco.', 'TCK-550', '190.14.33.201', 'Firefox en MacOS']
];

let inserted = 0;
for (const data of seedData) {
  stmt.run(...data);
  inserted++;
}

console.log("✅ Se insertaron " + inserted + " registros de prueba.");
db.close();
