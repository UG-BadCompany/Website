#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`✅ ${m}`);
const fail = (m) => { console.error(`❌ ${m}`); failed = true; };

[
  'public/assets/dashboard-phase23-customer-experience.css',
  'public/assets/dashboard-phase23-customer-experience.js',
  'public/dashboard/index.html',
  'netlify/functions/client-job-requests.mjs',
  'netlify/functions/client-quotes.mjs',
  'netlify/functions/client-invoices.mjs'
].forEach((file) => existsSync(join(root, file)) ? ok(`${file} exists`) : fail(`${file} missing`));

const dash = readFileSync(join(root, 'public/dashboard/index.html'), 'utf8');
dash.includes('/assets/dashboard-phase23-customer-experience.css') ? ok('phase23 css included') : fail('phase23 css missing');
dash.includes('/assets/dashboard-phase23-customer-experience.js') ? ok('phase23 js included') : fail('phase23 js missing');

const js = readFileSync(join(root, 'public/assets/dashboard-phase23-customer-experience.js'), 'utf8');
[
  '/api/client/job-requests',
  '/api/client/quotes',
  '/api/client/invoices',
  'Client status center',
  'friendlyStatus',
  'Latest customer update'
].forEach((needle) => js.includes(needle) ? ok(`${needle} present in customer JS`) : fail(`${needle} missing in customer JS`));

const css = readFileSync(join(root, 'public/assets/dashboard-phase23-customer-experience.css'), 'utf8');
[
  'customer-experience-suite',
  'customer-timeline-step',
  'customer-next-step-card',
  'customer-kpi-row'
].forEach((needle) => css.includes(needle) ? ok(`${needle} present in css`) : fail(`${needle} missing in css`));

if (failed) process.exit(1);
console.log('\nPhase 23 customer experience audit passed.');
