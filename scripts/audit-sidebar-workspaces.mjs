import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const dashboard = read('public/dashboard/index.html');
const sidebar = read('public/assets/dashboard-phase30-sidebar.js');
const phase34 = read('public/assets/dashboard-phase34-sidebar-only-workspaces.js');

const fail = (message) => failures.push(message);
const has = (text, pattern, message) => { if (!pattern.test(text)) fail(message); };

const selectorExists = (selector) => {
  if (!selector) return false;
  if (selector.startsWith('#')) return new RegExp(`id=["']${selector.slice(1)}["']`).test(dashboard);
  if (selector.startsWith('.')) return new RegExp(`class=["'][^"']*${selector.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"']*["']`).test(dashboard);
  if (selector === '.hero') return /class=["'][^"']*hero[^"']*["']/.test(dashboard);
  return dashboard.includes(selector.replace(/[\[\]'"#.]/g, ''));
};

const navItems = [...sidebar.matchAll(/\{ group: '([^']+)', label: '([^']+)'[\s\S]*?\}/g)].map((match) => ({ raw: match[0], group: match[1], label: match[2] }));
if (!navItems.length) fail('No sidebar nav items were found.');

for (const item of navItems) {
  const href = item.raw.match(/href: '([^']+)'/)?.[1] || '';
  const target = item.raw.match(/target: '([^']+)'/)?.[1] || '';
  const action = item.raw.match(/action: '([^']+)'/)?.[1] || '';
  if (href) {
    if (href === '/inventory/' && !existsSync(path.join(root, 'public/inventory/index.html'))) fail('Inventory href points to /inventory/ but public inventory page is missing.');
    if (!href.startsWith('/')) fail(`${item.label}: href ${href} should be a local route.`);
    continue;
  }
  if (action) continue;
  if (!target) fail(`${item.label}: sidebar item has no href, target, or action.`);
  else if (!selectorExists(target)) fail(`${item.label}: target ${target} does not exist in public/dashboard/index.html.`);
}

has(sidebar, /label: 'Inventory'[\s\S]*href: '\/inventory\/'/, 'Inventory sidebar item must navigate to /inventory/.');
has(sidebar, /label: 'Scheduling'[\s\S]*target: '#smart-schedule-suite'|label: 'Scheduling'[\s\S]*target: '\.smart-schedule-suite'/, 'Scheduling sidebar target must point to the schedule workspace.');
has(sidebar, /label: 'Worker Mobile'[\s\S]*target: '#worker-mobile-field'/, 'Worker Mobile sidebar target must point to #worker-mobile-field.');
has(sidebar, /label: 'Photo Docs'[\s\S]*target: '\.photo-doc-suite'/, 'Photo Docs sidebar target must point to .photo-doc-suite.');
has(sidebar, /label: 'Maintenance Plans'[\s\S]*target: '\.maintenance-suite'/, 'Maintenance Plans sidebar target must point to .maintenance-suite.');
has(sidebar, /label: 'Deployment Health'[\s\S]*target: '#system-readiness'/, 'Deployment Health sidebar target must point to #system-readiness.');

for (const [name, pattern] of Object.entries({
  'smart-schedule-suite': /class="[^"]*smart-schedule-suite[^"]*"[\s\S]*id="smart-schedule-suite"|id="smart-schedule-suite"[\s\S]*class="[^"]*smart-schedule-suite/,
  'worker-mobile-field': /class="[^"]*worker-mobile-suite[^"]*"[\s\S]*id="worker-mobile-field"|id="worker-mobile-field"[\s\S]*class="[^"]*worker-mobile-suite/,
  'photo-doc-suite': /class="[^"]*photo-doc-suite/,
  'maintenance-suite': /class="[^"]*maintenance-suite/,
  'system-readiness': /class="[^"]*readiness-suite[^"]*"[\s\S]*id="system-readiness"|id="system-readiness"[\s\S]*class="[^"]*readiness-suite/,
})) has(dashboard, pattern, `${name} workspace is missing.`);

has(dashboard, /data-schedule-dispatch-form[\s\S]*Schedule \/ assign job/, 'Scheduling workspace must include a real dispatch form.');
has(dashboard, /Worker Mobile Field Mode[\s\S]*data-worker-mobile-list/, 'Worker Mobile workspace must include job list/status UI.');
has(dashboard, /data-photo-doc-form[\s\S]*Save evidence notes/, 'Photo Docs workspace must include an evidence form.');
has(dashboard, /data-maintenance-plan-form[\s\S]*Save maintenance plan/, 'Maintenance workspace must include plan form.');
has(dashboard, /npm run build[\s\S]*data-readiness-refresh|data-readiness-refresh[\s\S]*npm run build/, 'Deployment Health workspace must include readiness actions.');
has(phase34, /scheduling[\s\S]*#smart-schedule-suite/, 'Phase 34 workspace router must know Scheduling.');
has(phase34, /photo-docs[\s\S]*\.photo-doc-suite/, 'Phase 34 workspace router must know Photo Docs.');
has(phase34, /maintenance[\s\S]*\.maintenance-suite/, 'Phase 34 workspace router must know Maintenance.');
has(' '+read('package.json'), /"test:sidebar-workspaces"/, 'package.json must include test:sidebar-workspaces.');

if (failures.length) {
  console.error('\nSidebar workspace audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Sidebar workspace audit passed for ${navItems.length} sidebar items.`);
