import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';

const MIGRATIONS_DIR = new URL('../netlify/database/migrations/', import.meta.url);
const MIGRATION_PREFIX_PATTERN = /^(\d{4})_.+\.sql$/;

// Netlify Database validates applied migrations by name. These files must stay
// committed even when their schema changes were later moved, consolidated, or
// reintroduced under another migration name.
const APPLIED_COMPATIBILITY_MIGRATIONS = new Set([
  '0004_custom_roles_permissions.sql',
  '0009_completion_review_status.sql',
  '0009_quote_payment_completion_controls.sql',
  '0009_worker_completion_evidence.sql',
  '0010_invoices_payments.sql',
  '0010_worker_job_details.sql',
  '0011_admin_activity_permission.sql',
  '0011_completion_review_status.sql',
  '0012_quote_payment_completion_controls.sql',
  '0013_invoices_payments.sql',
  '0014_worker_completion_evidence.sql',
]);

const APPLIED_MIGRATION_LOCKS = new Map([
  [
    '0004_work_order_schedule.sql',
    {
      sha256: 'c0583dd2a53b96ea6db8898cd9bf805c9c013350add30b57592b958e109af9d1',
      reason: 'Netlify Database already applied this migration; edit only by pulling the applied file or adding a later migration.',
    },
  ],
]);

const listMigrationFiles = async () => (await readdir(MIGRATIONS_DIR))
  .filter((file) => file.endsWith('.sql'))
  .sort();

const sha256File = async (file) => createHash('sha256')
  .update(await readFile(new URL(file, MIGRATIONS_DIR)))
  .digest('hex');

export const validateMigrationFiles = async () => {
  const files = await listMigrationFiles();
  const warnings = [];
  const prefixes = new Map();
  const errors = [];

  files
    .filter((file) => APPLIED_COMPATIBILITY_MIGRATIONS.has(file))
    .forEach((file) => {
      warnings.push(`Kept applied compatibility migration ${file}; Netlify Database requires applied migration names to remain present.`);
    });

  files.forEach((file) => {
    const match = file.match(MIGRATION_PREFIX_PATTERN);

    if (!match) {
      errors.push(`${file} must start with a four-digit migration number.`);
      return;
    }

    const [, prefix] = match;
    const existing = prefixes.get(prefix) || [];
    existing.push(file);
    prefixes.set(prefix, existing);
  });

  [...prefixes.entries()]
    .filter(([, names]) => names.length > 1)
    .forEach(([prefix, names]) => {
      const nonCompatibilityNames = names.filter((name) => !APPLIED_COMPATIBILITY_MIGRATIONS.has(name));

      if (nonCompatibilityNames.length > 1) {
        errors.push(`Duplicate migration number ${prefix}: ${names.join(', ')}`);
      }
    });

  return { files, errors, warnings };
};

const isDirectRun = process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href;

if (isDirectRun) {
  const { files, errors, warnings } = await validateMigrationFiles();

  warnings.forEach((warning) => console.warn(`Warning: ${warning}`));

  if (errors.length > 0) {
    console.error('Netlify Database migration validation failed:');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log(`Netlify Database migrations verified: ${files.join(', ')}`);
}
