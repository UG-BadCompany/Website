import fs from 'node:fs/promises';
const name = (process.argv[2] || '').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
if (!name) throw new Error('Usage: node scripts/create-migration.mjs descriptive_name');
await fs.mkdir('netlify/database/migrations',{recursive:true});
const files = (await fs.readdir('netlify/database/migrations')).filter(f=>/^\d{4}_/.test(f));
const next = String(Math.max(0,...files.map(f=>Number(f.slice(0,4))))+1).padStart(4,'0');
const file = `netlify/database/migrations/${next}_${name}.sql`;
await fs.writeFile(file, `-- ${next} ${name}\n`);
console.log(file);
