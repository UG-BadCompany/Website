import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const required = ['dashboard','customers','request-estimate','quote-center','ai-photo-estimate','ai-quote-builder','ai-troubleshooting','work-orders','schedule','worker-jobs','inventory','invoices','payments','finance','files','users-roles','workspace-permissions','theme-manager','homepage-editor','module-manager','reports','platform-health','cache-manager','audit-logs','backup-restore','system-center','environment-integrations','licensing','maintenance-plans','client-portal','worker-portal'];
for (const id of required) assert.ok(existsSync(join('modules', id, 'module.json')), `missing module ${id}`);
const registry = JSON.parse(readFileSync('out/assets/module-registry.json','utf8'));
assert.equal(registry.modules.length, required.length, 'all core modules registered');
for (const m of registry.modules) {
  assert.ok(m.route && m.apiBase, `${m.id} has route/api`);
  assert.ok(m.nav?.sidebar && m.nav?.mobile, `${m.id} has nav`);
  assert.ok(m.permissions?.length >= 6, `${m.id} has permissions`);
  assert.ok(m.workspaces?.length >= 1, `${m.id} has workspace availability`);
}
const redirects = readFileSync('out/_redirects','utf8');
assert.match(redirects, /\/api\/\*/); assert.match(redirects, /\/\*/);
const app = readFileSync('src/app.js','utf8');
for (const text of ['Welcome to Your New Business Platform','Magic Login','Environment & Integrations','Run workflow demo']) assert.ok(app.includes(text), `UI includes ${text}`);
const fn = readFileSync('netlify/functions/api.mjs','utf8');
for (const route of ['/install-status','/install/health','/install/draft','/install/finish','/auth/magic-link','/workflow/advance','/ai/estimate','/public/quote/','/public/invoice/']) assert.ok(fn.includes(route), `API includes ${route}`);
const netlify = readFileSync('netlify.toml','utf8');
assert.match(netlify, /publish = "out"/); assert.match(netlify, /functions = "netlify\/functions"/); assert.match(netlify, /NETLIFY_NEXT_PLUGIN_SKIP = "true"/);
console.log('Verification passed: installer, modules, workflow, AI, dashboards, System Center, and Netlify static/function setup are present.');
