#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const root = process.cwd();
let failed = false;
const ok = (m) => console.log(`OK ${m}`);
const fail = (m) => { console.error(`FAIL ${m}`); failed = true; };
const read = (file) => readFileSync(join(root, file), 'utf8');

[
  'public/dashboard/index.html',
  'public/assets/dashboard-phase29-full-cleanup.css',
  'public/assets/dashboard-phase29-action-guard.js',
  'public/dashboard/modules/dashboard-app.js'
].forEach((file) => existsSync(join(root, file)) ? ok(`${file} exists`) : fail(`${file} missing`));

const assetFiles = [];
const walk = (dir) => {
  for (const name of readdirSync(join(root, dir))) {
    const full = join(root, dir, name);
    const rel = relative(root, full).replaceAll('\\', '/');
    if (statSync(full).isDirectory()) walk(rel);
    else if (['.js','.html','.css'].includes(extname(full))) assetFiles.push(rel);
  }
};
walk('public');
const allText = assetFiles.map((file) => read(file)).join('\n');

const anchorHrefs = [...new Set([...allText.matchAll(/href=["']#([^"']+)["']/g)].map((m)=>m[1]).filter(Boolean))];
const ids = new Set([...allText.matchAll(/id=["']([^"']+)["']/g)].map((m)=>m[1]));
const idAssignments = new Set([...allText.matchAll(/\.id\s*=\s*["']([^"']+)["']/g)].map((m)=>m[1]));
for (const href of anchorHrefs) {
  if (ids.has(href) || idAssignments.has(href)) ok(`#${href} target exists`);
  else fail(`#${href} target missing`);
}

const existingPaths = new Set();
for (const file of assetFiles.filter((file)=>file.endsWith('.html'))) {
  let webPath = '/' + file.replace(/^public\//, '');
  if (webPath.endsWith('/index.html')) existingPaths.add(webPath.slice(0, -10) || '/');
  existingPaths.add(webPath);
}
const netlifyToml = existsSync(join(root, 'netlify.toml')) ? read('netlify.toml') : '';
for (const file of assetFiles.filter((file)=>file.endsWith('.html'))) {
  const text = read(file);
  for (const match of text.matchAll(/href=["']([^"']+)["']/g)) {
    const href = match[1];
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue;
    const path = href.split('?')[0].split('#')[0];
    if (path.startsWith('/api/')) {
      netlifyToml.includes(`from = "${path}"`) ? ok(`${path} API route exists`) : fail(`${path} API route missing`);
      continue;
    }
    if (path.includes('.') && !path.endsWith('.html')) continue;
    const check = path.endsWith('/') && path !== '/' ? path.slice(0,-1) : path;
    if (existingPaths.has(check) || existingPaths.has(`${check}/index.html`) || existingPaths.has(`${check}.html`)) ok(`${href} page exists`);
    else fail(`${href} page missing`);
  }
}

const dashboard = read('public/dashboard/index.html');
const dashboardApp = read('public/dashboard/modules/dashboard-app.js');
dashboardApp.includes('data-admin-access-shortcut') ? ok('admin access uses modal shortcut') : fail('admin access shortcut missing');
dashboardApp.includes('data-admin-activity-shortcut') ? ok('admin activity uses modal shortcut') : fail('admin activity shortcut missing');
dashboard.includes('/api/logout?redirect=') ? ok('logout href uses existing route') : fail('logout href not fixed');
dashboard.includes('dashboard-phase29-action-guard.js') ? ok('action guard included') : fail('action guard missing');

if (failed) process.exit(1);
console.log('Phase29 full project audit passed');
