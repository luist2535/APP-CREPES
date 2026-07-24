const db = require('../src/lib/db').getDb();
const bcrypt = require('bcryptjs');

const email = 'qa_admin@crepes.com';
const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

if (!user) {
  const hash = bcrypt.hashSync('QaAdmin123!', 10);
  db.prepare(`INSERT INTO users (nombre, email, password_hash, rol_id, activo, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`).run(
    'QA Administrator', email, hash, 1, 1
  );
  console.log('Usuario QA creado exitosamente: qa_admin@crepes.com / QaAdmin123!');
} else {
  console.log('El usuario QA ya existe.');
}
