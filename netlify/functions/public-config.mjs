const json = (status, body) => Response.json(body, {
  status,
  headers: {
    'cache-control': 'no-store',
  },
});

const publicSiteKey = (process.env.RECAPTCHA_SITE_KEY || '').trim();

export default async () => json(200, {
  ok: true,
  recaptchaSiteKey: publicSiteKey || null,
});

export const config = {
  path: '/api/public-config',
};
