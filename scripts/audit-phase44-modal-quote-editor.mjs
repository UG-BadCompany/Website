#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`OK ${m}`);
const fail = (m) => { console.error(`FAIL ${m}`); failed = true; };

[
  'public/assets/dashboard-phase2-upgrade.js',
  'public/assets/dashboard-phase44-quote-editor-modal.css',
  'public/dashboard/index.html',
  'netlify/functions/admin-estimate-rewrite.mjs'
].forEach((file) => existsSync(join(root, file)) ? ok(`${file} exists`) : fail(`${file} missing`));

const js = readFileSync(join(root, 'public/assets/dashboard-phase2-upgrade.js'), 'utf8');
[
  'ensureQuoteEditorModal',
  'openQuoteEditorModal',
  'quoteModalDelegated',
  'data-modal-ai-rewrite',
  '/api/admin/estimate-rewrite',
  '/api/admin/estimate-review',
  'data-edit-estimate',
  'window.__latestEstimateDrafts'
].forEach((needle) => js.includes(needle) ? ok(`${needle} present`) : fail(`${needle} missing`));

const dash = readFileSync(join(root, 'public/dashboard/index.html'), 'utf8');
dash.includes('dashboard-phase44-quote-editor-modal.css') ? ok('phase44 css included') : fail('phase44 css missing');

if (failed) process.exit(1);
console.log('Phase44 modal quote editor audit passed');
