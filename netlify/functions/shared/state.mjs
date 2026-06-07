import { readFile, writeFile, mkdir } from 'node:fs/promises';
const file='/tmp/contractor-cmms-state.json';
const defaults={installation_complete:false,company:null,owner:null,roles:[],modules:[],theme:{mode:'system'},homepage:{headline:'Contractor CMMS'},audit:[],workflow:[]};
export async function getState(){ try{return {...defaults,...JSON.parse(await readFile(file,'utf8'))};}catch{return {...defaults};} }
export async function saveState(state){ await mkdir('/tmp',{recursive:true}); await writeFile(file, JSON.stringify(state,null,2)); return state; }
export async function audit(action,target,metadata={},actor_id='system'){ const state=await getState(); state.audit.push({actor_id,action,target,metadata,created_at:new Date().toISOString()}); await saveState(state); return state.audit.at(-1); }
