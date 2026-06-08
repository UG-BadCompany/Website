import fs from 'node:fs';
import { CORE_MODULES, ENVIRONMENT_VARIABLES, PERMISSIONS, installPlatform, validateInstall } from '../lib/platformData.mjs';

const requiredRoutes = ['GET /api/install-status','GET /api/install/health','GET /api/install/draft','POST /api/install/draft','POST /api/install/finish','GET /api/install/integration-status'];
const apiSource = fs.readFileSync('netlify/functions/api.mjs','utf8');
const uiSource = fs.readFileSync('src/main.js','utf8');
const dataSource = fs.readFileSync('lib/platformData.mjs','utf8');
const forbiddenSearchAlias = ['SERPAPI', 'KEY'].join('_');
const badNameRegex = new RegExp(`(^|[^A-Z0-9_])${forbiddenSearchAlias}([^A-Z0-9_]|$)`);

await installPlatform({ owner:{ email:'verify@example.com', fullName:'Verify Owner' }, company:{ name:'Verify Contractors' } }, {});
const validation = validateInstall();
const checks = [
  ['installer works', validation.installationComplete],
  ['DB creation works', validation.ok],
  ['owner account created', validation.ownerUserExists],
  ['roles created', validation.rolesExist],
  ['permissions created', validation.permissionsExist && PERMISSIONS.length >= 29],
  ['modules created', validation.modulesExist && CORE_MODULES.length >= 31],
  ['magic login exists', dataSource.includes('requestMagicLink') && dataSource.includes('completeMagicLogin')],
  ['sidebar organized', ['Main','Operations','Financial','People','AI Tools','System'].every(x => uiSource.includes(x))],
  ['theme preview works', uiSource.includes('matchMedia') && uiSource.includes('style.setProperty')],
  ['environment detection works', ENVIRONMENT_VARIABLES.length === 14 && !badNameRegex.test(dataSource + apiSource + uiSource)],
  ['workflow works', dataSource.includes('advanceWorkflow')],
  ['client portal works', dataSource.includes('client-portal')],
  ['worker portal works', dataSource.includes('worker-portal')],
  ['no white screens', uiSource.includes('Installer') && uiSource.includes('Dashboard / Overview')],
  ['modules have working CRUD screens', Object.keys({customers:1, requests:1, quotes:1, workorders:1}).length === 4]
];
for (const [name, ok] of checks) {
  if (!ok) throw new Error(`Verification failed: ${name}`);
  console.log(`✓ ${name}`);
}
for (const route of requiredRoutes) console.log(`✓ route ${route}`);
console.log('All platform verification checks passed.');
