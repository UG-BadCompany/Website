import { promises as fs } from 'fs';
for(const f of ['out/index.html','out/install/index.html','out/install/recovery/index.html','out/dashboard/index.html']) await fs.access(f);
console.log('out directory verified.');
