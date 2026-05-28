import {
  createMagicLinkUrl,
  createToken,
  hashToken,
  json,
  loadDatabase,
  MAGIC_LINK_TTL_MINUTES,
  minutesFromNow,
  normalizeAuthEmailPayload,
  parseJsonBody,
  sendMagicLinkEmail,
  validateEmail,
} from './auth-utils.mjs';
import { verifyRecaptchaToken } from './recaptcha-utils.mjs';

export const createMagicLinkHandler = ({
  getDatabase = loadDatabase,
  makeToken = createToken,
  sendEmail = sendMagicLinkEmail,
} = {}) => async (request) => {
  if (request.method !== 'POST') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const body = await parseJsonBody(request);

  if (!body) {
    return json(400, { ok: false, message: 'Request body must be valid JSON.' });
  }

  const payload = normalizeAuthEmailPayload(body);
  const recaptchaCheck = await verifyRecaptchaToken({ token: body?.recaptchaToken, request, action: 'login_magic_link' });
  if (!recaptchaCheck.ok) {
    return json(403, { ok: false, message: `reCAPTCHA verification failed. Please try again. (${recaptchaCheck.reason})` });
  }

  if (payload.botField) {
    return json(200, { ok: true, message: 'If this email can sign in, a secure link will be sent.' });
  }

  const validationError = validateEmail(payload.email);

  if (validationError) {
    return json(422, { ok: false, message: validationError });
  }

  try {
    const db = await getDatabase();
    const token = makeToken();
    const magicLinkUrl = createMagicLinkUrl(request, token);

    await db.sql`
      insert into auth_magic_links (email, token_hash, purpose, expires_at)
      values (${payload.email}, ${hashToken(token)}, 'sign_in', ${minutesFromNow(MAGIC_LINK_TTL_MINUTES)}::timestamptz)
    `;

    let emailResult;

    try {
      emailResult = await sendEmail({ to: payload.email, magicLinkUrl, purpose: 'sign_in' });
    } catch (emailError) {
      console.error('Magic-link email delivery failed', emailError);
      emailResult = {
        sent: false,
        reason: 'Email delivery failed. Check RESEND_API_KEY, MAGIC_LINK_FROM_EMAIL, and the verified sender domain in Resend.',
      };
    }

    if (!emailResult.sent) {
      return json(200, {
        ok: true,
        emailSent: false,
        devMagicLink: magicLinkUrl,
        message: emailResult.reason || 'Magic-link email is not configured. Use devMagicLink for local testing, or configure RESEND_API_KEY, MAGIC_LINK_FROM_EMAIL, and a verified sender domain in Resend.',
      });
    }

    return json(200, {
      ok: true,
      emailSent: true,
      message: 'Check your email for a secure sign-in link.',
    });
  } catch (error) {
    console.error('Failed to create magic link', error);

    return json(500, {
      ok: false,
      message: 'We could not create a secure sign-in link right now. Please try again shortly.',
    });
  }
};

export default createMagicLinkHandler();

export const config = {
  path: '/api/auth/magic-link',
};
