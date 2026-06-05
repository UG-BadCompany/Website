import {
  createMagicLinkUrl,
  createToken,
  ensureClientRoleAndWorkspace,
  hashToken,
  getSessionToken,
  json,
  linkEmailOwnedRecords,
  loadDatabase,
  MAGIC_LINK_TTL_MINUTES,
  minutesFromNow,
  normalizeClientAccountPayload,
  parseJsonBody,
  sendMagicLinkEmail,
  validateClientAccount,
  clean,
} from './auth-utils.mjs';

const normalizeSetupPayload = (body = {}) => ({
  fullName: clean(body.fullName || body.full_name || body.name, 160),
  phone: clean(body.phone, 60),
  companyName: clean(body.companyName || body.company_name, 160),
  propertyAddress: clean(body.propertyAddress || body.property_address, 300),
  city: clean(body.city, 120),
  state: clean(body.state, 60),
  zip: clean(body.zip || body.postalCode || body.postal_code, 40),
  acceptedTerms: Boolean(body.acceptedTerms || body.accepted_terms || body.consent),
});

const loadSetupSession = async (db, request) => {
  const token = getSessionToken(request);
  if (!token) return null;
  const [session] = await db.sql`
    select auth_sessions.id, auth_sessions.user_id, app_users.email, app_users.full_name, app_users.phone
    from auth_sessions
    join app_users on app_users.id = auth_sessions.user_id
    where auth_sessions.session_hash = ${hashToken(token)}
      and auth_sessions.revoked_at is null
      and auth_sessions.expires_at > now()
      and app_users.is_active = true
    order by auth_sessions.created_at desc
    limit 1
  `;
  return session || null;
};

const completeClientAccountSetup = async (db, request, body) => {
  const session = await loadSetupSession(db, request);
  if (!session) return null;
  const payload = normalizeSetupPayload(body);
  if (!payload.fullName) return json(422, { ok: false, message: 'Full name is required.' });
  if (!payload.phone) return json(422, { ok: false, message: 'Phone is required.' });
  if (body.requireTerms && !payload.acceptedTerms) return json(422, { ok: false, message: 'Please accept the terms to continue.' });

  const [user] = await db.sql`
    update app_users
    set full_name = ${payload.fullName},
        phone = ${payload.phone},
        company_name = ${payload.companyName || null},
        source = coalesce(nullif(source, ''), 'portal_magic_link_signup'),
        account_setup_complete = true,
        last_login_at = coalesce(last_login_at, now()),
        last_seen_at = now(),
        updated_at = now()
    where id = ${session.user_id}
    returning id, email, full_name, phone, company_name
  `;

  await ensureClientRoleAndWorkspace(db, session.user_id);
  await linkEmailOwnedRecords(db, user);

  if (payload.propertyAddress) {
    await db.sql`
      insert into properties (client_id, label, street, city, state, postal_code)
      values (${session.user_id}, 'Primary Property', ${payload.propertyAddress}, ${payload.city || null}, ${payload.state || 'AZ'}, ${payload.zip || null})
    `;
  }

  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (${session.user_id}, 'client.account_setup_completed', 'app_user', ${session.user_id}, ${JSON.stringify({ source: 'portal_magic_link_signup', linkedByEmail: user.email })}::jsonb)
  `;

  return json(200, { ok: true, location: '/dashboard/#client.overview', user: { id: user.id, email: user.email, fullName: user.full_name, phone: user.phone, companyName: user.company_name, role: 'client', workspaceAccess: ['client'] } });
};

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
    const setupResult = await completeClientAccountSetup(db, request, body);
    if (setupResult) return setupResult;

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
