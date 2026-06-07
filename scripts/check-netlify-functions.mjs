import { promises as fs } from 'node:fs';
import path from 'node:path';
const dir = path.join(process.cwd(), 'netlify/functions');
const required = ['install-status.mjs','install.mjs','install-env-status.mjs','install-env.mjs','install-env-test.mjs','dashboard-bootstrap.mjs','module-api.mjs','protected-api.mjs'];
for (const file of required) await fs.access(path.join(dir, file));
console.log(`Validated ${required.length} Netlify functions.`);
