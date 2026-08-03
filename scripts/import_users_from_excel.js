const Database = require('better-sqlite3');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '../database/crepes.db');
const db = new Database(dbPath);
const excelPath = 'c:/Users/p.tecbqa/Documents/App Crepes 2.0/correos (2).xlsx';

const wb = xlsx.readFile(excelPath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet);

const defaultPassword = bcrypt.hashSync('crepes123', 10);

let addedCount = 0;
let updatedCount = 0;
let rolesCreated = 0;

db.transaction(() => {
  for (const row of data) {
    const nombre = row.NOMBRE?.trim();
    const cargo = row.CARGO?.trim();
    const correo = row.CORREO?.trim().toLowerCase();

    if (!nombre || !cargo || !correo) continue;

    // 1. Find or create role based on CARGO
    let role = db.prepare('SELECT id FROM roles WHERE nombre = ? COLLATE NOCASE').get(cargo);
    let roleId;
    
    if (role) {
      roleId = role.id;
    } else {
      const insertRole = db.prepare('INSERT INTO roles (nombre, descripcion, permisos, activo) VALUES (?, ?, ?, 1)');
      // Use generic permissions for now
      const info = insertRole.run(cargo, `Rol importado: ${cargo}`, '{"visitas": true, "dashboard_area": true}');
      roleId = info.lastInsertRowid;
      rolesCreated++;
    }

    // 2. Insert or update user
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(correo);
    if (existingUser) {
      db.prepare('UPDATE users SET nombre = ?, rol_id = ? WHERE id = ?').run(nombre, roleId, existingUser.id);
      updatedCount++;
    } else {
      db.prepare('INSERT INTO users (nombre, email, password_hash, rol_id) VALUES (?, ?, ?, ?)').run(nombre, correo, defaultPassword, roleId);
      addedCount++;
    }
  }
})();

console.log(`Proceso finalizado:`);
console.log(`- Nuevos roles creados: ${rolesCreated}`);
console.log(`- Usuarios agregados: ${addedCount}`);
console.log(`- Usuarios actualizados: ${updatedCount}`);
