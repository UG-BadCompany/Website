import { json, readJson } from './shared/response.mjs';
import { getState, saveState, audit } from './shared/state.mjs';
export async function handler(event){ const state=await getState(); if(event.httpMethod==='GET') return json(200,{ok:true,draft:state.draft||null}); state.draft=await readJson(event); await saveState(state); await audit('install.draft.saved','installer'); return json(200,{ok:true,draft_saved:true}); }
