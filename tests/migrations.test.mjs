import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validateMigrationFiles } from '../scripts/check-netlify-migrations.mjs';

const createTempMigrationsDir = async (files) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ta-migrations-'));

  await Promise.all(Object.entries(files).map(([file, body]) => (
    writeFile(new URL(file, `file://${directory}/`), body)
  )));

  return new URL(`file://${directory}/`);
};

test('Netlify Database migrations use unique numeric prefixes', async () => {
  const { errors, files } = await validateMigrationFiles();

  assert.deepEqual(errors, [], 'Migration files must pass Netlify Database validation.');
  assert.equal(files.includes('0004_work_order_schedule.sql'), true, 'Previously applied Netlify migration 0004_work_order_schedule must remain present.');
});


test('migration validator removes the stale cached custom role migration before build validation', async () => {
  const migrationsDir = await createTempMigrationsDir({
    '0004_custom_roles_permissions.sql': '-- stale cached duplicate migration created by test\n',
  });

  try {
    const { errors, files, warnings } = await validateMigrationFiles({ repairLegacy: true, migrationsDir, appliedMigrationLocks: new Map() });

    assert.deepEqual(errors, [], 'Repair mode should remove the stale legacy custom role migration without requiring its replacement in the cached checkout.');
    assert.equal(files.includes('0004_custom_roles_permissions.sql'), false);
    assert.equal(warnings.some((warning) => warning.includes('Removed stale cached 0004_custom_roles_permissions.sql')), true);
    await assert.rejects(stat(new URL('0004_custom_roles_permissions.sql', migrationsDir)), { code: 'ENOENT' });
  } finally {
    await rm(migrationsDir, { recursive: true, force: true });
  }
});

test('migration validator removes stale cached duplicate 0009 migrations before build validation', async () => {
  const migrationsDir = await createTempMigrationsDir({
    '0009_completion_review_status.sql': '-- stale cached duplicate migration created by test\n',
    '0009_quote_payment_completion_controls.sql': '-- stale cached duplicate migration created by test\n',
    '0010_invoices_payments.sql': '-- stale cached future migration created by test\n',
  });

  try {
    const { errors, files, warnings } = await validateMigrationFiles({ repairLegacy: true, migrationsDir, appliedMigrationLocks: new Map() });

    assert.deepEqual(errors, [], 'Repair mode should remove stale cached duplicate 0009 migrations.');
    assert.equal(files.includes('0009_completion_review_status.sql'), false);
    assert.equal(files.includes('0009_quote_payment_completion_controls.sql'), false);
    assert.equal(files.includes('0010_invoices_payments.sql'), false);
    assert.equal(warnings.some((warning) => warning.includes('Removed stale cached 0009_completion_review_status.sql')), true);
    assert.equal(warnings.some((warning) => warning.includes('Removed stale cached 0009_quote_payment_completion_controls.sql')), true);
    assert.equal(warnings.some((warning) => warning.includes('Removed stale cached 0010_invoices_payments.sql')), true);
    await assert.rejects(stat(new URL('0009_completion_review_status.sql', migrationsDir)), { code: 'ENOENT' });
    await assert.rejects(stat(new URL('0009_quote_payment_completion_controls.sql', migrationsDir)), { code: 'ENOENT' });
    await assert.rejects(stat(new URL('0010_invoices_payments.sql', migrationsDir)), { code: 'ENOENT' });
  } finally {
    await rm(migrationsDir, { recursive: true, force: true });
  }
});

test('migration validator removes stale cached 0012 quote-payment controls when the replacement is absent', async () => {
  const migrationsDir = await createTempMigrationsDir({
    '0012_quote_payment_completion_controls.sql': '-- stale cached quote-payment controls migration created by test\n',
  });

  try {
    const { errors, files, warnings } = await validateMigrationFiles({ repairLegacy: true, migrationsDir, appliedMigrationLocks: new Map() });

    assert.deepEqual(errors, [], 'Repair mode should not fail just because a replacement migration is absent in the cached deploy checkout.');
    assert.equal(files.includes('0012_quote_payment_completion_controls.sql'), false);
    assert.equal(warnings.some((warning) => warning.includes('Removed stale cached 0012_quote_payment_completion_controls.sql')), true);
    await assert.rejects(stat(new URL('0012_quote_payment_completion_controls.sql', migrationsDir)), { code: 'ENOENT' });
  } finally {
    await rm(migrationsDir, { recursive: true, force: true });
  }
});


test('migration validator keeps the applied 0004 work order schedule migration during repair', async () => {
  const { errors, files, warnings } = await validateMigrationFiles({ repairLegacy: true });

  assert.deepEqual(errors, [], 'Repair mode should keep the applied work-order schedule migration valid.');
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

  assert.equal(
    checksum,
    'c0583dd2a53b96ea6db8898cd9bf805c9c013350add30b57592b958e109af9d1',
    'The applied Netlify Database migration must not be edited in place.',
  );
});
