import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFile, rm, stat, writeFile } from 'node:fs/promises';
import { validateMigrationFiles } from '../scripts/check-netlify-migrations.mjs';

test('Netlify Database migrations use unique numeric prefixes', async () => {
  const { errors, files } = await validateMigrationFiles();

  assert.deepEqual(errors, [], 'Migration files must pass Netlify Database validation.');
  assert.equal(files.includes('0004_work_order_schedule.sql'), true, 'Previously applied Netlify migration 0004_work_order_schedule must remain present.');
  assert.equal(files.includes('0014_worker_completion_evidence.sql'), true, 'Worker completion evidence changes must live in a later migration.');
  assert.equal(files.includes('0009_worker_completion_evidence.sql'), false, 'Previously applied 0009_worker_completion_evidence must not be re-sent with a changed checksum.');
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

test('migration validator removes stale cached duplicate 0009 migrations before build validation', async () => {
  const migrationsDir = new URL('../netlify/database/migrations/', import.meta.url);
  const staleCompletion = new URL('0009_completion_review_status.sql', migrationsDir);
  const staleQuoteControls = new URL('0009_quote_payment_completion_controls.sql', migrationsDir);
  const staleInvoices = new URL('0010_invoices_payments.sql', migrationsDir);
  const staleWorkerEvidence = new URL('0009_worker_completion_evidence.sql', migrationsDir);

  await writeFile(staleCompletion, `-- stale cached duplicate migration created by test\n`);
  await writeFile(staleQuoteControls, `-- stale cached duplicate migration created by test\n`);
  await writeFile(staleInvoices, `-- stale cached future migration created by test\n`);
  await writeFile(staleWorkerEvidence, `-- stale cached applied migration created by test\n`);

  try {
    const { errors, files, warnings } = await validateMigrationFiles({ repairLegacy: true });

    assert.deepEqual(errors, [], 'Repair mode should remove stale cached duplicate 0009 migrations.');
    assert.equal(files.includes('0009_completion_review_status.sql'), false);
    assert.equal(files.includes('0009_quote_payment_completion_controls.sql'), false);
    assert.equal(files.includes('0010_invoices_payments.sql'), false);
    assert.equal(files.includes('0009_worker_completion_evidence.sql'), false);
    assert.equal(warnings.some((warning) => warning.includes('Removed stale cached 0009_completion_review_status.sql')), true);
    assert.equal(warnings.some((warning) => warning.includes('Removed stale cached 0009_quote_payment_completion_controls.sql')), true);
    assert.equal(warnings.some((warning) => warning.includes('Removed stale cached 0010_invoices_payments.sql')), true);
    assert.equal(warnings.some((warning) => warning.includes('Removed stale cached 0009_worker_completion_evidence.sql')), true);
    await assert.rejects(stat(staleCompletion), { code: 'ENOENT' });
    await assert.rejects(stat(staleQuoteControls), { code: 'ENOENT' });
    await assert.rejects(stat(staleInvoices), { code: 'ENOENT' });
    await assert.rejects(stat(staleWorkerEvidence), { code: 'ENOENT' });
  } finally {
    await rm(staleCompletion, { force: true });
    await rm(staleQuoteControls, { force: true });
    await rm(staleInvoices, { force: true });
    await rm(staleWorkerEvidence, { force: true });
  }
});


test('migration validator keeps the applied 0004 work order schedule migration during repair', async () => {
  const { errors, files, warnings } = await validateMigrationFiles({ repairLegacy: true });

  assert.deepEqual(errors, [], 'Repair mode should keep the applied work-order schedule migration valid.');
  assert.equal(files.includes('0004_work_order_schedule.sql'), true);
  assert.equal(warnings.some((warning) => warning.includes('0004_work_order_schedule.sql')), false);
});

test('restored applied 0004 schedule migration keeps the original work-order body', async () => {
  const migrationsDir = new URL('../netlify/database/migrations/', import.meta.url);
  const appliedSchedule = await readFile(new URL('0004_work_order_schedule.sql', migrationsDir), 'utf8');

  assert.match(appliedSchedule, /planned_service_at timestamptz/, '0004_work_order_schedule must keep the originally applied work-order scheduling columns.');
  assert.match(appliedSchedule, /client_reschedule_note text/, '0004_work_order_schedule must keep the originally applied client reschedule note column.');
});

test('restored applied 0004 schedule migration keeps the locked applied checksum', async () => {
  const migrationsDir = new URL('../netlify/database/migrations/', import.meta.url);
  const appliedSchedule = await readFile(new URL('0004_work_order_schedule.sql', migrationsDir));
  const checksum = createHash('sha256').update(appliedSchedule).digest('hex');

  assert.equal(
    checksum,
    'f9cf4dc0988130a124df27bcdee45650b1162d1e555f761a0b8ef5ecbc67fd80',
    'The applied Netlify Database migration must not be edited in place.',
  );
});
