import assert from 'node:assert/strict';
import test from 'node:test';
import { rm, stat, writeFile } from 'node:fs/promises';
import { validateMigrationFiles } from '../scripts/check-netlify-migrations.mjs';

test('Netlify Database migrations use unique numeric prefixes', async () => {
  const { errors } = await validateMigrationFiles();

  assert.deepEqual(errors, [], 'Migration files must pass Netlify Database validation.');
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

  await writeFile(staleCompletion, `-- stale cached duplicate migration created by test\n`);
  await writeFile(staleQuoteControls, `-- stale cached duplicate migration created by test\n`);
  await writeFile(staleInvoices, `-- stale cached future migration created by test\n`);

  try {
    const { errors, files, warnings } = await validateMigrationFiles({ repairLegacy: true });

    assert.deepEqual(errors, [], 'Repair mode should remove stale cached duplicate 0009 migrations.');
    assert.equal(files.includes('0009_completion_review_status.sql'), false);
    assert.equal(files.includes('0009_quote_payment_completion_controls.sql'), false);
    assert.equal(files.includes('0010_invoices_payments.sql'), false);
    assert.equal(warnings.some((warning) => warning.includes('Removed stale cached 0009_completion_review_status.sql')), true);
    assert.equal(warnings.some((warning) => warning.includes('Removed stale cached 0009_quote_payment_completion_controls.sql')), true);
    assert.equal(warnings.some((warning) => warning.includes('Removed stale cached 0010_invoices_payments.sql')), true);
    await assert.rejects(stat(staleCompletion), { code: 'ENOENT' });
    await assert.rejects(stat(staleQuoteControls), { code: 'ENOENT' });
    await assert.rejects(stat(staleInvoices), { code: 'ENOENT' });
  } finally {
    await rm(staleCompletion, { force: true });
    await rm(staleQuoteControls, { force: true });
    await rm(staleInvoices, { force: true });
  }
});
