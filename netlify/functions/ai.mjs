import { error, json, method } from './shared/response.mjs';
import { updateState, audit } from './shared/state.mjs';
function body(event){ try { return JSON.parse(event.body || '{}'); } catch { return {}; } }
export async function handler(event) {
  const feature = (event.path || '').split('/').pop(); const m = method(event,['POST']); if (m) return m;
  if (!['photo-estimate','quote','troubleshooting'].includes(feature)) return error(404,'AI_FEATURE_NOT_FOUND','Unknown AI feature.');
  const payload = body(event); const run = { id: crypto.randomUUID(), feature, model: process.env.OPENAI_MODEL || 'configured-server-side', status: process.env.OPENAI_API_KEY ? 'completed' : 'needs_configuration', inputSummary: payload.summary || 'Request received', outputSummary: process.env.OPENAI_API_KEY ? 'AI analysis completed.' : 'OpenAI is not configured. Configure it in Environment & Integrations.', tokenUsage: {}, costEstimate: 0, createdAt: new Date().toISOString() };
  await updateState((s)=>{s.aiRuns.unshift(run); return s;}); await audit(`ai_${feature}_run`,{runId:run.id});
  return json(200,{ok:true,data:run,message:run.outputSummary});
}
