import assert from 'node:assert/strict';
import test from 'node:test';
import { assertHtmlPage, readText } from './browser-qa-utils.mjs';

const expectedRoutes = [
  ['Overview', 'overview', '.hero'],
  ['Estimate Review', 'estimate-review', '#estimate-review'],
  ['Work Orders', 'work-orders', '#admin-requests'],
  ['Scheduling', 'scheduling', '#smart-schedule-suite'],
  ['Requests', 'client-requests', '#client-requests'],
  ['Quotes', 'client-quotes', '#client-quotes'],
  ['Invoices', 'client-invoices', '#client-invoices'],
  ['Finance Center', 'finance', '.finance-suite'],
  ['Invoices', 'invoices', '#admin-invoices'],
  ['Customer Status', 'customer-status', '#customer-experience-center'],
  ['Worker Jobs', 'worker-jobs', '#worker-jobs'],
  ['Worker Mobile', 'worker-mobile', '#worker-mobile-field'],
  ['AI Troubleshooting', 'ai-troubleshooting', '#worker-ai-troubleshooting'],
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
  assert.match(sidebar, /label: 'Profile'[\s\S]*action: 'client-profile'[\s\S]*views: \['client'\]/, 'Profile should be a client-only profile modal action');
});

test('Phase 34 router separates finance, invoices, scheduling, work orders, roles, maintenance, worker, mobile, and photo modules', async () => {
  const phase34 = await readText('public/assets/dashboard-phase34-sidebar-only-workspaces.js');
  assert.match(phase34, /finance:[\s\S]*targets: \['\.finance-suite', '\[data-phase4-finance-suite\]', '#finance-command-center', '\.finance-command-panel'\]/, 'Finance Center should target Financial Command Center only');
  assert.match(phase34, /invoices:[\s\S]*targets: \['#admin-invoices', '\[data-admin-invoices\]'\]/, 'Invoices should target modern invoice modules only');
  assert.doesNotMatch(phase34.match(/finance: \{[\s\S]*?targets: \[([^\]]*)\]/)?.[1] || '', /admin-invoices|client-invoices/, 'Finance should not include invoice module selectors');
  assert.doesNotMatch(phase34.match(/work-orders: \{[\s\S]*?targets: \[([^\]]*)\]/)?.[1] || '', /worker-jobs|smart-schedule-suite/, 'Work Orders should not include Worker Jobs or Scheduling');
  assert.doesNotMatch(phase34.match(/worker-jobs: \{[\s\S]*?targets: \[([^\]]*)\]/)?.[1] || '', /worker-mobile-field|worker-ai-troubleshooting|photo-doc-suite/, 'Worker Jobs should not include Worker Mobile, AI Troubleshooting, or Photo Docs');
  assert.match(phase34, /'ai-troubleshooting':[\s\S]*targets: \['#worker-ai-troubleshooting', '\[data-worker-ai-troubleshooting\]', '\.ai-troubleshooting-suite'\]/, 'AI Troubleshooting should target only its assistant module');
  assert.doesNotMatch(phase34.match(/ai-troubleshooting: \{[\s\S]*?targets: \[([^\]]*)\]/)?.[1] || '', /worker-jobs|worker-mobile-field|photo-doc-suite/, 'AI Troubleshooting should not target other field modules');
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
  for (const workspace of ['estimate-review', 'work-orders', 'client-requests', 'client-quotes', 'client-invoices', 'scheduling', 'finance', 'invoices', 'customer-status', 'worker-jobs', 'worker-mobile', 'ai-troubleshooting', 'photo-docs', 'maintenance', 'roles-users', 'deployment']) {
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
  assert.match(html, /id="worker-ai-troubleshooting"[\s\S]*data-ai-troubleshooting-form[\s\S]*Generate Troubleshooting Plan/, 'AI Troubleshooting should include a real form and generate button');
  assert.match(bootstrap, /data-ai-troubleshooting-form[\s\S]*\/api\/worker\/ai-troubleshooting[\s\S]*data-ai-troubleshooting-copy[\s\S]*save_notes/, 'AI Troubleshooting should call the real endpoint, copy plans, and save job notes');
  assert.match(bootstrap, /data-photo-doc-form[\s\S]*postWorkerAssignmentUpdate/, 'Photo Docs should persist evidence notes');
  assert.match(html, /id="worker-ai-troubleshooting"[^>]*data-views="worker admin"|data-views="admin worker"[^>]*id="worker-ai-troubleshooting"/, 'AI Troubleshooting should be visible to worker and admin views');
});

test('mobile quick actions and inventory navigation are preserved', async () => {
  const sidebar = await readText('public/assets/dashboard-phase30-sidebar.js');
  assert.match(sidebar, /mobileQuickActions[\s\S]*Requests[\s\S]*Quotes[\s\S]*Stock[\s\S]*Today[\s\S]*Troubleshoot[\s\S]*Complete[\s\S]*Profile/, 'mobile quick action bar should keep role-aware actions');
  assert.match(sidebar, /label: 'Troubleshoot'[\s\S]*workspace: 'ai-troubleshooting'[\s\S]*views: \['worker', 'admin'\]/, 'Troubleshoot quick action should be available for worker and admin');
  assert.match(sidebar, /label: 'Request'[\s\S]*workspace: 'client-requests'[\s\S]*views: \['client'\]/, 'Client mobile Request should route to client requests');
  assert.match(sidebar, /label: 'Profile'[\s\S]*action: 'client-profile'[\s\S]*views: \['client'\]/, 'Client mobile Profile should open profile modal');
  assert.match(sidebar, /data-mobile-quick-workspace[\s\S]*taSetSidebarWorkspace/, 'mobile quick actions should use workspace routing when available');
  assert.match(sidebar, /href: '\/inventory\/'/, 'Inventory should remain a page navigation');
});


test('role switcher remains owned by bootstrap and visible after sidebar mounts', async () => {
  const html = await readText('public/dashboard/index.html');
  const sidebar = await readText('public/assets/dashboard-phase30-sidebar.js');
  const phase31 = await readText('public/assets/dashboard-phase31-strict-role-views.js');
  const phase34 = await readText('public/assets/dashboard-phase34-sidebar-only-workspaces.js');
  const phase34Css = await readText('public/assets/dashboard-phase34-sidebar-only-workspaces.css');
  const sidebarCss = await readText('public/assets/dashboard-phase30-sidebar.css');
  const bootstrap = await readText('public/dashboard/modules/dashboard/bootstrap.js');

  assert.match(html, /data-view-switcher[\s\S]*data-view-button="admin"[\s\S]*data-view-button="client"[\s\S]*data-view-button="worker"/, 'role switcher and admin/client/worker buttons should remain in dashboard markup');
  assert.match(bootstrap, /window\.taSetDashboardView\s*=\s*\(view\)/, 'bootstrap should own taSetDashboardView');
  assert.doesNotMatch(phase31, /window\.taSetDashboardView\s*=/, 'Phase 31 should not replace taSetDashboardView');
  assert.match(sidebar, /root\.classList\.add\('dashboard-shell-v2', 'dashboard-workspace-v2'\)/, 'Phase 30 should decorate the existing root instead of wrapping/moving hero');
  assert.doesNotMatch(sidebar, /originalChildren|workspace\.appendChild|appendChild\(child\)/, 'Phase 30 should not move original dashboard children');
  assert.doesNotMatch(phase34, /targets:\s*\[[^\]]*\.hero|\['\.hero'/, 'Phase 34 should never target .hero for workspace tagging');
  assert.match(phase34, /overview:[\s\S]*targets: \['#executive-overview', '\.executive-suite', '\[data-overview-workspace\]'\]/, 'overview workspace should use non-hero overview targets');
  assert.match(phase34Css, /body\[data-sidebar-workspace\] \.dashboard-workspace-v2 \[data-sidebar-workspace-section\]/, 'Phase 34 CSS should scope hiding inside dashboard workspace');
  assert.doesNotMatch(phase34Css, /body\[data-sidebar-workspace\] \[data-sidebar-workspace-section\]/, 'Phase 34 CSS should not globally hide workspace sections');
  assert.match(sidebarCss, /\.dashboard-sidebar-v2 \{[\s\S]*max-height:\s*none;[\s\S]*overflow:\s*visible;/, 'desktop sidebar should not have an inner scrollbar');
  assert.match(sidebarCss, /@media \(max-width:\s*980px\)[\s\S]*\.dashboard-sidebar-v2 \{[\s\S]*overflow:\s*auto;/, 'mobile sidebar drawer should still be scrollable');
});

test('dashboard/sidebar workspace files avoid console error strings', async () => {
  const html = await readText('public/dashboard/index.html');
  const sidebar = await readText('public/assets/dashboard-phase30-sidebar.js');
  const phase34 = await readText('public/assets/dashboard-phase34-sidebar-only-workspaces.js');
  assert.doesNotMatch(`${html}\n${sidebar}\n${phase34}`, /url is not defined|Cannot read properties of undefined/, 'workspace code should not contain known console error strings');
});
