import fs from 'node:fs';
for (const f of ['out/index.html','out/assets/app.js','out/assets/styles.css','out/config/modules.json','out/config/bootstrap.json']) {
  if (!fs.existsSync(f)) throw new Error(`Build output missing ${f}`);
}
console.log('Static output directory verified: out');
