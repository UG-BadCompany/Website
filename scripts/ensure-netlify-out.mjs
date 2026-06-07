import fs from 'node:fs/promises';
for (const f of ['out/index.html','out/install/index.html','out/dashboard/index.html','out/config/bootstrap.json','out/config/module-manifest.json']) { try { await fs.access(f); } catch { console.error(`Missing build output ${f}`); process.exit(1); } }
console.log('Netlify out directory verified.');
