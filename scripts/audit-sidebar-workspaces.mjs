import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const dashboard = read('public/dashboard/index.html');
const sidebar = read('public/assets/dashboard-phase30-sidebar.js');
const phase34 = read('public/assets/dashboard-phase34-sidebar-only-workspaces.js');
const phase34Css = read('public/assets/dashboard-phase34-sidebar-only-workspaces.css');
const phase30Css = read('public/assets/dashboard-phase30-sidebar.css');
const phase31 = read('public/assets/dashboard-phase31-strict-role-views.js');
const bootstrap = read('public/dashboard/modules/dashboard/bootstrap.js');
const financeJs = read('public/assets/dashboard-phase4-finance.js');
const searchableMarkup = `${dashboard}\n${financeJs}\n${phase34}`;

const fail = (message) => failures.push(message);
const has = (text, pattern, message) => { if (!pattern.test(text)) fail(message); };
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const selectorExists = (selector) => {
  if (!selector) return false;
  if (selector.startsWith('#')) return new RegExp(`id=["']${escapeRegex(selector.slice(1))}["']`).test(searchableMarkup);
  if (selector.startsWith('.')) {
    const className = escapeRegex(selector.slice(1));
    return new RegExp(`class(?:Name)?\\s*=\\s*[\"'][^\"']*${className}[^\"']*[\"']`).test(searchableMarkup);
  }
  if (selector.startsWith('[')) return searchableMarkup.includes(selector.slice(1, -1).split('=')[0]);
  return searchableMarkup.includes(selector.replace(/[\[\]'"#.]/g, ''));
};

const expected = [
  ['Overview', 'overview', '.executive-suite'],
  ['Estimate Review', 'estimate-review', '#estimate-review'],
  ['Work Orders', 'work-orders', '#admin-requests'],
  ['Scheduling', 'scheduling', '#smart-schedule-suite'],
  ['Schedule / Route', 'scheduling', '#worker-route-suite'],
  ['Requests', 'client-requests', '#client-requests'],
  ['Quotes', 'client-quotes', '#client-quotes'],
  ['Invoices', 'client-invoices', '#client-invoices'],
  ['Profile', '', 'client-profile'],
  ['Finance Center', 'finance', '.finance-suite'],
  ['Invoices', 'invoices', '#admin-invoices'],
  ['Customers', 'customers', '#customer-experience-center'],
  ['Worker Jobs', 'worker-jobs', '#worker-jobs'],
  ['Worker Mobile', 'worker-mobile', '#worker-mobile-field'],
  ['AI Troubleshooting', 'ai-troubleshooting', '#worker-ai-troubleshooting'],
  ['Photo Docs', 'photo-docs', '.photo-doc-suite'],
  ['Inventory', 'inventory', '/inventory/'],
  ['Project Updates', 'maintenance', '.maintenance-suite'],
  ['Roles & Users', 'roles-users', '#admin-access'],
  ['Deployment Health', 'deployment', '#system-readiness'],
];

const navItems = [...sidebar.matchAll(/\{ group: '([^']+)', label: '([^']+)'[\s\S]*?\}/g)].map((match) => ({ raw: match[0], group: match[1], label: match[2] }));
if (navItems.length !== expected.length) fail(`Expected ${expected.length} sidebar items, found ${navItems.length}.`);

const labels = new Set();
for (const item of navItems) {
  const labelKey = `${item.group}:${item.label}`;
  if (labels.has(labelKey)) fail(`Duplicate sidebar item label in ${item.group}: ${item.label}.`);
  labels.add(labelKey);
  const href = item.raw.match(/href: '([^']+)'/)?.[1] || '';
  const target = item.raw.match(/target: '([^']+)'/)?.[1] || '';
  const action = item.raw.match(/action: '([^']+)'/)?.[1] || '';
  const workspace = item.raw.match(/workspace: '([^']+)'/)?.[1] || '';
  const expectedItem = expected.find(([label, workspace]) => label === item.label && workspace === (item.raw.match(/workspace: '([^']+)'/)?.[1] || '')) || expected.find(([label]) => label === item.label);
  if (!expectedItem) { fail(`Unexpected sidebar item: ${item.label}.`); continue; }
  const [, expectedWorkspace, expectedTarget] = expectedItem;
  if (workspace !== expectedWorkspace) fail(`${item.label}: expected workspace ${expectedWorkspace || '(none)'}, found ${workspace || 'none'}.`);
  if (!expectedWorkspace && action !== expectedTarget) fail(`${item.label}: expected action ${expectedTarget}, found ${action || 'none'}.`);
  if (!expectedWorkspace) continue;
  if (href) {
    if (href !== expectedTarget) fail(`${item.label}: expected href ${expectedTarget}, found ${href}.`);
    if (href === '/inventory/' && !existsSync(path.join(root, 'public/inventory/index.html'))) fail('Inventory href points to /inventory/ but public inventory page is missing.');
    continue;
  }
  if (target !== expectedTarget) fail(`${item.label}: expected target ${expectedTarget}, found ${target || 'none'}.`);
  if (!selectorExists(target)) fail(`${item.label}: target ${target} does not exist in dashboard markup or mounted module source.`);
}

has(sidebar, /data-sidebar-workspace="\$\{item\.workspace/, 'Rendered sidebar buttons must carry exactly one workspace key.');
has(sidebar, /mobileQuickActions[\s\S]*href: '\/inventory\/'/, 'Phase 55 mobile quick action bar must preserve Inventory navigation.');
has(phase34, /root\.querySelectorAll\('\[data-sidebar-workspace-section\]'\)[\s\S]*removeAttribute\('data-sidebar-workspace-section'\)/, 'Phase 34 must clear stale workspace tags before retagging.');
has(dashboard, /data-view-switcher[\s\S]*data-view-button="admin"[\s\S]*data-view-button="client"[\s\S]*data-view-button="worker"/, 'Dashboard role switcher and admin/client/worker buttons must remain in the DOM.');
has(bootstrap, /window\.taSetDashboardView\s*=\s*\(view\)/, 'bootstrap.js must remain the owner of window.taSetDashboardView.');
has(bootstrap, /taSetSidebarWorkspace\?\.\('overview'/, 'Dashboard view switching should reset sidebar workspace to overview to avoid stale hidden modules.');
has(sidebar, /root\.classList\.add\('dashboard-shell-v2', 'dashboard-workspace-v2'\)/, 'Phase 30 must decorate the dashboard root instead of moving .hero into a new wrapper.');
if (/originalChildren|appendChild\(child\)|workspace\.appendChild/.test(sidebar)) fail('Phase 30 must not move original dashboard children or .hero.');
if (/window\.taSetDashboardView\s*=/.test(phase31)) fail('Phase 31 must not replace window.taSetDashboardView or own role switching.');
if (/\['\.hero'|targets:\s*\[[^\]]*\.hero/.test(phase34)) fail('Phase 34 overview targets must not include .hero.');
has(phase34, /overview:[\s\S]*targets: \['#executive-overview', '\.executive-suite', '\[data-overview-workspace\]'\]/, 'Phase 34 overview targets must be non-hero overview modules only.');
has(phase34, /finance:[\s\S]*targets: \['\.finance-suite', '\[data-phase4-finance-suite\]', '#finance-command-center', '\.finance-command-panel'\]/, 'Finance workspace must target only the Financial Command Center module.');
has(phase34, /invoices:[\s\S]*targets: \['#admin-invoices', '\[data-admin-invoices\]'\]/, 'Invoices workspace must target only admin invoice modules.');
has(phase34, /'worker-mobile':[\s\S]*#worker-mobile-field/, 'Worker Mobile workspace must be separate from Worker Jobs.');
has(phase34, /'ai-troubleshooting':[\s\S]*targets: \['#worker-ai-troubleshooting', '\[data-worker-ai-troubleshooting\]', '\.ai-troubleshooting-suite'\]/, 'AI Troubleshooting workspace must target only its assistant module.');
has(phase34, /'roles-users':[\s\S]*#admin-access/, 'Roles & Users workspace must map to Access Manager only.');
has(phase34Css, /body\[data-sidebar-workspace\] \.dashboard-workspace-v2 \[data-sidebar-workspace-section\]/, 'Phase 34 CSS must scope workspace hiding inside .dashboard-workspace-v2.');
if (/body\[data-sidebar-workspace\] \[data-sidebar-workspace-section\]/.test(phase34Css)) fail('Phase 34 CSS must not globally hide workspace sections outside .dashboard-workspace-v2.');
if (/hero[\s\S]*data-sidebar-workspace-section/.test(phase34Css)) fail('Phase 34 CSS must not hide .hero.');
has(phase34Css, /body\[data-sidebar-workspace="finance"\] \.dashboard-workspace-v2[\s\S]*data-sidebar-workspace-section~="finance"/, 'Phase 34 CSS must reveal Finance workspace.');
has(phase34Css, /body\[data-sidebar-workspace="worker-mobile"\] \.dashboard-workspace-v2[\s\S]*data-sidebar-workspace-section~="worker-mobile"/, 'Phase 34 CSS must reveal Worker Mobile workspace.');
has(phase34Css, /body\[data-sidebar-workspace="ai-troubleshooting"\] \.dashboard-workspace-v2[\s\S]*data-sidebar-workspace-section~="ai-troubleshooting"/, 'Phase 34 CSS must reveal AI Troubleshooting workspace.');
has(phase34Css, /body\[data-sidebar-workspace="client-requests"\] \.dashboard-workspace-v2[\s\S]*data-sidebar-workspace-section~="client-requests"/, 'Phase 34 CSS must reveal Client Requests workspace.');
has(phase30Css, /\.dashboard-sidebar-v2 \{[\s\S]*max-height:\s*none;[\s\S]*overflow:\s*visible;/, 'Desktop sidebar must not use an inner scrollbar.');
has(phase30Css, /@media \(max-width:\s*980px\)[\s\S]*\.dashboard-sidebar-v2 \{[\s\S]*overflow:\s*auto;/, 'Mobile sidebar drawer may scroll.');
has(phase34Css, /sidebar-nav-link\[aria-current="true"\]/, 'Sidebar CSS must include a single active-state style.');
has(phase34, /removeAttribute\('aria-current'\)/, 'Workspace routing must remove inactive aria-current values to prevent duplicate highlights.');
has(phase34, /scrollWorkspaceTarget[\s\S]*scrollIntoView/, 'Sidebar workspace clicks must scroll to the selected module.');
has(phase34, /setWorkspace\(selectedWorkspace, \{ scroll: true, target: button\.dataset\.sidebarTarget \|\| button\.dataset\.mobileQuickTarget/, 'Sidebar click handler must call setWorkspace with scroll enabled for sidebar and mobile quick actions.');

const forbiddenCombos = [
  ['finance', '#admin-invoices'],
  ['client-requests', '#admin-requests'],
  ['client-quotes', '#estimate-review'],
  ['client-invoices', '#admin-invoices'],
  ['finance', '[data-admin-invoices]'],
  ['invoices', '[data-phase4-finance-suite]'],
  ['work-orders', '#worker-jobs'],
  ['worker-jobs', '#worker-mobile-field'],
  ['worker-jobs', '.photo-doc-suite'],
  ['worker-jobs', '#worker-ai-troubleshooting'],
  ['worker-mobile', '#worker-ai-troubleshooting'],
  ['ai-troubleshooting', '#worker-jobs'],
  ['ai-troubleshooting', '#worker-mobile-field'],
  ['ai-troubleshooting', '.photo-doc-suite'],
  ['roles-users', '.maintenance-suite'],
  ['maintenance', '#admin-access'],
];
for (const [workspace, selector] of forbiddenCombos) {
  const block = phase34.match(new RegExp(`${workspace.replace('-', '\\-')}: \\{[\\s\\S]*?targets: \\[([^\\]]*)\\]`))?.[1] || '';
  if (block.includes(selector)) fail(`${workspace} workspace must not target ${selector}.`);
}

has(dashboard, /data-schedule-dispatch-form[\s\S]*Schedule \/ assign job/, 'Scheduling workspace must include a real dispatch form.');
has(dashboard, /Worker Mobile Field Mode[\s\S]*data-worker-mobile-list/, 'Worker Mobile workspace must include job list/status UI.');
has(dashboard, /data-photo-doc-form[\s\S]*Save evidence notes/, 'Photo Docs workspace must include an evidence form.');
has(dashboard, /id="worker-ai-troubleshooting"[\s\S]*data-ai-troubleshooting-form[\s\S]*Generate Troubleshooting Plan/, 'AI Troubleshooting workspace must include a real assistant form.');
has(sidebar, /mobileQuickActions[\s\S]*Troubleshoot[\s\S]*ai-troubleshooting[\s\S]*views: \['worker'\]/, 'Worker mobile quick actions must include Troubleshoot without exposing it to admin.');
has(sidebar, /label: 'Requests'[\s\S]*workspace: 'client-requests'[\s\S]*views: \['client'\]/, 'Client Requests sidebar item must route to client requests only.');
has(sidebar, /label: 'Profile'[\s\S]*action: 'client-profile'[\s\S]*views: \['client'\]/, 'Client Profile sidebar item must open the profile modal only.');
has(phase34, /const selectedWorkspace = button\.dataset\.sidebarWorkspace \|\| button\.dataset\.mobileQuickWorkspace/, 'Phase 34 must derive selected workspace from sidebar or mobile quick action buttons.');
has(phase34, /setWorkspace\(selectedWorkspace/, 'Sidebar click handler must use the selected button workspace.');
if (/setWorkspace\(workspace\)/.test(phase34)) fail('Phase 34 must not call setWorkspace(workspace) with an undefined workspace variable.');
has(dashboard, /data-maintenance-plan-form[\s\S]*Save maintenance plan/, 'Maintenance workspace must include plan form.');
has(dashboard, /Modern Invoice Command Center[\s\S]*data-admin-invoice-status-filter[\s\S]*data-admin-invoice-search/, 'Invoices module must be the modern invoice command center with filters/search.');
has(dashboard, /mobile-field-ux\.css/, 'Phase 55 mobile CSS must remain included.');
has(' '+read('package.json'), /"test:sidebar-workspaces"/, 'package.json must include test:sidebar-workspaces.');

if (failures.length) {
  console.error('\nSidebar workspace audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Sidebar workspace audit passed: ${navItems.length} sidebar items map to exactly one workspace each.`);
