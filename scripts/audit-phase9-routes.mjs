#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const fail = (message) => {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
};

const ok = (message) => console.log(`✅ ${message}`);

const requiredFiles = [
  'public/index.html',
  'public/login/index.html',
  'public/dashboard/index.html',
  'netlify/functions/create-job-request.mjs',
  'netlify/functions/request-magic-link.mjs',
  'netlify/functions/verify-magic-link.mjs',
  'netlify/functions/me.mjs',
  'netlify/functions/logout.mjs',
  'netlify/functions/admin-estimate-review.mjs',
  'netlify/functions/admin-work-orders.mjs',
  'netlify/functions/admin-finance-overview.mjs',
  'netlify/functions/admin-executive-overview.mjs',
  'netlify/functions/system-health.mjs',
];

requiredFiles.forEach((file) => existsSync(join(root, file)) ? ok(`${file} exists`) : fail(`${file} is missing`));

const dashboard = readFileSync(join(root, 'public/dashboard/index.html'), 'utf8');
const dashboardAssets = readdirSync(join(root, 'public/assets'))
  .filter((file) => file.endsWith('.js') || file.endsWith('.css'))
  .map((file) => readFileSync(join(root, 'public/assets', file), 'utf8'))
  .join('\n');
const dashboardSearch = `${dashboard}\n${dashboardAssets}`;
const netlifyToml = readFileSync(join(root, 'netlify.toml'), 'utf8');

const requiredAnchors = [
  'estimate-review',
  'finance-command-center',
  'executive-overview',
  'admin-requests',
  'admin-quotes',
  'admin-invoices',
  'admin-inventory',
  'admin-access',
  'admin-activity',
  'worker-jobs',
  'client-requests',
  'client-quotes',
  'client-invoices',
];

requiredAnchors.forEach((id) => {
  const hasAnchor = dashboardSearch.includes(`id="${id}"`) ||
    dashboardSearch.includes(`id='${id}'`) ||
    dashboardSearch.includes(`#${id}`) ||
    dashboardSearch.includes(id);
  hasAnchor ? ok(`#${id} exists or is dynamically mounted`) : fail(`#${id} missing in dashboard/static assets`);
});

const deadShortcutTerms = [
  'Review, quote, schedule, assign, and close active jobs.',
  'Confirm payments and review billing follow-up.',
  'Open materials, tools, stock, and usage controls.',
  'Manage user access, roles, and permissions.',
  'Search recent status, payment, and account events.',
  'View low stock, pending review jobs, and unpaid invoice counts.',
  'Open work-order tools in a quick popup.',
  'Open invoice tools in a quick popup.',
  'Open inventory tools in a quick popup.',
];

deadShortcutTerms.forEach((term) => {
  dashboard.includes(term) ? fail(`Dead shortcut copy still exists: ${term}`) : ok(`Removed dead shortcut copy: ${term}`);
});

const requiredRoutes = [
  '/api/job-requests',
  '/api/auth/magic-link',
  '/api/me',
  '/api/logout',
  '/api/admin/estimate-review',
  '/api/admin/work-orders',
  '/api/admin/finance-overview',
  '/api/admin/executive-overview',
  '/api/system-health',
  '/api/square/create-payment-link',
];

requiredRoutes.forEach((route) => {
  netlifyToml.includes(`from = "${route}"`) ? ok(`${route} redirect exists`) : fail(`${route} redirect missing`);
});

if (!process.exitCode) {
  console.log('\\nPhase 9 route/page cleanup audit passed.');
}
