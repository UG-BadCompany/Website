import { readdir, unlink } from 'node:fs/promises';

const MIGRATIONS_DIR = new URL('../netlify/database/migrations/', import.meta.url);
const MIGRATION_PREFIX_PATTERN = /^(\d{4})_.+\.sql$/;
const LEGACY_CUSTOM_ROLE_MIGRATION = '0004_custom_roles_permissions.sql';
const CURRENT_CUSTOM_ROLE_MIGRATION = '0005_custom_roles_permissions.sql';

// Keep these compatibility guards defined so older/conflicted PR diffs that still
// reference them cannot crash prebuild with a ReferenceError before validation runs.
const REQUIRED_APPLIED_MIGRATIONS = new Set();
const RENAMED_APPLIED_MIGRATIONS = new Set();

const listMigrationFiles = async () => (await readdir(MIGRATIONS_DIR))
  .filter((file) => file.endsWith('.sql'))
  .sort();

const removeLegacyCustomRoleMigration = async (files) => {
  if (!files.includes(LEGACY_CUSTOM_ROLE_MIGRATION)) {
    return { files, warnings: [] };
  }

  if (!files.includes(CURRENT_CUSTOM_ROLE_MIGRATION)) {
    return {
      files,
      warnings: [`${LEGACY_CUSTOM_ROLE_MIGRATION} exists but ${CURRENT_CUSTOM_ROLE_MIGRATION} is missing; not removing the only custom role migration.`],
    };
  }

  await unlink(new URL(LEGACY_CUSTOM_ROLE_MIGRATION, MIGRATIONS_DIR));

  return {
    files: files.filter((file) => file !== LEGACY_CUSTOM_ROLE_MIGRATION),
    warnings: [`Removed stale cached ${LEGACY_CUSTOM_ROLE_MIGRATION}; custom role permissions now live in ${CURRENT_CUSTOM_ROLE_MIGRATION}.`],
  };
};

export const validateMigrationFiles = async ({ repairLegacy = false } = {}) => {
  let files = await listMigrationFiles();
  const warnings = [];

  if (repairLegacy) {
    const repaired = await removeLegacyCustomRoleMigration(files);
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
