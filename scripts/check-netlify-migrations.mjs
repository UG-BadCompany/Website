import { readdir } from 'node:fs/promises';

const MIGRATIONS_DIR = new URL('../netlify/database/migrations/', import.meta.url);
const MIGRATION_PREFIX_PATTERN = /^(\d{4})_.+\.sql$/;
const LEGACY_CUSTOM_ROLE_MIGRATION = '0004_custom_roles_permissions.sql';

export const validateMigrationFiles = async () => {
  const files = (await readdir(MIGRATIONS_DIR))
    .filter((file) => file.endsWith('.sql'))
    .sort();
  const prefixes = new Map();
  const errors = [];

  if (files.includes(LEGACY_CUSTOM_ROLE_MIGRATION)) {
    errors.push(`${LEGACY_CUSTOM_ROLE_MIGRATION} must not exist; custom role permissions now live in 0005_custom_roles_permissions.sql.`);
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

  return { files, errors };
};

const isDirectRun = process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href;

if (isDirectRun) {
  const { files, errors } = await validateMigrationFiles();

  if (errors.length > 0) {
    console.error('Netlify Database migration validation failed:');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log(`Netlify Database migrations verified: ${files.join(', ')}`);
}
