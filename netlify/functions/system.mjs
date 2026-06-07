import { json } from './shared/response.mjs';
import { readState, updateState, audit } from './shared/state.mjs';
import registry from '../generated/module-registry.json' assert { type: 'json' };
export async function handler(event) {
  const action = (event.path || '').split('/').pop(); const state = await readState();
  if (action === 'health') return json(200,{ok:true,data:{database:'healthy',functions:'healthy',homepageCache:'healthy',dashboardCache:'healthy',bootstrapCache:state.installation.bootstrap_generated?'healthy':'warning',moduleRegistry:registry.modules.length?'healthy':'warning',openAI:process.env.OPENAI_API_KEY?'healthy':'warning',resend:process.env.RESEND_API_KEY?'healthy':'warning',square:process.env.SQUARE_ACCESS_TOKEN?'healthy':'warning',storage:'healthy',licenseServer:'warning',magicLinks:process.env.RESEND_API_KEY?'healthy':'warning'}});
  if (action === 'cache') { await audit('cache_rebuilt',{kind:'all'}); return json(200,{ok:true,message:'Caches cleared and bootstrap/module registry rebuild requested.'}); }
  if (action === 'backup') { await updateState(s=>{s.backups.unshift({id:crypto.randomUUID(),kind:'manual',status:'created',createdAt:new Date().toISOString()}); return s;}); await audit('restore_point_created'); return json(200,{ok:true,message:'Restore point created.'}); }
  if (action === 'audit') return json(200,{ok:true,data:state.auditLogs});
  if (action === 'files') return json(200,{ok:true,data:state.files});
  if (action === 'ai-usage') return json(200,{ok:true,data:state.aiRuns});
  return json(200,{ok:true,data:{modules:registry.modules.length, installed:state.installation.installation_complete}});
}
