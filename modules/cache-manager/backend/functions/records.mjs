export const route = { method: ['GET','POST'], path: '/records', permission: 'cache.manage' };
export default async function handler(request, context) {
  if (request.method === 'POST') return context.json(200, { ok: true, data: { moduleId: 'cache-manager', saved: true }, message: 'Saved.' });
  return context.json(200, { ok: true, data: { moduleId: 'cache-manager', records: [] } });
}
