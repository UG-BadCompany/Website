#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`OK ${m}`);
const fail = (m) => { console.error(`FAIL ${m}`); failed = true; };

[
  'public/assets/dashboard-phase36-remove-old-workspace.js',
  'public/assets/dashboard-phase36-remove-old-workspace.css',
  'public/assets/dashboard-phase34-sidebar-only-workspaces.js',
  'public/dashboard/index.html'
].forEach((file) => existsSync(join(root, file)) ? ok(`${file} exists`) : fail(`${file} missing`));

[
  'public/assets/dashboard-phase33-workspace-routes.css',
  'public/assets/dashboard-phase33-workspace-routes.js'
].forEach((file) => !existsSync(join(root, file)) ? ok(`${file} removed`) : fail(`${file} still exists`));

const dash = readFileSync(join(root, 'public/dashboard/index.html'), 'utf8');
dash.includes('dashboard-phase36-remove-old-workspace.js') ? ok('phase36 js included') : fail('phase36 js missing');
dash.includes('dashboard-phase36-remove-old-workspace.css') ? ok('phase36 css included') : fail('phase36 css missing');
!dash.includes('dashboard-phase33-workspace-routes') ? ok('phase33 old workspace assets not included') : fail('phase33 old workspace assets still included');

const phase34 = readFileSync(join(root, 'public/assets/dashboard-phase34-sidebar-only-workspaces.js'), 'utf8');
!phase34.includes("searchParams.set('workspace'") ? ok('phase34 no longer writes workspace query') : fail('phase34 still writes workspace query');
phase34.includes("searchParams.delete('workspace'") ? ok('phase34 removes old workspace query') : fail('phase34 does not remove old workspace query');

const publicDir = join(root, 'public');
const htmlFiles = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (full.endsWith('.html')) htmlFiles.push(full);
  }
};
walk(publicDir);

for (const file of htmlFiles) {
  const text = readFileSync(file, 'utf8');
  const rel = relative(root, file).replaceAll('\\', '/');
  !text.includes('/dashboard/?workspace=overview') ? ok(`${rel} no old overview link`) : fail(`${rel} still has old overview link`);
}

if (failed) process.exit(1);
console.log('Phase36 old workspace cleanup audit passed');
