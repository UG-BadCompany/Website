import { promises as fs } from 'node:fs';
import { discoverModules } from './discover-modules.mjs';
const fail = (msg) => { console.error(msg); process.exit(1); };
const modules = await discoverModules();
if (modules.length < 16) fail(`Expected at least 16 modules, found ${modules.length}`);
for (const m of modules) {
  for (const key of ['id','version','minimumPlatform','dependencies','permissions']) if (!(key in m)) fail(`${m.id} missing ${key}`);
}
const registry = JSON.parse(await fs.readFile('public/generated/module-registry.json','utf8'));
if (registry.modules.length !== modules.length) fail('Generated module registry does not match discovered modules');
const dashboard = await fs.readFile('src/dashboard.html','utf8');
if (dashboard.includes('No Data')) fail('Forbidden empty state text found');
for (const text of ['Welcome to Your New Business Platform','Quick Start Checklist','Setup Progress','Business Health','Recommended Actions']) if (!dashboard.includes(text)) fail(`Dashboard missing ${text}`);
const finish = await fs.readFile('netlify/functions/install-finish.mjs','utf8');
for (const opt of ['OpenAI','Resend','Square']) if (finish.includes(`missing.push('${opt}`)) fail(`${opt} blocks install`);
if (!finish.includes('canImpersonate: true') || !finish.includes('canAccessBetaModules: true')) fail('Super Owner capabilities missing');
console.log('Platform verification passed');
