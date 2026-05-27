#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`OK ${m}`);
const fail = (m) => { console.error(`FAIL ${m}`); failed = true; };

[
  'netlify/functions/admin-estimate-rewrite.mjs',
  'public/assets/dashboard-phase2-upgrade.js',
  'public/assets/dashboard-phase42-full-quote-editor.css',
  'public/dashboard/index.html'
].forEach((file) => existsSync(join(root, file)) ? ok(`${file} exists`) : fail(`${file} missing`));

const endpoint = readFileSync(join(root, 'netlify/functions/admin-estimate-rewrite.mjs'), 'utf8');
[
  '/api/admin/estimate-rewrite',
  'OPENAI_API_KEY',
  'fallbackRewrite',
  'aiRewrite',
  'quote.ai_rewrite_generated',
  'missingInfo',
  'rewriteStyle'
].forEach((needle) => endpoint.includes(needle) ? ok(`${needle} endpoint present`) : fail(`${needle} endpoint missing`));

const js = readFileSync(join(root, 'public/assets/dashboard-phase2-upgrade.js'), 'utf8');
[
  'data-ai-rewrite-estimate',
  'data-estimate-missing-info',
  'data-estimate-rewrite-notes',
  'applyRewriteToForm',
  '/api/admin/estimate-rewrite',
  'Save & send',
  'Final customer quote / admin summary'
].forEach((needle) => js.includes(needle) ? ok(`${needle} dashboard present`) : fail(`${needle} dashboard missing`));

const dash = readFileSync(join(root, 'public/dashboard/index.html'), 'utf8');
dash.includes('dashboard-phase42-full-quote-editor.css') ? ok('phase42 css included') : fail('phase42 css missing');

if (failed) process.exit(1);
console.log('Phase42 full quote editor audit passed');
