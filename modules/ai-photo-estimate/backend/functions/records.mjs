export const route = { method: ['GET','POST'], path: '/records', permission: 'ai.photo-estimate.use' };
export default async function handler(request, context) {
  if (request.method === 'POST') return context.json(200, { ok: true, data: { moduleId: 'ai-photo-estimate', saved: true }, message: 'Saved.' });
  return context.json(200, { ok: true, data: { moduleId: 'ai-photo-estimate', records: [] } });
}
