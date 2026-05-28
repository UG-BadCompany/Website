#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`OK ${m}`);
const fail = (m) => { console.error(`FAIL ${m}`); failed = true; };

[
  'public/assets/dashboard-phase2-upgrade.js',
  'public/assets/dashboard-phase45-visible-estimate-editor.css',
  'public/dashboard/index.html',
  'netlify/functions/admin-estimate-rewrite.mjs',
  'netlify/functions/admin-estimate-review.mjs'
].forEach((file) => existsSync(join(root, file)) ? ok(`${file} exists`) : fail(`${file} missing`));

const js = readFileSync(join(root, 'public/assets/dashboard-phase2-upgrade.js'), 'utf8');

[
  'estimate-visible-editor',
  'Final editable quote',
  'data-estimate-editor-section',
  'data-focus-estimate-editor',
  'data-ai-rewrite-estimate',
  'data-estimate-title',
  'data-estimate-amount',
  'data-estimate-summary',
  'data-estimate-missing-info',
  'Save draft',
  'Save & send'
].forEach((needle) => js.includes(needle) ? ok(`${needle} present`) : fail(`${needle} missing`));

if (js.includes('class="estimate-edit-form" data-estimate-edit-form="${escapeHtml(draft.quoteId)}" hidden')) {
  fail('old hidden edit form still present');
}

const dashboard = readFileSync(join(root, 'public/dashboard/index.html'), 'utf8');
dashboard.includes('dashboard-phase45-visible-estimate-editor.css') ? ok('phase45 css included') : fail('phase45 css missing');

if (failed) process.exit(1);
console.log('Phase45 visible estimate editor audit passed');
