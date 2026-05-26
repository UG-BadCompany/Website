// netlify/functions/logout.mjs
export const handler = async () => ({
  statusCode: 200,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'set-cookie': 'ta_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
  },
  body: JSON.stringify({ ok: true }),
});

export default handler;
