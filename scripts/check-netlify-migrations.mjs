import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';

const migrationsDir = new URL('../netlify/database/migrations/', import.meta.url);
const compatibilityMigrations = new Set(['0004_custom_roles_permissions.sql', '0009_completion_review_status.sql', '0009_quote_payment_completion_controls.sql', '0009_worker_completion_evidence.sql', '0010_invoices_payments.sql', '0010_worker_job_details.sql', '0011_completion_review_status.sql', '0012_quote_payment_completion_controls.sql', '0013_invoices_payments.sql', '0014_worker_completion_evidence.sql']);
const lockedScheduleSha256 = 'c0583dd2a53b96ea6db8898cd9bf805c9c013350add30b57592b958e109af9d1';

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

  const scheduleMigration = '0004_work_order_schedule.sql';
  if (!files.includes(scheduleMigration)) {
    errors.push(`${scheduleMigration} must remain committed because Netlify Database has already applied it.`);
  } else {
    const actualSha256 = await sha256File(scheduleMigration);
    if (actualSha256 !== lockedScheduleSha256) {
      errors.push(`${scheduleMigration} checksum changed after it was applied (${actualSha256}); expected ${lockedScheduleSha256}. Netlify Database already applied this migration; edit only by pulling the applied file or adding a later migration.`);
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
}
