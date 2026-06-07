import fs from 'node:fs/promises';
for (const f of ['out/index.html','out/install/index.html','out/config/module-manifest.json']) await fs.access(f);
console.log('/out verification passed.');
