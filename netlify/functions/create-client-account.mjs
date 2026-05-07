import {
  createMagicLinkUrl,
  createToken,
  hashToken,
  json,
  loadDatabase,
  MAGIC_LINK_TTL_MINUTES,
  minutesFromNow,
  normalizeClientAccountPayload,
  parseJsonBody,
  sendMagicLinkEmail,
  validateClientAccount,
} from './auth-utils.mjs';

export const createClientAccountHandler = ({
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

  const payload = normalizeClientAccountPayload(body);

  if (payload.botField) {
    return json(200, { ok: true, message: 'If this account can be created, a secure link will be sent.' });
  }

  const validationError = validateClientAccount(payload);

  if (validationError) {
    return json(422, { ok: false, message: validationError });
  }

  try {
    const db = await getDatabase();
    const token = makeToken();
    const magicLinkUrl = createMagicLinkUrl(request, token);

    await db.sql`
      insert into auth_magic_links (email, token_hash, purpose, client_name, client_phone, expires_at)
      values (${payload.email}, ${hashToken(token)}, 'client_account', ${payload.name}, ${payload.phone}, ${minutesFromNow(MAGIC_LINK_TTL_MINUTES)}::timestamptz)
    `;

    const emailResult = await sendEmail({ to: payload.email, magicLinkUrl, purpose: 'client_account' });

    return json(200, {
      ok: true,
      emailSent: emailResult.sent,
      message: emailResult.sent
        ? 'Check your email to finish creating your client account.'
        : 'Account magic link created, but email delivery is off. Add RESEND_API_KEY and MAGIC_LINK_FROM_EMAIL in Netlify to send emails. For now, use the development link below.',
      ...(emailResult.sent ? {} : { devMagicLink: magicLinkUrl }),
    });
  } catch (error) {
    console.error('Failed to create client account magic link', error);

    return json(500, {
      ok: false,
      message: 'We could not create the client account link right now. Please try again shortly.',
    });
  }
};

export default createClientAccountHandler();

export const config = {
  path: '/api/auth/client-account',
};
