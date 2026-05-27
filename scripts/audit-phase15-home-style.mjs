#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`✅ ${m}`);
const fail = (m) => { console.error(`❌ ${m}`); failed = true; };

const cssFile = 'public/assets/public-phase13-dashboard-match.css';
const jsFile = 'public/assets/public-phase15-home-section-fix.js';
existsSync(join(root, cssFile)) ? ok(`${cssFile} exists`) : fail(`${cssFile} missing`);
existsSync(join(root, jsFile)) ? ok(`${jsFile} exists`) : fail(`${jsFile} missing`);

const home = readFileSync(join(root, 'public/index.html'), 'utf8');
home.includes('/assets/public-phase15-home-section-fix.js') ? ok('homepage includes phase15 fixer') : fail('homepage missing phase15 fixer');

const css = readFileSync(join(root, cssFile), 'utf8');
[
  'Phase 15: force remaining homepage white blocks',
  '#portal',
  '#estimate',
  'home-dark-panel-fix',
  'rgba(15,23,42,.92)',
  '#dbeafe'
].forEach((needle) => css.includes(needle) ? ok(`${needle} present`) : fail(`${needle} missing`));

if (failed) process.exit(1);
console.log('\nPhase 15 homepage style audit passed.');
