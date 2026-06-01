import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync('public/dashboard/index.html', 'utf8');
const bootstrap = readFileSync('public/dashboard/modules/dashboard/bootstrap.js', 'utf8');
const mobileUx = readFileSync('public/assets/mobile-dashboard-ux.js', 'utf8');

const extractRoleHero = (role) => {
  const marker = `data-role-hero data-role-visible="${role}"`;
  const start = html.indexOf(marker);
  assert.notEqual(start, -1, `${role} hero is present`);
  const nextHero = html.indexOf('data-role-hero data-role-visible="', start + marker.length);
  const closeSection = html.indexOf('</section>', start);
  return html.slice(start, nextHero === -1 ? closeSection : nextHero);
};

test('dashboard has independent role hero surfaces and no legacy client hero copy', () => {
  assert.doesNotMatch(html, /Secure Client Portal/);
  assert.doesNotMatch(html, /Welcome back to your T&amp;A workspace/);

  const adminHero = extractRoleHero('admin');
  const clientHero = extractRoleHero('client');
  const workerHero = extractRoleHero('worker');

  assert.match(adminHero, /Admin Command Center/);
  assert.match(adminHero, /Business Operations Dashboard/);
  assert.match(adminHero, /Revenue/);
  assert.match(adminHero, /Open Work Orders/);
  assert.match(adminHero, /AI Estimate Queue/);
  assert.doesNotMatch(adminHero, /Request Estimate|Client Portal|Project Dashboard/);

  assert.match(clientHero, /Client Portal/);
  assert.match(clientHero, /Project Dashboard/);
  assert.match(clientHero, /Open Requests/);
  assert.match(clientHero, /Outstanding Invoices/);
  assert.doesNotMatch(clientHero, /Revenue|Employees Active|Inventory Alerts|Reports/);

  assert.match(workerHero, /Field Operations/);
  assert.match(workerHero, /Today&rsquo;s Assignments/);
  assert.match(workerHero, /Assigned Jobs/);
  assert.match(workerHero, /Safety Alerts/);
  assert.doesNotMatch(workerHero, /Revenue|Customer Messages|Outstanding Invoices|Employee/);
});

test('bootstrap applies centralized data-role-visible guards on every dashboard view switch', () => {
  assert.match(bootstrap, /const applyRoleVisibility = \(view\) =>/);
  assert.match(bootstrap, /querySelectorAll\('\[data-role-visible\]'\)/);
  assert.match(bootstrap, /element\.hidden = !visible/);
  assert.match(bootstrap, /applyRoleVisibility\(nextView\)/);
  assert.match(bootstrap, /document\.body\.dataset\.currentDashboardView = nextView/);
  assert.match(bootstrap, /applyRoleVisibility,/);
});

test('mobile role summaries are distinct and do not share business metrics with client or worker views', () => {
  assert.match(mobileUx, /const mobileSummaryByRole = {/);
  assert.match(mobileUx, /\['Revenue', 'revenue', 'Business income signal'\]/);
  assert.match(mobileUx, /\['My Requests', 'requests', 'Submitted service needs'\]/);
  assert.match(mobileUx, /\['Assigned Jobs', 'jobs', 'Work assigned to you'\]/);
  assert.match(mobileUx, /applyMobileSummary\(role\)/);
});

test('mobile More menu allowlists are role separated', () => {
  assert.match(mobileUx, /admin: \['dashboard', 'requests', 'quotes', 'work-orders', 'invoices', 'customers', 'employees', 'inventory', 'reports', 'settings', 'ai-tools', 'sign-out'\]/);
  assert.match(mobileUx, /client: \['dashboard', 'requests', 'quotes', 'invoices', 'project-updates', 'profile', 'request-estimate', 'sign-out'\]/);
  assert.match(mobileUx, /worker: \['dashboard', 'jobs', 'schedule', 'materials', 'photos', 'troubleshooter', 'job-notes', 'sign-out'\]/);
  assert.doesNotMatch(mobileUx, /client: \[[^\]]*inventory/);
  assert.doesNotMatch(mobileUx, /client: \[[^\]]*reports/);
  assert.doesNotMatch(mobileUx, /worker: \[[^\]]*settings/);
  assert.match(html, /data-mobile-more-key="ai-tools"/);
  assert.match(html, /data-mobile-more-key="project-updates"/);
  assert.match(html, /data-mobile-more-key="materials"/);
});

test('mobile FAB allowlists are role separated', () => {
  assert.match(mobileUx, /admin: \['estimate', 'work-order', 'customer', 'inventory-entry', 'schedule-job'\]/);
  assert.match(mobileUx, /client: \['request', 'request-estimate', 'support'\]/);
  assert.match(mobileUx, /worker: \['start-job', 'photo', 'material-request', 'troubleshooting'\]/);
  assert.doesNotMatch(mobileUx, /client: \[[^\]]*work-order/);
  assert.doesNotMatch(mobileUx, /worker: \[[^\]]*inventory-entry/);
  assert.match(html, /data-mobile-fab-action="estimate"/);
  assert.match(html, /data-mobile-fab-action="material-request"/);
});
