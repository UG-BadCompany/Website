import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const dashboard = read('public/dashboard/index.html');
const sidebar = read('public/assets/dashboard-phase30-sidebar.js');
const phase34 = read('public/assets/dashboard-phase34-sidebar-only-workspaces.js');
const phase34Css = read('public/assets/dashboard-phase34-sidebar-only-workspaces.css');
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
  ['Inventory', 'inventory', '/inventory/'],
  ['Maintenance Plans', 'maintenance', '.maintenance-suite'],
  ['Roles & Users', 'roles-users', '#admin-access'],
  ['Deployment Health', 'deployment', '#system-readiness'],
];

const navItems = [...sidebar.matchAll(/\{ group: '([^']+)', label: '([^']+)'[\s\S]*?\}/g)].map((match) => ({ raw: match[0], group: match[1], label: match[2] }));
if (navItems.length !== expected.length) fail(`Expected ${expected.length} sidebar items, found ${navItems.length}.`);

const labels = new Set();
for (const item of navItems) {
  if (labels.has(item.label)) fail(`Duplicate sidebar item label: ${item.label}.`);
  labels.add(item.label);
  const href = item.raw.match(/href: '([^']+)'/)?.[1] || '';
  const target = item.raw.match(/target: '([^']+)'/)?.[1] || '';
  const workspace = item.raw.match(/workspace: '([^']+)'/)?.[1] || '';
  const expectedItem = expected.find(([label]) => label === item.label);
  if (!expectedItem) { fail(`Unexpected sidebar item: ${item.label}.`); continue; }
  const [, expectedWorkspace, expectedTarget] = expectedItem;
  if (workspace !== expectedWorkspace) fail(`${item.label}: expected workspace ${expectedWorkspace}, found ${workspace || 'none'}.`);
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
has(phase34, /finance:[\s\S]*targets: \['\.finance-suite', '\[data-phase4-finance-suite\]', '#finance-command-center'\]/, 'Finance workspace must target only the Financial Command Center module.');
has(phase34, /invoices:[\s\S]*targets: \['#admin-invoices', '#client-invoices', '\[data-admin-invoices\]', '\[data-client-invoices\]'\]/, 'Invoices workspace must target only invoice modules.');
has(phase34, /'worker-mobile':[\s\S]*#worker-mobile-field/, 'Worker Mobile workspace must be separate from Worker Jobs.');
has(phase34, /'roles-users':[\s\S]*#admin-access/, 'Roles & Users workspace must map to Access Manager only.');
has(phase34Css, /body\[data-sidebar-workspace="finance"\][\s\S]*data-sidebar-workspace-section~="finance"/, 'Phase 34 CSS must reveal Finance workspace.');
has(phase34Css, /body\[data-sidebar-workspace="worker-mobile"\][\s\S]*data-sidebar-workspace-section~="worker-mobile"/, 'Phase 34 CSS must reveal Worker Mobile workspace.');
has(phase34Css, /sidebar-nav-link\[aria-current="true"\]/, 'Sidebar CSS must include a single active-state style.');
has(phase34, /removeAttribute\('aria-current'\)/, 'Workspace routing must remove inactive aria-current values to prevent duplicate highlights.');

const forbiddenCombos = [
  ['finance', '#admin-invoices'],
  ['finance', '[data-admin-invoices]'],
  ['invoices', '[data-phase4-finance-suite]'],
  ['work-orders', '#worker-jobs'],
  ['worker-jobs', '#worker-mobile-field'],
  ['worker-jobs', '.photo-doc-suite'],
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
