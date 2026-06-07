import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
const file='/tmp/contractor-cmms-state.json';
function initial(){return {installation:{id:'default',installation_complete:false,current_step:'welcome',license_status:'not_checked',bootstrap_generated:false,metadata:{}}, secrets:{}, license:{id:'default',license_status:'verification_disabled',validation_enabled:false}, company:null, users:[], roles:[], permissions:[], modules:[], workflows:[], audit:[]}}
export function loadState(){try{return existsSync(file)?JSON.parse(readFileSync(file,'utf8')):initial()}catch{return initial()}}
export function saveState(s){writeFileSync(file,JSON.stringify(s,null,2));return s}
export async function withState(mutator){const s=loadState(); const r=await mutator(s); saveState(s); return r??s}
export function safeInstallStatus(){const s=loadState(); const i=s.installation||initial().installation; const installed=!!i.installation_complete; return installed?{ok:true,installed:true,installationComplete:true,needsInstall:false,installedAt:i.installed_at,installedVersion:i.installed_version||'1.0.0'}:{ok:true,installed:false,installationComplete:false,needsInstall:true,currentStep:i.current_step||'welcome'}}
export function registry(){try{return JSON.parse(readFileSync(new URL('../../../netlify/generated/module-registry.json', import.meta.url),'utf8'))}catch{try{return JSON.parse(readFileSync(new URL('../../../public/config/module-manifest.json', import.meta.url),'utf8'))}catch{return {generatedAt:null,modules:[]}}}}
