import fs from 'node:fs';
const bad=['Replace before production','Demo only','Fallback path','Placeholder contact details'];
const files=['src/index.html','src/app.js'];
for(const f of files){ const s=fs.readFileSync(f,'utf8'); for(const b of bad) if(s.includes(b)) throw new Error(`${f} contains public placeholder: ${b}`); }
console.log('UX audit passed.');
