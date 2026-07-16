const db = require('better-sqlite3')('database/crepes.db');
try {
  db.exec(`ALTER TABLE mantenimientos ADD COLUMN checklist_tareas TEXT DEFAULT '[]'`);
  console.log('Success');
} catch (e) {
  if (e.message.includes('duplicate column name')) {
    console.log('Column already exists');
  } else {
    console.error(e);
  }
}
