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

  assert.match(html, /data-admin-role-select/, 'role manager should use a single role selector');
  assert.match(html, /data-admin-open-selected-role/, 'selected role edit button should be present');
  assert.doesNotMatch(html, /data-admin-role-list/, 'roles should not render as a separate card list');
  assert.match(script, /const renderUserProperties =/, 'opening a user profile requires the property renderer to be declared');
  assert.match(script, /renderUserProperties\(user\.properties \|\| \[\]\)/, 'user profile opening should render saved addresses');
});
