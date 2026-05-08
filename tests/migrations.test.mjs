import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { rm, stat, writeFile } from 'node:fs/promises';
import { validateMigrationFiles } from '../scripts/check-netlify-migrations.mjs';

const execFileAsync = promisify(execFile);

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


test('migration prebuild script runs without undefined migration guard references', async () => {
  const { stdout } = await execFileAsync(process.execPath, ['scripts/check-netlify-migrations.mjs']);

  assert.match(stdout, /Netlify Database migrations verified:/);
});
