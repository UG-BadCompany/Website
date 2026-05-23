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
  const hasScore = typeof result.score === 'number' || (typeof result.score === 'string' && result.score !== '');
  const score = hasScore ? Number(result.score) : null;
  const hasAction = typeof result.action === 'string' && result.action.trim() !== '';
  const actionMatches = !action || !hasAction || result.action === action;
  const scorePasses = !hasScore || Number.isNaN(score) ? true : score >= 0.3;
  const passed = Boolean(result.success) && actionMatches && scorePasses;
  const reason = passed
    ? 'ok'
    : (!result.success ? `provider-error:${(result['error-codes'] || []).join(',') || 'unknown'}`
      : !actionMatches ? `action-mismatch:${result.action || 'missing'}`
        : `low-score:${score}`);
  return { ok: passed, reason, result };
};
