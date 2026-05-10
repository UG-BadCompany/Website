import { readdir, unlink } from 'node:fs/promises';

const MIGRATIONS_DIR = new URL('../netlify/database/migrations/', import.meta.url);
const MIGRATION_PREFIX_PATTERN = /^(\d{4})_.+\.sql$/;
const LEGACY_MIGRATIONS = [
  {
    legacyMigration: '0004_custom_roles_permissions.sql',
    currentMigration: '0005_custom_roles_permissions.sql',
    label: 'custom role permissions',
  },
  {
    legacyMigration: '0011_admin_activity_permission.sql',
    currentMigration: '0015_admin_activity_permission.sql',
    label: 'admin activity permission',
  },
  {
    legacyMigration: '0011_completion_review_status.sql',
    currentMigration: '0009_completion_review_status.sql',
    label: 'completion review status',
  },
  {
    legacyMigration: '0012_quote_payment_completion_controls.sql',
    currentMigration: '0010_invoices_payments.sql',
    label: 'quote payment completion controls',
  },
  {
    legacyMigration: '0013_invoices_payments.sql',
    currentMigration: '0010_invoices_payments.sql',
    label: 'invoice and payment tables',
  },
  {
    legacyMigration: '0014_worker_completion_evidence.sql',
    currentMigration: '0009_completion_review_status.sql',
    label: 'worker completion review status',
  },
];

// Keep these named constants defined for older/conflicted deploy diffs that may
// still reference the pre-table migration guard names during Netlify prebuild.
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

export const validateMigrationFiles = async ({ repairLegacy = false } = {}) => {
  let files = await listMigrationFiles();
  const warnings = [];

  if (repairLegacy) {
    for (const legacy of LEGACY_MIGRATIONS) {
      const repaired = await removeLegacyMigration({ files, ...legacy });
      files = repaired.files;
      warnings.push(...repaired.warnings);
    }
  }

  const prefixes = new Map();
  const errors = [];

  LEGACY_MIGRATIONS
    .filter(({ legacyMigration }) => files.includes(legacyMigration))
    .forEach(({ legacyMigration, currentMigration, label }) => {
      errors.push(`${legacyMigration} must not exist; ${label} now lives in ${currentMigration}.`);
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
