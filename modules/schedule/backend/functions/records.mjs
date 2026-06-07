export const route = { method: ['GET','POST'], path: '/records', permission: 'schedule.view' };
export default async function handler(request, context) {
  if (request.method === 'POST') return context.json(200, { ok: true, data: { moduleId: 'schedule', saved: true }, message: 'Saved.' });
  return context.json(200, { ok: true, data: { moduleId: 'schedule', records: [] } });
}
