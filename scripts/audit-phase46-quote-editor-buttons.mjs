#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`OK ${m}`);
const fail = (m) => { console.error(`FAIL ${m}`); failed = true; };

[
  'public/assets/dashboard-phase2-upgrade.js',
  'public/assets/dashboard-phase46-quote-editor-buttons.css',
  'public/dashboard/index.html',
  'netlify/functions/admin-estimate-rewrite.mjs',
  'netlify/functions/admin-estimate-review.mjs'
].forEach((file) => existsSync(join(root, file)) ? ok(`${file} exists`) : fail(`${file} missing`));

const js = readFileSync(join(root, 'public/assets/dashboard-phase2-upgrade.js'), 'utf8');

[
  'phase46EditorButtons',
  'resetEstimateForm',
  'saveEstimateForm',
  'rewriteEstimateForm',
  'getEstimateFormPayload',
  'updateEstimateFormStatus',
  'data-ai-rewrite-estimate',
  'data-cancel-estimate-edit',
  'data-save-send-estimate',
  '/api/admin/estimate-rewrite',
  '/api/admin/estimate-review',
  "saveEstimateForm(form, 'save')",
  "saveEstimateForm(form, 'send')",
  'Cancel edits'
].forEach((needle) => js.includes(needle) ? ok(`${needle} present`) : fail(`${needle} missing`));

const dash = readFileSync(join(root, 'public/dashboard/index.html'), 'utf8');
dash.includes('dashboard-phase46-quote-editor-buttons.css') ? ok('phase46 css included') : fail('phase46 css missing');

if (failed) process.exit(1);
console.log('Phase46 quote editor button audit passed');
