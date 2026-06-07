const fs=require('fs'), path=require('path');
const dir=path.join(process.cwd(),'netlify','migrations');
if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
const files=fs.readdirSync(dir).filter(f=>/^\d{4}_.+\.sql$/.test(f)).sort();
let expected=1; for(const file of files){ const n=Number(file.slice(0,4)); if(n!==expected) throw new Error(`Migration sequence broken at ${file}; expected ${String(expected).padStart(4,'0')}`); expected++; }
console.log(`Migration sequence valid (${files.length} files).`);
