import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const PUBLIC_DASHBOARD_PATH = new URL('../public/dashboard/index.html', import.meta.url);
const OUT_DASHBOARD_PATH = new URL('../out/dashboard/index.html', import.meta.url);
import test from 'node:test';

const loadDashboardHtml = () => readFile(PUBLIC_DASHBOARD_PATH, 'utf8');

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
  assert.match(html, /switcher\.addEventListener\('click'/, 'view switcher should use delegated click handling so role buttons keep working');
  assert.match(html, /onclick="window\.taSetDashboardView && window\.taSetDashboardView\('admin'\)"/, 'admin view button should have a direct click fallback');
  assert.match(html, /window\.taSetDashboardView = \(view\) => \{[\s\S]*setDashboardView\(view\);[\s\S]*\}/, 'dashboard should expose a direct view-switch fallback for role buttons');
  assert.match(html, /const dedupeDashboardSingletons = \(\) =>/, 'dashboard should define the singleton cleanup helper before configuring views');
  assert.ok(
    html.indexOf('const dedupeDashboardSingletons = () =>') < html.indexOf('const setDashboardView = (view) =>'),
    'singleton cleanup helper should be initialized before direct view switching can call it',
  );
  assert.match(html, /const normalizeDashboardViewName =/, 'dashboard should normalize role/view names before deciding available views');
  assert.match(html, /data-dashboard-view-status/, 'dashboard should show visible feedback for the selected role view');
  assert.match(html, /data-main-command-title/, 'main command center heading should update when the selected view changes');
  assert.match(html, /Admin tools for running the business/, 'admin view should have clear admin command-center copy');
  assert.match(html, /Client tools for managing a project/, 'client view should have clear client command-center copy');
  assert.match(html, /Worker tools for assigned field jobs/, 'worker view should have clear worker command-center copy');
  assert.match(html, /data-main-action-views="admin"/, 'admin command shortcuts should be scoped to the admin view');
  assert.match(html, /data-main-action-views="client"/, 'client command shortcuts should be scoped to the client view');
  assert.match(html, /data-main-action-views="worker"/, 'worker command shortcuts should be scoped to the worker view');
});

test('auth debug mode exposes advanced dashboard debug controls', async () => {
  const html = await loadDashboardHtml();

  assert.match(html, /data-auth-debug-controls/, 'debug panel should include interactive debug controls');
  assert.match(html, /data-debug-switch-view="admin"/, 'debug controls should include an admin view switch action');
  assert.match(html, /data-debug-switch-view="client"/, 'debug controls should include a client view switch action');
  assert.match(html, /data-debug-switch-view="worker"/, 'debug controls should include a worker view switch action');
  assert.match(html, /data-debug-refresh-session/, 'debug controls should include a quick session refresh check');
  assert.match(html, /runDashboardDebugHealthCheck = async \(\) =>/, 'dashboard should expose a health-check helper for debug mode');
  assert.match(html, /bindDashboardDebugControls = \(\) =>/, 'dashboard should bind debug control click handlers');
  assert.match(html, /window\.taSetDashboardView\(view\)/, 'debug controls should switch views through the shared dashboard switch helper');
  assert.match(html, /fetchJson\('\/api\/me'\)/, 'health check should verify /api/me');
  assert.match(html, /fetchJson\('\/api\/auth\/debug'\)/, 'health check should verify /api/auth/debug');
});

test('client and worker empty dashboard states are easy to scan', async () => {
  const html = await loadDashboardHtml();

  assert.match(html, /\/\* Client and worker workspace readability \*\//, 'dashboard should include a dedicated readability pass for client and worker panels');
  assert.match(html, /\.client-requests,[\s\S]*linear-gradient\(135deg,rgba\(15,23,42,\.82\),rgba\(19,13,9,\.72\)\)/, 'client and worker panels should use integrated dark dashboard surfaces instead of white cards');
  assert.match(html, /html\[data-theme="light"\] \.client-requests,[\s\S]*rgba\(255,248,238,\.94\),rgba\(246,226,201,\.86\)/, 'light mode panels should use warm integrated surfaces instead of plain white');
  assert.match(html, /\.client-requests > strong,[\s\S]*font-size: clamp\(1\.55rem,3vw,2\.35rem\)/, 'client and worker panel headings should be larger and easier to scan');
  assert.match(html, /\.client-request-form-intro/, 'request form should include explanatory intro styling');
  assert.match(html, /Start with the service and project details/, 'request form should explain where clients should start');
  assert.match(html, /const renderDashboardEmptyState = \(title, message\) =>/, 'dashboard should render reusable high-contrast empty states');
  assert.match(html, /No job requests yet\./, 'client requests should have a visible empty state card');
  assert.match(html, /No quotes ready yet\./, 'client quotes should have a visible empty state card');
  assert.match(html, /No open invoices yet\./, 'client invoices should have a visible empty state card');
  assert.match(html, /No assigned jobs yet\./, 'worker jobs should have a visible empty state card');
});


test('generated out dashboard includes the same command-center and view-switch helpers as source dashboard', async () => {
  const [publicHtml, outHtml] = await Promise.all([
    readFile(PUBLIC_DASHBOARD_PATH, 'utf8'),
    readFile(OUT_DASHBOARD_PATH, 'utf8'),
  ]);

  for (const signature of [
    'data-main-dashboard-actions',
    'data-main-action-views="admin"',
    'const dedupeDashboardSingletons = () =>',
    'const renderDashboardEmptyState = (title, message) =>',
    'window.taSetDashboardView = (view) =>',
  ]) {
    assert.equal(publicHtml.includes(signature), true, `public dashboard should include ${signature}`);
    assert.equal(outHtml.includes(signature), true, `out dashboard should include ${signature}`);
  }
});
