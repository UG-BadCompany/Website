import { readdir, unlink } from 'node:fs/promises';

const MIGRATIONS_DIR = new URL('../netlify/database/migrations/', import.meta.url);
const MIGRATION_PREFIX_PATTERN = /^(\d{4})_.+\.sql$/;
const LEGACY_CUSTOM_ROLE_MIGRATION = '0004_custom_roles_permissions.sql';
const CURRENT_CUSTOM_ROLE_MIGRATION = '0005_custom_roles_permissions.sql';
const STALE_CACHED_MIGRATIONS = new Set([
  LEGACY_CUSTOM_ROLE_MIGRATION,
  '0009_completion_review_status.sql',
  '0009_quote_payment_completion_controls.sql',
  '0010_invoices_payments.sql',
]);

const listMigrationFiles = async () => (await readdir(MIGRATIONS_DIR))
  .filter((file) => file.endsWith('.sql'))
  .sort();

const removeStaleCachedMigrations = async (files) => {
  const warnings = [];
  let repairedFiles = [...files];

  for (const staleMigration of STALE_CACHED_MIGRATIONS) {
    if (!repairedFiles.includes(staleMigration)) {
      continue;
    }

    if (staleMigration === LEGACY_CUSTOM_ROLE_MIGRATION && !repairedFiles.includes(CURRENT_CUSTOM_ROLE_MIGRATION)) {
      warnings.push(`${LEGACY_CUSTOM_ROLE_MIGRATION} exists but ${CURRENT_CUSTOM_ROLE_MIGRATION} is missing; not removing the only custom role migration.`);
      continue;
    }

    await unlink(new URL(staleMigration, MIGRATIONS_DIR));
    repairedFiles = repairedFiles.filter((file) => file !== staleMigration);
    warnings.push(`Removed stale cached ${staleMigration}.`);
  }

  return { files: repairedFiles, warnings };
};

export const validateMigrationFiles = async ({ repairLegacy = false } = {}) => {
  let files = await listMigrationFiles();
  const warnings = [];

  if (repairLegacy) {
    const repaired = await removeStaleCachedMigrations(files);
    files = repaired.files;
    warnings.push(...repaired.warnings);
  }

  const prefixes = new Map();
  const errors = [];

  if (files.includes(LEGACY_CUSTOM_ROLE_MIGRATION)) {
    errors.push(`${LEGACY_CUSTOM_ROLE_MIGRATION} must not exist; custom role permissions now live in ${CURRENT_CUSTOM_ROLE_MIGRATION}.`);
  }

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
      errors.push(`Duplicate migration number ${prefix}: ${names.join(', ')}`);
    });

  return { files, errors, warnings };
};

const isDirectRun = process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href;

if (isDirectRun) {
  const { files, errors, warnings } = await validateMigrationFiles({ repairLegacy: true });

  warnings.forEach((warning) => console.warn(`Warning: ${warning}`));

  if (errors.length > 0) {
    console.error('Netlify Database migration validation failed:');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log(`Netlify Database migrations verified: ${files.join(', ')}`);
}
