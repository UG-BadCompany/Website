#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`OK ${m}`);
const fail = (m) => { console.error(`FAIL ${m}`); failed = true; };

[
  'public/assets/dashboard-phase37-estimate-review-edit.css',
  'public/assets/dashboard-phase2-upgrade.js',
  'public/dashboard/index.html',
  'netlify/functions/admin-estimate-review.mjs',
  'netlify/functions/admin-job-requests.mjs',
  'netlify/functions/admin-quotes.mjs'
].forEach((file) => existsSync(join(root,file)) ? ok(`${file} exists`) : fail(`${file} missing`));

const dashboard = readFileSync(join(root, 'public/dashboard/index.html'), 'utf8');
dashboard.includes('dashboard-phase37-estimate-review-edit.css') ? ok('phase37 css included') : fail('phase37 css missing');

const js = readFileSync(join(root, 'public/assets/dashboard-phase2-upgrade.js'), 'utf8');
[
  'data-edit-estimate',
  'data-estimate-edit-form',
  'data-estimate-title',
  'data-estimate-amount',
  'data-estimate-summary',
  'data-save-send-estimate',
  'saveDraft',
  'data-open-requests-workspace',
  'data-open-quotes-workspace',
  "switchWorkspace('requests')",
  "switchWorkspace('quotes')",
  "method: 'PATCH'"
].forEach((needle) => js.includes(needle) ? ok(`${needle} present`) : fail(`${needle} missing`));

const endpoint = readFileSync(join(root, 'netlify/functions/admin-estimate-review.mjs'), 'utf8');
[
  'PATCH',
  'amountCents',
  'summary',
  'title',
  'estimate_review.updated',
  'estimate_review.sent'
].forEach((needle) => endpoint.includes(needle) ? ok(`${needle} endpoint support present`) : fail(`${needle} endpoint support missing`));

if (failed) process.exit(1);
console.log('Phase37 estimate review editing audit passed');
