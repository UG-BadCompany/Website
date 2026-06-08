import { stat } from 'node:fs/promises';
await stat('out/index.html');
console.log('/out verified');
