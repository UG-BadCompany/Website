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

    const emailResult = await sendEmail({ to: payload.email, magicLinkUrl, purpose: 'sign_in' });

    return json(200, {
      ok: true,
      emailSent: emailResult.sent,
      message: emailResult.sent
        ? 'Check your email for a secure sign-in link.'
        : 'Magic link created, but email delivery is off. Add RESEND_API_KEY and MAGIC_LINK_FROM_EMAIL in Netlify to send emails. For now, use the development link below.',
      ...(emailResult.sent ? {} : { devMagicLink: magicLinkUrl }),
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
