import { existsSync } from 'node:fs';
const required=['public/dashboard/index.html','public/assets/js/dashboard-router.js','public/assets/js/module-loader.js'];
for (const file of required) if (!existsSync(file)) throw new Error(`${file} is required for the clean modular dashboard.`);
console.log('Clean dashboard router and module loader files are present.');
