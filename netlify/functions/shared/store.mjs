import { promises as fs } from 'fs';
import path from 'path';
const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'platform-state.json');
export const DEFAULT_STATE = {
  installation: { id:'default', installation_complete:false, installed_version:null, installed_at:null, installed_by_user_id:null, current_step:'welcome', license_status:'not_checked', bootstrap_generated:false, metadata:{}, created_at:null, updated_at:null },
  draft: {}, company:null, theme:null, homepage:null, services:[], users:[], roles:[], permissions:[], modules:[], auditLogs:[], workflows:[], invoices:[], payments:[], files:[], aiRuns:[], env:{}, backups:[]
};
export async function readState() { try { return { ...DEFAULT_STATE, ...JSON.parse(await fs.readFile(DATA_FILE,'utf8')) }; } catch { return structuredClone(DEFAULT_STATE); } }
export async function writeState(state) { await fs.mkdir(DATA_DIR,{recursive:true}); await fs.writeFile(DATA_FILE, JSON.stringify(state,null,2)); return state; }
export async function updateState(mutator) { const state = await readState(); const result = await mutator(state) || state; await writeState(state); return result; }
export function now() { return new Date().toISOString(); }
export function publicBootstrap(state) { return { generatedAt: now(), installationComplete: !!state.installation?.installation_complete, company: state.company || { displayName:'Your Contractor Company' }, theme: state.theme || defaultTheme(), homepage: state.homepage || defaultHomepage(), modules: (state.modules||[]).filter(m=>m.enabled && !m.hidden).map(({id,name,version,category,nav,workspaces})=>({id,name,version,category,nav,workspaces})) }; }
export function defaultTheme(){return {mode:'system',primary:'#2563eb',accent:'#f59e0b',background:'#f8fafc',surface:'#ffffff',text:'#0f172a',border:'#dbe3ef',button:'#2563eb',buttonText:'#ffffff',sidebarBackground:'#101827',sidebarText:'#e5e7eb',sidebarActiveBackground:'#1d4ed8',sidebarActiveText:'#ffffff',sidebarHoverBackground:'#1e293b',mobileNavBackground:'#101827',mobileNavActive:'#1d4ed8',mobileNavText:'#e5e7eb'};}
export function defaultHomepage(){return {hero:{headline:'Modern contractor service, quoting, and project care.',subheadline:'Request estimates, review quotes, track work, and pay invoices from one secure portal.'},sections:['services','ai-estimate','projects','how-it-works','contact'],services:['HVAC','Water Heaters','Plumbing','Electrical','Drywall','Painting','Doors','Windows','Appliances','Handyman','Facilities Maintenance','Property Maintenance','Commercial Maintenance','General Contracting','Tenant Improvements','Other / Not Sure']};}
