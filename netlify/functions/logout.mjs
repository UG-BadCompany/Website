// netlify/functions/logout.mjs
const json = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  },
  body: JSON.stringify(body),
});

export const handler = async () => json(200, { ok: true }, {
  'set-cookie': 'ta_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
});

export default handler;
