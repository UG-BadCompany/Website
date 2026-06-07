const { readdirSync } = require('node:fs');
const { join } = require('node:path');

const migrationsDir = join(__dirname, '..', 'netlify', 'database', 'migrations');
const compatibilityMigrations = new Set(['0004_custom_roles_permissions.sql', '0009_completion_review_status.sql', '0009_quote_payment_completion_controls.sql', '0009_worker_completion_evidence.sql', '0010_invoices_payments.sql', '0010_worker_job_details.sql', '0011_admin_activity_permission.sql', '0011_completion_review_status.sql', '0012_quote_payment_completion_controls.sql', '0013_invoices_payments.sql', '0014_worker_completion_evidence.sql']);

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
