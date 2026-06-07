import fs from 'node:fs';
const html=fs.existsSync('out/index.html')?fs.readFileSync('out/index.html','utf8'):fs.readFileSync('src/index.html','utf8');
if(/href="#"/.test(html)) throw new Error('Dead # links found');
console.log('Deadlink audit passed.');
