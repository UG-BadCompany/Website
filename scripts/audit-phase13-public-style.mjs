#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`✅ ${m}`);
const fail = (m) => { console.error(`❌ ${m}`); failed = true; };

const css = 'public/assets/public-phase13-dashboard-match.css';
existsSync(join(root, css)) ? ok(`${css} exists`) : fail(`${css} missing`);

[
  'public/index.html',
  'public/login/index.html',
  'public/thank-you/index.html',
  'public/inventory/index.html',
  'public/portal/admin/index.html',
  'public/portal/client/index.html',
  'public/portal/worker/index.html'
].forEach((file) => {
  const text = readFileSync(join(root, file), 'utf8');
  text.includes('/assets/header-phase10.css') ? ok(`${file} has shared header`) : fail(`${file} missing shared header`);
  text.includes('/assets/public-phase13-dashboard-match.css') ? ok(`${file} has dashboard-matching public theme`) : fail(`${file} missing public theme`);
});

const theme = readFileSync(join(root, css), 'utf8');
['linear-gradient(135deg', '#f97316', '#f59e0b', 'dashboard', 'dark/copper'].forEach((needle) => {
  theme.includes(needle) ? ok(`theme contains ${needle}`) : fail(`theme missing ${needle}`);
});

if (failed) process.exit(1);
console.log('\nPhase 13 public style audit passed.');
