import fs from 'node:fs/promises';
const required = ['install-status.mjs','install.mjs','env.mjs','dashboard-bootstrap.mjs','module-api.mjs','workflow.mjs','ai.mjs','system.mjs'];
const files = new Set(await fs.readdir('netlify/functions'));
const missing = required.filter((f)=>!files.has(f));
if (missing.length) { console.error(`Missing functions: ${missing.join(', ')}`); process.exit(1); }
console.log('Netlify functions present.');
