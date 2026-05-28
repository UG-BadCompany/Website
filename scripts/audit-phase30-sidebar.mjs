#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`OK ${m}`);
const fail = (m) => { console.error(`FAIL ${m}`); failed = true; };

[
  'public/assets/dashboard-phase30-sidebar.css',
  'public/assets/dashboard-phase30-sidebar.js',
  'public/dashboard/index.html'
].forEach((file) => existsSync(join(root, file)) ? ok(`${file} exists`) : fail(`${file} missing`));

const dashboard = readFileSync(join(root, 'public/dashboard/index.html'), 'utf8');
dashboard.includes('/assets/dashboard-phase30-sidebar.css') ? ok('sidebar css included') : fail('sidebar css missing');
dashboard.includes('/assets/dashboard-phase30-sidebar.js') ? ok('sidebar js included') : fail('sidebar js missing');

const css = readFileSync(join(root, 'public/assets/dashboard-phase30-sidebar.css'), 'utf8');
[
  'dashboard-shell-v2',
  'dashboard-sidebar-v2',
  'dashboard-mobile-nav-toggle',
  'dashboard-sidebar-backdrop',
  'data-sidebar-collapsed',
  'dashboard-sidebar-v2[data-collapsed="true"]',
  '@media (max-width: 980px)'
].forEach((needle) => css.includes(needle) ? ok(`${needle} present in css`) : fail(`${needle} missing in css`));

const js = readFileSync(join(root, 'public/assets/dashboard-phase30-sidebar.js'), 'utf8');
[
  'Workspace',
  'Estimate Review',
  'Work Orders',
  'Scheduling',
  'Finance Center',
  'Worker Mobile',
  'Roles & Users',
  'Deployment Health',
  'Dev',
  'dashboard-shell-v2',
  'sidebarToggle',
  'adminAccess',
  '#system-readiness',
  'data-sidebar-collapse',
  'sidebar-collapse-icon',
  'ta_dashboard_sidebar_collapsed',
  'document.addEventListener'
].forEach((needle) => js.includes(needle) ? ok(`${needle} present in js`) : fail(`${needle} missing in js`));

!js.includes('Jump to the exact area you need without scrolling the whole dashboard.') ? ok('old sidebar helper copy removed') : fail('old sidebar helper copy still present');

if (failed) process.exit(1);
console.log('Phase30 sidebar audit passed');
