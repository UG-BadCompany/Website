export const route = { method: ['GET','POST'], path: '/records', permission: 'workflow.manage' };
export default async function handler(request, context) {
  if (request.method === 'POST') return context.json(200, { ok: true, data: { moduleId: 'estimate-quote-center', saved: true }, message: 'Saved.' });
  return context.json(200, { ok: true, data: { moduleId: 'estimate-quote-center', records: [] } });
}
