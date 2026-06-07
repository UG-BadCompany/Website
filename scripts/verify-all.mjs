import fs from 'node:fs/promises'; import { execFileSync } from 'node:child_process';
execFileSync(process.execPath,['scripts/discover-modules.mjs'],{stdio:'inherit'});
const text=await fs.readFile('netlify/functions/shared/env-metadata.mjs','utf8');
for (const forbidden of ['ta-contracting.org','tacontracting.netlify.app','sk_live_','sk_test_']) if(text.includes(forbidden)) throw new Error(`Forbidden hardcoded value ${forbidden}`);
const registry=JSON.parse(await fs.readFile('netlify/generated/module-registry.json','utf8')); if(registry.modules.length<10) throw new Error('Expected core module manifests');
console.log('Verification passed.');
