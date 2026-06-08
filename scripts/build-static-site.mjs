import { mkdir, cp, writeFile } from 'node:fs/promises';
await mkdir('out',{recursive:true});
await cp('src','out',{recursive:true});
await writeFile('out/config-bootstrap.json', JSON.stringify({generatedAt:new Date().toISOString(), theme:{mode:'system'}},null,2));
console.log('Built static site to /out');
