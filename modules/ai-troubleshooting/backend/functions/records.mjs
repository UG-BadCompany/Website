export const route = { method: ['GET','POST'], path: '/records', permission: 'ai.troubleshooting.use' };
export default async function handler(request, context) {
  if (request.method === 'POST') return context.json(200, { ok: true, data: { moduleId: 'ai-troubleshooting', saved: true }, message: 'Saved.' });
  return context.json(200, { ok: true, data: { moduleId: 'ai-troubleshooting', records: [] } });
}
