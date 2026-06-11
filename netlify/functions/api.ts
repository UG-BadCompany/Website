import { auditLog, clearSessionCookie, consumeMagicLink, HttpError, redirectAfterLogin, requireAuth, requirePermission, secureCookie, sendMagicLink } from '../../lib/server/auth';
import { readConfig } from '../../lib/server/config';
import { detectDatabaseAdapter } from '../../lib/server/database';
import { completeInstallation, createPublicEstimateRequest, getInstallStatus, getPublicMedia, getPublicSiteSettings } from '../../lib/server/installation';
import { LocalLicenseProvider } from '../../lib/server/license';
import { paymentAdapter } from '../../lib/server/payments';
import { validateEnvironment } from '../../lib/server/env-validation';

type NetlifyEvent = { httpMethod?: string; path: string; rawUrl?: string; body?: string | null; headers?: Record<string, string | undefined>; queryStringParameters?: Record<string, string | undefined> };
type NetlifyResponse = { statusCode: number; headers?: Record<string, string>; body: string; isBase64Encoded?: boolean };
const json = (statusCode: number, body: unknown, headers = {}): NetlifyResponse => ({ statusCode, headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const readBody = (event: NetlifyEvent) => event.body ? JSON.parse(event.body) : {};
const toApiRoute = (path: string) => `/api${path === '/' ? '' : path}`;

function errorDetails(error: unknown) {
  if (!(error instanceof Error)) return { message: String(error) };
  return { message: error.message || error.name, name: error.name, stack: error.stack };
}

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  let path = '/';
  let route = '/api';
  const method = event.httpMethod || 'GET';

  try {
    path = event.path.replace(/^\/\.netlify\/functions\/api/, '').replace(/^\/api/, '') || '/';
    route = toApiRoute(path);

    if (path === '/public/site-settings') return json(200, await getPublicSiteSettings(), { 'cache-control': 'no-store, max-age=0' });
    if (path === '/public/request-estimate' && event.httpMethod === 'POST') return json(200, await createPublicEstimateRequest(readBody(event)));
    if (path.startsWith('/media/')) {
      const media = await getPublicMedia(decodeURIComponent(path.slice('/media/'.length).split('?')[0]));
      if (!media) return json(404, { error: 'Media not found' });
      return { statusCode: 200, headers: { 'content-type': media.mimeType, 'cache-control': 'public, max-age=31536000, immutable' }, body: media.data.toString('base64'), isBase64Encoded: true };
    }
    if (path === '/install/status') return json(200, await getInstallStatus());
    if (path === '/install/check') return json(200, { ...(await getInstallStatus()), databaseAdapter: detectDatabaseAdapter(), config: { appUrl: readConfig().appUrl, paymentProvider: readConfig().paymentProvider } });
    if (path === '/install/license') return json(200, await new LocalLicenseProvider().verify(readBody(event)));
    if (path === '/install/database') return json(200, { adapter: detectDatabaseAdapter(), migrationsReady: true, netlifyDatabasePreferred: Boolean(process.env.NETLIFY) });
    if (path === '/install/env-validation') return json(200, validateEnvironment(process.env, readBody(event)));
    if (path === '/install/email-test') {
      const validation = validateEnvironment();
      const ready = validation.email.every((check) => check.status === 'found');
      return json(ready ? 200 : 400, { sent: ready, email: validation.email, message: ready ? 'Test email check passed. Production sends via Resend without exposing secrets.' : 'Required email environment variables are missing.' });
    }
    if (path === '/install/payment-test') return json(200, paymentAdapter(readBody(event).provider).requiredEnv);
    if (path === '/install/complete' && event.httpMethod === 'POST') return json(200, await completeInstallation(readBody(event)));
    if ((path === '/auth/send-magic-link' || path === '/auth/magic-link') && event.httpMethod === 'POST') {
      const body = readBody(event);
      return json(200, await sendMagicLink(String(body.email || ''), typeof body.redirect === 'string' ? body.redirect : undefined, await getPublicSiteSettings(), event));
    }
    if ((path === '/auth/verify-magic-link' || path === '/auth/magic') && event.httpMethod === 'POST') {
      const body = readBody(event);
      const token = typeof body.token === 'string' ? body.token : '';
      const requestedRedirect = typeof body.redirect === 'string' ? body.redirect : undefined;
      const { sessionToken, user } = await consumeMagicLink(token, event);
      return json(200, { ok: true, redirectTo: redirectAfterLogin(user, requestedRedirect) }, { 'set-cookie': secureCookie('contractoros_session', sessionToken) });
    }
    if (path === '/auth/magic' && event.httpMethod === 'GET') {
      const callbackUrl = new URL(event.rawUrl || event.path, readConfig().appUrl);
      const headerHost = event.headers?.host || event.headers?.Host;
      if (headerHost) callbackUrl.host = headerHost;
      const token = callbackUrl.searchParams.get('token') || event.queryStringParameters?.token || '';
      const requestedRedirect = callbackUrl.searchParams.get('redirect') || event.queryStringParameters?.redirect || '/dashboard';
      const frontend = new URL('/auth/magic', readConfig().appUrl);
      if (token) frontend.searchParams.set('token', token);
      if (requestedRedirect) frontend.searchParams.set('redirect', requestedRedirect);
      return { statusCode: 302, headers: { location: `${frontend.pathname}${frontend.search}` }, body: '' };
    }
    if (path === '/auth/logout' && event.httpMethod === 'POST') {
      const user = await requireAuth(event).catch(() => null);
      if (user) await auditLog('logout', { method: 'manual' }, user.id);
      return json(200, { ok: true }, { 'set-cookie': clearSessionCookie() });
    }
    if (path === '/auth/me' || path === '/auth/verify' || path === '/me') {
      const user = await requireAuth(event).catch((error) => {
        if (error instanceof HttpError && error.statusCode === 401) return null;
        throw error;
      });
      if (!user) return json(401, { ok: false, error: 'Unauthenticated' }, { 'cache-control': 'no-store, max-age=0' });
      const publicSettings = await getPublicSiteSettings();
      return json(200, {
        ok: true,
        user: { id: user.id, name: user.name, email: user.email, role: { id: user.role, name: user.role } },
        role: { id: user.role, name: user.role },
        permissions: user.permissions,
        clientId: user.clientId,
        branding: publicSettings.branding,
      }, { 'cache-control': 'no-store, max-age=0' });
    }
    const protectedPermission = permissionForPath(path);
    if (protectedPermission) {
      const user = await requirePermission(event, protectedPermission);
      return json(200, { ok: true, route: path, permissionChecked: true, user: { id: user.id, role: user.role }, scope: scopeForRole(user.role) });
    }
    return json(404, { error: 'Not found', path });
  } catch (error) {
    if (error instanceof HttpError) return json(error.statusCode, { ok: false, error: error.message });
    const details = errorDetails(error);
    console.error('ContractorOS API unhandled error', { route, method, ...details });
    return json(500, {
      ok: false,
      error: 'Internal server error',
      route,
      ...(process.env.NODE_ENV === 'development' ? { details } : {}),
    });
  }
}

function permissionForPath(path: string) {
  if (path.startsWith('/settings') || path.startsWith('/admin')) return 'settings.view';
  if (path.match(/^\/(clients)/)) return 'clients.view';
  if (path.match(/^\/(properties)/)) return 'properties.view';
  if (path.match(/^\/(requests)/)) return 'requests.view';
  if (path.match(/^\/(quotes)/)) return 'quotes.view';
  if (path.match(/^\/(jobs)/)) return 'jobs.view';
  if (path.match(/^\/(work-orders)/)) return 'work_orders.view';
  if (path.match(/^\/(invoices)/)) return 'invoices.view';
  if (path.match(/^\/(payments)/)) return 'payments.view';
  if (path.match(/^\/(assets|cmms)/)) return 'cmms.view';
  if (path.match(/^\/(messages)/)) return 'messages.view';
  if (path.match(/^\/(media)/)) return 'media.view';
  if (path.match(/^\/(dashboard)/)) return 'dashboard.view';
  return '';
}

function scopeForRole(role: string) {
  if (['Owner', 'Admin'].includes(role)) return 'company';
  if (role === 'Technician') return 'assigned-technician-records';
  if (role === 'Client') return 'own-client-records';
  if (role === 'Vendor') return 'vendor-assigned-records';
  return 'permission-scoped-company-records';
}
