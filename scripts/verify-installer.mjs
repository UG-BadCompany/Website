import { promises as fs } from 'node:fs';
const fail = (msg) => { console.error(msg); process.exit(1); };
const read = (p) => fs.readFile(p, 'utf8');
const netlify = await read('netlify.toml');
for (const route of ['/api/install-status','/api/install/health','/api/install/draft','/api/install/finish']) {
  if (!netlify.includes(route)) fail(`Missing Netlify redirect for ${route}`);
}
for (const fn of ['install-status.mjs','install-health.mjs','install-draft.mjs','install-finish.mjs']) {
  const body = await read(`netlify/functions/${fn}`);
  if (!body.includes('json(') || body.includes('text/html')) fail(`${fn} does not consistently return JSON`);
}
const install = await read('src/install-app.html');
if (!install.includes('setTimeout(()=>saveDraft(true), 1000)')) fail('Autosave debounce is not 1000ms');
if (!install.includes('autosaveStopped=true')) fail('Autosave does not stop after a failure');
if (!install.includes('Retry Save')) fail('Retry Save button missing');
if (install.includes('Missing:</strong></div>') || install.includes('Missing:')) fail('Installer may display blank Missing section');
if (!install.includes('/api/install/health') || !install.includes('/api/install/draft') || !install.includes('/api/install/finish')) fail('Installer does not call required routes');
console.log('Installer verification passed');
