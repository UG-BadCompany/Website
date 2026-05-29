import assert from 'node:assert/strict';
import test from 'node:test';
import { assertHtmlPage, readText } from './browser-qa-utils.mjs';

const sidebarItems = [
  ['Scheduling', /label: 'Scheduling'[\s\S]*target: '#smart-schedule-suite'|label: 'Scheduling'[\s\S]*target: '\.smart-schedule-suite'/, /id="smart-schedule-suite"/],
  ['Worker Mobile', /label: 'Worker Mobile'[\s\S]*target: '#worker-mobile-field'/, /id="worker-mobile-field"/],
  ['Photo Docs', /label: 'Photo Docs'[\s\S]*target: '\.photo-doc-suite'/, /class="[^"]*photo-doc-suite/],
  ['Maintenance Plans', /label: 'Maintenance Plans'[\s\S]*target: '\.maintenance-suite'/, /class="[^"]*maintenance-suite/],
  ['Deployment Health', /label: 'Deployment Health'[\s\S]*target: '#system-readiness'/, /id="system-readiness"/],
];

test('sidebar loads and every Phase 54 sidebar target exists', async () => {
  const html = await assertHtmlPage('public/dashboard/index.html', ['dashboard-phase30-sidebar.js', 'data-dashboard-root']);
  const sidebar = await readText('public/assets/dashboard-phase30-sidebar.js');

  for (const [label, sidebarPattern, htmlPattern] of sidebarItems) {
    assert.match(sidebar, sidebarPattern, `${label} sidebar mapping should exist`);
    assert.match(html, htmlPattern, `${label} workspace should exist`);
  }
  assert.match(sidebar, /label: 'Inventory'[\s\S]*href: '\/inventory\/'/, 'Inventory navigates to /inventory/');
});

test('Scheduling opens a real schedule workspace with dispatch workflow', async () => {
  const html = await assertHtmlPage('public/dashboard/index.html', ['id="smart-schedule-suite"', 'data-schedule-dispatch-form']);
  const bootstrap = await readText('public/dashboard/modules/dashboard/bootstrap.js');
  assert.match(html, /Upcoming jobs[\s\S]*Unscheduled jobs[\s\S]*Schedule \/ assign job/, 'Scheduling workspace should show board and schedule form');
  assert.match(bootstrap, /data-schedule-dispatch-form[\s\S]*\/api\/admin\/job-requests/, 'Scheduling form should call existing admin job request API');
});

test('Worker Mobile opens a real mobile field workspace', async () => {
  const html = await assertHtmlPage('public/dashboard/index.html', ['id="worker-mobile-field"', 'data-worker-mobile-list']);
  const bootstrap = await readText('public/dashboard/modules/dashboard/bootstrap.js');
  assert.match(html, /Start job[\s\S]*Mark in progress[\s\S]*Mark complete/, 'Worker Mobile should expose field status actions');
  assert.match(bootstrap, /data-mobile-start-job[\s\S]*data-mobile-complete-job[\s\S]*\/api\/worker\/jobs\/complete/, 'Worker Mobile actions should use worker jobs API');
});

test('Photo Docs opens evidence workspace with useful non-silent buttons', async () => {
  const html = await assertHtmlPage('public/dashboard/index.html', ['photo-doc-suite', 'data-photo-doc-form']);
  const bootstrap = await readText('public/dashboard/modules/dashboard/bootstrap.js');
  assert.match(html, /Before photos[\s\S]*Progress photos[\s\S]*After photos[\s\S]*Save evidence notes/, 'Photo Docs should expose evidence workflow');
  assert.match(bootstrap, /data-photo-doc-form[\s\S]*Save evidence notes|data-photo-doc-form[\s\S]*postWorkerAssignmentUpdate/, 'Photo Docs should persist evidence notes through worker jobs API');
  assert.match(bootstrap, /data-photo-doc-upload-note[\s\S]*\/api\/job-files/, 'Upload placeholder button should explain the existing upload endpoint');
});

test('Maintenance Plans opens recurring plan workspace with APIs', async () => {
  const html = await assertHtmlPage('public/dashboard/index.html', ['maintenance-suite', 'data-maintenance-plan-form']);
  const bootstrap = await readText('public/dashboard/modules/dashboard/bootstrap.js');
  const adminApi = await readText('netlify/functions/admin-maintenance-plans.mjs');
  const clientApi = await readText('netlify/functions/client-maintenance-plans.mjs');
  assert.match(html, /HVAC seasonal maintenance[\s\S]*Plumbing inspection[\s\S]*Electrical safety check[\s\S]*Property care plan/, 'Maintenance workspace should include default plan types');
  assert.match(bootstrap, /\/api\/admin\/maintenance-plans[\s\S]*\/api\/client\/maintenance-plans/, 'Maintenance UI should load admin/client APIs');
  assert.match(adminApi, /maintenance_plans[\s\S]*insert into maintenance_plans/, 'Admin maintenance API should create plans');
  assert.match(clientApi, /maintenance_plans[\s\S]*properties\.client_id/, 'Client maintenance API should scope plans to client properties');
});

test('Deployment Health opens readiness workspace without exposing secrets', async () => {
  const html = await assertHtmlPage('public/dashboard/index.html', ['id="system-readiness"', 'data-readiness-refresh']);
  const bootstrap = await readText('public/dashboard/modules/dashboard/bootstrap.js');
  assert.match(html, /npm run build[\s\S]*check-netlify-functions[\s\S]*audit:dead-buttons[\s\S]*test:browser/, 'Readiness workspace should list required commands');
  assert.match(bootstrap, /data-readiness-refresh[\s\S]*navigator\.clipboard|data-readiness-refresh[\s\S]*renderReadinessWorkspace/, 'Readiness buttons should update/copy visible state');
  assert.doesNotMatch(html, /DATABASE_URL=.*|SQUARE_ACCESS_TOKEN=.*|RESEND_API_KEY=.*/, 'Readiness workspace must not expose secret values');
});

test('dashboard/sidebar workspace files avoid console error strings', async () => {
  const html = await readText('public/dashboard/index.html');
  const sidebar = await readText('public/assets/dashboard-phase30-sidebar.js');
  const phase34 = await readText('public/assets/dashboard-phase34-sidebar-only-workspaces.js');
  assert.doesNotMatch(`${html}\n${sidebar}\n${phase34}`, /url is not defined|Cannot read properties of undefined/, 'workspace code should not contain known console error strings');
});
