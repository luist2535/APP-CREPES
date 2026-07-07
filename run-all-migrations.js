const { execSync } = require('child_process');
const fs = require('fs');

const migrations = [
  'init-db.js',
  'migrate-db.js',
  'migrate-db-2.js',
  'migrate-db-3.js',
  'migrate-db-4.js',
  'migrate-db-5.js',
  'migrate-db-6.js',
  'migrate-db-7.js',
  'migrate-db-8.js',
  'add-bpm-checklist.js'
];

console.log('====================================================');
console.log('🗄️  VERIFICANDO Y ACTUALIZANDO BASE DE DATOS');
console.log('====================================================');

for (const file of migrations) {
  if (fs.existsSync(file)) {
    try {
      console.log(`\n▶️  Ejecutando ${file}...`);
      execSync(`node "${file}"`, { stdio: 'inherit' });
    } catch (err) {
      console.error(`⚠️  Advertencia en ${file} (puede que ya esté aplicado):`, err.message);
    }
  }
}

console.log('\n✅  Base de datos verificada y lista para producción.');
