import { readdir, unlink } from 'node:fs/promises';

const MIGRATIONS_DIR = new URL('../netlify/database/migrations/', import.meta.url);
const MIGRATION_PREFIX_PATTERN = /^(\d{4})_.+\.sql$/;
const LEGACY_CUSTOM_ROLE_MIGRATION = '0004_custom_roles_permissions.sql';
const CURRENT_CUSTOM_ROLE_MIGRATION = '0005_custom_roles_permissions.sql';
const LEGACY_ADMIN_ACTIVITY_MIGRATION = '0011_admin_activity_permission.sql';
const CURRENT_ADMIN_ACTIVITY_MIGRATION = '0015_admin_activity_permission.sql';

// Keep these compatibility guards defined so older/conflicted PR diffs that still
// reference them cannot crash prebuild with a ReferenceError before validation runs.
const REQUIRED_APPLIED_MIGRATIONS = new Set();
const RENAMED_APPLIED_MIGRATIONS = new Set();

const listMigrationFiles = async () => (await readdir(MIGRATIONS_DIR))
  .filter((file) => file.endsWith('.sql'))
  .sort();

const removeLegacyMigration = async ({ files, legacyMigration, currentMigration, label }) => {
  if (!files.includes(legacyMigration)) {
    return { files, warnings: [] };
  }

  if (!files.includes(currentMigration)) {
    return {
      files,
      warnings: [`${legacyMigration} exists but ${currentMigration} is missing; not removing the only ${label} migration.`],
    };
  }

  await unlink(new URL(legacyMigration, MIGRATIONS_DIR));

  return {
    files: files.filter((file) => file !== legacyMigration),
    warnings: [`Removed stale cached ${legacyMigration}; ${label} now lives in ${currentMigration}.`],
  };
};

const removeLegacyCustomRoleMigration = async (files) => removeLegacyMigration({
  files,
  legacyMigration: LEGACY_CUSTOM_ROLE_MIGRATION,
  currentMigration: CURRENT_CUSTOM_ROLE_MIGRATION,
  label: 'custom role permissions',
});

const removeLegacyAdminActivityMigration = async (files) => removeLegacyMigration({
  files,
  legacyMigration: LEGACY_ADMIN_ACTIVITY_MIGRATION,
  currentMigration: CURRENT_ADMIN_ACTIVITY_MIGRATION,
  label: 'admin activity permission',
});

export const validateMigrationFiles = async ({ repairLegacy = false } = {}) => {
  let files = await listMigrationFiles();
  const warnings = [];

  if (repairLegacy) {
    for (const repair of [removeLegacyCustomRoleMigration, removeLegacyAdminActivityMigration]) {
      const repaired = await repair(files);
      files = repaired.files;
      warnings.push(...repaired.warnings);
    }
  }

  const prefixes = new Map();
  const errors = [];

  if (files.includes(LEGACY_CUSTOM_ROLE_MIGRATION)) {
    errors.push(`${LEGACY_CUSTOM_ROLE_MIGRATION} must not exist; custom role permissions now live in ${CURRENT_CUSTOM_ROLE_MIGRATION}.`);
  }

  if (files.includes(LEGACY_ADMIN_ACTIVITY_MIGRATION)) {
    errors.push(`${LEGACY_ADMIN_ACTIVITY_MIGRATION} must not exist; admin activity permission now lives in ${CURRENT_ADMIN_ACTIVITY_MIGRATION}.`);
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
