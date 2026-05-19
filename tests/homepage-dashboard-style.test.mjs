import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const loadHomeHtml = () => readFile(new URL('../public/index.html', import.meta.url), 'utf8');

test('homepage uses the dashboard visual system', async () => {
  const html = await loadHomeHtml();

  assert.match(html, /--dash-bg: #070a0f/, 'homepage should share dashboard color tokens');
  assert.match(html, /linear-gradient\(135deg, #070a0f 0%, #111827 48%, #251109 100%\)/, 'homepage should use the dashboard dark background gradient');
  assert.match(html, /\.hero \{[\s\S]*grid-template-columns: minmax\(0, 1fr\) minmax\(260px, \.55fr\)/, 'homepage hero should use the dashboard hero layout proportions');
  assert.match(html, /\.hero-media \{[\s\S]*linear-gradient\(180deg, rgba\(255,246,234,\.95\), rgba\(255,250,243,\.82\)\)/, 'homepage logo panel should match dashboard logo-panel styling');
  assert.match(html, /\.service-card,[\s\S]*\.workflow-card,[\s\S]*\.estimate-shell,[\s\S]*\.estimate-form \{[\s\S]*backdrop-filter: blur\(18px\)/, 'homepage cards should use dashboard glass panels');
  assert.match(html, /@media \(max-width: 980px\) \{[\s\S]*\.hero,[\s\S]*grid-template-columns: 1fr; \}/, 'homepage should keep the dashboard-style hero responsive on narrow screens');
});


const collectHtmlFiles = async (directoryUrl) => {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const childUrl = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directoryUrl);
    if (entry.isDirectory()) return collectHtmlFiles(childUrl);
    return entry.name.endsWith('.html') ? [childUrl] : [];
  }));

  return files.flat();
};

test('all public pages share the unified homepage and dashboard style layer', async () => {
  const files = await collectHtmlFiles(new URL('../public/', import.meta.url));
  assert.ok(files.length >= 8, 'expected all public HTML pages to be checked');

  for (const file of files) {
    const html = await readFile(file, 'utf8');
    assert.match(html, /\/\* Unified homepage\/dashboard visual system \*\//, `${file.pathname} should include the shared visual-system layer`);
    assert.match(html, /--dash-bg: #070a0f/, `${file.pathname} should expose shared dashboard color tokens`);
    assert.match(html, /linear-gradient\(135deg, #070a0f 0%, #111827 48%, #251109 100%\)/, `${file.pathname} should use the shared dark shell gradient`);
    assert.match(html, /\.nav \{[\s\S]*background: rgba\(7,10,15,\.80\)/, `${file.pathname} should use the shared dark navigation style`);
    assert.match(html, /\/\* Shared polished top-right navigation controls \*\//, `${file.pathname} should include the shared polished nav controls`);
  }
});

test('thank-you page matches the shared dashboard confirmation style', async () => {
  const html = await readFile(new URL('../public/thank-you/index.html', import.meta.url), 'utf8');

  assert.match(html, /thank-you-hero/, 'thank-you page should use the polished confirmation hero');
  assert.match(html, /thank-you-next-steps/, 'thank-you page should show matching next-step cards');
  assert.match(html, /Your request is in the T&amp;A Contracting workspace for review/, 'thank-you copy should match the portal workspace tone');
  assert.match(html, /Open the client portal to track requests, quote decisions, invoices, and saved property details/, 'thank-you page should connect users back to the portal flow');
});


test('generated out pages keep shared visual-system signatures for home and dashboard', async () => {
  const targets = [
    ['index', new URL('../public/index.html', import.meta.url), new URL('../out/index.html', import.meta.url)],
    ['dashboard', new URL('../public/dashboard/index.html', import.meta.url), new URL('../out/dashboard/index.html', import.meta.url)],
  ];

  for (const [label, publicUrl, outUrl] of targets) {
    const [publicHtml, outHtml] = await Promise.all([
      readFile(publicUrl, 'utf8'),
      readFile(outUrl, 'utf8'),
    ]);

    for (const signature of [
      '/* Unified homepage/dashboard visual system */',
      '--dash-bg: #070a0f',
      'linear-gradient(135deg, #070a0f 0%, #111827 48%, #251109 100%)',
      '/* Shared polished top-right navigation controls */',
    ]) {
      assert.equal(publicHtml.includes(signature), true, `${label} public should include ${signature}`);
      assert.equal(outHtml.includes(signature), true, `${label} out should include ${signature}`);
    }
  }
});
