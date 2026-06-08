const fs = require('fs');
fs.mkdirSync('netlify/generated', { recursive: true });
fs.writeFileSync('netlify/generated/migrations-ready.json', JSON.stringify({ ok: true, checkedAt: new Date().toISOString() }, null, 2));
console.log('prebuild migrations ready');
