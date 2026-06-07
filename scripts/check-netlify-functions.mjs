import { promises as fs } from 'fs';
const required=['install-status.mjs','install.mjs','dashboard-bootstrap.mjs','public-config.mjs','module-api.mjs','workflow.mjs','square-webhook.mjs'];
for(const f of required) await fs.access(`netlify/functions/${f}`);
console.log('Netlify functions present.');
