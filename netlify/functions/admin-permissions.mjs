import { json, PORTAL_PERMISSIONS } from './auth-utils.mjs';
export default async (request) => {
  if (request.method !== 'GET') return json(405, { ok: false, message: 'Method not allowed.' });
  return json(200, { ok: true, permissions: PORTAL_PERMISSIONS });
};
