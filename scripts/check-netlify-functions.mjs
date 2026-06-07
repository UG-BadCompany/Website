import fs from 'node:fs';
const required=['install.mjs','install-status.mjs','module-api.mjs','ai.mjs','workflow.mjs','payments.mjs','auth-magic-link.mjs'];
const missing=required.filter(f=>!fs.existsSync(`netlify/functions/${f}`));
if(missing.length) throw new Error(`Missing Netlify functions: ${missing.join(', ')}`);
console.log('Netlify functions present.');
