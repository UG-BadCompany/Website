import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('all modules have manifests required for drop-in registration', () => {
  const dirs = fs.readdirSync('modules', { withFileTypes: true }).filter(d=>d.isDirectory());
  assert.ok(dirs.length >= 18);
  for (const d of dirs) {
    const m = JSON.parse(fs.readFileSync(`modules/${d.name}/manifest.json`, 'utf8'));
    assert.equal(m.id, d.name);
    assert.ok(m.nav.route.startsWith('/dashboard/modules/'));
    assert.ok(Array.isArray(m.permissions) && m.permissions.length >= 2);
    assert.ok(m.apiNamespace);
  }
});
