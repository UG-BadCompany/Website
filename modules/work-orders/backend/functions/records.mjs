export const route = { method: ['GET','POST'], path: '/records', permission: 'work-orders.view' };
export default async function handler(request, context) {
  if (request.method === 'POST') return context.json(200, { ok: true, data: { moduleId: 'work-orders', saved: true }, message: 'Saved.' });
  return context.json(200, { ok: true, data: { moduleId: 'work-orders', records: [] } });
}
