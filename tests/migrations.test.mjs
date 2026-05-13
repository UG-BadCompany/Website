import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { validateMigrationFiles } from '../scripts/check-netlify-migrations.mjs';

test('Netlify Database migrations allow applied compatibility names to remain committed', async () => {
  const { errors, files } = await validateMigrationFiles();

  assert.deepEqual(errors, [], 'Migration files must pass Netlify Database validation.');
  assert.equal(files.includes('0004_work_order_schedule.sql'), true, 'Previously applied Netlify migration 0004_work_order_schedule must remain present.');
  assert.equal(files.includes('0011_completion_review_status.sql'), true, 'Previously applied Netlify migration 0011_completion_review_status must remain present.');
  assert.equal(files.includes('0012_quote_payment_completion_controls.sql'), true, 'Previously applied Netlify migration 0012_quote_payment_completion_controls must remain present.');
  assert.equal(files.includes('0013_invoices_payments.sql'), true, 'Previously applied Netlify migration 0013_invoices_payments must remain present.');
  assert.equal(files.includes('0014_worker_completion_evidence.sql'), true, 'Previously applied Netlify migration 0014_worker_completion_evidence must remain present.');
});


test('migration validator warns instead of removing applied compatibility migrations', async () => {
  const { errors, files, warnings } = await validateMigrationFiles();

  assert.deepEqual(errors, [], 'Applied compatibility migrations should not fail validation.');
  assert.equal(files.includes('0011_admin_activity_permission.sql'), true);
  assert.equal(files.includes('0011_completion_review_status.sql'), true);
  assert.equal(warnings.some((warning) => warning.includes('Kept applied compatibility migration 0011_completion_review_status.sql')), true);
  assert.equal(warnings.every((warning) => !warning.includes('Removed stale cached')), true);
});


test('migration validator keeps the applied 0004 work order schedule migration', async () => {
  const { errors, files, warnings } = await validateMigrationFiles();

  assert.deepEqual(errors, [], 'Validation should keep the applied work-order schedule migration valid.');
  assert.equal(files.includes('0004_work_order_schedule.sql'), true);
  assert.equal(warnings.some((warning) => warning.includes('0004_work_order_schedule.sql')), false);
});

test('migration repair removes stale names even when a cached checkout lacks the replacement file', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'ta-migrations-'));
  const migrationsDir = pathToFileURL(`${tempDir}/`);
  const staleMigration = '0012_quote_payment_completion_controls.sql';

  await writeFile(new URL(staleMigration, migrationsDir), '-- stale cached deploy migration without replacement in checkout\n');

  try {
    const { errors, files, warnings } = await validateMigrationFiles({ repairLegacy: true, migrationsDir });

    assert.deepEqual(errors, [], 'Repair mode should not fail when a cached checkout only contains the obsolete name.');
    assert.equal(files.includes(staleMigration), false);
    assert.equal(warnings.some((warning) => warning.includes('was not present in this deploy checkout')), true);
    await assert.rejects(stat(new URL(staleMigration, migrationsDir)), { code: 'ENOENT' });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});


test('migration prebuild script runs without undefined migration guard references', async () => {
  const { stdout } = await execFileAsync(process.execPath, ['scripts/check-netlify-migrations.mjs']);

  assert.match(stdout, /Netlify Database migrations verified:/);
});
