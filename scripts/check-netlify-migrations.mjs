import { createHash } from 'node:crypto';
import { readFile, readdir, unlink } from 'node:fs/promises';

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

  for (const [file, lock] of APPLIED_MIGRATION_LOCKS.entries()) {
    if (!files.includes(file)) {
      errors.push(`${file} must remain committed because Netlify Database has already applied it.`);
      continue;
    }

    const actualSha256 = await sha256File(file);

    if (actualSha256 !== lock.sha256) {
      errors.push(`${file} checksum changed after it was applied (${actualSha256}); expected ${lock.sha256}. ${lock.reason}`);
    }
  }

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
