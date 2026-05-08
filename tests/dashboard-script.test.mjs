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
  assert.match(html, /data-client-edit-property/, 'clients should have an edit action for saved properties');
  assert.match(html, /data-client-property-modal/, 'property edits should open in a dedicated popup instead of the request form');
  assert.match(html, /My profile &amp; properties|My profile & properties/, 'profile section should organize contact info and properties together');
  assert.match(html, /data-profile-button/, 'top navigation should expose a My Profile button');
  assert.match(html, /data-client-profile-form/, 'clients should have an editable profile form');
  assert.match(html, /data-client-request-edit-form/, 'clients should be able to edit open job requests in a modal');
  assert.match(html, /data-admin-role-select/, 'role manager should use a single role selector');
  assert.match(html, /data-admin-open-selected-role/, 'selected role edit button should be present');
  assert.doesNotMatch(html, /data-admin-role-list/, 'roles should not render as a separate card list');
  assert.match(script, /const saveClientProfile =/, 'clients should be able to save profile changes');
  assert.match(script, /const bindClientProfileButton =/, 'top My Profile button should open the profile modal');
  assert.match(script, /const bindClientProfileForm =/, 'client profile form should be bound');
  assert.match(script, /const saveClientRequestUpdate =/, 'clients should be able to update an open request');
  assert.match(script, /const saveClientProperty =/, 'clients should be able to save property changes');
  assert.match(script, /const bindClientPropertyActions =/, 'client property edit controls should be bound');
  assert.match(script, /const renderUserProperties =/, 'opening a user profile requires the property renderer to be declared');
  assert.match(script, /renderUserProperties\(user\.properties \|\| \[\]\)/, 'user profile opening should render saved addresses');
  assert.ok(html.indexOf('data-client-profile-form') < html.indexOf('data-client-properties'), 'client properties should live inside/after the profile form, not as a separate earlier section');
});
