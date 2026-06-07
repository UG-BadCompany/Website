const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const dir = path.join(process.cwd(),'netlify/database/migrations'); if (!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
const files = fs.readdirSync(dir).filter(f=>/^\d{4}_.+\.sql$/.test(f)).sort(); const nums = new Set(); const checksums = {};
for (const f of files) { const n = f.slice(0,4); if (nums.has(n)) { console.error(`Duplicate migration number ${n}`); process.exit(1); } nums.add(n); const body = fs.readFileSync(path.join(dir,f)); if (body[0]===0xef && body[1]===0xbb && body[2]===0xbf) { console.error(`BOM forbidden in ${f}`); process.exit(1); } if (body.includes(Buffer.from('\r\n'))) { console.error(`CRLF forbidden in ${f}`); process.exit(1); } checksums[f]=crypto.createHash('sha256').update(body).digest('hex'); }
const lockPath = path.join(process.cwd(),'netlify/database/migration-lock.json'); const lock = fs.existsSync(lockPath)?JSON.parse(fs.readFileSync(lockPath,'utf8')):{version:1,locked:{}};
for (const [f,sum] of Object.entries(lock.locked||{})) { if (!checksums[f]) { console.error(`Locked migration missing ${f}`); process.exit(1); } if (checksums[f] !== sum) { console.error(`Locked migration changed ${f}`); process.exit(1); } }
console.log(`Validated ${files.length} migrations.`);
