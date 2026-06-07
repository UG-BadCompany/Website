import { error, json, method } from './shared/response.mjs';
import { readState, updateState, audit } from './shared/state.mjs';
import { WORKFLOW_STATUSES, transition } from './shared/workflow-service.mjs';
function body(event){ try { return JSON.parse(event.body || '{}'); } catch { return {}; } }
export async function handler(event) {
  const action = (event.path || '').split('/').pop();
  if (action === 'statuses') return json(200, { ok: true, statuses: WORKFLOW_STATUSES, active: Object.keys(WORKFLOW_STATUSES).filter((s)=>WORKFLOW_STATUSES[s].active), history: Object.keys(WORKFLOW_STATUSES).filter((s)=>!WORKFLOW_STATUSES[s].active) });
  if (action === 'create') { const m = method(event,['POST']); if (m) return m; const payload = body(event); const record = { id: crypto.randomUUID(), recordType: 'request', status: 'request_received', active: true, payload, history: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; await updateState((s)=>{s.workflows.unshift(record); return s;}); await audit('workflow_created',{workflowId:record.id}); return json(200,{ok:true,data:record,message:'Request created.'}); }
  if (action === 'transition') { const m = method(event,['POST']); if (m) return m; const payload = body(event); let updated; try { await updateState((s)=>{ const i=s.workflows.findIndex((r)=>r.id===payload.id); if(i<0) throw Object.assign(new Error('Workflow not found'),{code:'NOT_FOUND'}); updated=transition(s.workflows[i], payload.toStatus, payload.actor || 'owner'); s.workflows[i]=updated; return s; }); } catch(e) { return error(e.code==='NOT_FOUND'?404:422, e.code || 'INVALID_TRANSITION', e.message); } await audit('workflow_transitioned',{workflowId:payload.id,toStatus:payload.toStatus}); return json(200,{ok:true,data:updated,message:'Workflow moved forward.'}); }
  const state = await readState(); return json(200,{ok:true,data:{records:state.workflows, active:state.workflows.filter(r=>r.active), history:state.workflows.filter(r=>!r.active)}});
}
