export const route = { method: ['GET','POST'], path: '/records', permission: 'customers.view' };
export default async function handler(request, context) {
  if (request.method === 'POST') return context.json(200, { ok: true, data: { moduleId: 'customers', saved: true }, message: 'Saved.' });
  return context.json(200, { ok: true, data: { moduleId: 'customers', records: [] } });
}
