import { readdir } from 'node:fs/promises';

const MIGRATIONS_DIR = new URL('../netlify/database/migrations/', import.meta.url);
const MIGRATION_PREFIX_PATTERN = /^(\d{4})_.+\.sql$/;
const COMPATIBILITY_MIGRATIONS = [
  {
    compatibilityMigration: '0004_custom_roles_permissions.sql',
    currentMigration: '0005_custom_roles_permissions.sql',
    label: 'custom role permissions',
  },
  {
    compatibilityMigration: '0011_admin_activity_permission.sql',
    currentMigration: '0015_admin_activity_permission.sql',
    label: 'admin activity permission',
  },
  {
    compatibilityMigration: '0011_completion_review_status.sql',
    currentMigration: '0009_completion_review_status.sql',
    label: 'completion review status',
  },
  {
    compatibilityMigration: '0012_quote_payment_completion_controls.sql',
    currentMigration: '0010_invoices_payments.sql',
    label: 'quote payment completion controls',
  },
  {
    compatibilityMigration: '0013_invoices_payments.sql',
    currentMigration: '0010_invoices_payments.sql',
    label: 'invoice and payment tables',
  },
  {
    compatibilityMigration: '0014_worker_completion_evidence.sql',
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

const listMigrationFiles = async (migrationsDir = MIGRATIONS_DIR) => (await readdir(migrationsDir))
  .filter((file) => file.endsWith('.sql'))
  .sort();

const COMPATIBILITY_MIGRATION_NAMES = new Set(
  COMPATIBILITY_MIGRATIONS.map(({ compatibilityMigration }) => compatibilityMigration),
);

const retainCompatibilityMigration = ({ files, compatibilityMigration, currentMigration, label }) => {
  if (!files.includes(compatibilityMigration)) {
    return { files, warnings: [] };
  }

  return {
    files,
    warnings: [files.includes(currentMigration)
      ? `Kept compatibility migration ${compatibilityMigration}; ${label} now lives in ${currentMigration}, but Netlify requires applied migration files to remain present.`
      : `Kept compatibility migration ${compatibilityMigration}; ${currentMigration} was not present in this deploy checkout, and Netlify requires applied migration files to remain present.`],
  };
};

export const validateMigrationFiles = async ({ repairLegacy = false, migrationsDir = MIGRATIONS_DIR } = {}) => {
  let files = await listMigrationFiles(migrationsDir);
  const warnings = [];

  if (repairLegacy) {
    for (const compatibility of COMPATIBILITY_MIGRATIONS) {
      const retained = retainCompatibilityMigration({ files, ...compatibility });
      files = retained.files;
      warnings.push(...retained.warnings);
    }
  }

  const prefixes = new Map();
  const errors = [];

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
      const nonCompatibilityNames = names.filter((name) => !COMPATIBILITY_MIGRATION_NAMES.has(name));
      if (nonCompatibilityNames.length > 1) {
        errors.push(`Duplicate migration number ${prefix}: ${names.join(', ')}`);
      }
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
