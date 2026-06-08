import { promises as fs } from 'node:fs';
const required = ['out/index.html','out/install/index.html','out/dashboard/index.html','out/config/bootstrap.json','out/generated/module-registry.json'];
const missing = [];
for (const file of required) { try { await fs.access(file); } catch { missing.push(file); } }
if (missing.length) { console.error('Missing build outputs:', missing.join(', ')); process.exit(1); }
console.log('Static output verified in /out');
