#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`OK ${m}`);
const fail = (m) => { console.error(`FAIL ${m}`); failed = true; };

[
  'public/assets/dashboard-phase47-quote-editor-controller.js',
  'public/assets/dashboard-phase47-quote-editor-controller.css',
  'public/dashboard/index.html',
  'netlify/functions/admin-estimate-review.mjs',
  'netlify/functions/admin-estimate-rewrite.mjs'
].forEach((file) => existsSync(join(root, file)) ? ok(`${file} exists`) : fail(`${file} missing`));

const js = readFileSync(join(root, 'public/assets/dashboard-phase47-quote-editor-controller.js'), 'utf8');

[
  'document.addEventListener',
  'data-ai-rewrite-estimate',
  'data-cancel-estimate-edit',
  'data-save-send-estimate',
  'data-estimate-edit-form',
  '/api/admin/estimate-review',
  '/api/admin/estimate-rewrite',
  "saveForm(form, 'save')",
  "saveForm(form, 'send')",
  'rewriteForm(form)',
  'restoreFromCard(form)',
  'stopImmediatePropagation'
].forEach((needle) => js.includes(needle) ? ok(`${needle} present`) : fail(`${needle} missing`));

const dash = readFileSync(join(root, 'public/dashboard/index.html'), 'utf8');
dash.includes('dashboard-phase47-quote-editor-controller.js') ? ok('controller js included') : fail('controller js missing');
dash.includes('dashboard-phase47-quote-editor-controller.css') ? ok('controller css included') : fail('controller css missing');

if (failed) process.exit(1);
console.log('Phase47 independent quote editor controller audit passed');
