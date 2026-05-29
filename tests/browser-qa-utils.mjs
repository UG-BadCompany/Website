import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

export const rootDir = path.resolve(new URL('..', import.meta.url).pathname);

export const readText = (relativePath) => readFile(path.join(rootDir, relativePath), 'utf8');

export const extractInlineScripts = (html) => [...html.matchAll(/<script(?![^>]+src=)[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
export const extractScriptSrcs = (html) => [...html.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]);
export const extractHrefs = (html) => [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]);
export const extractIds = (html) => new Set([...html.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1]));

export const assertHtmlPage = async (relativePath, required = []) => {
  const html = await readText(relativePath);
  assert.match(html, /<!doctype html>/i, `${relativePath} should be an HTML document`);
  for (const needle of required) assert.ok(html.includes(needle), `${relativePath} should include ${needle}`);
  return html;
};

export const assertScriptsParse = async (html, pagePath) => {
  for (const [index, script] of extractInlineScripts(html).entries()) {
    assert.doesNotThrow(() => new Function(script), `${pagePath} inline script ${index + 1} should parse`);
  }
  for (const src of extractScriptSrcs(html)) {
    if (!src.startsWith('/')) continue;
    const filePath = path.join(rootDir, 'public', src);
    assert.equal(existsSync(filePath), true, `${pagePath} script ${src} should exist`);
    const code = await readFile(filePath, 'utf8');
    assert.doesNotThrow(() => new Function(code), `${src} should parse as browser script`);
  }
};

export const assertLocalLinksResolve = async (html, pagePath) => {
  const ids = extractIds(html);
  for (const href of extractHrefs(html)) {
    if (href.startsWith('#')) {
      const id = href.slice(1);
      assert.ok(!id || ids.has(id), `${pagePath} hash link ${href} should target an element on the page`);
      continue;
    }
    if (!href.startsWith('/') || href.startsWith('/api/')) continue;
    const clean = href.split(/[?#]/)[0];
    const candidates = [
      path.join(rootDir, 'public', clean, 'index.html'),
      path.join(rootDir, 'public', clean),
    ];
    const found = candidates.some((candidate) => existsSync(candidate));
    assert.equal(found, true, `${pagePath} link ${href} should resolve in public/`);
  }
};

export const assertNoWhiteBrokenPanels = (html, pagePath) => {
  assert.match(html, /--dash-bg: #070a0f|linear-gradient\(135deg, #070a0f|data-theme="dark"/, `${pagePath} should keep the dark dashboard visual system`);
  assert.doesNotMatch(html, /<table[^>]*class="[^"]*(?:white|light|gray)/i, `${pagePath} should not reintroduce white/light table panels`);
};

export const assertButtonHasPurpose = (buttonHtml, pagePath) => {
  const attrs = buttonHtml.match(/<button\b([^>]*)>/i)?.[1] || '';
  const text = buttonHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const purposeful = /\bdata-[\w-]+\b|\bonclick=|\bdisabled\b|\bhidden\b|type=["'](?:submit|reset)["']|aria-label=|form=|id=/.test(attrs);
  assert.equal(purposeful, true, `${pagePath} button "${text || attrs}" should have data handler, submit/reset semantics, disabled state, id/form, or aria-label`);
};

export const getButtons = (html) => [...html.matchAll(/<button\b[\s\S]*?<\/button>/gi)].map((match) => match[0]);
