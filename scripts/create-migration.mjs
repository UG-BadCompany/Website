import fs from 'node:fs/promises'; import path from 'node:path';
const name=(process.argv[2]||'migration').replace(/[^a-z0-9_]+/gi,'_').toLowerCase(); const dir='netlify/database/migrations'; await fs.mkdir(dir,{recursive:true});
const nums=(await fs.readdir(dir)).map(f=>Number(f.match(/^(\d+)/)?.[1]||0)); const next=String(Math.max(0,...nums)+1).padStart(4,'0'); const file=path.join(dir,`${next}_${name}.sql`); await fs.writeFile(file,`-- ${name}\n`); console.log(file);
