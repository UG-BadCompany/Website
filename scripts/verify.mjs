import { readFile, stat } from 'node:fs/promises';
import { modules } from '../netlify/functions/shared/core-data.mjs';

const requiredFiles = [
  'netlify.toml',
  'netlify/functions/api.mjs',
  'netlify/functions/shared/db.mjs',
  'netlify/functions/shared/workflow.mjs',
  'netlify/functions/shared/env-metadata.mjs',
  'netlify/functions/shared/seed.mjs',
  'netlify/functions/domains/crud.mjs',
  'src/index.html',
  'src/app/main.js',
  'src/app/router.js',
  'src/app/views/installer.js',
  'src/app/views/dashboard.js',
  'src/app/views/login.js',
  'src/app/views/portal.js',
  'src/styles/app.css',
  'Doc/migrations/001_core_platform.sql',
  'Doc/migrations/002_cmms_workflow.sql',
  'Doc/migrations/003_auth_integrations.sql',
];

const requiredRoutes = [
  '/install-status',
  '/install/draft',
  '/install/finish',
  '/install/integration-status',
  '/system/integration-status',
  '/auth/magic-link',
  '/auth/verify',
  '/workflow/transition',
  '/payments/manual',
  '/health',
  '/ai/run',
];

const requiredTables = [
  'platform_installation', 'company_settings', 'homepage_settings', 'app_users', 'roles',
  'permissions', 'role_permissions', 'user_roles', 'workspace_access', 'module_registry',
  'module_settings', 'service_categories', 'customers', 'customer_properties', 'estimate_requests',
  'quotes', 'work_orders', 'inventory_items', 'inventory_transactions', 'invoices', 'payments',
  'files', 'workflow_events', 'audit_logs', 'magic_link_tokens', 'platform_secret_settings',
];

const failures = [];
for (const file of requiredFiles) {
  try { await stat(file); } catch { failures.push(`Missing ${file}`); }
}

const api = await readFile('netlify/functions/api.mjs', 'utf8');
for (const route of requiredRoutes) {
  if (!api.includes(route)) failures.push(`Missing route ${route}`);
}

const db = await readFile('netlify/functions/shared/db.mjs', 'utf8');
for (const table of requiredTables) {
  if (!db.includes(`create table if not exists ${table}`)) failures.push(`Missing table ${table}`);
}

for (const module of modules) {
  try {
    const raw = await readFile(`src/modules/${module.id}/manifest.json`, 'utf8');
    const manifest = JSON.parse(raw);
    const checks = [manifest.route, manifest.permission, manifest.api, manifest.ui?.mobile, manifest.ui?.desktop, manifest.audit, manifest.workflowIntegration];
    if (checks.some((value) => !value)) failures.push(`Incomplete manifest ${module.id}`);
  } catch {
    failures.push(`Missing manifest ${module.id}`);
  }
}

const envMetadata = await readFile('netlify/functions/shared/env-metadata.mjs', 'utf8');
if (!envMetadata.includes('SERPAPI_API_KEY')) failures.push('SERPAPI_API_KEY missing from env metadata.');
if (envMetadata.includes('SERPAPI' + '_KEY')) failures.push('Wrong SerpAPI key present in env metadata.');

const app = await readFile('src/app/views/installer.js', 'utf8');
if (!app.includes('applyTheme') || !app.includes('input type="color"')) failures.push('Installer live theme/color controls missing.');
if (!api.includes('setupLink') || !api.includes('token_hash')) failures.push('Magic login hashing/setup flow missing.');
if (!api.includes('Not configured; platform will use manual mode') && !envMetadata.includes('manual mode')) failures.push('Manual integration fallback copy missing.');

try { await stat('out/index.html'); } catch { failures.push('Build output /out/index.html missing. Run npm run build.'); }

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`verify passed: ${modules.length} modules, ${requiredRoutes.length} API routes, ${requiredTables.length} tables, installer/theme/auth/workflow checks.`);
