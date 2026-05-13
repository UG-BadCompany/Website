import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

const loadLoginHtml = () => readFile(new URL('../public/login/index.html', import.meta.url), 'utf8');
const loadLoginScript = () => readFile(new URL('../public/assets/login.js', import.meta.url), 'utf8');
const extractInlineScripts = (html) => [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);

test('login page loads magic-link behavior from an external script', async () => {
  const html = await loadLoginHtml();
  const inlineScripts = extractInlineScripts(html).map((script) => script.trim()).filter(Boolean);

  assert.equal(inlineScripts.length, 0, 'login should not render inline JavaScript that can appear as page text after merge conflicts');
  assert.match(html, /<script src="\/assets\/login\.js" defer><\/script>/, 'login should load the external magic-link script');
});

test('login script shows magic-link and sign-out status messages once', async () => {
  const script = await loadLoginScript();

  assert.doesNotThrow(() => new Function(script));
  assert.match(script, /const queryMessages =/, 'login should map auth query states to visible messages');
  assert.match(script, /signed-out/, 'login should acknowledge a completed sign out');
  assert.match(script, /expired/, 'login should explain expired or consumed magic links');
  assert.match(script, /applyInitialStatus\(setStatus\)/, 'login should apply query status when the page loads');
  assert.match(script, /dataset\.bound/, 'login form binding should be idempotent');

  assert.equal((script.match(/const queryMessages =/g) || []).length, 1, 'login status mapping should only be declared once');
  assert.equal((script.match(/const applyInitialStatus =/g) || []).length, 1, 'login status initializer should only be declared once');
});
