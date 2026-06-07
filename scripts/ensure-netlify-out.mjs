import { promises as fs } from 'node:fs';
import path from 'node:path';
const out = path.join(process.cwd(), 'out');
await fs.access(out);
await fs.access(path.join(out, 'index.html'));
await fs.access(path.join(out, 'install/index.html'));
console.log('Verified Netlify publish directory out/.');
