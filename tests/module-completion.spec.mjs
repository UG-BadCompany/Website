import assert from 'node:assert/strict';
import test from 'node:test';
import { assertHtmlPage, readText } from './browser-qa-utils.mjs';

test('Finance Center opens the newer Financial Command Center, not invoice desk', async () => {
  const finance = await readText('public/assets/dashboard-phase4-finance.js');
  const phase34 = await readText('public/assets/dashboard-phase34-sidebar-only-workspaces.js');
  assert.match(finance, /Financial Command Center[\s\S]*data-finance-open-count[\s\S]*data-finance-paid-amount[\s\S]*data-finance-refresh/, 'Financial Command Center should include KPIs and refresh');
  assert.match(phase34, /finance:[\s\S]*\.finance-suite[\s\S]*\.finance-command-panel/, 'Finance sidebar should map to finance command panels');
  assert.doesNotMatch(phase34.match(/finance: \{[\s\S]*?targets: \[([^\]]*)\]/)?.[1] || '', /#admin-invoices/, 'Finance should not route to admin invoices');
});

test('Invoices are modernized and separate from finance', async () => {
  const html = await assertHtmlPage('public/dashboard/index.html', ['Modern Invoice Command Center', 'data-admin-invoice-status-filter']);
  const bootstrap = await readText('public/dashboard/modules/dashboard/bootstrap.js');
  assert.doesNotMatch(html, /Invoice &amp; payment desk|Invoice & payment desk/, 'old invoice desk label should not be present');
  assert.match(html, /data-admin-invoice-search[\s\S]*data-admin-invoice-list/, 'invoice module should include search and list');
  assert.match(bootstrap, /bindAdminInvoiceActions[\s\S]*taInvoiceActions[\s\S]*taAdminInvoicePayments/, 'invoice module should have action/payment bindings');
});

test('operations modules are completed with useful workflows', async () => {
  const html = await readText('public/dashboard/index.html');
  const bootstrap = await readText('public/dashboard/modules/dashboard/bootstrap.js');
  assert.match(html, /id="smart-schedule-suite"[\s\S]*Upcoming jobs[\s\S]*Unscheduled jobs[\s\S]*Schedule \/ assign job/, 'Scheduling should be useful');
  assert.match(html, /id="admin-requests"[\s\S]*Job Materials|data-admin-work-order-inventory-usage/, 'Work Orders should show materials closeout');
  assert.match(html, /class="[^"]*maintenance-suite[\s\S]*HVAC seasonal maintenance[\s\S]*Save maintenance plan/, 'Maintenance should support recurring plan create/update');
  assert.match(html, /id="admin-access"[\s\S]*data-admin-new-role[\s\S]*data-admin-user-create[\s\S]*data-admin-user-search/, 'Roles & Users should expose access manager flows');
  assert.match(bootstrap, /\/api\/admin\/maintenance-plans[\s\S]*\/api\/client\/maintenance-plans/, 'Maintenance should load admin/client APIs');
});

test('field modules are separated and actionable', async () => {
  const html = await readText('public/dashboard/index.html');
  const bootstrap = await readText('public/dashboard/modules/dashboard/bootstrap.js');
  assert.match(html, /id="worker-jobs"[\s\S]*data-worker-job-list/, 'Worker Jobs should have assigned job list');
  assert.match(bootstrap, /data-worker-material-use[\s\S]*data-worker-material-release[\s\S]*\/api\/worker\/inventory\/\$\{action\}/, 'Worker Jobs should update material use/release');
  assert.match(bootstrap, /worker-mobile-card[\s\S]*data-mobile-start-job[\s\S]*data-mobile-complete-job[\s\S]*data-mobile-request-material/, 'Worker Mobile should have phone-first actions');
  assert.match(html, /photo-doc-suite[\s\S]*Before photos[\s\S]*Progress photos[\s\S]*After photos[\s\S]*Save evidence notes/, 'Photo Docs should have evidence workflow');
  assert.match(html, /id="worker-ai-troubleshooting"[^>]*data-views="worker"[\s\S]*System \/ Trade[\s\S]*Equipment \/ Component[\s\S]*Issue \/ Complaint[\s\S]*Safety Conditions[\s\S]*Generate Troubleshooting Plan/, 'AI Troubleshooting should expose all core field assistant inputs');
  assert.match(bootstrap, /data-ai-troubleshooting-form[\s\S]*\/api\/worker\/ai-troubleshooting[\s\S]*data-ai-troubleshooting-copy[\s\S]*save_notes/, 'AI Troubleshooting should submit, copy, and save notes through real handlers');
});

test('customer status and deployment health are useful and safe', async () => {
  const html = await readText('public/dashboard/index.html');
  assert.match(html, /id="customer-experience-center"[\s\S]*Requests[\s\S]*Quotes[\s\S]*Invoices[\s\S]*Maintenance/, 'Customer Status should summarize customer timeline areas');
  assert.match(html, /id="system-readiness"[\s\S]*npm run build[\s\S]*check-netlify-functions[\s\S]*audit:dead-buttons[\s\S]*test:browser/, 'Deployment Health should list useful audit commands');
  assert.doesNotMatch(html, /DATABASE_URL=.*|SQUARE_ACCESS_TOKEN=.*|RESEND_API_KEY=.*/, 'Deployment Health should not expose secrets');
});
