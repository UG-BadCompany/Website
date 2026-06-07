import { access, readFile } from 'node:fs/promises';
const files=['install-status','install-health','install-draft','install-finish','config-bootstrap','module-api','system'];
for(const f of files) await access(`netlify/functions/${f}.mjs`);
const text=await readFile('netlify/functions/shared/response.mjs','utf8'); if(text.includes('process.env[name] }')) throw new Error('Secret exposure risk');
console.log('Audited functions');
