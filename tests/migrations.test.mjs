import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateMigrationFiles } from '../scripts/check-netlify-migrations.mjs';

const execFileAsync = promisify(execFile);

test('Netlify Database migrations allow committed compatibility placeholders', async () => {
  const { errors, files } = await validateMigrationFiles();

  assert.deepEqual(errors, [], 'Migration files must pass Netlify Database validation.');
  assert.equal(files.includes('0011_completion_review_status.sql'), true);
  assert.equal(files.includes('0012_quote_payment_completion_controls.sql'), true);
  assert.equal(files.includes('0013_invoices_payments.sql'), true);
  assert.equal(files.includes('0014_worker_completion_evidence.sql'), true);
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


test('Square payment metadata migration prepares invoices and payments for provider checkout', async () => {
  const migration = await readFile(new URL('../netlify/database/migrations/0018_square_payment_metadata.sql', import.meta.url), 'utf8');

  assert.match(migration, /alter table invoices/);
  assert.match(migration, /add column if not exists payment_provider text not null default 'manual'/);
  assert.match(migration, /add column if not exists provider_checkout_url text/);
  assert.match(migration, /add column if not exists provider_metadata jsonb not null default '\{\}'::jsonb/);
  assert.match(migration, /alter table payments/);
  assert.match(migration, /add column if not exists provider_payment_id text/);
  assert.match(migration, /add column if not exists provider_receipt_url text/);
  assert.match(migration, /idx_invoices_provider_checkout_id/);
  assert.match(migration, /idx_payments_provider_payment_id/);
});


test('migration validator keeps the custom role compatibility migration present', async () => {
  const { errors, files, warnings } = await validateMigrationFiles({ repairLegacy: true });

  assert.deepEqual(errors, [], 'Repair mode should not remove Netlify-applied compatibility migrations.');
  assert.equal(files.includes('0004_custom_roles_permissions.sql'), true);
  assert.equal(files.includes('0005_custom_roles_permissions.sql'), true);
  assert.equal(warnings.some((warning) => warning.includes('Kept compatibility migration 0004_custom_roles_permissions.sql')), true);
});


test('migration validator keeps the admin activity compatibility migration present', async () => {
  const { errors, files, warnings } = await validateMigrationFiles({ repairLegacy: true });

  assert.deepEqual(errors, [], 'Repair mode should not remove Netlify-applied compatibility migrations.');
  assert.equal(files.includes('0011_admin_activity_permission.sql'), true);
  assert.equal(files.includes('0015_admin_activity_permission.sql'), true);
  assert.equal(warnings.some((warning) => warning.includes('Kept compatibility migration 0011_admin_activity_permission.sql')), true);
});


test('migration validator keeps deploy-era compatibility migration names before build validation', async () => {
  const compatibilityMigrations = [
    '0011_completion_review_status.sql',
    '0012_quote_payment_completion_controls.sql',
    '0013_invoices_payments.sql',
    '0014_worker_completion_evidence.sql',
  ];

  const { errors, files, warnings } = await validateMigrationFiles({ repairLegacy: true });

  assert.deepEqual(errors, [], 'Repair mode should not remove Netlify-applied compatibility migrations.');
  compatibilityMigrations.forEach((file) => {
    assert.equal(files.includes(file), true);
    assert.equal(warnings.some((warning) => warning.includes(`Kept compatibility migration ${file}`)), true);
  });
  assert.equal(files.includes('0009_completion_review_status.sql'), true);
  assert.equal(files.includes('0010_invoices_payments.sql'), true);
});


test('migration prebuild script keeps legacy guard constants defined', async () => {
  const script = await readFile(new URL('../scripts/check-netlify-migrations.mjs', import.meta.url), 'utf8');

  assert.match(script, /const LEGACY_CUSTOM_ROLE_MIGRATION = '0004_custom_roles_permissions\.sql'/);
  assert.match(script, /const CURRENT_CUSTOM_ROLE_MIGRATION = '0005_custom_roles_permissions\.sql'/);
  assert.match(script, /const LEGACY_ADMIN_ACTIVITY_MIGRATION = '0011_admin_activity_permission\.sql'/);
  assert.match(script, /const CURRENT_ADMIN_ACTIVITY_MIGRATION = '0015_admin_activity_permission\.sql'/);
});

test('migration repair keeps compatibility names even when a cached checkout lacks the replacement file', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'ta-migrations-'));
  const migrationsDir = pathToFileURL(`${tempDir}/`);
  const staleMigration = '0012_quote_payment_completion_controls.sql';

  await writeFile(new URL(staleMigration, migrationsDir), '-- stale cached deploy migration without replacement in checkout\n');

  try {
    const { errors, files, warnings } = await validateMigrationFiles({ repairLegacy: true, migrationsDir });

    assert.deepEqual(errors, [], 'Repair mode should not fail when a cached checkout only contains the compatibility name.');
    assert.equal(files.includes(staleMigration), true);
    assert.equal(warnings.some((warning) => warning.includes('was not present in this deploy checkout')), true);
    await assert.doesNotReject(stat(new URL(staleMigration, migrationsDir)));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});


test('migration prebuild script runs without undefined migration guard references', async () => {
  const { stdout } = await execFileAsync(process.execPath, ['scripts/check-netlify-migrations.mjs']);

  assert.match(stdout, /Netlify Database migrations verified:/);
});
