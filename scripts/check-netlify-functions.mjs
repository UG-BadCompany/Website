import fs from 'node:fs/promises';
const required=['install-status.mjs','install.mjs','dashboard-bootstrap.mjs','module-api.mjs','workflow.mjs','ai.mjs'];
for (const f of required) await fs.access(`netlify/functions/${f}`);
console.log('Netlify function check passed.');
