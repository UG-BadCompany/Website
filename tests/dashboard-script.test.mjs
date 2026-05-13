import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

const loadDashboardHtml = () => readFile(new URL('../public/dashboard/index.html', import.meta.url), 'utf8');
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

  assert.match(html, /data-request-estimate-link/, 'dashboard request estimate link should target the in-dashboard request form');
  assert.doesNotMatch(html, /href="\/login\/">Client Portal/, 'signed-in dashboard nav should not show the Client Portal link');
  assert.doesNotMatch(html, /data-logout-button hidden/, 'sign out should stay available while the session check is pending');
  assert.match(html, /href="\/api\/auth\/logout\?redirect=\/login\/\?signed-out=1" data-logout-button/, 'sign out should work as a normal link if dashboard JavaScript stalls');
  assert.match(html, /data-client-edit-property/, 'clients should have an edit action for saved properties');
  assert.match(html, /data-client-property-modal/, 'property edits should open in a dedicated popup instead of the request form');
  assert.match(html, /My profile &amp; properties|My profile & properties/, 'profile section should organize contact info and properties together');
  assert.match(html, /data-profile-button/, 'top navigation should expose a My Profile button');
  assert.match(html, /data-client-profile-form/, 'clients should have an editable profile form');
  assert.match(html, /data-client-request-edit-form/, 'clients should be able to edit open job requests in a modal');
  assert.match(html, /data-admin-assignment-form/, 'admins should have a worker assignment form');
  assert.match(html, /data-admin-activity/, 'admins should have an audit activity panel');
  assert.match(html, /data-admin-activity-filter-form/, 'admin audit activity should have filters');
  assert.match(html, /data-client-invoices/, 'clients should have an invoice and payment panel');
  assert.match(html, /data-admin-invoices/, 'admins should have an invoice and payment panel');
  assert.match(html, /data-worker-jobs/, 'workers should have an assigned jobs dashboard section');
  assert.match(html, /data-worker-job-filter/, 'worker jobs should have a status filter dropdown');
  assert.match(html, /data-worker-completion-photos/, 'worker completion form should collect photo or attachment evidence');
  assert.match(html, /data-worker-job-modal/, 'workers should open a detailed work order modal');
  assert.match(html, /data-worker-material-notes/, 'worker work orders should collect material notes');
  assert.match(html, /data-worker-checklist-items/, 'worker work orders should collect checklist items');
  assert.match(html, /data-admin-role-select/, 'role manager should use a single role selector');
  assert.match(html, /data-admin-open-selected-role/, 'selected role edit button should be present');
  assert.doesNotMatch(html, /data-admin-role-list/, 'roles should not render as a separate card list');
  assert.match(script, /const fetchJson =/, 'dashboard API calls should use the resilient JSON fetch helper');
  assert.match(script, /credentials: 'same-origin'/, 'session checks should explicitly include same-origin credentials');
  assert.match(script, /AbortController/, 'session checks should time out instead of leaving the dashboard stuck');
  assert.match(script, /Promise\.race/, 'session checks should fail fast even if fetch does not abort');
  assert.match(script, /bindLogout\(\);[\s\S]*fetchJson\('\/api\/me'\)/, 'sign out should bind before the session check finishes');
  assert.match(script, /event\.preventDefault\(\)/, 'JavaScript sign out should enhance the normal logout link');
  assert.match(script, /const saveClientProfile =/, 'clients should be able to save profile changes');
  assert.match(script, /const bindClientProfileButton =/, 'top My Profile button should open the profile modal');
  assert.match(script, /const bindClientProfileForm =/, 'client profile form should be bound');
  assert.match(script, /const saveClientRequestUpdate =/, 'clients should be able to update an open request');
  assert.match(script, /const loadAdminActivity =/, 'admins should load audit activity');
  assert.match(script, /const bindAdminActivityActions =/, 'admin audit activity controls should be bound');
  assert.match(script, /canViewAdminActivity/, 'admin activity loading should honor the activity permission');
  assert.match(script, /const loadClientInvoices =/, 'clients should load open invoices');
  assert.match(script, /const loadAdminInvoices =/, 'admins should load invoice follow-up');
  assert.match(script, /const confirmAdminPayment =/, 'admins should be able to confirm invoice payments');
  assert.match(script, /window\.taDashboardActions\.bindAdminInvoiceActions =/, 'admin invoice action binding should live on a dashboard action namespace');
  assert.doesNotMatch(script, /const bindAdminInvoiceActions =|function bindAdminInvoiceActions\(\)/, 'admin invoice action binding must not declare a top-level identifier that can collide after deploy merges');
  assert.match(script, /tokenFromDashboardUrl[\s\S]*\/api\/auth\/verify\?token=/, 'dashboard token links should be routed through the magic-link verifier before session checks');
  assert.match(script, /canManageInvoices/, 'admin invoice loading should honor invoice management permission');
  assert.match(script, /const loadWorkerJobs =/, 'workers should load assigned jobs');
  assert.match(script, /const bindWorkerJobActions =/, 'worker job update controls should be bound');
  assert.match(script, /const renderWorkerJobs =/, 'worker job filter should rerender the jobs list');
  assert.match(script, /completionPhotoNames/, 'worker completion updates should send completion photo file names');
  assert.match(script, /const openWorkerJobModal =/, 'worker job cards should open the detail modal');
  assert.match(script, /checklistItems/, 'worker job updates should include checklist items');
  assert.match(script, /const saveClientProperty =/, 'clients should be able to save property changes');
  assert.match(script, /const bindClientPropertyActions =/, 'client property edit controls should be bound');
  assert.match(script, /const renderUserProperties =/, 'opening a user profile requires the property renderer to be declared');
  assert.match(script, /renderUserProperties\(user\.properties \|\| \[\]\)/, 'user profile opening should render saved addresses');
  assert.ok(html.indexOf('data-client-profile-form') < html.indexOf('data-client-properties'), 'client properties should live inside/after the profile form, not as a separate earlier section');
});
