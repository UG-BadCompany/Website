import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const pkg = JSON.parse(await readFile('package.json','utf8'));
assert(pkg.dependencies['@netlify/database'], 'package.json must include @netlify/database');

const netlifyConfig = await readFile('netlify.toml','utf8');
assert(netlifyConfig.includes('publish = "dist"'), 'netlify.toml must publish dist');
assert(netlifyConfig.includes('functions = "netlify/functions"'), 'netlify.toml must use netlify/functions');
assert(netlifyConfig.includes('NETLIFY_NEXT_PLUGIN_SKIP = "true"'), 'netlify.toml must skip the Next.js runtime plugin');
assert(!netlifyConfig.includes('[[plugins]]'), 'netlify.toml must not configure build plugins');
assert(!netlifyConfig.includes('@netlify/plugin-nextjs'), 'netlify.toml must not configure @netlify/plugin-nextjs');

const forbiddenDependencies = ['next', '@netlify/plugin-nextjs'];
for (const dependencyName of forbiddenDependencies) {
  assert(!pkg.dependencies?.[dependencyName], `package.json dependencies must not include ${dependencyName}`);
  assert(!pkg.devDependencies?.[dependencyName], `package.json devDependencies must not include ${dependencyName}`);
  assert(!pkg.optionalDependencies?.[dependencyName], `package.json optionalDependencies must not include ${dependencyName}`);
  assert(!pkg.peerDependencies?.[dependencyName], `package.json peerDependencies must not include ${dependencyName}`);
}

const repoEntries = await readdir('.', { withFileTypes: true });
const forbiddenRootEntries = new Set(['next.config.js', 'next.config.mjs', '.next', 'pages', 'app']);
for (const entry of repoEntries) {
  assert(!forbiddenRootEntries.has(entry.name), `Next.js artifact must not exist at repository root: ${entry.name}`);
}

const packageLock = await readFile('package-lock.json','utf8');
assert(!packageLock.includes('node_modules/next'), 'package-lock.json must not include next');
assert(!packageLock.includes('node_modules/@netlify/plugin-nextjs'), 'package-lock.json must not include @netlify/plugin-nextjs');
const api = await readFile('netlify/functions/api.mjs','utf8');
for (const route of ['/api/install-status','/api/install/health','/api/install/bootstrap-database','/api/install/draft','/api/install/finish']) assert(api.includes(route), `missing ${route}`);
const db = await readFile('netlify/functions/lib/db.mjs','utf8');
for (const table of ['platform_installation','installer_drafts','company_settings','theme_settings','homepage_settings','app_users','roles','permissions','role_permissions','user_roles','workspace_access','module_registry','module_settings','service_categories','customers','customer_properties','job_requests','quotes','quote_line_items','work_orders','work_order_assignments','schedule_events','inventory_items','inventory_transactions','invoices','payments','uploaded_files','ai_runs','workflow_events','magic_tokens','platform_secret_settings','audit_logs','system_health_events']) assert(db.includes(`create table if not exists ${table}`), `missing table ${table}`);
assert(db.includes('bootstrap_write_tests'), 'missing write test table');
assert(db.includes('writeTestPassed'), 'missing write test response');
const integrations = await readFile('netlify/functions/lib/integrations.mjs','utf8');
assert(integrations.includes('SERPAPI_API_KEY'), 'SERPAPI_API_KEY missing');
assert(!integrations.includes('SERPAPI_KEY\''), 'wrong SERPAPI_KEY present');
const modules = await readdir('src/modules');
assert(modules.length >= 26, 'expected core modules');
console.log('Verification passed: database schema, installer APIs, integration keys, and drop-in modules are present.');
