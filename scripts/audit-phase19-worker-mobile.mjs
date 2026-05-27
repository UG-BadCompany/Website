#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`✅ ${m}`);
const fail = (m) => { console.error(`❌ ${m}`); failed = true; };

[
  'public/assets/dashboard-phase19-worker-mobile.css',
  'public/assets/dashboard-phase19-worker-mobile.js',
  'public/dashboard/index.html',
  'netlify/functions/worker-jobs.mjs'
].forEach((file) => existsSync(join(root, file)) ? ok(`${file} exists`) : fail(`${file} missing`));

const dashboard = readFileSync(join(root, 'public/dashboard/index.html'), 'utf8');
dashboard.includes('/assets/dashboard-phase19-worker-mobile.css') ? ok('phase19 css included') : fail('phase19 css missing');
dashboard.includes('/assets/dashboard-phase19-worker-mobile.js') ? ok('phase19 js included') : fail('phase19 js missing');

const css = readFileSync(join(root, 'public/assets/dashboard-phase19-worker-mobile.css'), 'utf8');
[
  'worker-mobile-suite',
  'worker-mobile-bottom-bar',
  '@media (max-width: 780px)',
  'position: sticky'
].forEach((needle) => css.includes(needle) ? ok(`${needle} present in css`) : fail(`${needle} missing in css`));

const js = readFileSync(join(root, 'public/assets/dashboard-phase19-worker-mobile.js'), 'utf8');
[
  '/api/worker/jobs',
  'worker-mobile-field',
  'Today’s field work',
  'Before photos taken',
  'Blocked job note'
].forEach((needle) => js.includes(needle) ? ok(`${needle} present in js`) : fail(`${needle} missing in js`));

if (failed) process.exit(1);
console.log('\nPhase 19 worker mobile audit passed.');
