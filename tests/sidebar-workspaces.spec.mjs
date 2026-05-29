import assert from 'node:assert/strict';
import test from 'node:test';
import { assertHtmlPage, readText } from './browser-qa-utils.mjs';

const expectedRoutes = [
  ['Overview', 'overview', '.hero'],
  ['Estimate Review', 'estimate-review', '#estimate-review'],
  ['Work Orders', 'work-orders', '#admin-requests'],
  ['Scheduling', 'scheduling', '#smart-schedule-suite'],
  ['Finance Center', 'finance', '.finance-suite'],
  ['Invoices', 'invoices', '#admin-invoices'],
  ['Customer Status', 'customer-status', '#customer-experience-center'],
  ['Worker Jobs', 'worker-jobs', '#worker-jobs'],
  ['Worker Mobile', 'worker-mobile', '#worker-mobile-field'],
  ['Photo Docs', 'photo-docs', '.photo-doc-suite'],
  ['Maintenance Plans', 'maintenance', '.maintenance-suite'],
  ['Roles & Users', 'roles-users', '#admin-access'],
  ['Deployment Health', 'deployment', '#system-readiness'],
];

test('each sidebar item maps to exactly one correct workspace/module', async () => {
  await assertHtmlPage('public/dashboard/index.html', ['dashboard-phase30-sidebar.js', 'data-dashboard-root']);
  const sidebar = await readText('public/assets/dashboard-phase30-sidebar.js');
  for (const [label, workspace, target] of expectedRoutes) {
    assert.match(sidebar, new RegExp(`label: '${label}'[\\s\\S]*workspace: '${workspace}'[\\s\\S]*target: '${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`), `${label} should map only to ${workspace} at ${target}`);
  }
  assert.match(sidebar, /label: 'Inventory'[\s\S]*workspace: 'inventory'[\s\S]*href: '\/inventory\/'/, 'Inventory should navigate to /inventory/');
});

test('Phase 34 router separates finance, invoices, scheduling, work orders, roles, maintenance, worker, mobile, and photo modules', async () => {
  const phase34 = await readText('public/assets/dashboard-phase34-sidebar-only-workspaces.js');
  assert.match(phase34, /finance:[\s\S]*targets: \['\.finance-suite', '\[data-phase4-finance-suite\]', '#finance-command-center'\]/, 'Finance Center should target Financial Command Center only');
  assert.match(phase34, /invoices:[\s\S]*targets: \['#admin-invoices', '#client-invoices', '\[data-admin-invoices\]', '\[data-client-invoices\]'\]/, 'Invoices should target modern invoice modules only');
  assert.doesNotMatch(phase34.match(/finance: \{[\s\S]*?targets: \[([^\]]*)\]/)?.[1] || '', /admin-invoices|client-invoices/, 'Finance should not include invoice module selectors');
  assert.doesNotMatch(phase34.match(/work-orders: \{[\s\S]*?targets: \[([^\]]*)\]/)?.[1] || '', /worker-jobs|smart-schedule-suite/, 'Work Orders should not include Worker Jobs or Scheduling');
  assert.doesNotMatch(phase34.match(/worker-jobs: \{[\s\S]*?targets: \[([^\]]*)\]/)?.[1] || '', /worker-mobile-field|photo-doc-suite/, 'Worker Jobs should not include Worker Mobile or Photo Docs');
  assert.doesNotMatch(phase34.match(/roles-users: \{[\s\S]*?targets: \[([^\]]*)\]/)?.[1] || '', /maintenance-suite/, 'Roles & Users should not include Maintenance Plans');
});

test('workspace router clears stale tags and prevents duplicate active sidebar highlights', async () => {
  const phase34 = await readText('public/assets/dashboard-phase34-sidebar-only-workspaces.js');
  const css = await readText('public/assets/dashboard-phase34-sidebar-only-workspaces.css');
  assert.match(phase34, /removeAttribute\('data-sidebar-workspace-section'\)/, 'router should clear old workspace tags before retagging');
  assert.match(phase34, /removeAttribute\('aria-current'\)/, 'router should remove inactive aria-current values');
  assert.match(phase34, /setActiveButton/, 'router should centralize active-state updates');
  assert.match(phase34, /scrollWorkspaceTarget[\s\S]*scrollIntoView/, 'router should visibly scroll to the selected module');
  assert.match(phase34, /setWorkspace\(button\.dataset\.sidebarWorkspace, \{ scroll: true, target: button\.dataset\.sidebarTarget/, 'sidebar clicks should request scrolling to their target');
  for (const workspace of ['estimate-review', 'work-orders', 'scheduling', 'finance', 'invoices', 'customer-status', 'worker-jobs', 'worker-mobile', 'photo-docs', 'maintenance', 'roles-users', 'deployment']) {
    assert.match(css, new RegExp(`data-sidebar-workspace="${workspace}"[\\s\\S]*${workspace}`), `CSS should reveal ${workspace}`);
  }
});

test('required modules exist and key buttons have real status/action wiring', async () => {
  const html = await assertHtmlPage('public/dashboard/index.html', ['Modern Invoice Command Center', 'id="smart-schedule-suite"', 'id="worker-mobile-field"']);
  const bootstrap = await readText('public/dashboard/modules/dashboard/bootstrap.js');
  assert.match(html, /data-schedule-dispatch-form[\s\S]*Schedule \/ assign job/, 'Scheduling should include dispatch form');
  assert.match(bootstrap, /data-schedule-dispatch-form[\s\S]*\/api\/admin\/job-requests/, 'Scheduling should call job request API');
  assert.match(html, /data-admin-new-role[\s\S]*data-admin-user-create/, 'Roles & Users should expose create role/user actions');
  assert.match(bootstrap, /data-mobile-request-material[\s\S]*\/api\/worker\/inventory\/request/, 'Worker Mobile request material should call real endpoint');
  assert.match(bootstrap, /data-photo-doc-form[\s\S]*postWorkerAssignmentUpdate/, 'Photo Docs should persist evidence notes');
});

test('mobile quick actions and inventory navigation are preserved', async () => {
  const sidebar = await readText('public/assets/dashboard-phase30-sidebar.js');
  assert.match(sidebar, /mobileQuickActions[\s\S]*Requests[\s\S]*Quotes[\s\S]*Stock[\s\S]*Today[\s\S]*Complete[\s\S]*Profile/, 'mobile quick action bar should keep role-aware actions');
  assert.match(sidebar, /data-mobile-quick-workspace[\s\S]*taSetSidebarWorkspace/, 'mobile quick actions should use workspace routing when available');
  assert.match(sidebar, /href: '\/inventory\/'/, 'Inventory should remain a page navigation');
});

test('dashboard/sidebar workspace files avoid console error strings', async () => {
  const html = await readText('public/dashboard/index.html');
  const sidebar = await readText('public/assets/dashboard-phase30-sidebar.js');
  const phase34 = await readText('public/assets/dashboard-phase34-sidebar-only-workspaces.js');
  assert.doesNotMatch(`${html}\n${sidebar}\n${phase34}`, /url is not defined|Cannot read properties of undefined/, 'workspace code should not contain known console error strings');
});
