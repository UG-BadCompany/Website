import fs from 'node:fs';
for(const f of ['out/index.html','out/app.js','out/styles.css']) if(!fs.existsSync(f)) throw new Error(`Missing ${f}`);
console.log('Static output verified.');
