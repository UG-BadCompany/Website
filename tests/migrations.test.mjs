import assert from 'node:assert/strict';
import test from 'node:test';
import { rm, stat, writeFile } from 'node:fs/promises';
import { validateMigrationFiles } from '../scripts/check-netlify-migrations.mjs';

test('Netlify Database migrations use unique numeric prefixes', async () => {
  const { errors } = await validateMigrationFiles();

  assert.deepEqual(errors, [], 'Migration files must pass Netlify Database validation.');
});


test('migration validator rejects renamed copies of applied migrations', async () => {
  const migrationsDir = new URL('../netlify/database/migrations/', import.meta.url);
  const renamedMigration = new URL('0011_completion_review_status.sql', migrationsDir);

  await writeFile(renamedMigration, `-- renamed copy of an applied migration created by test\n`);

  try {
    const { errors } = await validateMigrationFiles();

    assert.equal(
      errors.some((error) => error.includes('0011_completion_review_status.sql must not exist')),
      true,
      'Validator should reject renamed copies of migrations Netlify already applied under the original name.',
    );
  } finally {
    await rm(renamedMigration, { force: true });
  }
});


test('migration repair restores renamed applied migrations before build validation', async () => {
  const migrationsDir = new URL('../netlify/database/migrations/', import.meta.url);
  const renamedMigration = new URL('0011_completion_review_status.sql', migrationsDir);

  await writeFile(renamedMigration, `-- renamed copy of an applied migration created by test\n`);

  try {
    const { errors } = await validateMigrationFiles();

    assert.deepEqual(errors, [], 'Repair mode should remove renamed copies when the applied migration name is already present.');
    assert.equal(files.includes('0009_completion_review_status.sql'), true);
    assert.equal(files.includes('0011_completion_review_status.sql'), false);
    assert.equal(
      warnings.some((warning) => warning.includes('Removed renamed copy 0011_completion_review_status.sql')),
      true,
    );
    await assert.rejects(stat(renamedMigration), { code: 'ENOENT' });
  } finally {
    await rm(renamedMigration, { force: true });
  }
});


test('migration repair renames applied migrations back when only the renamed copy exists', async () => {
  const migrationsDir = new URL('../netlify/database/migrations/', import.meta.url);
  const appliedMigration = new URL('0009_completion_review_status.sql', migrationsDir);
  const renamedMigration = new URL('0011_completion_review_status.sql', migrationsDir);
  const originalBody = await readFile(appliedMigration, 'utf8');

  await rm(renamedMigration, { force: true });
  await rename(appliedMigration, renamedMigration);

  try {
    const { errors, files, warnings } = await validateMigrationFiles({ repairLegacy: true });

    assert.deepEqual(errors, [], 'Repair mode should restore the Netlify-applied filename before build validation.');
    assert.equal(files.includes('0009_completion_review_status.sql'), true);
    assert.equal(files.includes('0011_completion_review_status.sql'), false);
    assert.equal(await readFile(appliedMigration, 'utf8'), originalBody);
    assert.equal(
      warnings.some((warning) => warning.includes('Restored 0009_completion_review_status.sql from renamed 0011_completion_review_status.sql')),
      true,
    );
    await assert.rejects(stat(renamedMigration), { code: 'ENOENT' });
  } finally {
    await rm(renamedMigration, { force: true });
    await writeFile(appliedMigration, originalBody);
  }
});
