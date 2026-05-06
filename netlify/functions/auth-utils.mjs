import { createHash, randomBytes } from 'node:crypto';

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const PHONE_PATTERN = /^[+()\-\s.\d]{7,30}$/;
export const SESSION_COOKIE_NAME = process.env.AUTH_SESSION_COOKIE_NAME || 'ta_session';
export const MAGIC_LINK_TTL_MINUTES = Number(process.env.MAGIC_LINK_TTL_MINUTES || 20);
export const SESSION_TTL_DAYS = Number(process.env.AUTH_SESSION_TTL_DAYS || 14);

export const clean = (value, maxLength = 254) => (
  typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
);

export const json = (status, body, headers = {}) => Response.json(body, {
  status,
  headers: {
    'cache-control': 'no-store',
    ...headers,
  },
});

export const parseJsonBody = async (request) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

export const normalizeAuthEmailPayload = (body) => ({
  email: clean(body?.email).toLowerCase(),
  botField: clean(body?.['bot-field']),
});

export const normalizeClientAccountPayload = (body) => ({
  name: clean(body?.name, 140),
  email: clean(body?.email).toLowerCase(),
  phone: clean(body?.phone, 60),
  botField: clean(body?.['bot-field']),
});

export const validateEmail = (email) => {
  if (!email) {
    return 'Email is required.';
  }

  if (!EMAIL_PATTERN.test(email)) {
    return 'Enter a valid email address.';
  }

  return null;
};

export const validateClientAccount = ({ name, email, phone }) => {
  if (!name) {
    return 'Name is required.';
  }

  const emailError = validateEmail(email);

  if (emailError) {
    return emailError;
  }

  if (!phone) {
    return 'Phone is required.';
  }

  if (!PHONE_PATTERN.test(phone)) {
    return 'Enter a valid phone number.';
  }

  return null;
};

export const loadDatabase = async () => {
  const { getDatabase } = await import('@netlify/database');

  return getDatabase();
};

export const createToken = () => randomBytes(32).toString('base64url');

export const hashToken = (token) => createHash('sha256').update(token).digest('hex');

export const minutesFromNow = (minutes) => new Date(Date.now() + minutes * 60 * 1000).toISOString();

export const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

export const getSiteUrl = (request) => {
  const configuredUrl = clean(process.env.SITE_URL);

  if (configuredUrl && !configuredUrl.includes('your-domain.example')) {
    return configuredUrl.replace(/\/$/, '');
  }

  return new URL(request.url).origin;
};

export const createMagicLinkUrl = (request, token) => `${getSiteUrl(request)}/api/auth/verify?token=${encodeURIComponent(token)}`;

export const isConfiguredSecret = (value, placeholderFragments = []) => {
  const cleaned = clean(value);

  return Boolean(cleaned && !placeholderFragments.some((fragment) => cleaned.includes(fragment)));
};

export const shouldSendEmail = () => isConfiguredSecret(process.env.RESEND_API_KEY, ['replace_me', 'your-resend-api-key']);

export const getFromEmail = () => {
  const configuredFromEmail = clean(process.env.MAGIC_LINK_FROM_EMAIL);
  const quoteFromEmail = clean(process.env.QUOTE_FROM_EMAIL);

  if (configuredFromEmail && !configuredFromEmail.includes('your-domain.example')) {
    return configuredFromEmail;
  }

  if (quoteFromEmail && !quoteFromEmail.includes('your-domain.example')) {
    return quoteFromEmail;
  }

  return 'portal@ta-contracting.example';
};

export const sendMagicLinkEmail = async ({ fetchImpl = fetch, to, magicLinkUrl, purpose }) => {
  if (!shouldSendEmail()) {
    return { sent: false, reason: 'RESEND_API_KEY is not configured.' };
  }

  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: getFromEmail(),
      to,
      subject: purpose === 'client_account' ? 'Create your T&A Contracting portal account' : 'Sign in to your T&A Contracting portal',
      html: `<p>Use this secure link to ${purpose === 'client_account' ? 'finish creating your account' : 'sign in'}:</p><p><a href="${magicLinkUrl}">Open your secure portal link</a></p><p>This link expires in ${MAGIC_LINK_TTL_MINUTES} minutes.</p>`,
      text: `Use this secure link to ${purpose === 'client_account' ? 'finish creating your account' : 'sign in'}: ${magicLinkUrl}\n\nThis link expires in ${MAGIC_LINK_TTL_MINUTES} minutes.`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Resend email failed with ${response.status}: ${detail}`);
  }

  return { sent: true };
};

export const createSessionCookie = (sessionToken, request) => {
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toUTCString();
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';

  return `${SESSION_COOKIE_NAME}=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires}${secure}`;
};

export const parseCookies = (cookieHeader = '') => Object.fromEntries(
  cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .map((cookie) => {
      const [name, ...valueParts] = cookie.split('=');
      return [name, decodeURIComponent(valueParts.join('='))];
    }),
);

export const getSessionToken = (request) => parseCookies(request.headers.get('cookie') || '')[SESSION_COOKIE_NAME] || '';

export const createOrUpdateMagicLinkUser = async (db, { email, name = null, phone = null }) => {
  const [user] = await db.sql`
    insert into app_users (auth_provider, auth_subject, email, full_name, phone)
    values ('magic_link', ${email}, ${email}, ${name || null}, ${phone || null})
    on conflict (email) do update set
      auth_provider = case when app_users.auth_provider = 'pending' then 'magic_link' else app_users.auth_provider end,
      auth_subject = case when app_users.auth_provider = 'pending' or app_users.auth_subject is null then excluded.auth_subject else app_users.auth_subject end,
      full_name = coalesce(nullif(app_users.full_name, ''), excluded.full_name),
      phone = coalesce(nullif(app_users.phone, ''), excluded.phone),
      is_active = true,
      updated_at = now()
    returning id, email, full_name, phone
  `;

  await db.sql`
    insert into user_roles (user_id, role_id)
    select ${user.id}, roles.id
    from roles
    where roles.key = 'client'
      and not exists (select 1 from user_roles where user_roles.user_id = ${user.id})
    on conflict do nothing
  `;

  return user;
};
