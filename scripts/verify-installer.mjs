import { access, readFile } from 'node:fs/promises';
const files=['out/install/index.html','out/install/recovery/index.html','out/assets/installer.js','out/assets/theme.css','netlify/functions/install-status.mjs','netlify/functions/install-health.mjs','netlify/functions/install-draft.mjs','netlify/functions/install-finish.mjs','public/_redirects'];
for (const file of files) await access(file);
const redirects=await readFile('public/_redirects','utf8');
for (const route of ['/api/install-status','/api/install/health','/api/install/draft','/api/install/finish']) {
  if (!redirects.includes(route)) throw new Error(`${route} redirect is missing`);
}
console.log('Installer verification passed.');
