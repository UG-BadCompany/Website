import { access } from 'node:fs/promises';
for (const file of ['out/index.html','out/install/index.html','out/install/recovery/index.html','out/dashboard/index.html','out/assets/platform.js','out/assets/theme.css']) await access(file);
console.log('Netlify /out check passed.');
