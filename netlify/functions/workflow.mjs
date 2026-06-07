import { json, safeParse, currentUser } from './shared/http.mjs';
import { transition } from './shared/workflow-engine.mjs';
export async function handler(event){ if(event.httpMethod!=='POST') return json(405,{ok:false,code:'METHOD_NOT_ALLOWED',message:'Use POST.'}); return json(200, await transition({...safeParse(event.body), userId:currentUser(event).id})); }
