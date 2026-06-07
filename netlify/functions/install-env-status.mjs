import { json } from './shared/response.mjs'; import { loadState } from './shared/db.mjs'; import { REQUIRED, OPTIONAL, envStatus } from './shared/security.mjs';
export async function handler(){ const state=loadState(); return json(200,{ok:true,variables:[...REQUIRED,...OPTIONAL].map(k=>envStatus(k,state))}); }
