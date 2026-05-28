import { readFile, access } from 'node:fs/promises';

const fail = (message) => { throw new Error(message); };
const ok = (message) => console.log(`✓ ${message}`);

const requiredPages = [
  'public/index.html',
  'public/login/index.html',
  'public/dashboard/index.html',
  'public/inventory/index.html',
];

for (const page of requiredPages) {
  await access(page).catch(() => fail(`Required page missing: ${page}`));
}
ok('Required public pages still exist');

const [home, login, dashboard, inventory, polishCss] = await Promise.all([
  readFile('public/index.html', 'utf8'),
  readFile('public/login/index.html', 'utf8'),
  readFile('public/dashboard/index.html', 'utf8'),
  readFile('public/inventory/index.html', 'utf8'),
  readFile('public/assets/ui-polish-2026.css', 'utf8'),
]);

if (!login.includes('/api/auth/magic-link') && !login.includes('magic-link')) {
  fail('Magic link login endpoint/reference is missing from login page.');
}
ok('Magic link login references still exist');

for (const sidebarAsset of [
  '/assets/dashboard-phase30-sidebar.css',
  '/assets/dashboard-phase30-sidebar.js',
  '/assets/dashboard-phase34-sidebar-only-workspaces.css',
  '/assets/dashboard-phase34-sidebar-only-workspaces.js',
]) {
  if (!dashboard.includes(sidebarAsset)) fail(`Dashboard sidebar asset missing: ${sidebarAsset}`);
}
ok('Dashboard sidebar assets are still included');

const sidebarJs = await readFile('public/assets/dashboard-phase30-sidebar.js', 'utf8');
const sidebarWorkspaceJs = await readFile('public/assets/dashboard-phase34-sidebar-only-workspaces.js', 'utf8');
if (!sidebarJs.includes('Deployment Health') || !sidebarJs.includes('#system-readiness')) {
  fail('Dashboard sidebar is missing the developer Deployment Health link.');
}
if (!sidebarWorkspaceJs.includes('Deployment and workflow health') || !sidebarWorkspaceJs.includes('deployment')) {
  fail('Sidebar workspaces are missing the deployment health workspace.');
}
if (!dashboard.includes('Deployment Health')) fail('Dashboard compatibility markers are missing Deployment Health.');
ok('Developer deployment health sidebar area is present');
if (sidebarJs.includes('Jump to the exact area you need without scrolling the whole dashboard.')) {
  fail('Removed sidebar helper copy is still present.');
}
if (!sidebarJs.includes('data-sidebar-collapse') || !sidebarJs.includes('ta_dashboard_sidebar_collapsed') || !sidebarJs.includes('document.addEventListener')) {
  fail('Dashboard sidebar collapse control is missing or not delegated.');
}
if (sidebarJs.includes('>Collapse</button>') || sidebarJs.includes("textContent = collapsed ? 'Expand' : 'Collapse'")) {
  fail('Sidebar collapse control still uses text labels instead of the icon button.');
}
if (!sidebarJs.includes('sidebar-collapse-icon')) {
  fail('Sidebar collapse icon markup is missing.');
}
ok('Sidebar helper copy removal and icon collapse control are present');

const forbiddenTopTabs = [
  'data-admin-command-center',
  'data-client-command-center',
  'data-worker-command-center',
  'workspace-tab-list',
  'old-workspace-tabs',
];
for (const marker of forbiddenTopTabs) {
  if (dashboard.includes(marker)) fail(`Old workspace top-tab marker restored: ${marker}`);
}
ok('Old workspace top tabs were not restored');

for (const [name, html] of Object.entries({ home, login, dashboard, inventory })) {
  if (!html.includes('/assets/ui-polish-2026.css')) fail(`${name} missing UI polish stylesheet include.`);
}
ok('Modern polish CSS is included on target pages');

const sidebarCss = await readFile('public/assets/dashboard-phase30-sidebar.css', 'utf8');
if (!sidebarCss.includes('grid-template-columns: 148px minmax(0, 1fr) !important') || !sidebarCss.includes('.dashboard-sidebar-v2[data-collapsed="true"] .sidebar-nav-link small')) {
  fail('Collapsed sidebar CSS is not strong enough to visibly collapse the sidebar.');
}
const workflowCss = await readFile('public/assets/dashboard-phase3-workflow.css', 'utf8');
const inventoryJs = await readFile('public/assets/dashboard-phase25-inventory-assets.js', 'utf8');
if (!workflowCss.includes('overflow-x: visible') || !workflowCss.includes('repeat(4, minmax(0, 1fr))')) {
  fail('Work-order pipeline board still allows horizontal scrollbar layout.');
}
if (!inventoryJs.includes("section.dataset.sidebarWorkspaceSection='settings'")) {
  fail('Inventory suite is not scoped to the settings sidebar workspace.');
}
if (dashboard.includes('data-admin-inventory-list')) {
  fail('Dashboard overview still includes the admin inventory list markup.');
}
if (!dashboard.includes('data-admin-access-workspace') || !dashboard.includes('Open role/user manager')) {
  fail('Dedicated Roles & Users workspace is missing from the dashboard.');
}
if (!sidebarJs.includes("label: 'Roles & Users', target: '#admin-access'")) {
  fail('Sidebar Roles & Users item does not target the dedicated workspace.');
}
if (!sidebarWorkspaceJs.includes("document.body.dataset.sidebarWorkspace = 'overview'")) {
  fail('Sidebar workspace script does not initialize Overview before delayed boot.');
}
ok('Pipeline and inventory workspace polish checks are present');

for (const removedWorkOrderCopy of [
  'New estimate requests from the public form appear here for admins after sign-in.',
  'data-admin-pipeline-summary',
  'data-admin-requests-status',
  'data-admin-workspace-target="work-orders"',
]) {
  if (dashboard.includes(removedWorkOrderCopy)) fail(`Removed work-order summary UI is still present: ${removedWorkOrderCopy}`);
}
ok('Legacy work-order summary panel is removed');

const requiredCssMarkers = [
  '2026 UI polish layer',
  '[data-admin-activity-list]',
  '[data-admin-user-search-results]',
  '.admin-access-workspace',
  '.admin-access-workspace-card',
  '[data-admin-inventory-list]',
  '.inventory-card',
  '.admin-request-modal-panel',
];
for (const marker of requiredCssMarkers) {
  if (!polishCss.includes(marker)) fail(`Polish CSS missing required marker: ${marker}`);
}
ok('Inventory/admin/activity polish selectors are present');

const targetPages = { home, login, dashboard, inventory };
for (const [name, html] of Object.entries(targetPages)) {
  if (/class="[^"]*(?:workspace-tabs|top-tabs|tab-nav)[^"]*"/i.test(html)) {
    fail(`${name} contains obvious old top-tab navigation classes.`);
  }
}
ok('No obvious old top-tab navigation classes remain in target pages');

if (/\.nav-links\s+\.btn-soft\s*\{\s*background:\s*(?:#fff|white|rgba\(255,255,255,\.8)/i.test(polishCss)) {
  fail('Polish CSS reintroduced old white pill nav styling.');
}
ok('No obvious old white pill nav styling in polish layer');

console.log('\nUI polish audit passed.');
