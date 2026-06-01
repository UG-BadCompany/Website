import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('package scripts keep audit commands inside scripts and expose master commands', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  const misplaced = Object.keys(pkg).filter((key) => /^audit:|^test:|^verify:/.test(key));
  assert.deepEqual(misplaced, []);
  for (const key of ['audit:phase11', 'audit:phase24', 'audit:phase48', 'audit:all', 'test:all', 'verify:all']) {
    assert.equal(typeof pkg.scripts[key], 'string', `${key} should be runnable with npm run ${key}`);
  }
});

test('new admin AI and job photo APIs are routed through Netlify redirects', async () => {
  const toml = await readFile('netlify.toml', 'utf8');
  assert.match(toml, /from = "\/api\/admin\/ai-knowledge"[\s\S]*to = "\/\.netlify\/functions\/admin-ai-knowledge"/);
  assert.match(toml, /from = "\/api\/job-files"[\s\S]*to = "\/\.netlify\/functions\/job-files"/);
});

test('AI Knowledge Center UI is admin-only and reachable from desktop and mobile navigation', async () => {
  const html = await readFile('public/dashboard/index.html', 'utf8');
  const mobile = await readFile('public/assets/mobile-dashboard-ux.js', 'utf8');
  const sidebar = await readFile('public/assets/dashboard-phase34-sidebar-only-workspaces.js', 'utf8');
  const bootstrap = await readFile('public/dashboard/modules/dashboard/bootstrap.js', 'utf8');

  assert.match(html, /id="ai-knowledge-center"/);
  assert.match(html, /data-ai-knowledge-center data-dashboard-section data-views="admin"/);
  assert.match(html, /data-ai-knowledge-type/);
  assert.match(html, /data-ai-knowledge-action="approve"|data-ai-knowledge-refresh/);
  assert.match(mobile, /'ai-knowledge': \['ai-knowledge', '#ai-knowledge-center'\]/);
  assert.match(mobile, /admin: \[[^\]]*'ai-knowledge'/);
  assert.doesNotMatch(mobile, /client: \[[^\]]*'ai-knowledge'/);
  assert.doesNotMatch(mobile, /worker: \[[^\]]*'ai-knowledge'/);
  assert.match(sidebar, /'ai-knowledge'[\s\S]*views: \['admin'\]/);
  assert.match(bootstrap, /fetch\('\/api\/admin\/ai-knowledge'/);
});

test('AI Knowledge Center API enforces admin role checks', async () => {
  const fn = await readFile('netlify/functions/admin-ai-knowledge.mjs', 'utf8');
  assert.match(fn, /if \(!session\.roleKeys\.includes\('admin'\)\) return \{ error: json\(403/);
  assert.match(fn, /event_type, entity_type, entity_id, metadata/);
});

test('photo-aware AI has upload UI, file metadata persistence, and prompt context loading', async () => {
  const html = await readFile('public/dashboard/index.html', 'utf8');
  const bootstrap = await readFile('public/dashboard/modules/dashboard/bootstrap.js', 'utf8');
  const jobFiles = await readFile('netlify/functions/job-files.mjs', 'utf8');
  const ai = await readFile('netlify/functions/ai-intelligence-engine.mjs', 'utf8');
  const migration = await readFile('netlify/database/migrations/0032_photo_ai_metadata.sql', 'utf8');

  assert.match(html, /data-photo-doc-upload-files/);
  assert.match(html, /capture="environment"/);
  assert.match(html, /data-photo-doc-photo-type/);
  assert.match(bootstrap, /fetch\('\/api\/job-files'/);
  assert.match(jobFiles, /photoType/);
  assert.match(jobFiles, /caption/);
  assert.match(jobFiles, /sourceContext/);
  assert.match(migration, /photo_type/);
  assert.match(ai, /export const loadPhotoContext/);
  assert.match(ai, /photoContext: resolvedPhotoContext/);
  assert.match(ai, /photoNeeded/);
  assert.match(ai, /modelPlateNeeded/);
});

