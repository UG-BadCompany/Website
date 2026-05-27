#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`OK ${m}`);
const fail = (m) => { console.error(`FAIL ${m}`); failed = true; };

[
  'public/assets/dashboard-phase2-upgrade.js',
  'public/assets/dashboard-phase43-edit-draft-fix.css',
  'public/dashboard/index.html'
].forEach((file) => existsSync(join(root, file)) ? ok(`${file} exists`) : fail(`${file} missing`));

const js = readFileSync(join(root, 'public/assets/dashboard-phase2-upgrade.js'), 'utf8');
[
  'findEstimateForm',
  'openEstimateForm',
  'closeEstimateForm',
  'estimateEditDelegated',
  'data-edit-estimate',
  'data-cancel-estimate-edit'
].forEach((needle) => js.includes(needle) ? ok(`${needle} present`) : fail(`${needle} missing`));

if (js.includes('CSS.escape(button.dataset.editEstimate)')) {
  fail('fragile CSS.escape edit handler still present');
}

const dash = readFileSync(join(root, 'public/dashboard/index.html'), 'utf8');
dash.includes('dashboard-phase43-edit-draft-fix.css') ? ok('phase43 css included') : fail('phase43 css missing');

if (failed) process.exit(1);
console.log('Phase43 edit draft fix audit passed');
