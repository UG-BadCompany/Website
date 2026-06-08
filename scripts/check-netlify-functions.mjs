import { promises as fs } from 'node:fs';
const required = ['install-status.mjs','install-health.mjs','install-draft.mjs','install-finish.mjs','dashboard-bootstrap.mjs','module-api.mjs'];
const missing = [];
for (const file of required) { try { await fs.access(`netlify/functions/${file}`); } catch { missing.push(file); } }
if (missing.length) { console.error('Missing Netlify functions:', missing.join(', ')); process.exit(1); }
console.log('Netlify functions present:', required.join(', '));
