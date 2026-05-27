#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`✅ ${m}`);
const fail = (m) => { console.error(`❌ ${m}`); failed = true; };

const cssPath = 'public/assets/dashboard-phase14-readability.css';
existsSync(join(root, cssPath)) ? ok(`${cssPath} exists`) : fail(`${cssPath} missing`);

const dashboard = readFileSync(join(root, 'public/dashboard/index.html'), 'utf8');
dashboard.includes('/assets/dashboard-phase14-readability.css') ? ok('readability css included') : fail('readability css missing from dashboard');

const css = readFileSync(join(root, cssPath), 'utf8');
[
  '--readable-text',
  '--readable-muted',
  'color: #ffffff',
  'background: linear-gradient',
  'input::placeholder',
  'table'
].forEach((needle) => css.includes(needle) ? ok(`${needle} present`) : fail(`${needle} missing`));

if (failed) process.exit(1);
console.log('\nPhase 14 readability audit passed.');
