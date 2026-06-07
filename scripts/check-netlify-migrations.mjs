import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';

const migrationsDir = new URL('../netlify/database/migrations/', import.meta.url);
const compatibilityMigrations = new Set(['0004_custom_roles_permissions.sql', '0009_completion_review_status.sql', '0009_quote_payment_completion_controls.sql', '0009_worker_completion_evidence.sql', '0010_invoices_payments.sql', '0010_worker_job_details.sql', '0011_completion_review_status.sql', '0012_quote_payment_completion_controls.sql', '0013_invoices_payments.sql', '0014_worker_completion_evidence.sql']);
const appliedMigrationSha256 = new Map([
  ['0004_work_order_schedule.sql', 'c0583dd2a53b96ea6db8898cd9bf805c9c013350add30b57592b958e109af9d1'],
  ['0031_ai_intelligence_engine.sql', 'de4a761c15f9b3076684e0af10bfa29b84476881567a7cbc4410dd6eda2b591b'],
  ['0036_company_admin_settings.sql', 'f58dc19c08d718e27ae92059ad23979fce34bf2bed08ac6e5c1c6903d2b54590'],
  ['0040_supplier_price_research_metadata.sql', '25be759a97b49ff4c9694a6c6f67eaeea57c392c82acba093440483645c86288'],
  ['0048_homepage_editor_driven_config.sql', '6bb558a074fb0ffb2c19525c3838464816f1818c367150177e22853e701d4d5b'],
]);

const sha256File = async (file) => createHash('sha256')
  .update(await readFile(new URL(file, migrationsDir)))
  .digest('hex');

const listMigrationFiles = async () => {
  const files = [];
  for (const entry of await readdir(migrationsDir)) {
    if (entry.endsWith('.sql')) files.push(entry);
  }
  return files.sort();
};

export const validateMigrationFiles = async () => {
  const files = await listMigrationFiles();
  const warnings = [];
  const errors = [];
  const prefixes = new Map();

  for (const file of files) {
    if (compatibilityMigrations.has(file)) {
      warnings.push(`Kept applied compatibility migration ${file}; Netlify Database requires applied migration names to remain present.`);
    }

    const match = file.match(/^(\d{4})_.+\.sql$/);
    if (!match) {
      errors.push(`${file} must start with a four-digit migration number.`);
      continue;
    }

    const prefix = match[1];
    prefixes.set(prefix, [...(prefixes.get(prefix) || []), file]);
  }

  for (const [prefix, names] of prefixes) {
    if (names.length < 2) continue;
    const nonCompatibilityNames = names.filter((name) => !compatibilityMigrations.has(name));
    if (nonCompatibilityNames.length > 1) {
      errors.push(`Duplicate migration number ${prefix}: ${names.join(', ')}`);
    }
  }

  for (const [file, expectedSha256] of appliedMigrationSha256) {
    if (!files.includes(file)) {
      errors.push(`${file} must remain committed because Netlify Database has already applied it.`);
      continue;
    }

    const actualSha256 = await sha256File(file);
    if (actualSha256 !== expectedSha256) {
      errors.push(`${file} checksum changed after it was applied (${actualSha256}); expected ${expectedSha256}. Netlify Database already applied this migration; restore the applied file and add schema changes in a later migration.`);
    }
  }

  return { files, errors, warnings };
};

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  const result = await validateMigrationFiles();
  for (const warning of result.warnings) console.warn(`Warning: ${warning}`);
  if (result.errors.length > 0) {
    console.error('Netlify Database migration validation failed:');
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`Netlify Database migrations verified: ${result.files.join(', ')}`);
  console.log('Applied migration checksums verified.');
}
