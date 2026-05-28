#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`OK ${m}`);
const fail = (m) => { console.error(`FAIL ${m}`); failed = true; };

[
  'netlify/functions/admin-estimate-rewrite.mjs',
  'netlify/functions/admin-estimate-review.mjs',
  'public/assets/dashboard-phase47-quote-editor-controller.js',
  'public/assets/dashboard-phase48-quote-hardening.css',
  'public/dashboard/index.html'
].forEach((file) => existsSync(join(root, file)) ? ok(`${file} exists`) : fail(`${file} missing`));

const endpoint = readFileSync(join(root, 'netlify/functions/admin-estimate-rewrite.mjs'), 'utf8');
[
  'adminReviewChecklist',
  'customerClarifications',
  'laborBreakdown',
  'materialBreakdown',
  'Return strict JSON only',
  'fallbackRewrite',
  'aiRewrite',
  '/api/admin/estimate-rewrite'
].forEach((needle) => endpoint.includes(needle) ? ok(`${needle} endpoint present`) : fail(`${needle} endpoint missing`));

const controller = readFileSync(join(root, 'public/assets/dashboard-phase47-quote-editor-controller.js'), 'utf8');
[
  'Phase 48 hardened quote editor controller',
  'validatePayload',
  'rewriteForm',
  'saveForm',
  'restoreFromDraft',
  'showRewriteNotes',
  'adminReviewChecklist',
  'customerClarifications',
  "saveForm(form, 'save')",
  "saveForm(form, 'send')",
  '/api/admin/estimate-review',
  '/api/admin/estimate-rewrite',
  'stopImmediatePropagation'
].forEach((needle) => controller.includes(needle) ? ok(`${needle} controller present`) : fail(`${needle} controller missing`));

const dashboard = readFileSync(join(root, 'public/dashboard/index.html'), 'utf8');
dashboard.includes('dashboard-phase48-quote-hardening.css') ? ok('phase48 css included') : fail('phase48 css missing');
dashboard.includes('dashboard-phase47-quote-editor-controller.js') ? ok('quote controller included') : fail('quote controller missing');

if (failed) process.exit(1);
console.log('Phase48 quoting AI/editor hardening audit passed');
