import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';

const migrationsDir = new URL('../netlify/database/migrations/', import.meta.url);
const migrationPrefixPattern = /^(\d{4})_.+\.sql$/;

const appliedCompatibilityMigrations = new Set([
  '0004_custom_roles_permissions.sql',
  '0009_completion_review_status.sql',
  '0009_quote_payment_completion_controls.sql',
  '0009_worker_completion_evidence.sql',
  '0010_invoices_payments.sql',
  '0010_worker_job_details.sql',
  '0011_completion_review_status.sql',
  '0012_quote_payment_completion_controls.sql',
  '0013_invoices_payments.sql',
  '0014_worker_completion_evidence.sql',
]);

const appliedMigrationLocks = [
  {
    file: '0004_work_order_schedule.sql',
    sha256: 'c0583dd2a53b96ea6db8898cd9bf805c9c013350add30b57592b958e109af9d1',
    reason: 'Netlify Database already applied this migration; edit only by pulling the applied file or adding a later migration.',
  },
];

const listMigrationFiles = async () => {
  const entries = await readdir(migrationsDir);
  const files = [];

  for (const entry of entries) {
    if (entry.endsWith('.sql')) {
      files.push(entry);
    }
  }

  return files.sort();
};

const sha256File = async (file) => {
  const contents = await readFile(new URL(file, migrationsDir));
  return createHash('sha256').update(contents).digest('hex');
};

const pushPrefix = (prefixes, prefix, file) => {
  const names = prefixes.get(prefix) || [];
  names.push(file);
  prefixes.set(prefix, names);
};

export const validateMigrationFiles = async () => {
  const files = await listMigrationFiles();
  const warnings = [];
  const errors = [];
  const prefixes = new Map();

  for (const file of files) {
    if (appliedCompatibilityMigrations.has(file)) {
      warnings.push(`Kept applied compatibility migration ${file}; Netlify Database requires applied migration names to remain present.`);
    }

    const match = file.match(migrationPrefixPattern);

    if (!match) {
      errors.push(`${file} must start with a four-digit migration number.`);
      continue;
    }

    pushPrefix(prefixes, match[1], file);
  }

  for (const [prefix, names] of prefixes) {
    if (names.length < 2) {
      continue;
    }

    const nonCompatibilityNames = [];

    for (const name of names) {
      if (!appliedCompatibilityMigrations.has(name)) {
        nonCompatibilityNames.push(name);
      }
    }

    if (nonCompatibilityNames.length > 1) {
      errors.push(`Duplicate migration number ${prefix}: ${names.join(', ')}`);
    }
  }

  for (const lock of appliedMigrationLocks) {
    if (!files.includes(lock.file)) {
      errors.push(`${lock.file} must remain committed because Netlify Database has already applied it.`);
      continue;
    }

    const actualSha256 = await sha256File(lock.file);

    if (actualSha256 !== lock.sha256) {
      errors.push(`${lock.file} checksum changed after it was applied (${actualSha256}); expected ${lock.sha256}. ${lock.reason}`);
    }
  }

      if (nonCompatibilityNames.length > 1) {
        errors.push(`Duplicate migration number ${prefix}: ${names.join(', ')}`);
      }
    });

      if (nonCompatibilityNames.length > 1) {
        errors.push(`Duplicate migration number ${prefix}: ${names.join(', ')}`);
      }
    });

  return { files, errors, warnings };
};

const isDirectRun = process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href;

if (isDirectRun) {
  const result = await validateMigrationFiles();

  for (const warning of result.warnings) {
    console.warn(`Warning: ${warning}`);
  }

  if (result.errors.length > 0) {
    console.error('Netlify Database migration validation failed:');

    for (const error of result.errors) {
      console.error(`- ${error}`);
    }

    process.exit(1);
  }

  console.log(`Netlify Database migrations verified: ${result.files.join(', ')}`);
}
