import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync('public/dashboard/index.html', 'utf8');
const bootstrap = readFileSync('public/dashboard/modules/dashboard/bootstrap.js', 'utf8');
const mobileUx = readFileSync('public/assets/mobile-dashboard-ux.js', 'utf8');
const sidebarRouter = readFileSync('public/assets/dashboard-phase34-sidebar-only-workspaces.js', 'utf8');
const sidebarCss = readFileSync('public/assets/dashboard-phase34-sidebar-only-workspaces.css', 'utf8');
const mobileCss = readFileSync('public/assets/mobile-field-ux.css', 'utf8');

test('dashboard has one role-aware mobile summary and no multi-role dashboard sections', () => {
  assert.equal((html.match(/data-mobile-clean-dashboard/g) || []).length, 1, 'exactly one mobile summary should render');
  const unsafeDataViews = [...html.matchAll(/data-dashboard-section[^>]*data-views="([^"]*\s+[^"]*)"/g)].map((match) => match[0]);
  assert.deepEqual(unsafeDataViews, [], 'dashboard sections should not use shared multi-role data-views');
});

test('module router owns current view/module and marks exactly selected targets active', () => {
  assert.match(sidebarRouter, /document\.body\.dataset\.dashboardModule = module/);
  assert.match(sidebarRouter, /document\.documentElement\.dataset\.dashboardModule = module/);
  assert.match(sidebarRouter, /root\.querySelectorAll\('\[data-dashboard-section\], \[data-main-dashboard-actions\]'\)/);
  assert.match(sidebarRouter, /section\.dataset\.dashboardActiveSection = String\(active\)/);
  assert.match(sidebarRouter, /section\.hidden = !active/);
  assert.match(sidebarRouter, /window\.taSetDashboardModule = setWorkspace/);
});

test('CSS hides inactive modules with active-module guard instead of letting sections stack', () => {
  for (const css of [sidebarCss, mobileCss]) {
    assert.match(css, /body\[data-dashboard-module\][\s\S]*\[data-dashboard-root\][\s\S]*\[data-dashboard-section\]/);
    assert.match(css, /\[data-dashboard-active-section="true"\][\s\S]*display:\s*block !important/);
  }
});

test('view switching starts on home and does not unhide every role section at once', () => {
  assert.match(bootstrap, /mobileWorkspaceForView[\s\S]*admin:\s*'overview'[\s\S]*client:\s*'overview'[\s\S]*worker:\s*'overview'/);
  assert.match(bootstrap, /section\.dataset\.dashboardViewAllowed = String\(viewAllowed\)/);
  assert.doesNotMatch(bootstrap, /section\.hidden = !views\.includes\(view\) \|\| !hasRequiredPermission/);
});

test('mobile nav routes through module router for Home, bottom nav, More, and FAB', () => {
  assert.match(mobileUx, /key === 'home'[\s\S]*taSetSidebarWorkspace\('overview'/);
  assert.match(mobileUx, /routeMobileKey\(key\)/);
  assert.match(mobileUx, /routeFabAction\(action, item\)/);
  assert.match(mobileUx, /openWorkspace\('quotes', '#admin-quotes-workspace'\)/);
  assert.match(mobileUx, /openWorkspace\('worker-jobs', '#worker-jobs'\)/);
});
