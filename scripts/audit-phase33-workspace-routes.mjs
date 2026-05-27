#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`OK ${m}`);
const fail = (m) => { console.error(`FAIL ${m}`); failed = true; };

[
  'public/assets/dashboard-phase33-workspace-routes.css',
  'public/assets/dashboard-phase33-workspace-routes.js',
  'public/dashboard/index.html'
].forEach((file) => existsSync(join(root,file)) ? ok(`${file} exists`) : fail(`${file} missing`));

const dash = readFileSync(join(root,'public/dashboard/index.html'),'utf8');
dash.includes('dashboard-phase33-workspace-routes.css') ? ok('workspace css included') : fail('workspace css missing');
dash.includes('dashboard-phase33-workspace-routes.js') ? ok('workspace js included') : fail('workspace js missing');
!dash.includes('dashboard-quick-nav" aria-label="Dashboard quick links"') ? ok('header quick nav block removed') : fail('header quick nav still present');

const js = readFileSync(join(root,'public/assets/dashboard-phase33-workspace-routes.js'),'utf8');
[
  'workspace-route-tabs',
  'data-workspace-route-section',
  'taSetWorkspaceRoute',
  'workspace',
  'work-orders',
  'invoices'
].forEach((needle) => js.includes(needle) ? ok(`${needle} present`) : fail(`${needle} missing`));

if (failed) process.exit(1);
console.log('Phase33 workspace routes audit passed');
