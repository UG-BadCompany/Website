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
  assert.match(html, /data-profile-button/, 'top navigation should expose a My Profile button');
  assert.match(html, /data-client-profile-form/, 'clients should have an editable profile form');
  assert.match(html, /data-client-request-edit-form/, 'clients should be able to edit open job requests in a modal');
  assert.match(html, /data-admin-assignment-form/, 'admins should have a worker assignment form');
  assert.match(html, /data-admin-work-order-inventory-form/, 'admins should record inventory usage from work orders');
  assert.match(html, /data-admin-work-order-inventory-usage/, 'work orders should show linked inventory usage');
  assert.match(html, /Record inventory usage/, 'work order inventory form should use clear action copy');
  assert.match(html, /data-admin-pipeline-summary/, 'admins should have a work order pipeline summary');
  assert.match(html, /data-admin-request-search/, 'admins should be able to search work orders');
  assert.match(html, /data-admin-request-status-filter/, 'admins should be able to filter work orders by status');
  assert.match(html, /data-admin-request-scope-filter/, 'admins should switch between active and completed work order views');
  assert.match(html, /data-admin-work-order-summary/, 'admins should have a work order detail summary panel');
  assert.match(html, /data-admin-quote-id/, 'admin quote form should edit saved quotes by id');
  assert.match(html, /data-client-approve-completion/, 'clients should be able to approve completed work');
  assert.match(html, /value="pending_review"/, 'admins should be able to verify pending-review work');
  assert.doesNotMatch(html, /Secure portal gate/, 'dashboard should not show implementation placeholder cards');
  assert.doesNotMatch(html, /Use one magic-link sign-in/, 'dashboard hero should use production-facing copy');
  assert.match(html, /Welcome back to your T&A workspace/, 'dashboard hero should use cleaner signed-in workspace copy');
  assert.match(html, /data-worker-jobs/, 'workers should have an assigned jobs dashboard section');
  assert.match(html, /data-client-invoices/, 'clients should have an invoices and payments dashboard section');
  assert.match(html, /data-admin-invoices/, 'admins should have a payment confirmation dashboard section');
  assert.match(html, /href="\/inventory\/"/, 'admins should navigate to inventory as a separate page');
  assert.match(html, /data-permission="canManageInventory"/, 'inventory navigation should be permission-gated');
  assert.doesNotMatch(html, /<section class="card admin-inventory"/, 'inventory management should not render on the main dashboard');
  assert.match(html, /data-admin-command-center/, 'admins should have a polished command center overview');
  assert.match(html, /Run today’s work from one command center/, 'admin command center should use production-facing operations copy');
  assert.match(html, /Work order command center/, 'admin work order section should use cleaner operations copy');
  assert.match(html, /Invoice &amp; payment desk|Invoice & payment desk/, 'admin invoices should use clearer payment desk copy');
  assert.match(html, /Activity audit trail/, 'admin activity modal should use audit-trail copy');
  assert.match(html, /data-admin-access-shortcut/, 'admin command center should open roles and users');
  assert.match(html, /data-admin-activity-shortcut/, 'admin command center should open activity');
  assert.doesNotMatch(html, /<button[^>]+data-admin-access-open/, 'roles and users should no longer render as a duplicate workspace-tab button');
  assert.doesNotMatch(html, /<button[^>]+data-admin-activity-open/, 'activity should no longer render as a duplicate workspace-tab button');
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
  assert.match(script, /const bindClientProfileButton =/, 'top My Profile button should open the profile modal');
  assert.match(script, /const getUserDisplayName =/, 'dashboard session status should derive a human display name');
  assert.match(script, /Signed in as \$\{getUserDisplayName\(result\.user\)\}/, 'dashboard session status should not expose email and role strings as the primary label');
  assert.match(script, /const bindClientProfileForm =/, 'client profile form should be bound');
  assert.match(script, /const saveClientRequestUpdate =/, 'clients should be able to update an open request');
  assert.match(script, /const approveClientCompletion =/, 'clients should have completed-work approval handler');
  assert.match(script, /quoteMethod = payload.quoteId \? 'PATCH' : 'POST'/, 'saved quotes should be edited instead of recreated');
  assert.match(script, /canSwitchDashboardView && \(user\.roles \|\| \[\]\)\.includes\('admin'\)/, 'role view tabs should be admin-only');
  assert.match(script, /window\.location\.replace\('\/login\/\?next=dashboard'\)/, 'logged-out dashboard visits should redirect to magic-link sign in');
  assert.match(script, /const loadClientInvoices =/, 'clients should load open invoices');
  assert.match(script, /const loadAdminInvoices =/, 'admins should load invoices awaiting payment confirmation');
  assert.match(script, /requiredPermission = section\.dataset\.permission/, 'dashboard sections should support permission-gated navigation links');
  assert.match(script, /const renderAdminInvoiceSummary =/, 'admins should render invoice totals');
  assert.match(script, /const renderAdminActivityCard =/, 'admins should render recent audit activity');
  assert.match(script, /const renderAdminActivityList =/, 'admins should render filtered audit activity');
  assert.match(script, /const bindAdminActivityFilters =/, 'admins should bind activity filters');
  assert.match(script, /const renderAdminWorkOrderInventoryUsage =/, 'admins should render inventory usage on work orders');
  assert.match(script, /const loadAdminWorkOrderInventory = async/, 'admins should load inventory usage for selected work orders');
  assert.match(script, /fetch\(`\/api\/admin\/inventory\?jobRequestId=\$\{encodeURIComponent\(jobRequestId\)\}`/, 'work order inventory usage should load from inventory API');
  assert.match(script, /quantityDelta: -Math\.abs\(quantityUsed\)/, 'work order inventory usage should subtract stock');
  assert.match(script, /jobRequestId,[\s\S]*adjustmentType: 'used'/, 'work order inventory adjustments should be tied to the job and marked used');
  assert.match(script, /document\.querySelector\('\.admin-request-modal:not\(\[hidden\]\)'\)/, 'modal body scroll locking should account for nested admin modals');
  assert.ok(html.indexOf('</form>\n      </section>\n\n      <div class="admin-request-modal" data-admin-role-modal') > -1, 'role and user editor popups should sit outside the scrolling access panel');
  assert.match(script, /querySelectorAll\('\[data-admin-access-open\], \[data-admin-access-shortcut\]'\)/, 'admin access launcher should bind nav and command-center shortcuts');
  assert.match(script, /querySelectorAll\('\[data-admin-activity-open\], \[data-admin-activity-shortcut\]'\)/, 'admin activity launcher should bind nav and command-center shortcuts');
  assert.match(script, /const updateAdminActivityMoreButton =/, 'admins should update the activity pagination button');
  assert.match(script, /const scheduleAdminActivityReload =/, 'admins should debounce server-side activity filter refreshes');
  assert.match(script, /const loadAdminActivity = async \(\{ filtered = false, append = false \} = \{\}\)/, 'admins should load recent audit activity with filter and append options');
  assert.match(script, /url\.searchParams\.set\('page', String\(nextPage\)\)/, 'admin activity loading should request the current activity page');
  assert.match(script, /currentAdminActivity = append \? \[\.\.\.currentAdminActivity, \.\.\.events\] : events/, 'admin activity load more should append events');
  assert.match(script, /adminActivityHasNextPage = Boolean\(result\.pagination\?\.hasNextPage\)/, 'admin activity should track whether another page exists');
  assert.match(script, /url\.searchParams\.set\('type', typeFilter\)/, 'admin activity loading should request the selected type filter');
  assert.match(script, /url\.searchParams\.set\('q', search\)/, 'admin activity loading should request the selected activity search term');
  assert.match(script, /const renderAdminInvoiceList =/, 'admins should render filtered invoice records');
  assert.match(script, /status=\$\{encodeURIComponent\(filter\)\}/, 'admin invoice loading should request the selected invoice status');
  assert.match(script, /const renderAdminPipelineSummary =/, 'admins should render pipeline counts');
  assert.match(script, /const applyAdminRequestFilters =/, 'admins should filter the work order inbox');
  assert.match(script, /currentAdminRequestScope = result\.scope \|\| scope/, 'admin work order view should track the API scope');
  assert.match(script, /scope=\$\{encodeURIComponent\(scope\)\}/, 'admin work order loading should request the selected scope');
  assert.match(script, /canViewAdminActivity/, 'admin activity should use its own permission flag');
  assert.match(script, /new URL\('\/api\/admin\/activity', window\.location\.origin\)/, 'admin activity should load from the audit activity endpoint');
  assert.match(script, /fetch\(url, \{ headers: \{ accept: 'application\/json' \} \}\)/, 'admin activity should fetch the filtered activity URL');
  assert.match(script, /loadAdminActivity\(\{ append: true \}\)/, 'admin activity load more button should fetch the next page');
  assert.match(script, /const renderAdminWorkOrderSummary =/, 'admins should render a CMMS-style work order summary');
  assert.match(script, /data-admin-work-order-summary-card/, 'work order summary should render a dedicated summary card');
  assert.match(script, /data-admin-confirm-payment/, 'admins should be able to confirm payment from the dashboard');
  assert.match(script, /data-admin-payment-form/, 'admins should capture payment confirmation details from the dashboard');
  assert.match(script, /reference: formData\.get\('reference'\)/, 'admin payment confirmations should send payment reference notes');
  assert.match(script, /invoiceSearch\?\.addEventListener\('input', renderAdminInvoiceList\)/, 'admin invoice search should filter without refetching');
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
