import fs from 'node:fs/promises';
import { json, safeParse, getPath, originFromEvent, currentUser, lastFour } from './shared/http.mjs';
import { ENV_METADATA, ENV_CATEGORIES, publicEnvMetadata, isAllowedEnvKey } from './shared/env-metadata.mjs';
import { getStore, saveInstallerDraft, completeInstallation, saveSecret, envStatus, audit } from './shared/store.mjs';
async function registry(){ return JSON.parse(await fs.readFile('netlify/generated/module-registry.json','utf8').catch(()=>'{"modules":[]}')); }
function statusTest(key){ return {ok:true,key,status:'not_live_tested',message:'Configuration saved/status checked without exposing the secret.'}; }
export async function handler(event){
 const path=getPath(event), origin=originFromEvent(event), user=currentUser(event);
 if(path.endsWith('/env-status') && event.httpMethod==='GET') return json(200,{ok:true,categories:ENV_CATEGORIES,metadata:publicEnvMetadata(origin),variables:await envStatus(ENV_METADATA)});
 if(path.endsWith('/env/test') && event.httpMethod==='POST'){ const {key}=safeParse(event.body); if(!isAllowedEnvKey(key)) return json(400,{ok:false,code:'INVALID_ENV_KEY',message:'Variable is not allowlisted.'}); return json(200,statusTest(key)); }
 if(path.endsWith('/env') && event.httpMethod==='POST'){ const body=safeParse(event.body); if(!isAllowedEnvKey(body.key)) return json(400,{ok:false,code:'INVALID_ENV_KEY',message:'Variable is not allowlisted.'}); if(!body.value) return json(422,{ok:false,code:'VALIDATION_ERROR',message:'Missing value.',field:'value',missing:['value']}); const saved=await saveSecret(body.key, body.value); await audit('environment.secret.saved',user,{key:body.key,lastFour:lastFour(body.value)}); return json(200,{ok:true,variable:saved,message:'Saved securely. Secret value was not returned.'}); }
 if(path.endsWith('/draft') && event.httpMethod==='POST'){ const body=safeParse(event.body); const draft=await saveInstallerDraft(body.step, body.values||{}); return json(200,{ok:true,draft}); }
 if(path.endsWith('/finish') && event.httpMethod==='POST'){ const body=safeParse(event.body); const db=await completeInstallation(body, await registry()); await audit('installation.completed',user,{installedVersion:'1.0.0'}); return json(200,{ok:true,installed:true,redirect:'/dashboard/', company:db.company?.displayName}); }
 if(event.httpMethod==='GET') { const db=await getStore(); return json(200,{ok:true,installed:!!db.installation.installation_complete,currentStep:db.installation.current_step,draft:db.installation.metadata?.installerDraft||{},categories:ENV_CATEGORIES,envMetadata:publicEnvMetadata(origin),envStatus:await envStatus(ENV_METADATA),modules:(await registry()).modules}); }
 return json(405,{ok:false,code:'METHOD_NOT_ALLOWED',message:'Unsupported installer method.'});
}
