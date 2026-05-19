import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { validateMigrationFiles } from '../scripts/check-netlify-migrations.mjs';

const execFileAsync = promisify(execFile);

const migrationsDir = new URL('../netlify/database/migrations/', import.meta.url);
const lockedScheduleSha256 = 'c0583dd2a53b96ea6db8898cd9bf805c9c013350add30b57592b958e109af9d1';

test('Netlify Database migrations allow applied compatibility names to remain committed', async () => {
  const { errors, files } = await validateMigrationFiles();

  assert.deepEqual(errors, [], 'Migration files must pass Netlify Database validation.');
  assert.equal(files.includes('0004_work_order_schedule.sql'), true);
  assert.equal(files.includes('0011_completion_review_status.sql'), true);
  assert.equal(files.includes('0012_quote_payment_completion_controls.sql'), true);
  assert.equal(files.includes('0013_invoices_payments.sql'), true);
  assert.equal(files.includes('0014_worker_completion_evidence.sql'), true);
});

test('migration validator warns for applied compatibility migrations', async () => {
  const { errors, warnings } = await validateMigrationFiles();

  assert.deepEqual(errors, [], 'Applied compatibility migrations should not fail validation.');
  assert.equal(warnings.some((warning) => warning.includes('0011_completion_review_status.sql')), true);
  assert.equal(warnings.some((warning) => warning.includes('0012_quote_payment_completion_controls.sql')), true);
  assert.equal(warnings.some((warning) => warning.includes('0013_invoices_payments.sql')), true);
  assert.equal(warnings.some((warning) => warning.includes('0014_worker_completion_evidence.sql')), true);
});

test('applied 0004 schedule migration keeps locked checksum', async () => {
  const appliedSchedule = await readFile(new URL('0004_work_order_schedule.sql', migrationsDir));
  const checksum = createHash('sha256').update(appliedSchedule).digest('hex');

  assert.equal(checksum, lockedScheduleSha256);
});

test('applied compatibility migrations keep their original SQL bodies', async () => {
  const mirroredMigrations = [
    ['0006_job_request_schedule_dates.sql', '0004_work_order_schedule.sql'],
    ['0011_completion_review_status.sql', '0011_completion_review_status.sql'],
    ['0012_quote_payment_completion_controls.sql', '0012_quote_payment_completion_controls.sql'],
    ['0013_invoices_payments.sql', '0013_invoices_payments.sql'],
    ['0014_worker_completion_evidence.sql', '0014_worker_completion_evidence.sql'],
  ];

  for (const [source, compatibility] of mirroredMigrations) {
    const sourceSql = await readFile(new URL(source, migrationsDir), 'utf8');
    const compatibilitySql = await readFile(new URL(compatibility, migrationsDir), 'utf8');

    assert.equal(compatibilitySql, sourceSql, `${compatibility} must match the SQL that Netlify already applied.`);
  }
});

test('admin activity permission migration grants audit visibility to admins', async () => {
  const migration = await readFile(new URL('../netlify/database/migrations/0015_admin_activity_permission.sql', import.meta.url), 'utf8');

  assert.match(migration, /admin\.activity\.view/);
  assert.match(migration, /on conflict \(role_id, permission_key\) do update/);
});

test('migration validator script parses before Netlify prebuild runs it', async () => {
  await assert.doesNotReject(execFileAsync(process.execPath, ['--check', 'scripts/check-netlify-migrations.mjs']));
});

test('npm prebuild uses the CommonJS Netlify migration guard', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

  assert.equal(packageJson.scripts.prebuild, 'node scripts/prebuild-netlify-migrations.cjs');
  await assert.doesNotReject(execFileAsync(process.execPath, ['--check', 'scripts/prebuild-netlify-migrations.cjs']));
});

test('Netlify function syntax checker parses and passes current functions', async () => {
  await assert.doesNotReject(execFileAsync(process.execPath, ['--check', 'scripts/check-netlify-functions.mjs']));
  await assert.doesNotReject(execFileAsync(process.execPath, ['scripts/check-netlify-functions.mjs']));
});
