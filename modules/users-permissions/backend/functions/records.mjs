export const route = { method: ['GET','POST'], path: '/records', permission: 'users.view' };
export default async function handler(request, context) {
  if (request.method === 'POST') return context.json(200, { ok: true, data: { moduleId: 'users-permissions', saved: true }, message: 'Saved.' });
  return context.json(200, { ok: true, data: { moduleId: 'users-permissions', records: [] } });
}
