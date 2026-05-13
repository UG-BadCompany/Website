import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { validateMigrationFiles } from '../scripts/check-netlify-migrations.mjs';

const execFileAsync = promisify(execFile);

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
  assert.equal(files.includes('0011_admin_activity_permission.sql'), false, 'Do not commit two 0011 migrations; admin activity permission lives in 0015.');
  assert.equal(files.includes('0011_completion_review_status.sql'), true);
  assert.equal(warnings.some((warning) => warning.includes('Kept applied compatibility migration 0011_completion_review_status.sql')), true);
  assert.equal(files.filter((file) => file.startsWith('0011_')).length, 1, 'Netlify Database rejects duplicate migration number 0011.');
  assert.equal(warnings.every((warning) => !warning.includes('Removed stale cached')), true);
});


test('migration validator keeps the applied 0004 work order schedule migration', async () => {
  const { errors, files, warnings } = await validateMigrationFiles();

  assert.deepEqual(errors, [], 'Validation should keep the applied work-order schedule migration valid.');
  assert.equal(files.includes('0004_work_order_schedule.sql'), true);
  assert.equal(warnings.some((warning) => warning.includes('0004_work_order_schedule.sql')), false);
});

test('restored applied 0004 schedule migration matches the known schedule migration body', async () => {
  const migrationsDir = new URL('../netlify/database/migrations/', import.meta.url);
  const appliedSchedule = await readFile(new URL('0004_work_order_schedule.sql', migrationsDir), 'utf8');
  const currentSchedule = await readFile(new URL('0006_job_request_schedule_dates.sql', migrationsDir), 'utf8');

  assert.equal(appliedSchedule, currentSchedule, '0004_work_order_schedule must keep the originally applied schedule migration body.');
});

test('restored applied 0004 schedule migration keeps the locked applied checksum', async () => {
  const migrationsDir = new URL('../netlify/database/migrations/', import.meta.url);
  const appliedSchedule = await readFile(new URL('0004_work_order_schedule.sql', migrationsDir));
  const checksum = createHash('sha256').update(appliedSchedule).digest('hex');

  assert.match(stdout, /Netlify Database migrations verified:/);
});

test('migration validator script parses before Netlify prebuild runs it', async () => {
  await assert.doesNotReject(execFileAsync(process.execPath, ['--check', 'scripts/check-netlify-migrations.mjs']));
});

