import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, rm, stat, writeFile } from 'node:fs/promises';
import { validateMigrationFiles } from '../scripts/check-netlify-migrations.mjs';

const execFileAsync = promisify(execFile);

test('Netlify Database migrations use unique numeric prefixes', async () => {
  const { errors } = await validateMigrationFiles();

  assert.deepEqual(errors, [], 'Migration files must pass Netlify Database validation.');
});


test('invoice title backfill migration removes dashboard heading copy', async () => {
  const migration = await readFile(new URL('../netlify/database/migrations/0017_normalize_invoice_titles.sql', import.meta.url), 'utf8');

  assert.match(migration, /with normalized_invoice_titles as/);
  assert.match(migration, /lower\(trim\(invoices\.title\)\) = 'invoice & payment desk'/);
  assert.match(migration, /coalesce\(nullif\(trim\(job_requests\.service_type\), ''\), 'Completed work'\)/);
  assert.match(migration, /set title = normalized_invoice_titles\.title/);
  assert.match(migration, /where invoices\.id = normalized_invoice_titles\.id/);
  assert.doesNotMatch(migration, /update invoices[\s\S]*from job_requests[\s\S]*clients\.id = invoices\.client_id/i, 'target table should not be referenced inside a direct UPDATE FROM join');
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


test('migration validator removes stale cached admin activity migration before build validation', async () => {
  const migrationsDir = new URL('../netlify/database/migrations/', import.meta.url);
  const staleMigration = new URL('0011_admin_activity_permission.sql', migrationsDir);

  await writeFile(staleMigration, `-- stale cached duplicate admin activity migration created by test
`);

  try {
    const { errors, files, warnings } = await validateMigrationFiles({ repairLegacy: true });

    assert.deepEqual(errors, [], 'Repair mode should remove the stale admin activity migration.');
    assert.equal(files.includes('0011_admin_activity_permission.sql'), false);
    assert.equal(files.includes('0015_admin_activity_permission.sql'), true);
    assert.equal(warnings.some((warning) => warning.includes('Removed stale cached 0011_admin_activity_permission.sql')), true);
    await assert.rejects(stat(staleMigration), { code: 'ENOENT' });
  } finally {
    await rm(staleMigration, { force: true });
  }
});

test('migration prebuild script runs without undefined migration guard references', async () => {
  const { stdout } = await execFileAsync(process.execPath, ['scripts/check-netlify-migrations.mjs']);

test('migration validator removes stale cached deploy-era migration names before build validation', async () => {
  const migrationsDir = new URL('../netlify/database/migrations/', import.meta.url);
  const staleMigrations = [
    '0011_completion_review_status.sql',
    '0012_quote_payment_completion_controls.sql',
    '0013_invoices_payments.sql',
    '0014_worker_completion_evidence.sql',
  ];

test('migration validator removes stale cached deploy-era migration names before build validation', async () => {
  const migrationsDir = new URL('../netlify/database/migrations/', import.meta.url);
  const staleMigrations = [
    '0011_completion_review_status.sql',
    '0012_quote_payment_completion_controls.sql',
    '0013_invoices_payments.sql',
    '0014_worker_completion_evidence.sql',
  ];

  await Promise.all(staleMigrations.map((file) => writeFile(new URL(file, migrationsDir), `-- stale cached duplicate ${file}
`)));

  try {
    const { errors, files, warnings } = await validateMigrationFiles({ repairLegacy: true });

    assert.deepEqual(errors, [], 'Repair mode should remove stale deploy-era migration names.');
    staleMigrations.forEach((file) => {
      assert.equal(files.includes(file), false);
      assert.equal(warnings.some((warning) => warning.includes(`Removed stale cached ${file}`)), true);
    });
    assert.equal(files.includes('0009_completion_review_status.sql'), true);
    assert.equal(files.includes('0010_invoices_payments.sql'), true);
    await Promise.all(staleMigrations.map((file) => assert.rejects(stat(new URL(file, migrationsDir)), { code: 'ENOENT' })));
  } finally {
    await Promise.all(staleMigrations.map((file) => rm(new URL(file, migrationsDir), { force: true })));
  }
});


test('migration prebuild script keeps legacy guard constants defined', async () => {
  const script = await readFile(new URL('../scripts/check-netlify-migrations.mjs', import.meta.url), 'utf8');

  assert.match(script, /const LEGACY_CUSTOM_ROLE_MIGRATION = '0004_custom_roles_permissions\.sql'/);
  assert.match(script, /const CURRENT_CUSTOM_ROLE_MIGRATION = '0005_custom_roles_permissions\.sql'/);
  assert.match(script, /const LEGACY_ADMIN_ACTIVITY_MIGRATION = '0011_admin_activity_permission\.sql'/);
  assert.match(script, /const CURRENT_ADMIN_ACTIVITY_MIGRATION = '0015_admin_activity_permission\.sql'/);
});

test('migration prebuild script runs without undefined migration guard references', async () => {
  const { stdout } = await execFileAsync(process.execPath, ['scripts/check-netlify-migrations.mjs']);

  assert.match(stdout, /Netlify Database migrations verified:/);
});
