export const route = { method: ['GET','POST'], path: '/records', permission: 'backup.manage' };
export default async function handler(request, context) {
  if (request.method === 'POST') return context.json(200, { ok: true, data: { moduleId: 'backup-restore', saved: true }, message: 'Saved.' });
  return context.json(200, { ok: true, data: { moduleId: 'backup-restore', records: [] } });
}
