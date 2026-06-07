import { json, publicEnvStatus } from './shared/response.mjs';
import { getState } from './shared/state.mjs';
export async function handler(){ const state=await getState(); return json(200,{ok:true,service:'installer',database:{available:true,mode:'netlify-postgres-or-safe-file-fallback'},bootstrap:{available:true,path:'/config/bootstrap.json'},registry:{available:true,path:'/config/module-registry.json'},theme:{available:true,mode:state.theme?.mode||'system'},env:publicEnvStatus()}); }
