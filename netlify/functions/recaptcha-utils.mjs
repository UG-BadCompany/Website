const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

export const verifyRecaptchaToken = async ({ token, request, action }) => {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return { ok: false, reason: 'missing-secret' };
  if (!token || typeof token !== 'string') return { ok: false, reason: 'missing-token' };

  const params = new URLSearchParams({
    secret,
    response: token,
  });

  const remoteIp = request?.headers?.get?.('x-nf-client-connection-ip') || request?.headers?.get?.('x-forwarded-for') || '';
  if (remoteIp) params.set('remoteip', String(remoteIp).split(',')[0].trim());

  const response = await fetch(RECAPTCHA_VERIFY_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const result = await response.json().catch(() => ({}));
  const score = Number(result.score || 0);
  const actionMatches = !action || !result.action || result.action === action;
  const passed = Boolean(result.success) && actionMatches && score >= 0.5;
  return { ok: passed, reason: passed ? 'ok' : 'failed', result };
};
