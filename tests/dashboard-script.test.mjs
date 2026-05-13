import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

const loadDashboardHtml = () => readFile(new URL('../public/dashboard/index.html', import.meta.url), 'utf8');
const loadInventoryHtml = () => readFile(new URL('../public/inventory/index.html', import.meta.url), 'utf8');
const loadHomeHtml = () => readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const loadLoginHtml = () => readFile(new URL('../public/login/index.html', import.meta.url), 'utf8');
const extractInlineScripts = (html) => [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);

test('dashboard inline scripts parse without duplicate declarations', async () => {
  const html = await loadDashboardHtml();
  const scripts = extractInlineScripts(html);

  assert.ok(scripts.length > 0, 'expected at least one inline dashboard script');
  scripts.forEach((script) => assert.doesNotThrow(() => new Function(script)));
});

test('dashboard user and role controls have their required handlers', async () => {
  const html = await loadDashboardHtml();
  const [script] = extractInlineScripts(html);

  assert.match(html, /https:\/\/github.com\/UG-BadCompany\/Website\/blob\/main\/images\/logo\/logo3.png\?raw=true/, 'dashboard should use the real logo asset from the provided URL');
  assert.match(html, /dashboard-nav-cluster/, 'dashboard navigation should group controls separately from login status');
  assert.ok(html.indexOf('data-theme-toggle') > html.indexOf('data-request-estimate-link'), 'theme toggle should be moved after the primary dashboard actions');
  assert.ok(html.indexOf('data-session-status') > html.indexOf('dashboard-nav-row'), 'login status should sit below the dashboard nav actions');
  assert.match(html, /data-request-estimate-link/, 'dashboard request estimate link should target the in-dashboard request form');
  assert.doesNotMatch(html, /href="\/login\/">Client Portal/, 'signed-in dashboard nav should not show the Client Portal link');
  assert.match(html, /data-client-edit-property/, 'clients should have an edit action for saved properties');
  assert.match(html, /data-client-property-modal/, 'property edits should open in a dedicated popup instead of the request form');
  assert.match(html, /My profile &amp; properties|My profile & properties/, 'profile section should organize contact info and properties together');
  assert.doesNotMatch(html, /data-profile-button/, 'top navigation should not show a duplicate My Profile button');
  assert.match(html, /data-client-profile-form/, 'clients should have an editable profile form');
  assert.match(html, /data-client-request-edit-form/, 'clients should be able to edit open job requests in a modal');
  assert.match(html, /data-admin-assignment-form/, 'admins should have a worker assignment form');
  assert.match(html, /data-admin-activity/, 'admins should have an audit activity panel');
  assert.match(html, /data-admin-activity-filter-form/, 'admin audit activity should have filters');
  assert.match(html, /data-worker-jobs/, 'workers should have an assigned jobs dashboard section');
  assert.match(html, /data-client-invoices/, 'clients should have an invoices and payments dashboard section');
  assert.match(html, /data-admin-invoices/, 'admins should have a payment confirmation dashboard section');
  assert.match(html, /href="\/inventory\/"/, 'admins should navigate to inventory as a separate command-center page');
  assert.match(html, /data-permission="canManageInventory"/, 'inventory navigation should be permission-gated');
  assert.doesNotMatch(html, /<section class="card admin-inventory"/, 'inventory management should not render on the main dashboard');
  assert.match(html, /data-admin-command-center/, 'admins should have a polished command center overview');
  assert.match(html, /Run today’s work from one command center/, 'admin command center should use production-facing operations copy');
  assert.match(html, /Work order command center/, 'admin work order section should use cleaner operations copy');
  assert.match(html, /Invoice &amp; payment desk|Invoice & payment desk/, 'admin invoices should use clearer payment desk copy');
  assert.equal((html.match(/Invoice &amp; payment desk/g) || []).length, 1, 'admin invoice desk should render only one heading');
  assert.equal((html.match(/data-dashboard-singleton=\"admin-invoices\"/g) || []).length, 1, 'admin invoice desk should be marked as a singleton section');
  assert.match(html, /Activity audit trail/, 'admin activity modal should use audit-trail copy');
  assert.match(html, /data-admin-access-shortcut/, 'admin command center should open roles and users');
  assert.match(html, /data-admin-activity-shortcut/, 'admin command center should open activity');
  assert.doesNotMatch(html, /<button[^>]+data-admin-access-open/, 'roles and users should no longer render as a duplicate workspace-tab button');
  assert.doesNotMatch(html, /<button[^>]+data-admin-activity-open/, 'activity should no longer render as a duplicate workspace-tab button');
  assert.doesNotMatch(html, /<a href="#admin-work-orders" data-dashboard-section/, 'admin work orders should not render as a duplicate tab above the command center');
  assert.doesNotMatch(html, /<a href="#admin-invoices" data-dashboard-section/, 'admin invoices should not render as a duplicate tab above the command center');
  assert.doesNotMatch(html, /<a href="\/inventory\/" data-dashboard-section/, 'admin inventory should not render as a duplicate tab above the command center');
  assert.doesNotMatch(html, /workspace-tabs/, 'old shortcut tab shell should be fully removed');
  assert.match(html, /data-client-command-center/, 'clients should have their own command center');
  assert.match(html, /data-worker-command-center/, 'workers should have their own command center');
  assert.match(html, /Manage your project from one command center/, 'client command center should use command-center copy');
  assert.match(html, /Run assigned jobs from one command center/, 'worker command center should use command-center copy');
  assert.match(html, /data-client-profile-shortcut/, 'client and worker command centers should open profile from a command card');
  assert.match(html, /aria-label="Dashboard summary cards" data-dashboard-section data-views="client worker"/, 'summary cards below command center should be hidden from admin view');
  assert.doesNotMatch(html, /workspace-action/, 'removed admin shortcut button styles should not leave stale button hooks behind');
  assert.match(html, /data-admin-activity/, 'admins should have a recent activity audit section');
  assert.match(html, /data-admin-activity-type-filter/, 'admins should filter recent activity by type');
  assert.match(html, /data-admin-activity-search/, 'admins should search recent activity');
  assert.match(html, /data-admin-activity-more/, 'admins should page through more audit activity');
  assert.match(html, /<option value="inventory">Inventory<\/option>/, 'admin activity filters should include inventory events');
  assert.match(html, /data-admin-invoice-summary/, 'admins should have invoice totals before payment confirmation');
  assert.match(html, /data-admin-invoice-status-filter/, 'admins should switch between open and paid invoice views');
  assert.match(html, /data-admin-invoice-search/, 'admins should search invoice records');
  assert.match(html, /data-admin-role-select/, 'role manager should use a single role selector');
  assert.match(html, /data-admin-open-selected-role/, 'selected role edit button should be present');
  assert.doesNotMatch(html, /data-admin-role-list/, 'roles should not render as a separate card list');
  assert.match(script, /const saveClientProfile =/, 'clients should be able to save profile changes');
  assert.match(script, /const bindClientProfileButton =/, 'profile command-center cards should open the profile modal');
  assert.match(script, /querySelectorAll\('\[data-client-profile-shortcut\]'\)/, 'profile command-center cards should open the same profile modal');
  assert.match(script, /const getUserDisplayName =/, 'dashboard session status should derive a human display name');
  assert.match(script, /Signed in as \$\{getUserDisplayName\(result\.user\)\}/, 'dashboard session status should not expose email and role strings as the primary label');
  assert.match(script, /const bindClientProfileForm =/, 'client profile form should be bound');
  assert.match(script, /querySelectorAll\('\[data-request-estimate-link\]'\)/, 'request command-center card and nav link should share request-estimate binding');
  assert.match(html, /data-client-request-attachments/, 'client request form should accept photo and document attachments');
  assert.match(html, /Photos \/ attachments/, 'client request form should label the attachment area clearly');
  assert.match(script, /const summarizeClientRequestAttachments =/, 'client request submit should summarize selected files');
  assert.match(script, /payload\.attachmentNames = summarizeClientRequestAttachments\(formData\)/, 'client request submit should send attachment names to the API');
  assert.match(script, /const uploadJobFiles = async/, 'dashboard should upload job file records through the shared files API');
  assert.match(script, /fetch\('\/api\/job-files'/, 'dashboard file uploads should call the job files API');
  assert.match(html, /data-worker-before-files/, 'worker job form should accept before photos and files');
  assert.match(html, /data-worker-after-files/, 'worker job form should accept after photos and completion files');
  assert.match(script, /const saveClientRequestUpdate =/, 'clients should be able to update an open request');
  assert.match(script, /const loadAdminActivity =/, 'admins should load audit activity');
  assert.match(script, /const bindAdminActivityActions =/, 'admin audit activity controls should be bound');
  assert.match(script, /canViewAdminActivity/, 'admin activity loading should honor the activity permission');
  assert.match(script, /const loadWorkerJobs =/, 'workers should load assigned jobs');
  assert.match(script, /const bindWorkerJobActions =/, 'worker job update controls should be bound');
  assert.match(script, /const saveClientProperty =/, 'clients should be able to save property changes');
  assert.match(script, /const bindClientPropertyActions =/, 'client property edit controls should be bound');
  assert.match(script, /const renderUserProperties =/, 'opening a user profile requires the property renderer to be declared');
  assert.match(script, /renderUserProperties\(user\.properties \|\| \[\]\)/, 'user profile opening should render saved addresses');
  assert.ok(html.indexOf('data-client-profile-form') < html.indexOf('data-client-properties'), 'client properties should live inside/after the profile form, not as a separate earlier section');
});


test('inventory page owns inventory UI and API handlers', async () => {
  const html = await loadInventoryHtml();
  const [script] = extractInlineScripts(html);

  assert.match(html, /https:\/\/github.com\/UG-BadCompany\/Website\/blob\/main\/images\/logo\/logo3.png\?raw=true/, 'inventory should use the real logo asset from the provided URL');
  assert.match(html, /<title>Inventory \| T&A Contracting<\/title>/, 'inventory should have its own page title');
  assert.match(html, /data-admin-inventory-form/, 'inventory page should include the item creation form');
  assert.match(html, /data-admin-inventory-list/, 'inventory page should include the item list');
  assert.doesNotMatch(html, /href="\/login\/">Sign in/, 'inventory nav should not look signed out by default');
  assert.match(html, /data-inventory-account-status/, 'inventory nav should show the signed-in account status');
  assert.match(html, /data-inventory-logout/, 'inventory nav should expose sign out after auth');
  assert.match(html, /data-admin-inventory-edit-form/, 'inventory page should allow admins to edit item details');
  assert.match(html, /data-admin-inventory-archive/, 'inventory page should allow admins to archive inactive items');
  assert.match(script, /const requireInventoryAccess =/, 'inventory page should verify signed-in inventory permission');
  assert.match(script, /Signed in as/, 'inventory page should show the authenticated user instead of a login button');
  assert.match(script, /const loadAdminInventory =/, 'inventory page should load inventory records');
  assert.match(script, /fetch\('\/api\/admin\/inventory'/, 'inventory page should use the inventory API');
  assert.match(script, /action: 'archive'/, 'inventory page should send archive actions to the API');
  assert.doesNotThrow(() => new Function(script));
});


test('homepage portal links route logged-out users straight to login and active sessions to dashboard', async () => {
  const html = await loadHomeHtml();
  const script = extractInlineScripts(html).join('\n');

  assert.match(html, /https:\/\/github.com\/UG-BadCompany\/Website\/blob\/main\/images\/logo\/logo3.png\?raw=true/, 'homepage should use the real logo asset from the provided URL');
  assert.match(html, /href="\/login\/\?next=dashboard" data-dashboard-link>Dashboard/, 'primary dashboard link should fall back directly to magic-link login');
  assert.match(html, /href="\/login\/\?next=dashboard" data-dashboard-link>Open Client Portal/, 'portal CTA should fall back directly to magic-link login');
  assert.match(html, /one clean portal/, 'portal copy should be cleaner and more polished');
  assert.match(html, /data-dashboard-link/, 'homepage dashboard links should be session-aware');
  assert.doesNotMatch(html, /href="\/dashboard\/">Dashboard/, 'homepage should not send logged-out users to the dashboard before login');
  assert.doesNotMatch(html, /href="\/dashboard\/">Open Dashboard/, 'homepage CTA should not send logged-out users to the dashboard before login');
  assert.match(script, /const dashboardLinks = document\.querySelectorAll\('\[data-dashboard-link\]'\)/, 'homepage should intercept dashboard links');
  assert.match(script, /fetch\('\/api\/me'/, 'homepage should check session before routing dashboard links');
  assert.match(script, /response\.ok && result\.authenticated \? '\/dashboard\/' : '\/login\/\?next=dashboard'/, 'homepage should route signed-in users to dashboard and logged-out users to login');
});


test('login page redirects existing sessions back to the dashboard', async () => {
  const html = await loadLoginHtml();
  const [script] = extractInlineScripts(html);

  assert.match(html, /href="\/dashboard\/">Dashboard/, 'login nav should point users with sessions back to the dashboard');
  assert.doesNotMatch(html, /href="\/login\/">Client Portal/, 'login nav should not loop portal users back to login');
  assert.match(html, /portal-hero/, 'login page should use the refreshed portal hero layout');
  assert.match(html, /linear-gradient\(135deg, #070a0f 0%, #111827 48%, #251109 100%\)/, 'login page should match the dark dashboard visual system');
  assert.match(html, /Secure Client Portal/, 'login page should use production-facing secure portal copy');
  assert.match(html, /Send Secure Link/, 'login submit button should use polished action copy');
  assert.match(html, /requests, saved properties, quotes, invoices, and schedule updates/, 'login page should mention the current portal capabilities');
  assert.doesNotMatch(html, /Open your Client Portal with a secure magic link/, 'login page should not use the old standalone light-page hero copy');
  assert.match(script, /const redirectExistingSession = async/, 'login page should check for an existing session');
  assert.match(script, /fetch\('\/api\/me'/, 'login page should use api\/me for the existing-session check');
  assert.match(script, /window\.location\.replace\('\/dashboard\/'\)/, 'authenticated users should be sent to the dashboard');
  assert.match(script, /signed-out/, 'signed-out redirects should not bounce straight back to the dashboard');
  assert.doesNotThrow(() => new Function(script));
});
