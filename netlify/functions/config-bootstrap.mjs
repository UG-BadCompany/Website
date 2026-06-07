import { json } from './shared/response.mjs';
import { getState } from './shared/state.mjs';
import { modules } from './shared/module-registry.mjs';
export async function handler(){ const state=await getState(); return json(200,{installation_complete:!!state.installation_complete,company:state.company?{name:state.company.name,site_url:state.company.site_url}:null,theme:state.theme||{mode:'system'},homepage:state.homepage||{},modules:(state.modules?.length?state.modules:modules).map(m=>({id:m.id,name:m.name,status:m.status})),no_secret_values:true}); }
