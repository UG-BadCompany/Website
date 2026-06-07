const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dir = path.join(process.cwd(), 'netlify/database');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^\d+.*\.sql$/.test(f)).sort() : [];
const seen = new Set();
for (const file of files) {
  const number = file.match(/^(\d+)/)?.[1];
  if (seen.has(number)) throw new Error(`Duplicate migration number ${number}`);
  seen.add(number);
}
const lockPath = path.join(dir, 'migration-lock.json');
if (fs.existsSync(lockPath)) {
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  for (const [file, expected] of Object.entries(lock.migrations || {})) {
    const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, file))).digest('hex');
    if (actual !== expected) throw new Error(`Locked migration changed: ${file}`);
  }
}
console.log(`Validated ${files.length} Netlify database migrations.`);
