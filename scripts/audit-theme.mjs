import { readFile } from 'node:fs/promises';
const css=await readFile('public/assets/css/design-system.css','utf8'); const js=await readFile('public/assets/js/core/theme-client.js','utf8');
for(const token of ['data-theme=dark','system','custom']) if(!css.includes(token)&&!js.includes(token)) throw new Error(`Missing theme ${token}`);
console.log('Audited theme modes');
