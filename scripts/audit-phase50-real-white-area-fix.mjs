#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`OK ${m}`);
const fail = (m) => { console.error(`FAIL ${m}`); failed = true; };

[
  'public/assets/dashboard-phase50-real-white-area-fix.css',
  'public/index.html',
  'public/login/index.html',
  'public/dashboard/index.html'
].forEach((file) => existsSync(join(root, file)) ? ok(`${file} exists`) : fail(`${file} missing`));

const css = readFileSync(join(root, 'public/assets/dashboard-phase50-real-white-area-fix.css'), 'utf8');
[
  '.nav .nav-links > a:not(.btn)',
  '.portal-shell',
  '.portal-hero',
  '.portal-benefits .benefit',
  '.login-panel',
  '.login-card',
  '#portal-title'
].forEach((needle) => css.includes(needle) ? ok(`${needle} targeted`) : fail(`${needle} missing`));

['public/index.html','public/login/index.html','public/dashboard/index.html'].forEach((file) => {
  const html = readFileSync(join(root, file), 'utf8');
  html.includes('dashboard-phase50-real-white-area-fix.css') ? ok(`${file} includes phase50`) : fail(`${file} missing phase50 include`);
});

if (failed) process.exit(1);
console.log('Phase50 real white-area fix audit passed');
