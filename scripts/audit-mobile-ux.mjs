import { readFileSync } from 'node:fs';
const css=readFileSync('public/assets/css/base.css','utf8')+readFileSync('public/dashboard/dashboard.css','utf8');
if(!/@media\(max-width:820px\)|@media \(max-width:820px\)|mobile-nav/.test(css)) throw new Error('Responsive/mobile dashboard styles are missing.');
console.log('Responsive mobile styles are present.');
