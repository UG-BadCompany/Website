const fs=require('fs'); const path=require('path');
const dir=path.join(process.cwd(),'netlify/database/migrations'); fs.mkdirSync(dir,{recursive:true});
const seen=new Set(); for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.sql'))){ const n=f.match(/^(\d+)/)?.[1]; if(n&&seen.has(n)){ console.error(`Duplicate migration number ${n}`); process.exit(1);} if(n) seen.add(n); }
console.log(`Migration prebuild check passed (${seen.size} migrations).`);
