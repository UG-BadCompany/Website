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
