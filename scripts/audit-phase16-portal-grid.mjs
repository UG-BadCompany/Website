#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`✅ ${m}`);
const fail = (m) => { console.error(`❌ ${m}`); failed = true; };

const cssFile = 'public/assets/public-phase13-dashboard-match.css';
const jsFile = 'public/assets/public-phase16-portal-grid-fix.js';
existsSync(join(root, cssFile)) ? ok(`${cssFile} exists`) : fail(`${cssFile} missing`);
existsSync(join(root, jsFile)) ? ok(`${jsFile} exists`) : fail(`${jsFile} missing`);

const home = readFileSync(join(root, 'public/index.html'), 'utf8');
home.includes('/assets/public-phase16-portal-grid-fix.js') ? ok('homepage includes phase16 fixer') : fail('homepage missing phase16 fixer');

const css = readFileSync(join(root, cssFile), 'utf8');
[
  'Phase 16: exact portal feature grid white-card fix',
  'portal-feature-dark-fix',
  'portal-feature-grid',
  'rgba(15,23,42,.94)',
  '#dbeafe'
].forEach((needle) => css.includes(needle) ? ok(`${needle} present`) : fail(`${needle} missing`));

const js = readFileSync(join(root, jsFile), 'utf8');
[
  'Request quotes',
  'Approve or deny quotes',
  'Track repair status',
  'Manage multiple properties',
  'Review quote history',
  'Payments and invoices next'
].forEach((needle) => js.includes(needle) ? ok(`${needle} marker present`) : fail(`${needle} marker missing`));

if (failed) process.exit(1);
console.log('\nPhase 16 portal grid audit passed.');
