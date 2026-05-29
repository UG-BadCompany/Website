import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const dashboard = read('public/dashboard/index.html');
const bootstrap = read('public/dashboard/modules/dashboard/bootstrap.js');
const finance = read('public/assets/dashboard-phase4-finance.js');
const phase34 = read('public/assets/dashboard-phase34-sidebar-only-workspaces.js');
const failures = [];
const fail = (message) => failures.push(message);
const has = (text, pattern, message) => { if (!pattern.test(text)) fail(message); };

const moduleChecks = [
  ['Scheduling / Dispatch', dashboard, /id="smart-schedule-suite"[\s\S]*Upcoming jobs[\s\S]*Unscheduled jobs[\s\S]*data-schedule-dispatch-form[\s\S]*Schedule \/ assign job/],
  ['Scheduling API action', bootstrap, /data-schedule-dispatch-form[\s\S]*\/api\/admin\/job-requests[\s\S]*Job scheduled\/assigned/],
  ['Work Orders closeout', dashboard, /id="admin-requests"[\s\S]*Job Materials[\s\S]*Admin Completion Review|data-admin-work-order-inventory-usage[\s\S]*data-admin-completion-review/],
  ['Work Orders action code', bootstrap, /loadAdminRequests[\s\S]*completion|admin-work-orders[\s\S]*review/],
  ['Financial Command Center', finance, /Financial Command Center[\s\S]*data-finance-open-count[\s\S]*data-finance-paid-amount[\s\S]*data-finance-refresh/],
  ['Finance route separation', phase34, /finance:[\s\S]*\.finance-suite[\s\S]*invoices:[\s\S]*#admin-invoices/],
  ['Modern invoices', dashboard, /Modern Invoice Command Center[\s\S]*data-admin-invoice-status-filter[\s\S]*data-admin-invoice-search[\s\S]*data-admin-invoice-list/],
  ['Invoice actions', bootstrap, /bindAdminInvoiceActions[\s\S]*taInvoiceActions[\s\S]*taAdminInvoicePayments/],
  ['Maintenance Plans', dashboard, /class="[^"]*maintenance-suite[\s\S]*HVAC seasonal maintenance[\s\S]*Save maintenance plan/],
  ['Maintenance API load/save', bootstrap, /\/api\/admin\/maintenance-plans[\s\S]*\/api\/client\/maintenance-plans/],
  ['Roles and Users Access Manager', dashboard, /id="admin-access"[\s\S]*data-admin-new-role[\s\S]*data-admin-user-create[\s\S]*data-admin-user-search/],
  ['Worker Jobs', dashboard, /id="worker-jobs"[\s\S]*data-worker-jobs-status[\s\S]*data-worker-job-list/],
  ['Worker Job material closeout', bootstrap, /data-worker-material-use[\s\S]*data-worker-material-release[\s\S]*\/api\/worker\/inventory\/\$\{action\}/],
  ['Worker Mobile', bootstrap, /worker-mobile-card[\s\S]*data-mobile-start-job[\s\S]*data-mobile-complete-job[\s\S]*data-mobile-request-material/],
  ['Photo Docs', dashboard, /photo-doc-suite[\s\S]*Before photos[\s\S]*Progress photos[\s\S]*After photos[\s\S]*Save evidence notes/],
  ['Customer Status', dashboard, /id="customer-experience-center"[\s\S]*Requests[\s\S]*Quotes[\s\S]*Invoices[\s\S]*Maintenance/],
  ['Deployment Health', dashboard, /id="system-readiness"[\s\S]*npm run build[\s\S]*check-netlify-functions[\s\S]*audit:dead-buttons[\s\S]*test:browser/],
];

for (const [name, text, pattern] of moduleChecks) has(text, pattern, `${name} module is incomplete or missing expected controls.`);

if (/Invoice &amp; payment desk|Invoice & payment desk/.test(dashboard)) fail('Old “Invoice & payment desk” label must be replaced/upgraded.');
if (/<span id="finance-command-center" class="dashboard-anchor-alias"/.test(dashboard)) fail('Finance command center must not be shadowed by an old anchor alias.');
if (!/module-completion-2026\.css/.test(dashboard)) fail('Dashboard must include Phase 56 module completion polish CSS.');

const workspaceKeys = [...phase34.matchAll(/^    ['"]?([a-z-]+)['"]?: \{/gm)].map((match) => match[1]);
for (const required of ['overview', 'estimate-review', 'work-orders', 'scheduling', 'finance', 'invoices', 'customer-status', 'worker-jobs', 'worker-mobile', 'photo-docs', 'maintenance', 'roles-users', 'deployment']) {
  if (!workspaceKeys.includes(required)) fail(`Phase 34 router missing workspace key: ${required}.`);
}

if (failures.length) {
  console.error('\nModule completion audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Module completion audit passed: required modules are separated, modernized, and functionally wired.');
