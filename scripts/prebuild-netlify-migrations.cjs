const { createHash } = require('node:crypto');
const { readFileSync, readdirSync } = require('node:fs');
const { join } = require('node:path');

const migrationsDir = join(__dirname, '..', 'netlify', 'database', 'migrations');
const compatibilityMigrations = new Set(['0004_custom_roles_permissions.sql', '0009_completion_review_status.sql', '0009_quote_payment_completion_controls.sql', '0009_worker_completion_evidence.sql', '0010_invoices_payments.sql', '0010_worker_job_details.sql', '0011_admin_activity_permission.sql', '0011_completion_review_status.sql', '0012_quote_payment_completion_controls.sql', '0013_invoices_payments.sql', '0014_worker_completion_evidence.sql']);
const appliedMigrationSha256 = new Map([
  ['0004_work_order_schedule.sql', 'c0583dd2a53b96ea6db8898cd9bf805c9c013350add30b57592b958e109af9d1'],
  ['0031_ai_intelligence_engine.sql', 'de4a761c15f9b3076684e0af10bfa29b84476881567a7cbc4410dd6eda2b591b'],
  ['0036_company_admin_settings.sql', 'f58dc19c08d718e27ae92059ad23979fce34bf2bed08ac6e5c1c6903d2b54590'],
  ['0040_supplier_price_research_metadata.sql', '25be759a97b49ff4c9694a6c6f67eaeea57c392c82acba093440483645c86288'],
  ['0048_homepage_editor_driven_config.sql', '6bb558a074fb0ffb2c19525c3838464816f1818c367150177e22853e701d4d5b'],
]);

const files = readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();
const prefixes = new Map();
const errors = [];
const migrationNumbers = [];

for (const file of files) {
  const match = file.match(/^(\d{4})_.+\.sql$/);
  if (!match) {
    errors.push(`${file} must start with a four-digit migration number.`);
    continue;
  }

  const prefix = match[1];
  migrationNumbers.push(Number(prefix));
  prefixes.set(prefix, [...(prefixes.get(prefix) || []), file]);
}

const nextAvailableMigrationNumber = String(Math.max(0, ...migrationNumbers) + 1).padStart(4, '0');

for (const [file, expectedSha256] of appliedMigrationSha256) {
  if (!files.includes(file)) {
    errors.push(`${file} must remain committed because Netlify Database has already applied it.`);
    continue;
  }

  const actualSha256 = createHash('sha256')
    .update(readFileSync(join(migrationsDir, file)))
    .digest('hex');

  if (actualSha256 !== expectedSha256) {
    errors.push(`${file} checksum changed after it was applied (${actualSha256}); expected ${expectedSha256}. Netlify Database already applied this migration; restore the applied file and add schema changes in a later migration.`);
  }
}

for (const [prefix, names] of prefixes) {
  if (names.length <= 1) continue;
  const nonCompatibilityNames = names.filter((name) => !compatibilityMigrations.has(name));
  if (nonCompatibilityNames.length > 1) {
    errors.push([
      `Duplicate migration number ${prefix}:`,
      ...names,
      `Recommended next available migration number: ${nextAvailableMigrationNumber}`,
    ].join('\n'));
  }
}

if (errors.length > 0) {
  console.error('Netlify Database migration validation failed:');
  for (const error of errors) console.error(error);
  process.exit(1);
}

console.log(`Netlify Database migrations verified: ${files.join(', ')}`);
console.log('Applied migration checksums verified.');
