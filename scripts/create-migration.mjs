import { promises as fs } from 'fs';
const name=(process.argv[2]||'new_migration').replace(/[^a-z0-9_]+/gi,'_').toLowerCase(); await fs.mkdir('netlify/database/migrations',{recursive:true});
const files=(await fs.readdir('netlify/database/migrations')).filter(f=>/^\d+_/.test(f)); const next=String((Math.max(0,...files.map(f=>Number(f.split('_')[0])))+1)).padStart(4,'0'); const file=`netlify/database/migrations/${next}_${name}.sql`; await fs.writeFile(file,'-- New migration\n'); console.log(file);
