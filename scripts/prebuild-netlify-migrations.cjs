const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'netlify', 'migrations');
if (!fs.existsSync(dir)) process.exit(0);
const nums = new Map();
for (const file of fs.readdirSync(dir).filter(f => /^\d+.*\.sql$/.test(f))) {
  const n = file.match(/^(\d+)/)[1];
  if (nums.has(n)) throw new Error(`Duplicate migration number ${n}: ${nums.get(n)} and ${file}`);
  nums.set(n, file);
}
