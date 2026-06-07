import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { normalizeEmail } from './http.mjs';
const DATA_DIR = process.env.PLATFORM_DATA_DIR || '/tmp/white-label-cmms';
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const DEFAULT = {
  installation: { id:'default', installation_complete:false, current_step:'welcome', license_status:'not_checked', bootstrap_generated:false, metadata:{ installerDraft:{} }, created_at:new Date().toISOString(), updated_at:new Date().toISOString() },
  secrets:{}, company:null, theme:null, homepage:null, roles:[], permissions:[], users:[], modules:[], workflows:[], audit_logs:[], files:[], ai_runs:[], settings:{ license:{ license_status:'verification_disabled', validation_enabled:false } }
};
async function readFileStore(){ try { return { ...DEFAULT, ...JSON.parse(await fs.readFile(DATA_FILE,'utf8')) }; } catch { return structuredClone(DEFAULT); } }
async function writeFileStore(data){ await fs.mkdir(DATA_DIR,{recursive:true}); await fs.writeFile(DATA_FILE, JSON.stringify(data,null,2)); return data; }
export async function getStore(){ return readFileStore(); }
export async function saveStore(data){ data.installation.updated_at = new Date().toISOString(); return writeFileStore(data); }
export async function getInstallState(){ return (await getStore()).installation; }
export async function updateInstallState(patch){ const db=await getStore(); db.installation={...db.installation,...patch,updated_at:new Date().toISOString()}; await saveStore(db); return db.installation; }
export async function saveInstallerDraft(step, values){ const db=await getStore(); db.installation.current_step=step||db.installation.current_step; db.installation.metadata ||= {}; db.installation.metadata.installerDraft={...(db.installation.metadata.installerDraft||{}), ...values}; await saveStore(db); return db.installation.metadata.installerDraft; }
export async function completeInstallation(payload, registry){ const db=await getStore(); const now=new Date().toISOString(); const draft={...(db.installation.metadata?.installerDraft||{}), ...payload}; const company=draft.company||{}; const owner=draft.owner||{}; db.company={ name:company.name||company.displayName||'Configured Contractor', displayName:company.displayName||company.name||'Configured Contractor', phone:company.phone||'', supportEmail:company.supportEmail||'', quoteEmail:company.quoteEmail||'', websiteUrl:company.websiteUrl||'', address:company.address||'', serviceArea:company.serviceArea||'', timezone:company.timezone||'UTC', emergencyServiceEnabled:!!company.emergencyServiceEnabled };
 db.theme=draft.theme||{ mode:'system', primary:'#2563eb', accent:'#f59e0b', background:'#0f172a', surface:'#111827', text:'#f8fafc', sidebar:{background:'#111827', text:'#e5e7eb', active:'#2563eb', hover:'#1f2937'} };
 db.homepage=draft.homepage||{ hero:{title:`${db.company.displayName} Contractor Services`, subtitle:'Fast service requests, transparent quotes, and connected project updates.', cta:'Request an Estimate'}, sections:{services:true,projects:true,estimate:true,gallery:true,contact:true,footer:true}, services:draft.services||[], projects:[], navigation:{showServices:true,showProjects:true,showPortal:true} };
 db.roles=['owner','admin','manager','worker','client'].map((id)=>({id,name:id[0].toUpperCase()+id.slice(1),description:`Default ${id} role`}));
 db.permissions=[...new Map((registry.modules||[]).flatMap(m=>m.permissions||[]).map(p=>[p.key,p])).values()];
 const ownerEmail=normalizeEmail(owner.email||'owner@example.local');
 if(!db.users.some(u=>normalizeEmail(u.email)===ownerEmail)){ db.users.push({ id:crypto.randomUUID(), fullName:owner.fullName||'Owner', email:ownerEmail, phone:owner.phone||'', roles:['owner'], workspaceAccess:['owner','admin','manager','worker','client','public'], active:true, createdAt:now }); }
 db.modules=(registry.modules||[]).map((m)=>({ id:m.id, enabled:m.enabledByDefault!==false, visible:true, beta:!!m.beta, experimental:!!m.experimental, manifest:m }));
 db.settings.license=draft.license||{ license_status:'verification_disabled', validation_enabled:false };
 db.installation={...db.installation, installation_complete:true, installed_version:'1.0.0', installed_at:now, current_step:'complete', bootstrap_generated:true, metadata:{ installerDraft:draft }};
 await saveStore(db); return db; }
export async function audit(action, actor, metadata={}){ const db=await getStore(); db.audit_logs.push({id:crypto.randomUUID(), action, actor, metadata, createdAt:new Date().toISOString()}); await saveStore(db); }
export async function saveSecret(key, value){ const db=await getStore(); const iv=crypto.randomBytes(12); const secret=crypto.createHash('sha256').update(process.env.SECRET_ENCRYPTION_KEY||process.env.NETLIFY_DATABASE_URL||'development-only-key').digest(); const cipher=crypto.createCipheriv('aes-256-gcm', secret, iv); const encrypted=Buffer.concat([cipher.update(String(value),'utf8'), cipher.final()]); const tag=cipher.getAuthTag(); db.secrets[key]={ encrypted_value:`${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`, provider:'encrypted_db', last_four:String(value).slice(-4), status:'configured', last_tested_at:new Date().toISOString(), updated_at:new Date().toISOString() }; await saveStore(db); return {key, configured:true, source:'encrypted_db', lastFour:db.secrets[key].last_four, valid:true, lastCheckedAt:db.secrets[key].last_tested_at}; }
export async function envStatus(metadata){ const db=await getStore(); return metadata.map((item)=>{ const envValue=process.env[item.key]; const saved=db.secrets[item.key]; const configured=!!envValue || !!saved; return { key:item.key, required:item.required, configured, source:envValue?'netlify_env':(saved?.provider||'missing'), lastFour:configured?String(envValue?envValue:saved.last_four).slice(-4):undefined, valid:configured || !item.required, lastCheckedAt:saved?.last_tested_at||null }; }); }
