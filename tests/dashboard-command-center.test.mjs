import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const loadDashboardHtml = () => readFile(new URL('../public/dashboard/index.html', import.meta.url), 'utf8');

test('dashboard places a single all-tools command center directly under the hero', async () => {
  const html = await loadDashboardHtml();
  const heroIndex = html.indexOf('<section class="hero">');
  const mainCommandIndex = html.indexOf('aria-label="Main dashboard command center"');
  const sessionCheckIndex = html.indexOf('data-session-card');

  assert.ok(heroIndex >= 0, 'dashboard hero should be present');
  assert.ok(mainCommandIndex > heroIndex, 'main command center should render after the hero');
  assert.ok(sessionCheckIndex > mainCommandIndex, 'session check should render after the main command center');
  assert.equal((html.match(/<section[^>]+data-main-dashboard-actions/g) || []).length, 1, 'only one all-tools command center should own main dashboard actions');
  assert.doesNotMatch(html, /dashboard-hero-actions admin-command-actions/, 'shortcut cards should not be embedded inside the hero panel');
  assert.doesNotMatch(html, /<section class="command-center"/, 'old duplicated command-center sections should not render');
  assert.match(html, /\.main-command-shortcuts \.admin-command-actions \{[\s\S]*repeat\(auto-fit, minmax\(210px, 1fr\)\)/, 'main command center cards should use wider responsive columns');
  assert.match(html, /\.main-command-shortcuts \.admin-command-card \{[\s\S]*background: #fff;/, 'main command center cards should use a high-contrast card background');
  assert.match(html, /\.main-command-shortcuts \.admin-command-card::before/, 'main command center cards should have an accent marker for scanability');

  for (const label of [
    'Work orders',
    'Invoices',
    'Inventory',
    'Roles &amp; users',
    'Audit activity',
    'Requests',
    'Quotes',
    'Client invoices',
    'Profile',
    'Worker jobs',
  ]) {
    assert.match(html, new RegExp(`<strong>${label}</strong>`), `${label} card should be in the command center`);
  }
});


test('dashboard view switcher exposes all role views for switch-capable users', async () => {
  const html = await loadDashboardHtml();

  assert.match(html, /data-view-button="admin"/, 'admin view button should render');
  assert.match(html, /data-view-button="client"/, 'client view button should render');
  assert.match(html, /data-view-button="worker"/, 'worker view button should render');
  assert.match(html, /const canSwitchAllViews = Boolean\(permissions\.canSwitchDashboardView \|\| permissions\.canViewAdminTools \|\| roles\.has\('admin'\)\)/, 'admins and switch-capable users should be able to access all role views');
  assert.match(html, /\['admin', 'client', 'worker'\]\.forEach\(\(view\) => views\.add\(view\)\)/, 'all role views should be restored for switch-capable users');
  assert.match(html, /button\.setAttribute\('aria-pressed', String\(isActive\)\)/, 'view buttons should update pressed state when switching');
  assert.match(html, /data-main-action-views="admin"/, 'admin command shortcuts should be scoped to the admin view');
  assert.match(html, /data-main-action-views="client"/, 'client command shortcuts should be scoped to the client view');
  assert.match(html, /data-main-action-views="worker"/, 'worker command shortcuts should be scoped to the worker view');
});
