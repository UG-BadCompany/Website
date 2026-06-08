import { json, readStore, writeStore, audit } from './_shared.mjs';
const transitions = ['request','quote','work_order','scheduled','worker_assigned','completed','reviewed','invoiced','paid','verified','archived'];
export async function handler(event) {
 const store = readStore();
 if (event.httpMethod === 'GET') return json(200, { ok: true, workflows: store.workflows, active: store.workflows.filter(w => !['paid','verified','archived'].includes(w.status)) });
 if (event.httpMethod !== 'POST') return json(405, { ok:false, code:'METHOD_NOT_ALLOWED' });
 const body = JSON.parse(event.body || '{}');
 const existing = store.workflows.find(w => w.id === body.id);
 const status = body.status || 'request';
 if (!transitions.includes(status)) return json(400, { ok:false, code:'INVALID_STATUS' });
 const record = existing || { id: crypto.randomUUID(), createdAt: new Date().toISOString(), events: [] };
 Object.assign(record, { status, client: body.client || record.client || 'Walk-in Client', service: body.service || record.service || 'General Service', updatedAt: new Date().toISOString(), active: !['paid','verified','archived'].includes(status) });
 record.events.push({ status, at: new Date().toISOString() });
 if (!existing) store.workflows.push(record);
 audit(store, 'workflow_transitioned', { id: record.id, status });
 writeStore(store);
 return json(200, { ok: true, workflow: record });
}
