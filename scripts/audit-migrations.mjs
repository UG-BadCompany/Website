import { spawnSync } from 'node:child_process';
const r=spawnSync(process.execPath,['scripts/prebuild-netlify-migrations.cjs'],{stdio:'inherit'}); process.exit(r.status||0);
