#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`OK ${m}`);
const fail = (m) => { console.error(`FAIL ${m}`); failed = true; };

[
  'public/assets/dashboard-phase35-remove-top-tabs.css',
  'public/assets/dashboard-phase35-remove-top-tabs.js',
  'public/dashboard/index.html'
].forEach((file) => existsSync(join(root, file)) ? ok(`${file} exists`) : fail(`${file} missing`));

[
  'public/assets/dashboard-phase33-workspace-routes.css',
  'public/assets/dashboard-phase33-workspace-routes.js'
].forEach((file) => !existsSync(join(root, file)) ? ok(`${file} removed`) : fail(`${file} still exists`));

const dash = readFileSync(join(root, 'public/dashboard/index.html'), 'utf8');
!dash.includes('dashboard-phase33-workspace-routes.css') ? ok('phase33 css include removed') : fail('phase33 css include still present');
!dash.includes('dashboard-phase33-workspace-routes.js') ? ok('phase33 js include removed') : fail('phase33 js include still present');
dash.includes('dashboard-phase35-remove-top-tabs.css') ? ok('phase35 css included') : fail('phase35 css missing');
dash.includes('dashboard-phase35-remove-top-tabs.js') ? ok('phase35 js included') : fail('phase35 js missing');

const css = readFileSync(join(root, 'public/assets/dashboard-phase35-remove-top-tabs.css'), 'utf8');
['workspace-route-tabs', 'data-workspace-route-tabs', 'display: none'].forEach((needle) => css.includes(needle) ? ok(`${needle} present`) : fail(`${needle} missing`));

if (failed) process.exit(1);
console.log('Phase35 remove top tabs audit passed');
