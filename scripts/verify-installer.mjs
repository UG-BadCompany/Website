import { readFile, access } from 'node:fs/promises';
await access('public/install/index.html'); await access('public/install/recovery/index.html');
const install=await readFile('public/install/index.html','utf8');
for(const text of ['static fallback','Finish Install','Environment variables']) if(!install.includes(text)) throw new Error(`Installer missing ${text}`);
console.log('Verified installer static fallback and required pages');
