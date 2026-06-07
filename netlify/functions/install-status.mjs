import { json } from './shared/response.mjs';
import { getState } from './shared/state.mjs';
export async function handler(){ const state=await getState(); return json(200,{ok:true,installation_complete:!!state.installation_complete,company_configured:!!state.company,owner_configured:!!state.owner}); }
