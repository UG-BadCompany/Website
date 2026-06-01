import assert from 'node:assert/strict';
import test from 'node:test';
import { readText } from './browser-qa-utils.mjs';

test('estimate review queue and quote editor hooks are present for mocked API data', async () => {
  const phase2 = await readText('public/assets/dashboard-phase2-upgrade.js');
  const controller = await readText('public/assets/dashboard-phase47-quote-editor-controller.js');
  const quoteSources = `${phase2}\n${controller}`;
  assert.match(quoteSources, /\/api\/admin\/estimate-review/, 'estimate review should load queue API data');
  assert.match(quoteSources, /window\.__latestEstimateDrafts/, 'latest estimate drafts should be exposed for cancel/restore');
  for (const field of ['data-estimate-title', 'data-estimate-amount', 'data-estimate-summary', 'data-estimate-missing-info']) {
    assert.ok(controller.includes(field), `${field} should be editable`);
  }
});

test('quote editor AI rewrite, save draft, cancel, and save-send actions have status feedback', async () => {
  const controller = await readText('public/assets/dashboard-phase47-quote-editor-controller.js');
  assert.match(controller, /fetchJson\('\/api\/admin\/estimate-rewrite'/, 'AI Rewrite should hit the rewrite API');
  assert.match(controller, /Saving draft…[\s\S]*Draft saved\./, 'Save Draft should show saving and saved statuses');
  assert.match(controller, /Cancelled\. Fields restored to the last loaded draft\./, 'Cancel Edits should show restore status');
  assert.match(controller, /Saving and sending quote…[\s\S]*Saved and sent\./, 'Save & Send should show send statuses');
});

test('Estimate Review Center inbox wording and production-safe copy are present', async () => {
  const html = await readText('public/dashboard/index.html');
  const phase2 = await readText('public/assets/dashboard-phase2-upgrade.js');
  const bootstrap = await readText('public/dashboard/modules/dashboard/bootstrap.js');
  const quoteAreaSources = `${html}\n${phase2}\n${bootstrap}`;

  assert.match(html, /Estimate Review Center/, 'admin quotes heading should use Estimate Review Center');
  assert.match(html, /Review submitted estimate requests, edit AI-generated drafts, adjust pricing, save drafts, and send final quotes to clients\./, 'admin quotes description should explain the review workflow');
  for (const label of ['Needs Review', 'Drafts', 'Sent', 'Accepted', 'Declined', 'All']) {
    assert.match(html, new RegExp(`>${label}<`), `${label} tab should be visible`);
  }
  assert.match(bootstrap, /Submitted estimate requests need review\./, 'submitted request empty-state should be explicit');
  assert.match(bootstrap, /No quotes match this filter\./, 'empty filter state should remain clear');
  assert.doesNotMatch(quoteAreaSources, /SYSTEM HEALTH|System Health|What changed|Backend engine: automatic estimate draft/, 'internal System Health copy should not appear in quote UI sources');
});

test('dashboard module switching resets scroll to module top anchors', async () => {
  const sidebar = await readText('public/assets/dashboard-phase34-sidebar-only-workspaces.js');
  const mobile = await readText('public/assets/mobile-dashboard-ux.js');
  const html = await readText('public/dashboard/index.html');

  assert.match(html, /data-module-top-anchor="quotes"/, 'quotes module should expose a top anchor');
  assert.match(sidebar, /ensureModuleTopAnchor/, 'sidebar workspace switching should create top anchors for modules');
  assert.match(sidebar, /scrollTo\(\{ top, left: 0, behavior \}\)/, 'sidebar workspace switching should scroll by absolute top offset');
  assert.match(sidebar, /scrollToAnchor\('auto'\)[\s\S]*scrollToAnchor\('smooth'\)/, 'sidebar workspace switching should use instant scroll before optional smooth scroll');
  assert.match(sidebar, /visualViewport\?\.offsetTop/, 'sidebar scrolling should account for mobile Safari visual viewport offset');
  assert.match(mobile, /scrollToAnchor\('auto'\)[\s\S]*scrollToAnchor\('smooth'\)/, 'mobile fallback workspace links should also reset scroll to top');
});
