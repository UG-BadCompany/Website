import crypto from 'node:crypto';
import { Resend } from 'resend';
import { createDatabase, type Queryable } from './database';
import { readConfig } from './config';

export type AuthUser = { id: string; name: string; email: string; role: string; roles?: string[]; permissions: string[]; clientId?: string | null };
type EventWithHeaders = { headers?: Record<string, string | undefined>; httpMethod?: string; path?: string };
type Branding = { companyName?: string; companyDisplayName?: string; displayName?: string; logoUrl?: string; branding?: { companyName?: string; companyDisplayName?: string; displayName?: string; logoUrl?: string } };

const MAGIC_LINK_MAX_AGE_MINUTES = 15;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const SESSION_COOKIE = 'contractoros_session';
const PUBLIC_REDIRECT_DENYLIST = ['/login', '/install', '/auth/magic', '/auth/callback', '/magic-link-sent'];

export class HttpError extends Error { constructor(public statusCode: number, message: string) { super(message); } }

export function hashToken(token: string) { return crypto.createHash('sha256').update(token).digest('hex'); }
export function createMagicToken() { return crypto.randomBytes(32).toString('base64url'); }
function secureCookieAttributes(maxAge: number) {
  const secure = process.env.NODE_ENV === 'production' || process.env.NETLIFY === 'true' || process.env.CONTEXT === 'production' ? '; Secure' : '';
  return `; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}
export function secureCookie(name: string, value: string, maxAge = SESSION_MAX_AGE_SECONDS) { return `${name}=${value}${secureCookieAttributes(maxAge)}`; }
export function serializeSessionCookie(sessionToken: string, maxAge = SESSION_MAX_AGE_SECONDS) { return secureCookie(SESSION_COOKIE, sessionToken, maxAge); }
export function clearSessionCookie() { return `${SESSION_COOKIE}=${secureCookieAttributes(0)}`; }

function getHeader(event: EventWithHeaders, key: string) {
  const lower = key.toLowerCase();
  return event.headers?.[key] || event.headers?.[lower] || Object.entries(event.headers || {}).find(([headerKey]) => headerKey.toLowerCase() === lower)?.[1];
}

export function readCookie(event: EventWithHeaders, name: string) {
  const cookie = getHeader(event, 'cookie') || '';
  return cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) || '';
}

function authSecret() {
  return readConfig().authSecret || 'contractoros-development-auth-secret';
}

function timingSafeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function signMagicToken(rawToken: string) {
  const signature = crypto.createHmac('sha256', authSecret()).update(rawToken).digest('base64url');
  return `${rawToken}.${signature}`;
}

export function verifySignedToken(signedToken: string) {
  const [rawToken, signature, ...extra] = signedToken.split('.');
  if (!rawToken || !signature || extra.length) return false;
  return timingSafeEqual(signature, crypto.createHmac('sha256', authSecret()).update(rawToken).digest('base64url'));
}

export function isAllowedRedirect(redirect?: string | null) {
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//')) return false;
  return !PUBLIC_REDIRECT_DENYLIST.some((path) => redirect === path || redirect.startsWith(`${path}/`));
}

export function redirectAfterLogin(user: Pick<AuthUser, 'role'>, requestedRedirect?: string | null) {
  if (isAllowedRedirect(requestedRedirect)) return requestedRedirect!;
  return user.role === 'Client' ? '/portal' : '/dashboard';
}

export async function ensureAuthTables(db: Queryable = createDatabase()) {
  await db.query(`create table if not exists magic_tokens (id uuid primary key default gen_random_uuid(), user_id uuid references users(id) on delete cascade, token_hash text unique not null, expires_at timestamptz not null, used_at timestamptz, created_at timestamptz default now())`);
  await db.query(`create table if not exists sessions (id uuid primary key default gen_random_uuid(), user_id uuid references users(id), session_token_hash text unique not null, expires_at timestamptz not null, created_at timestamptz default now())`);
  await db.query(`create table if not exists login_activity (id uuid primary key default gen_random_uuid(), user_id uuid references users(id), email citext, ip_address inet, user_agent text, success boolean, created_at timestamptz default now())`);
}

export async function auditLog(event: string, metadata: Record<string, unknown> = {}, actorUserId?: string | null, db: Queryable = createDatabase()) {
  await db.query(`insert into audit_logs (actor_user_id, event, entity_type, entity_id, metadata) values ($1, $2, $3, $4, $5::jsonb)`, [actorUserId || null, event, 'auth', actorUserId || null, JSON.stringify(metadata)]);
}

function requestMeta(event: EventWithHeaders) {
  const forwardedFor = getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim();
  return { ipAddress: forwardedFor || null, userAgent: getHeader(event, 'user-agent') || null };
}

export async function logLoginActivity(userId: string | null, email: string | null, success: boolean, event: EventWithHeaders, db: Queryable = createDatabase()) {
  const meta = requestMeta(event);
  await db.query(`insert into login_activity (user_id, email, ip_address, user_agent, success) values ($1, $2, nullif($3, '')::inet, $4, $5)`, [userId, email, meta.ipAddress, meta.userAgent, success]);
}

export async function createSession(userId: string, db: Queryable = createDatabase()) {
  const sessionToken = createMagicToken();
  await db.query(`insert into sessions (user_id, session_token_hash, expires_at) values ($1, $2, now() + ($3 || ' seconds')::interval)`, [userId, hashToken(sessionToken), SESSION_MAX_AGE_SECONDS]);
  return sessionToken;
}

export async function invalidateCurrentSession(event: EventWithHeaders, db: Queryable = createDatabase()) {
  const token = readCookie(event, SESSION_COOKIE);
  if (!token) return false;
  const result = await db.query(`delete from sessions where session_token_hash = $1 returning id`, [hashToken(token)]);
  return Boolean(result.rows[0]);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char));
}

export function magicLinkEmailHtml(loginUrl: string, branding: Branding) {
  const companyName = branding.branding?.companyDisplayName || branding.companyDisplayName || branding.branding?.displayName || branding.displayName || branding.branding?.companyName || branding.companyName || 'ContractorOS';
  const logoUrl = branding.branding?.logoUrl || branding.logoUrl || '';
  const safeCompany = escapeHtml(companyName);
  const safeUrl = escapeHtml(loginUrl);
  const logo = logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${safeCompany} logo" style="width:56px;height:56px;border-radius:16px;object-fit:contain;border:1px solid #dbe3ef;background:#ffffff;" />` : `<div style="font-size:20px;font-weight:800;color:#0f172a;">${safeCompany}</div>`;
  return `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#0f172a;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dbe3ef;border-radius:24px;padding:32px;"><tr><td>${logo}<h1 style="margin:24px 0 8px;font-size:28px;line-height:1.1;">Login to ${safeCompany}</h1><p style="margin:0 0 24px;color:#64748b;font-size:16px;line-height:1.6;">Click the secure button below to access your account.</p><p style="margin:0 0 24px;"><a href="${safeUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:999px;padding:14px 24px;font-weight:800;">Login Securely</a></p><p style="margin:0;color:#64748b;font-size:14px;line-height:1.6;">This link expires in 15 minutes. If you did not request this login link, you can safely ignore this email.</p></td></tr></table></td></tr></table></body></html>`;
}

export async function sendMagicLink(email: string, redirect: string | undefined, branding: Branding, event: EventWithHeaders, db: Queryable = createDatabase()) {
  await ensureAuthTables(db);
  const normalizedEmail = email.trim().toLowerCase();
  const genericMessage = 'Check your email for a secure login link.';
  const userResult = await db.query<{ id: string; name: string; email: string }>(`select id, name, email from users where lower(email::text) = $1 and status = 'active' limit 1`, [normalizedEmail]);
  const user = userResult.rows[0];

  if (!user) {
    await auditLog('magic link sent', { email: normalizedEmail, delivered: false, reason: 'unknown_user' }, null, db);
    await logLoginActivity(null, normalizedEmail, false, event, db);
    return { sent: true, message: genericMessage };
  }

  const signedToken = signMagicToken(createMagicToken());
  await db.query(`insert into magic_tokens (user_id, token_hash, expires_at) values ($1, $2, now() + ($3 || ' minutes')::interval)`, [user.id, hashToken(signedToken), MAGIC_LINK_MAX_AGE_MINUTES]);
  const config = readConfig();
  const url = new URL('/auth/magic', config.appUrl);
  url.searchParams.set('token', signedToken);
  if (isAllowedRedirect(redirect)) url.searchParams.set('redirect', redirect!);

  if (config.resendApiKey && config.emailFrom) {
    const resend = new Resend(config.resendApiKey);
    const companyName = branding.branding?.companyDisplayName || branding.companyDisplayName || branding.branding?.displayName || branding.displayName || branding.branding?.companyName || branding.companyName || 'ContractorOS';
    await resend.emails.send({ from: config.emailFrom, to: user.email, subject: `Your secure login link for ${companyName}`, html: magicLinkEmailHtml(url.toString(), branding) });
  } else {
    console.warn('Resend is not configured; magic login link generated but email not sent.', { userId: user.id });
  }

  await auditLog('magic link sent', { email: normalizedEmail, delivered: Boolean(config.resendApiKey && config.emailFrom) }, user.id, db);
  return { sent: true, message: genericMessage };
}

export async function consumeMagicLink(signedToken: string, event: EventWithHeaders, db: Queryable = createDatabase()) {
  await ensureAuthTables(db);
  if (!verifySignedToken(signedToken)) {
    await auditLog('login failure', { reason: 'invalid_signature' }, null, db);
    throw new HttpError(400, 'This login link has expired or is invalid.');
  }

  const tokenHash = hashToken(signedToken);
  const result = await db.query<{ id: string; user_id: string; expires_at: Date; used_at: Date | null }>(`select id, user_id, expires_at, used_at from magic_tokens where token_hash = $1 limit 1`, [tokenHash]);
  const magicToken = result.rows[0];
  if (!magicToken || magicToken.used_at || new Date(magicToken.expires_at).getTime() <= Date.now()) {
    await auditLog('login failure', { reason: !magicToken ? 'unknown_token' : magicToken.used_at ? 'token_used' : 'token_expired' }, magicToken?.user_id, db);
    throw new HttpError(400, 'This login link has expired or is invalid.');
  }

  const userResult = await db.query<AuthUser>(userSelectSql('where u.id = $1 and u.status = \'active\''), [magicToken.user_id]);
  const user = userResult.rows[0];
  if (!user) {
    await auditLog('login failure', { reason: 'inactive_user' }, magicToken.user_id, db);
    throw new HttpError(400, 'This login link has expired or is invalid.');
  }

  const markedUsed = await db.query(`update magic_tokens set used_at = now() where id = $1 and used_at is null and expires_at > now() returning id`, [magicToken.id]);
  if (!markedUsed.rows[0]) {
    await auditLog('login failure', { reason: 'token_already_consumed' }, user.id, db);
    throw new HttpError(400, 'This login link has expired or is invalid.');
  }
  const sessionToken = await createSession(user.id, db);
  await auditLog('magic link used', { magicTokenId: magicToken.id }, user.id, db);
  await auditLog('login success', { method: 'magic_link' }, user.id, db);
  await logLoginActivity(user.id, user.email, true, event, db);
  return { sessionToken, user };
}

function userSelectSql(whereClause: string) {
  return `select u.id, u.name, u.email, coalesce(max(r.name) filter (where lower(r.name) = 'owner'), max(r.name), 'Client') as role,
                coalesce(array_agg(distinct r.name) filter (where r.name is not null), '{}') as roles,
                coalesce(array_agg(distinct p.key) filter (where p.key is not null), '{}') as permissions,
                max(cc.client_id::text) as "clientId"
         from users u
         left join user_roles ur on ur.user_id = u.id
         left join roles r on r.id = ur.role_id
         left join role_permissions rp on rp.role_id = r.id
         left join permissions p on p.id = rp.permission_id
         left join client_contacts cc on lower(cc.email::text) = lower(u.email::text)
         ${whereClause}
         group by u.id`;
}

export async function getCurrentUser(event: EventWithHeaders, db: Queryable = createDatabase()): Promise<AuthUser | null> {
  const token = readCookie(event, SESSION_COOKIE);
  const devRole = process.env.NODE_ENV === 'development' ? getHeader(event, 'x-contractoros-role') : '';
  if (!token && !devRole) return null;

  if (token) {
    const result = await db.query<AuthUser>(
      userSelectSql(`join sessions s on s.user_id = u.id where s.session_token_hash = $1 and s.expires_at > now() and u.status = 'active'`),
      [hashToken(token)]
    );
    if (result.rows[0]) return normalizeAuthUser(result.rows[0]);
  }

  if (devRole) {
    const role = devRole;
    return normalizeAuthUser({ id: 'dev-session-user', name: role, email: `${role.toLowerCase()}@example.com`, role, permissions: fallbackPermissions(role), clientId: null });
  }
  return null;
}

export async function requireAuth(event: EventWithHeaders, db: Queryable = createDatabase()) {
  const user = await getCurrentUser(event, db);
  if (!user) throw new HttpError(401, 'Authentication required');
  return user;
}

export function hasPermission(user: AuthUser | null | undefined, permission: string) {
  if (!user) return false;
  const roleName = user.role?.toLowerCase();
  if (roleName === 'owner') return true;
  if (user.permissions?.includes('*')) return true;
  if (user.permissions?.includes(permission)) return true;
  return false;
}

function normalizeAuthUser(user: AuthUser): AuthUser {
  if (user.role?.toLowerCase() !== 'owner') return user;
  return user.permissions.includes('*') ? user : { ...user, permissions: ['*', ...user.permissions] };
}

export async function requirePermission(event: EventWithHeaders, permission: string, db: Queryable = createDatabase()) {
  const user = await requireAuth(event, db);
  if (!hasPermission(user, permission)) throw new HttpError(403, `Missing permission ${permission}`);
  return user;
}

export function canAccessResource(user: AuthUser, resource: { clientId?: string | null; assignedUserId?: string | null; vendorId?: string | null }) {
  if (user.role?.toLowerCase() === 'owner' || user.permissions.includes('*') || user.role === 'Admin') return true;
  if (user.role === 'Technician') return Boolean(resource.assignedUserId && resource.assignedUserId === user.id) || user.permissions.includes('jobs.manage');
  if (user.role === 'Client') return Boolean(resource.clientId && resource.clientId === user.clientId);
  if (user.role === 'Vendor') return Boolean(resource.vendorId && resource.vendorId === user.id);
  return user.permissions.some((permission) => permission.endsWith('.manage'));
}

function fallbackPermissions(role: string) {
  const all = ['*','dashboard.view','dashboard.manage','settings.view','settings.manage','users.view','users.manage','roles.view','roles.manage','permissions.view','permissions.manage','clients.view','clients.manage','properties.view','properties.manage','requests.view','requests.manage','quotes.view','quotes.create','quotes.approve','quotes.manage','jobs.view','jobs.manage','work_orders.view','work_orders.manage','invoices.view','invoices.manage','payments.view','payments.manage','cmms.view','cmms.manage','messages.view','messages.manage','website.view','website.manage','homepage.manage','theme.view','theme.manage','branding.view','branding.manage','service_catalog.view','service_catalog.manage','media.view','media.manage','portal.view','portal.manage','account.view','account.manage','company.view','company.manage','foundation.view','foundation.manage','payment.view','payment.manage','email.view','email.manage','homepage.view','diagnostics.view','audit_logs.view','license.view','license.manage','expansion_packs.view','expansion_packs.manage'];
  if (['Owner', 'Admin'].includes(role)) return all;
  if (role === 'Technician') return ['dashboard.view','account.view','jobs.view','work_orders.view','work_orders.manage','messages.view','media.manage','cmms.view'];
  if (role === 'Client') return ['portal.view','account.view','requests.view','quotes.view','quotes.approve','invoices.view','payments.manage','messages.view','messages.manage','media.manage'];
  if (role === 'Vendor') return ['account.view','work_orders.view','messages.view'];
  return ['dashboard.view','clients.view','properties.view','requests.view','quotes.view','jobs.view','work_orders.view','invoices.view','payments.view','messages.view'];
}
