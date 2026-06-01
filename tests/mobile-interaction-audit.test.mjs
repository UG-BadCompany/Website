import assert from 'node:assert/strict';
import test from 'node:test';
import { readText } from './browser-qa-utils.mjs';

test('mobile app shell uses one navigation system and no mobile command center', async () => {
  const html = await readText('public/dashboard/index.html');
  const css = await readText('public/assets/mobile-field-ux.css');
  assert.doesNotMatch(html, /<div class="mobile-role-selector"/, 'legacy mobile role selector should not duplicate the real view switcher');
  assert.match(html, /data-view-switcher[\s\S]*Admin view[\s\S]*Client view[\s\S]*Worker view/, 'real view switcher should stay in markup');
  assert.match(css, /#executive-overview\.main-command-shortcuts[\s\S]*display:\s*none !important/, 'business command center should be suppressed on mobile');
  assert.match(css, /dashboard-mobile-nav-toggle[\s\S]*display:\s*none !important/, 'sidebar mobile toggle should not duplicate bottom nav');
});

test('view switcher and fab have touch-safe activation handlers', async () => {
  const bootstrap = await readText('public/dashboard/modules/dashboard/bootstrap.js');
  const mobileJs = await readText('public/assets/mobile-dashboard-ux.js');
  assert.match(bootstrap, /bindTapOnce[\s\S]*addEventListener\('pointerup'[\s\S]*addEventListener\('touchend'[\s\S]*addEventListener\('click'[\s\S]*data-view-button/);
  assert.match(bootstrap, /console\.log\(`Switching view: \$\{viewLabel\}`\)/);
  assert.match(bootstrap, /mobileWorkspaceForView[\s\S]*admin:\s*'work-orders'[\s\S]*client:\s*'client-requests'[\s\S]*worker:\s*'worker-jobs'/);
  assert.match(mobileJs, /bindTapOnce[\s\S]*addEventListener\('pointerup'[\s\S]*addEventListener\('touchend'[\s\S]*addEventListener\('click'[\s\S]*data-mobile-fab-action/);
});

test('more menu and inventory floating actions are not placeholders', async () => {
  const dashboard = await readText('public/dashboard/index.html');
  const mobileJs = await readText('public/assets/mobile-dashboard-ux.js');
  const inventory = await readText('public/inventory/index.html');
  assert.match(dashboard, /data-mobile-more-key="dashboard"[\s\S]*data-mobile-more-key="requests"[\s\S]*data-mobile-more-key="quotes"[\s\S]*data-mobile-more-key="work-orders"[\s\S]*data-mobile-more-key="invoices"[\s\S]*data-mobile-more-key="customers"[\s\S]*data-mobile-more-key="employees"[\s\S]*data-mobile-more-key="inventory"[\s\S]*data-mobile-more-key="reports"[\s\S]*data-mobile-more-key="settings"[\s\S]*data-mobile-more-key="ai-tools"[\s\S]*data-mobile-more-key="project-updates"[\s\S]*data-mobile-more-key="profile"[\s\S]*data-mobile-more-key="request-estimate"[\s\S]*data-mobile-more-key="schedule"[\s\S]*data-mobile-more-key="materials"[\s\S]*data-mobile-more-key="photos"[\s\S]*data-mobile-more-key="troubleshooter"[\s\S]*data-mobile-more-key="job-notes"[\s\S]*data-mobile-more-key="sign-out"/);
  assert.match(mobileJs, /'work-orders': \['work-orders'[\s\S]*employees:[\s\S]*reports:[\s\S]*settings:[\s\S]*'ai-tools':/);
  assert.match(inventory, /data-inventory-fab-action="add-item"[\s\S]*data-inventory-fab-action="scan-item"[\s\S]*data-inventory-fab-action="low-stock"/);
  assert.match(inventory, /bindInventoryMobileFab[\s\S]*pointerup[\s\S]*touchend[\s\S]*openInventoryPane\('items'\)[\s\S]*openInventoryPane\('low-stock'\)/);
});
