import { access } from 'node:fs/promises';
import path from 'node:path';

await access(path.join(process.cwd(), 'out', 'index.html'));
console.log('Verified out/index.html');
