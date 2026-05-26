import { createExpiredSessionCookie, json } from './auth-utils.mjs';

export default async (request) => {
  if (request.method !== 'POST' && request.method !== 'GET') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  return json(200, { ok: true, message: 'Signed out.' }, {
    'set-cookie': createExpiredSessionCookie(request),
  });
};

export const config = {
  path: '/api/auth/logout',
};
