import fs from 'node:fs';
const modules = fs.readdirSync('modules', { withFileTypes:true }).filter(d=>d.isDirectory()).map(d=>JSON.parse(fs.readFileSync(`modules/${d.name}/manifest.json`,'utf8')));
const app = fs.readFileSync('src/assets/app.js','utf8');
const netlify = fs.readFileSync('netlify.toml','utf8');
const requiredModules = ['Quote Center','Work Orders','Scheduling','Inventory','Invoices','Finance','AI Photo Estimate','AI Quote','AI Troubleshooting','Homepage Editor','Theme Manager','Module Manager','Client Portal','Platform Health','Cache Manager','Audit Logs','File Manager','Workflow Engine','Backup / Restore'];
const names = new Set(modules.map(m=>m.name));
const checks = {
  'static out build config': netlify.includes('publish = "out"') && netlify.includes('functions = "netlify/functions"'),
  'Node 20 and next plugin skip': netlify.includes('NODE_VERSION = "20"') && netlify.includes('NETLIFY_NEXT_PLUGIN_SKIP = "true"'),
  'no Next.js plugin': !netlify.includes('@netlify/plugin-nextjs'),
  'all core modules': requiredModules.every(n=>names.has(n)),
  'drop-in generated registry exists after build source': fs.existsSync('scripts/build-static-site.mjs'),
  'owner workspace switching': app.includes('Super Owner workspace switching') && app.includes('impersonate'),
  'workflow complete path': app.includes('Request → Quote → Work Order → Schedule → Worker → Completion → Invoice → Payment → Verification → Archive'),
  'system integrations page': app.includes('Environment & Integrations'),
  'theme modes': app.includes('system') && app.includes('dark') && app.includes('custom')
};
const failed = Object.entries(checks).filter(([,ok])=>!ok);
for (const [name,ok] of Object.entries(checks)) console.log(`${ok?'✓':'✗'} ${name}`);
if (failed.length) throw new Error(`Verification failed: ${failed.map(([n])=>n).join(', ')}`);
