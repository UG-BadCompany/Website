import { json, readJson } from './shared/response.mjs';
import { audit } from './shared/state.mjs';
import { modules } from './shared/module-registry.mjs';
export async function handler(event){ const id=event.queryStringParameters?.module; const action=event.queryStringParameters?.action||'records'; const module=modules.find(m=>m.id===id); if(!module) return json(404,{ok:false,error:'module_not_found'}); const payload=await readJson(event); await audit(`module.${action}`,id,{payload_keys:Object.keys(payload)}); return json(200,{ok:true,module:id,action,records:[{id:`${id}_demo`,status:'ready',payload}]}); }
