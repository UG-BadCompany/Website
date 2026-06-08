const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'migrations');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
const files = fs.readdirSync(dir).filter((file) => file.endsWith('.sql'));
const names = new Set();
for (const file of files) {
  const prefix = file.split('_')[0];
  if (names.has(prefix)) throw new Error(`Duplicate migration prefix ${prefix}`);
  names.add(prefix);
}
console.log(`Validated ${files.length} immutable migration(s).`);
