import fs from 'node:fs';
const css=fs.readFileSync('src/styles.css','utf8');
for(const token of ['--color-bg','--color-surface','--color-primary','prefers-color-scheme']) if(!css.includes(token)) throw new Error(`Theme token missing: ${token}`);
console.log('Theme audit passed.');
