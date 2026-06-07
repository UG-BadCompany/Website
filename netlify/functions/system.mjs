import { json, readJson } from './shared/response.mjs';
import { audit, getState, saveState } from './shared/state.mjs';

export async function handler(event) {
  const action = event.queryStringParameters?.action || 'status';
  const body = await readJson(event);
  if (action === 'audit') {
    const entry = await audit(body.action || 'audit.event', body.target || 'system', body.metadata || {}, body.actor_id || 'owner_default');
    return json(200, { ok: true, entry });
  }
  if (action === 'workflow-demo') {
    const state = await getState();
    const id = `wf_${Date.now()}`;
    const flow = ['request.created', 'quote.ai_generated', 'quote.approved', 'work_order.created', 'invoice.created', 'payment.paid', 'items.closed'];
    const item = { id, status: 'closed', events: flow, active_queue: false, amount: body.amount || 0, created_at: new Date().toISOString() };
    state.workflow.push(item);
    await saveState(state);
    await audit('workflow.demo.completed', id, { events: flow.length });
    return json(200, { ok: true, item });
  }
  return json(200, { ok: true, action });
}
