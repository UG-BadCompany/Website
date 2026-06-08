import fs from 'fs';
const required = ['install-status.js','install-finish.js','install.js','modules.js','workflow.js','platform.js'];
for (const file of required) {
  const full = `netlify/functions/${file}`;
  if (!fs.existsSync(full)) throw new Error(`Missing function ${full}`);
}
console.log('Netlify Functions present.');
