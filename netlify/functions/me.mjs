const json = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  body: JSON.stringify(body),
});

export const handler = async () => json(200, {
  ok: true,
  authenticated: false,
  message: 'Auth placeholder. Connect to production auth/session system when ready.',
});

export default handler;
