import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

const loadLoginHtml = () => readFile(new URL('../public/login/index.html', import.meta.url), 'utf8');
const extractInlineScripts = (html) => [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);

test('login page shows magic-link and sign-out status messages', async () => {
  const html = await loadLoginHtml();
  const [script] = extractInlineScripts(html);

  assert.match(script, /const queryMessages =/, 'login should map auth query states to visible messages');
  assert.match(script, /signed-out/, 'login should acknowledge a completed sign out');
  assert.match(script, /expired/, 'login should explain expired or consumed magic links');
  assert.match(script, /applyInitialStatus\(\)/, 'login should apply query status when the page loads');
});
