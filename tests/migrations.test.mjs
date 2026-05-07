import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import test from 'node:test';

const MIGRATION_PREFIX_PATTERN = /^(\d{4})_.+\.sql$/;

test('Netlify Database migrations use unique numeric prefixes', async () => {
  const files = (await readdir(new URL('../netlify/database/migrations/', import.meta.url)))
    .filter((file) => file.endsWith('.sql'));
  const prefixes = new Map();

  files.forEach((file) => {
    const match = file.match(MIGRATION_PREFIX_PATTERN);

    assert.ok(match, `${file} must start with a four-digit migration number.`);

    const [, prefix] = match;
    const existing = prefixes.get(prefix) || [];
    existing.push(file);
    prefixes.set(prefix, existing);
  });

  const duplicates = [...prefixes.entries()].filter(([, names]) => names.length > 1);

  assert.deepEqual(duplicates, [], 'Migration numbers must be unique for Netlify Database validation.');
});
