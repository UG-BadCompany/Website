import { createHash, randomBytes } from 'node:crypto';

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const PHONE_PATTERN = /^[+()\-\s.\d]{7,30}$/;
export const SESSION_COOKIE_NAME = process.env.AUTH_SESSION_COOKIE_NAME || 'ta_session';
export const MAGIC_LINK_TTL_MINUTES = Number(process.env.MAGIC_LINK_TTL_MINUTES || 20);
export const CLIENT_SESSION_TTL_MINUTES = Number(process.env.CLIENT_SESSION_TTL_MINUTES || 30);
export const STAFF_SESSION_TTL_MINUTES = Number(process.env.STAFF_SESSION_TTL_MINUTES || 120);


export const PORTAL_PERMISSIONS = [
  { key: 'dashboard.view.admin', label: 'dashboard.view.admin', description: 'Allows dashboard view admin.' },
  { key: 'dashboard.view.client', label: 'dashboard.view.client', description: 'Allows dashboard view client.' },
  { key: 'dashboard.view.worker', label: 'dashboard.view.worker', description: 'Allows dashboard view worker.' },
  { key: 'users.manage', label: 'users.manage', description: 'Allows users manage.' },
  { key: 'users.create', label: 'users.create', description: 'Allows users create.' },
  { key: 'users.edit', label: 'users.edit', description: 'Allows users edit.' },
  { key: 'users.deactivate', label: 'users.deactivate', description: 'Allows users deactivate.' },
  { key: 'roles.manage', label: 'roles.manage', description: 'Allows roles manage.' },
  { key: 'roles.create', label: 'roles.create', description: 'Allows roles create.' },
  { key: 'roles.edit', label: 'roles.edit', description: 'Allows roles edit.' },
  { key: 'roles.delete', label: 'roles.delete', description: 'Allows roles delete.' },
  { key: 'ranks.manage', label: 'ranks.manage', description: 'Allows ranks manage.' },
  { key: 'ranks.create', label: 'ranks.create', description: 'Allows ranks create.' },
  { key: 'ranks.edit', label: 'ranks.edit', description: 'Allows ranks edit.' },
  { key: 'ranks.delete', label: 'ranks.delete', description: 'Allows ranks delete.' },
  { key: 'permissions.manage', label: 'permissions.manage', description: 'Allows permissions manage.' },
  { key: 'company.manage', label: 'company.manage', description: 'Allows company manage.' },
  { key: 'branding.manage', label: 'branding.manage', description: 'Allows branding manage.' },
  { key: 'homepage.manage', label: 'homepage.manage', description: 'Allows homepage manage.' },
  { key: 'requests.manage', label: 'requests.manage', description: 'Allows requests manage.' },
  { key: 'quotes.manage', label: 'quotes.manage', description: 'Allows quotes manage.' },
  { key: 'quotes.create', label: 'quotes.create', description: 'Allows quotes create.' },
  { key: 'quotes.edit', label: 'quotes.edit', description: 'Allows quotes edit.' },
  { key: 'quotes.send', label: 'quotes.send', description: 'Allows quotes send.' },
  { key: 'invoices.manage', label: 'invoices.manage', description: 'Allows invoices manage.' },
  { key: 'inventory.manage', label: 'inventory.manage', description: 'Allows inventory manage.' },
  { key: 'customers.manage', label: 'customers.manage', description: 'Allows customers manage.' },
  { key: 'workers.manage', label: 'workers.manage', description: 'Allows workers manage.' },
  { key: 'scheduling.manage', label: 'scheduling.manage', description: 'Allows scheduling manage.' },
  { key: 'ai.quote.use', label: 'ai.quote.use', description: 'Allows ai quote use.' },
  { key: 'ai.quote.manage', label: 'ai.quote.manage', description: 'Allows ai quote manage.' },
  { key: 'ai.troubleshooting.use', label: 'ai.troubleshooting.use', description: 'Allows ai troubleshooting use.' },
  { key: 'ai.knowledge.manage', label: 'ai.knowledge.manage', description: 'Allows ai knowledge manage.' },
  { key: 'reports.view', label: 'reports.view', description: 'Allows reports view.' },
  { key: 'settings.manage', label: 'settings.manage', description: 'Allows settings manage.' },
  { key: 'admin.tools', label: 'admin.tools', description: 'Allows admin tools.' },
  { key: 'client.tools', label: 'client.tools', description: 'Allows client tools.' },
  { key: 'worker.tools', label: 'worker.tools', description: 'Allows worker tools.' },
  { key: 'admin.users.manage', label: 'admin.users.manage', description: 'Allows admin users manage.' },
  { key: 'admin.roles.manage', label: 'admin.roles.manage', description: 'Allows admin roles manage.' },
  { key: 'admin.requests.manage', label: 'admin.requests.manage', description: 'Allows admin requests manage.' },
  { key: 'admin.quotes.manage', label: 'admin.quotes.manage', description: 'Allows admin quotes manage.' },
  { key: 'admin.invoices.manage', label: 'admin.invoices.manage', description: 'Allows admin invoices manage.' },
  { key: 'admin.inventory.manage', label: 'admin.inventory.manage', description: 'Allows admin inventory manage.' },
  { key: 'dashboard.switch_views', label: 'dashboard.switch_views', description: 'Allows dashboard switch_views.' }
];

export const ALL_PERMISSION_KEYS = PORTAL_PERMISSIONS.map((permission) => permission.key);


export const ROLE_HIERARCHY = { owner: 100, admin: 80, manager: 60, worker: 40, client: 20, guest: 10 };
export const roleRank = (roleKey = '') => ROLE_HIERARCHY[normalizeRoleKey(roleKey)] || ROLE_HIERARCHY.guest;
export const highestRoleRank = (roleKeys = []) => Math.max(0, ...(Array.isArray(roleKeys) ? roleKeys : []).map((roleKey) => roleRank(roleKey)));
export const canManageRoleKey = (actorRoleKeys = [], targetRoleKey = '') => actorRoleKeys.includes('owner') || roleRank(targetRoleKey) < highestRoleRank(actorRoleKeys);
export const grantablePermissionKeys = (roleKeys = [], assignedPermissionKeys = []) => roleKeys.includes('owner') ? ALL_PERMISSION_KEYS : [...new Set(assignedPermissionKeys)].sort();

export const DEFAULT_ROLE_PERMISSIONS = {
  owner: ALL_PERMISSION_KEYS,
  admin: ALL_PERMISSION_KEYS.filter((permission) => !['ranks.delete', 'homepage.manage'].includes(permission)),
  manager: ['dashboard.view.admin', 'requests.manage', 'quotes.manage', 'quotes.create', 'quotes.edit', 'scheduling.manage', 'customers.manage', 'workers.manage', 'invoices.manage', 'ai.quote.use'],
  worker: ['dashboard.view.worker', 'worker.tools', 'ai.troubleshooting.use'],
  client: ['dashboard.view.client', 'client.tools'],
  guest: [],
};

export const normalizeRoleKey = (value) => clean(value, 80)
  .toLowerCase()
  .replace(/[^a-z0-9_-]+/g, '-')
  .replace(/^-+|-+$/g, '');

export const normalizePermissionKeys = (permissions) => {
  const allowed = new Set(ALL_PERMISSION_KEYS);

  return [...new Set((Array.isArray(permissions) ? permissions : [])
    .map((permission) => clean(permission, 120))
    .filter((permission) => allowed.has(permission)))];
};

export const getPermissionKeysForRoles = (roleKeys, assignedPermissionKeys = []) => {
  if (roleKeys.includes('owner')) return [...ALL_PERMISSION_KEYS].sort();
  if (Array.isArray(assignedPermissionKeys) && assignedPermissionKeys.length) return [...new Set(assignedPermissionKeys)].sort();
  const permissionKeys = new Set();
  roleKeys.forEach((roleKey) => {
    (DEFAULT_ROLE_PERMISSIONS[roleKey] || []).forEach((permission) => permissionKeys.add(permission));
  });
  return [...permissionKeys].sort();
};


export const loadRolePermissionKeys = async (db, userId, { logPrefix = 'Failed to load role permissions; using role defaults' } = {}) => {
  try {
    const rolePermissions = await db.sql`
      select distinct role_permissions.permission_key
      from user_roles
      join roles on roles.id = user_roles.role_id
      join role_permissions on role_permissions.role_id = roles.id and role_permissions.enabled = true
      where user_roles.user_id = ${userId}
      order by role_permissions.permission_key
    `;

    return rolePermissions.map((permission) => permission.permission_key);
  } catch (error) {
    console.error(logPrefix, error);
    return [];
  }
};

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


export const normalizeSiteUrl = (url) => clean(url).replace(/\/$/, '');

export const getAllowedSiteUrls = () => [
  normalizeSiteUrl(process.env.SITE_URL),
  ...clean(process.env.SITE_URL_ALIASES, 2000)
    .split(',')
    .map((url) => normalizeSiteUrl(url)),
].filter((url) => url && !url.includes('your-domain.example'));

export const hostnameWithoutWww = (hostname) => hostname.replace(/^www\./i, '');

const matchesConfiguredSiteHost = (requestOrigin, allowedSiteUrls) => {
  const requestUrl = new URL(requestOrigin);

  return allowedSiteUrls.some((allowedUrl) => {
    const parsedAllowedUrl = new URL(allowedUrl);

    return requestUrl.protocol === parsedAllowedUrl.protocol
      && hostnameWithoutWww(requestUrl.hostname) === hostnameWithoutWww(parsedAllowedUrl.hostname)
      && requestUrl.port === parsedAllowedUrl.port;
  });
};

export const getSiteUrl = (request) => {
  const requestOrigin = new URL(request.url).origin;
  const allowedSiteUrls = getAllowedSiteUrls();

  if (allowedSiteUrls.includes(requestOrigin) || matchesConfiguredSiteHost(requestOrigin, allowedSiteUrls)) {
    return requestOrigin;
  }

  return allowedSiteUrls[0] || requestOrigin;
};

export const createMagicLinkUrl = (request, token) => new URL(`/api/auth/verify?token=${encodeURIComponent(token)}`, request.url).toString();

export const isConfiguredSecret = (value, placeholderFragments = []) => {
  const cleaned = clean(value);

  return Boolean(cleaned && !placeholderFragments.some((fragment) => cleaned.includes(fragment)));
};

const getConfiguredFromEmail = () => {
  const configuredFromEmail = clean(process.env.MAGIC_LINK_FROM_EMAIL);
  const quoteFromEmail = clean(process.env.QUOTE_FROM_EMAIL);

  if (configuredFromEmail && !configuredFromEmail.includes('your-domain.example')) {
    return configuredFromEmail;
  }

  if (quoteFromEmail && !quoteFromEmail.includes('your-domain.example')) {
    return quoteFromEmail;
  }

  return '';
};

export const shouldSendEmail = () => (
  isConfiguredSecret(process.env.RESEND_API_KEY, ['replace_me', 'your-resend-api-key'])
  && Boolean(getConfiguredFromEmail())
);

export const getFromEmail = () => getConfiguredFromEmail() || 'portal@ta-contracting.org';

export const sendMagicLinkEmail = async ({ fetchImpl = fetch, to, magicLinkUrl, purpose }) => {
  if (!shouldSendEmail()) {
    return { sent: false, reason: 'RESEND_API_KEY or MAGIC_LINK_FROM_EMAIL is not configured.' };
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
      subject: purpose === 'client_account' ? 'We received your contractor request' : 'Sign in to your contractor portal',
      html: purpose === 'client_account'
        ? `<p>We received your request for the contractor.</p><p>Use this secure link to open your client portal, review your request, and add any property details:</p><p><a href="${magicLinkUrl}">Open your secure client portal</a></p><p>This link expires in ${MAGIC_LINK_TTL_MINUTES} minutes.</p>`
        : `<p>Use this secure link to sign in:</p><p><a href="${magicLinkUrl}">Open your secure portal link</a></p><p>This link expires in ${MAGIC_LINK_TTL_MINUTES} minutes.</p>`,
      text: purpose === 'client_account'
        ? `We received your request for the contractor. Use this secure link to open your client portal, review your request, and add any property details: ${magicLinkUrl}\n\nThis link expires in ${MAGIC_LINK_TTL_MINUTES} minutes.`
        : `Use this secure link to sign in: ${magicLinkUrl}\n\nThis link expires in ${MAGIC_LINK_TTL_MINUTES} minutes.`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Resend email failed with ${response.status}: ${detail}`);
  }

  return { sent: true };
};

export const getSessionTtlMinutesForRoles = (roleKeys = []) => (
  roleKeys.some((roleKey) => ['admin', 'worker'].includes(roleKey))
    ? STAFF_SESSION_TTL_MINUTES
    : CLIENT_SESSION_TTL_MINUTES
);

const isSecureCookieRequest = (request) => {
  const forwardedProto = clean(request.headers.get('x-forwarded-proto')).toLowerCase();

  return new URL(request.url).protocol === 'https:' || forwardedProto.split(',').map((proto) => proto.trim()).includes('https');
};

const isCookieDomainSafe = (hostname) => (
  hostname
    && hostname.includes('.')
    && !hostname.endsWith('.netlify.app')
    && !['localhost', '127.0.0.1'].includes(hostname)
);

const normalizeCookieDomain = (domain) => hostnameWithoutWww(clean(domain, 253).toLowerCase().replace(/^\.+/, ''));

const getConfiguredCookieDomain = (request) => {
  const requestHostname = new URL(request.url).hostname.toLowerCase();
  const explicitDomain = normalizeCookieDomain(process.env.AUTH_COOKIE_DOMAIN);

  if (isCookieDomainSafe(explicitDomain)
    && (requestHostname === explicitDomain || requestHostname.endsWith(`.${explicitDomain}`))) {
    return explicitDomain;
  }

  return getAllowedSiteUrls()
    .map((siteUrl) => normalizeCookieDomain(new URL(siteUrl).hostname))
    .find((siteHostname) => isCookieDomainSafe(siteHostname)
      && (requestHostname === siteHostname || requestHostname.endsWith(`.${siteHostname}`))) || '';
};

const getCookieDomainAttribute = (request) => {
  const cookieDomain = getConfiguredCookieDomain(request);

  return cookieDomain ? `; Domain=.${cookieDomain}` : '';
};

const getCookieSecurityAttributes = (request) => (
  `${getCookieDomainAttribute(request)}; SameSite=Lax${isSecureCookieRequest(request) ? '; Secure' : ''}`
);

export const createSessionCookie = (sessionToken, request, ttlMinutes = CLIENT_SESSION_TTL_MINUTES) => {
  const maxAgeSeconds = Math.max(60, Math.round(Number(ttlMinutes || CLIENT_SESSION_TTL_MINUTES) * 60));
  const expires = new Date(Date.now() + maxAgeSeconds * 1000).toUTCString();

  return `${SESSION_COOKIE_NAME}=${sessionToken}; Path=/; HttpOnly${getCookieSecurityAttributes(request)}; Max-Age=${maxAgeSeconds}; Expires=${expires}`;
};

export const createExpiredSessionCookie = (request) => (
  `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly${getCookieSecurityAttributes(request)}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
);

export const parseCookiePairs = (cookieHeader = '') => cookieHeader
  .split(';')
  .map((cookie) => cookie.trim())
  .filter(Boolean)
  .map((cookie) => {
    const [name, ...valueParts] = cookie.split('=');
    return [name, decodeURIComponent(valueParts.join('='))];
  });

export const parseCookies = (cookieHeader = '') => Object.fromEntries(parseCookiePairs(cookieHeader));

export const getSessionTokens = (request) => [...new Set(parseCookiePairs(request.headers.get('cookie') || '')
  .filter(([name, value]) => name === SESSION_COOKIE_NAME && value)
  .map(([, value]) => value))];

export const getSessionToken = (request) => getSessionTokens(request)[0] || '';

export const createOrUpdateMagicLinkUser = async (db, { email, name = null, phone = null }) => {
  const normalizedEmail = clean(email).toLowerCase();
  const [existingUser] = await db.sql`
    select id, email, full_name, phone
    from app_users
    where lower(email) = lower(${normalizedEmail})
    order by created_at asc
    limit 1
  `;

  const [savedUser] = existingUser ? await db.sql`
    update app_users
    set full_name = coalesce(nullif(full_name, ''), ${name || null}),
        phone = coalesce(nullif(phone, ''), ${phone || null}),
        is_active = true,
        updated_at = now()
    where id = ${existingUser.id}
    returning id, email, full_name, phone
  ` : await db.sql`
    insert into app_users (auth_provider, auth_subject, email, full_name, phone)
    values ('magic_link', ${normalizedEmail}, ${normalizedEmail}, ${name || null}, ${phone || null})
    on conflict (email) do update set
      full_name = coalesce(nullif(app_users.full_name, ''), excluded.full_name),
      phone = coalesce(nullif(app_users.phone, ''), excluded.phone),
      is_active = true,
      updated_at = now()
    returning id, email, full_name, phone
  `;

  if (!savedUser) {
    throw new Error(`Unable to create or update magic-link user for ${normalizedEmail}`);
  }

  try {
    await db.sql`
      insert into roles (key, name, description)
      values ('client', 'Client', 'Can manage their own properties, requests, quotes, invoices, files, and messages.')
      on conflict (key) do nothing
    `;

    await db.sql`
      insert into user_roles (user_id, role_id)
      select ${savedUser.id}, roles.id
      from roles
      where roles.key = 'client'
        and not exists (select 1 from user_roles where user_roles.user_id = ${savedUser.id})
      on conflict do nothing
    `;
  } catch (error) {
    console.error('Failed to assign default client role during magic-link sign-in', error);
  }

  return savedUser;
};
