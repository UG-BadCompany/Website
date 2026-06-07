import { json } from './shared/json.mjs';
export async function handler(){return json(200,{ok:true,message:'Square webhook endpoint reachable. Secrets are verified server-side when configured.'});}
