import test from 'node:test';
import assert from 'node:assert/strict';
import { assertHtmlPage, assertScriptsParse, assertLocalLinksResolve, assertNoWhiteBrokenPanels, getButtons, assertButtonHasPurpose } from './browser-qa-utils.mjs';

test('home page loads, links resolve, buttons are purposeful, and scripts parse', async () => {
  const html = await assertHtmlPage('public/index.html', ['Services', 'Dashboard', 'Request Estimate', 'data-dashboard-link']);
  await assertScriptsParse(html, 'public/index.html');
  await assertLocalLinksResolve(html, 'public/index.html');
  assertNoWhiteBrokenPanels(html, 'public/index.html');
  getButtons(html).forEach((button) => assertButtonHasPurpose(button, 'public/index.html'));
});

test('login page loads magic link form and navigation without script errors', async () => {
  const html = await assertHtmlPage('public/login/index.html', ['Secure Client Portal', 'Send Secure Link', 'data-auth-form', '/api/auth/magic-link']);
  await assertScriptsParse(html, 'public/login/index.html');
  await assertLocalLinksResolve(html, 'public/login/index.html');
  assertNoWhiteBrokenPanels(html, 'public/login/index.html');
  assert.match(html, /href="\/dashboard\/"/, 'login should expose Dashboard navigation');
  assert.match(html, /href="\/#estimate"/, 'login should expose Request Estimate navigation');
  getButtons(html).forEach((button) => assertButtonHasPurpose(button, 'public/login/index.html'));
});
