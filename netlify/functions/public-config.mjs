import { json } from './shared/json.mjs'; import { readState, publicBootstrap } from './shared/store.mjs';
export async function handler(){const s=await readState(); return json(200,{ok:true,data:publicBootstrap(s)});}
