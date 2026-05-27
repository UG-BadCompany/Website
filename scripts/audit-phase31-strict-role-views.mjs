#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`OK ${m}`);
const fail = (m) => { console.error(`FAIL ${m}`); failed = true; };

[
  'public/assets/dashboard-phase31-strict-role-views.css',
  'public/assets/dashboard-phase31-strict-role-views.js',
  'public/dashboard/index.html'
].forEach((file) => existsSync(join(root, file)) ? ok(`${file} exists`) : fail(`${file} missing`));

const dashboard = readFileSync(join(root, 'public/dashboard/index.html'), 'utf8');
dashboard.includes('/assets/dashboard-phase31-strict-role-views.css') ? ok('strict role css included') : fail('strict role css missing');
dashboard.includes('/assets/dashboard-phase31-strict-role-views.js') ? ok('strict role js included') : fail('strict role js missing');

const js = readFileSync(join(root, 'public/assets/dashboard-phase31-strict-role-views.js'), 'utf8');
[
  'strict role workspace separation',
  'setAttribute',
  'data-strict-view',
  'admin operations only',
  'Client view: showing client',
  'Worker view: showing worker',
  'updateSidebarForView'
].forEach((needle) => js.includes(needle) ? ok(`${needle} present`) : fail(`${needle} missing`));

const css = readFileSync(join(root, 'public/assets/dashboard-phase31-strict-role-views.css'), 'utf8');
[
  'body[data-current-dashboard-view="admin"]',
  'body[data-current-dashboard-view="client"]',
  'body[data-current-dashboard-view="worker"]',
  '.role-view-clean-note'
].forEach((needle) => css.includes(needle) ? ok(`${needle} present`) : fail(`${needle} missing`));

if (failed) process.exit(1);
console.log('Phase31 strict role views audit passed');
