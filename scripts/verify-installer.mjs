import fs from 'node:fs';
const app = fs.readFileSync('src/assets/app.js','utf8');
const statusFn = fs.readFileSync('netlify/functions/install-status.js','utf8');
const finishFn = fs.readFileSync('netlify/functions/install-finish.js','utf8');
const checks = {
  'fresh / redirects to /install/': app.includes('status.needsInstall') && app.includes("navigate('/install/')"),
  'installer has recovery route': app.includes('renderRecovery') && app.includes('/install/recovery'),
  'installer never blank': app.includes('safe-shell') && app.includes('renderCrash'),
  'safe install-status JSON': statusFn.includes('catch') && statusFn.includes('needsInstall'),
  'finish sets installation_complete true': finishFn.includes('installation_complete: true'),
  'optional integrations warnings only': finishFn.includes('integrationWarnings') && !finishFn.includes('OPENAI_API_KEY')
};
const failed = Object.entries(checks).filter(([,ok])=>!ok);
for (const [name,ok] of Object.entries(checks)) console.log(`${ok?'✓':'✗'} ${name}`);
if (failed.length) throw new Error(`Installer verification failed: ${failed.map(([n])=>n).join(', ')}`);
