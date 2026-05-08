import assert from 'node:assert/strict';
import test from 'node:test';
import { rm, stat, writeFile } from 'node:fs/promises';
import { validateMigrationFiles } from '../scripts/check-netlify-migrations.mjs';

test('Netlify Database migrations use unique numeric prefixes', async () => {
  const { errors } = await validateMigrationFiles();

  assert.deepEqual(errors, [], 'Migration files must pass Netlify Database validation.');
});


test('migration validator removes the stale cached custom role migration before build validation', async () => {
  const migrationsDir = new URL('../netlify/database/migrations/', import.meta.url);
  const staleMigration = new URL('0004_custom_roles_permissions.sql', migrationsDir);

  await writeFile(staleMigration, `-- stale cached duplicate migration created by test\n`);

  try {
    const { errors, files, warnings } = await validateMigrationFiles({ repairLegacy: true });

    assert.deepEqual(errors, [], 'Repair mode should remove the stale legacy custom role migration.');
    assert.equal(files.includes('0004_custom_roles_permissions.sql'), false);
    assert.equal(warnings.some((warning) => warning.includes('Removed stale cached 0004_custom_roles_permissions.sql')), true);
    await assert.rejects(stat(staleMigration), { code: 'ENOENT' });
  } finally {
    await rm(staleMigration, { force: true });
  }
});
