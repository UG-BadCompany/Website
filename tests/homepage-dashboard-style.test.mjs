import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const loadHomeHtml = () => readFile(new URL('../public/index.html', import.meta.url), 'utf8');

test('homepage uses the dashboard visual system', async () => {
  const html = await loadHomeHtml();

  assert.match(html, /--dash-bg: #070a0f/, 'homepage should share dashboard color tokens');
  assert.match(html, /linear-gradient\(135deg, #070a0f 0%, #111827 48%, #251109 100%\)/, 'homepage should use the dashboard dark background gradient');
  assert.match(html, /\.hero \{[\s\S]*grid-template-columns: minmax\(0, 1fr\) minmax\(260px, \.55fr\)/, 'homepage hero should use the dashboard hero layout proportions');
  assert.match(html, /\.hero-media \{[\s\S]*linear-gradient\(180deg, rgba\(255,246,234,\.95\), rgba\(255,250,243,\.82\)\)/, 'homepage logo panel should match dashboard logo-panel styling');
  assert.match(html, /\.service-card,[\s\S]*\.workflow-card,[\s\S]*\.estimate-shell,[\s\S]*\.estimate-form \{[\s\S]*backdrop-filter: blur\(18px\)/, 'homepage cards should use dashboard glass panels');
  assert.match(html, /@media \(max-width: 980px\) \{[\s\S]*\.hero \{ grid-template-columns: 1fr; \}/, 'homepage should keep the dashboard-style hero responsive on narrow screens');
});
