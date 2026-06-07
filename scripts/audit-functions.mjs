import { spawnSync } from 'node:child_process';
const r=spawnSync(process.execPath,['scripts/check-netlify-functions.mjs'],{stdio:'inherit'}); process.exit(r.status||0);
