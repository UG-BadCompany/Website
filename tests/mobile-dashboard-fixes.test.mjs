import assert from 'node:assert/strict';
import test from 'node:test';
import { readText } from './browser-qa-utils.mjs';

test('mobile dashboard removes desktop command center duplicates and keeps app actions', async () => {
  const html = await readText('public/dashboard/index.html');
  const css = await readText('public/assets/mobile-field-ux.css');
  const js = await readText('public/assets/mobile-dashboard-ux.js');

  assert.match(html, /data-mobile-clean-dashboard[\s\S]*Today&apos;s jobs[\s\S]*Open requests[\s\S]*Pending quotes[\s\S]*Unpaid invoices[\s\S]*Low inventory alerts[\s\S]*Recent activity/);
  assert.match(css, /#executive-overview\.main-command-shortcuts[\s\S]*display:\s*none !important/);
  assert.match(html, /data-mobile-fab-action="request"[\s\S]*data-mobile-fab-action="quote"[\s\S]*data-mobile-fab-action="job"[\s\S]*data-mobile-fab-action="inventory"[\s\S]*data-mobile-fab-action="customer"[\s\S]*data-mobile-fab-action="photo"[\s\S]*data-mobile-fab-action="assistant"/);
  assert.match(js, /pointerup[\s\S]*touchend[\s\S]*Escape[\s\S]*setFabOpen\(false\)[\s\S]*hashchange[\s\S]*popstate/);
});

test('dashboard role switching persists selected view and shows locked fallback safely', async () => {
  const bootstrap = await readText('public/dashboard/modules/dashboard/bootstrap.js');
  assert.match(bootstrap, /const viewStorageKey = 'ta\.dashboard\.selectedView'/);
  assert.match(bootstrap, /readStoredDashboardView[\s\S]*localStorage[\s\S]*sessionStorage/);
  assert.match(bootstrap, /persistDashboardView\(nextView\)/);
  assert.match(bootstrap, /data-mobile-clean-locked[\s\S]*Your account cannot open/);
  assert.match(bootstrap, /console\.log\(`Switching view: \${viewLabel}`\)/);
  assert.match(bootstrap, /applySidebarWorkspaceForView[\s\S]*mobileWorkspaceForView[\s\S]*work-orders[\s\S]*client-requests[\s\S]*worker-jobs/);
  assert.match(bootstrap, /pointerup[\s\S]*touchend/);
  assert.match(bootstrap, /console\.error\('Failed to switch dashboard view\.'/);
});
