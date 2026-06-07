import { promises as fs } from 'fs';
const files=['out/install/index.html','out/install/recovery/index.html','out/assets/install.js','out/assets/styles.css','netlify/functions/install-status.mjs','netlify/functions/install.mjs'];
for(const f of files) await fs.access(f);
const toml=await fs.readFile('netlify.toml','utf8');
if(!toml.includes('from = "/install/*"')) throw new Error('install redirect missing');
if(toml.includes('from = "/*"') && toml.indexOf('from = "/install/*"') > toml.indexOf('from = "/*"')) throw new Error('install redirect after catchall');
const html=await fs.readFile('out/install/index.html','utf8'); if(!html.includes('fallback-shell')||!html.includes('Welcome to Setup')) throw new Error('installer fallback missing');
console.log('Installer verification passed.');
