import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { validateMigrationFiles } from '../scripts/check-netlify-migrations.mjs';

test('Netlify Database migrations keep the applied production migration names', async () => {
  const { errors, files } = await validateMigrationFiles();

  assert.deepEqual(errors, [], 'Migration files must pass Netlify Database validation.');
  assert.equal(files.includes('0004_work_order_schedule.sql'), true, 'Previously applied Netlify migration 0004_work_order_schedule must remain present.');
  assert.equal(files.includes('0009_completion_review_status.sql'), true, 'Previously applied Netlify migration 0009_completion_review_status must remain present.');
  assert.equal(files.includes('0009_quote_payment_completion_controls.sql'), true, 'Previously applied Netlify migration 0009_quote_payment_completion_controls must remain present.');
  assert.equal(files.includes('0009_worker_completion_evidence.sql'), true, 'Previously applied Netlify migration 0009_worker_completion_evidence must remain present.');
  assert.equal(files.includes('0010_invoices_payments.sql'), true, 'Previously applied Netlify migration 0010_invoices_payments must remain present.');
  assert.equal(files.includes('0011_completion_review_status.sql'), false, 'Renamed copies of applied migrations must not be committed.');
  assert.equal(files.includes('0012_quote_payment_completion_controls.sql'), false, 'Renamed copies of applied migrations must not be committed.');
  assert.equal(files.includes('0013_invoices_payments.sql'), false, 'Renamed copies of applied migrations must not be committed.');
  assert.equal(files.includes('0014_worker_completion_evidence.sql'), false, 'Renamed copies of applied migrations must not be committed.');
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
