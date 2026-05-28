#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`OK ${m}`);
const fail = (m) => { console.error(`FAIL ${m}`); failed = true; };

[
  'public/assets/dashboard-phase34-sidebar-only-workspaces.css',
  'public/assets/dashboard-phase34-sidebar-only-workspaces.js',
  'public/dashboard/index.html'
].forEach((file) => existsSync(join(root,file)) ? ok(`${file} exists`) : fail(`${file} missing`));

const dash = readFileSync(join(root,'public/dashboard/index.html'),'utf8');
dash.includes('dashboard-phase34-sidebar-only-workspaces.css') ? ok('phase34 css included') : fail('phase34 css missing');
dash.includes('dashboard-phase34-sidebar-only-workspaces.js') ? ok('phase34 js included') : fail('phase34 js missing');
!dash.includes('dashboard-phase33-workspace-routes.js') ? ok('top workspace tabs js removed') : fail('phase33 top tabs js still active');
!dash.includes('dashboard-phase33-workspace-routes.css') ? ok('top workspace tabs css removed') : fail('phase33 top tabs css still active');

const js = readFileSync(join(root,'public/assets/dashboard-phase34-sidebar-only-workspaces.js'),'utf8');
[
  'sidebar-only dashboard workspaces',
  'taSetSidebarWorkspace',
  'data-sidebar-workspace-section',
  'overview',
  'requests',
  'quotes',
  'work-orders',
  'invoices',
  'workers',
  'settings',
  'deployment',
  'Deployment and workflow health'
].forEach((needle) => js.includes(needle) ? ok(`${needle} present`) : fail(`${needle} missing`));

const css = readFileSync(join(root,'public/assets/dashboard-phase34-sidebar-only-workspaces.css'),'utf8');
[
  'workspace-route-tabs',
  'body[data-sidebar-workspace]',
  '.sidebar-workspace-header',
  'body[data-sidebar-workspace="deployment"]'
].forEach((needle) => css.includes(needle) ? ok(`${needle} present`) : fail(`${needle} missing`));

if (failed) process.exit(1);
console.log('Phase34 sidebar-only workspaces audit passed');
