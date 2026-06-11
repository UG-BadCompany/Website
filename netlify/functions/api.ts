import { auditLog, clearSessionCookie, consumeMagicLink, getCurrentUser, hasPermission, HttpError, invalidateCurrentSession, redirectAfterLogin, requireAuth, requirePermission, sendMagicLink, serializeSessionCookie } from '../../lib/server/auth';
import { readConfig } from '../../lib/server/config';
import { detectDatabaseAdapter } from '../../lib/server/database';
import { completeInstallation, createPublicEstimateRequest, getInstallStatus, getPublicMedia, getPublicServiceCatalog, getPublicSiteSettings, getSystemDiagnostics, repairOwnerAccess, uploadBrandingMedia } from '../../lib/server/installation';
import { LocalLicenseProvider } from '../../lib/server/license';
import { paymentAdapter } from '../../lib/server/payments';
import { getDashboardLayout, getDashboardOverview, getPortalOverview, handleDiagnostics, handleSettingsRoute, saveDashboardLayout } from '../../lib/server/admin-settings';
import { validateEnvironment } from '../../lib/server/env-validation';
import { handleModuleRoute } from '../../lib/server/modules';

type NetlifyEvent = { httpMethod?: string; path: string; rawUrl?: string; body?: string | null; headers?: Record<string, string | undefined>; queryStringParameters?: Record<string, string | undefined>; isBase64Encoded?: boolean };
type NetlifyResponse = { statusCode: number; headers?: Record<string, string>; multiValueHeaders?: Record<string, string[]>; body: string; isBase64Encoded?: boolean };
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
    if (path === '/public/service-catalog' && event.httpMethod === 'GET') return json(200, await getPublicServiceCatalog(), { 'cache-control': 'no-store, max-age=0' });
    if (path === '/public/request-estimate' && event.httpMethod === 'POST') return json(200, await createPublicEstimateRequest(readBody(event)));
    if (path === '/media/upload' && event.httpMethod === 'POST') {
      const upload = parseMultipartUpload(event);
      return json(200, await uploadBrandingMedia(upload));
    }
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
    if (path === '/install/repair-owner' && event.httpMethod === 'POST') {
      const body = readBody(event);
      const status = await getInstallStatus();
      const currentUser = await getCurrentUser(event).catch(() => null);
      const token = typeof body.token === 'string' ? body.token : '';
      const tokenAllowed = Boolean(process.env.INSTALL_REPAIR_TOKEN && token && token === process.env.INSTALL_REPAIR_TOKEN);
      if (!status.installerEnabled && !hasPermission(currentUser, '*') && !tokenAllowed) throw new HttpError(403, 'Owner repair is locked. Enable installer, sign in as Owner, or provide INSTALL_REPAIR_TOKEN.');
      return json(200, await repairOwnerAccess({ ownerEmail: typeof body.ownerEmail === 'string' ? body.ownerEmail : currentUser?.email }));
    }
    if (path === '/install/diagnostics') {
      const currentUser = await getCurrentUser(event).catch(() => null);
      return json(200, await getSystemDiagnostics(currentUser), { 'cache-control': 'no-store, max-age=0' });
    }
    if ((path === '/auth/send-magic-link' || path === '/auth/magic-link') && event.httpMethod === 'POST') {
      const body = readBody(event);
      return json(200, await sendMagicLink(String(body.email || ''), typeof body.redirect === 'string' ? body.redirect : undefined, await getPublicSiteSettings(), event));
    }
    if ((path === '/auth/verify-magic-link' || path === '/auth/magic') && event.httpMethod === 'POST') {
      const body = readBody(event);
      const token = typeof body.token === 'string' ? body.token : '';
      const requestedRedirect = typeof body.redirect === 'string' ? body.redirect : undefined;
      const { sessionToken, user } = await consumeMagicLink(token, event);
      return json(200, { ok: true, redirectTo: redirectAfterLogin(user, requestedRedirect) }, { 'Set-Cookie': serializeSessionCookie(sessionToken) });
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
      await invalidateCurrentSession(event).catch(() => undefined);
      return json(200, { ok: true }, { 'Set-Cookie': clearSessionCookie() });
    }

    if (path === '/dashboard/overview' && event.httpMethod === 'GET') {
      const user = await requirePermission(event, 'dashboard.view');
      return json(200, await getDashboardOverview(user, event.queryStringParameters?.range), { 'cache-control': 'no-store, max-age=0' });
    }
    if (path === '/dashboard/layout') {
      const user = await requirePermission(event, 'dashboard.view');
      if (event.httpMethod === 'GET') return json(200, await getDashboardLayout(user), { 'cache-control': 'no-store, max-age=0' });
      if (event.httpMethod === 'POST') return json(200, await saveDashboardLayout(user, readBody(event).layout));
      throw new HttpError(405, 'Method not allowed');
    }
    if (path === '/portal/overview' && event.httpMethod === 'GET') {
      const user = await requirePermission(event, 'portal.view');
      return json(200, await getPortalOverview(user), { 'cache-control': 'no-store, max-age=0' });
    }
    if (path.startsWith('/settings/')) {
      const user = await requirePermission(event, 'settings.view');
      return json(200, await handleSettingsRoute(path, event.httpMethod || 'GET', event.body ? readBody(event) : {}, user), { 'cache-control': 'no-store, max-age=0' });
    }
    if (path === '/system/diagnostics') {
      const user = await requirePermission(event, 'diagnostics.view');
      return json(200, await handleDiagnostics(user), { 'cache-control': 'no-store, max-age=0' });
    }
    if (isModuleApiPath(path)) {
      const permission = permissionForPath(path) || 'dashboard.view';
      const user = await requirePermission(event, permission);
      return json(200, await handleModuleRoute(path, event.httpMethod || 'GET', event.body ? readBody(event) : {}, user, event.queryStringParameters), { 'cache-control': 'no-store, max-age=0' });
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
        user: { id: user.id, name: user.name, email: user.email, role: { id: user.role, name: user.role }, permissions: user.permissions },
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

function isModuleApiPath(path: string) {
  return /^\/(clients|properties|requests|quotes|jobs|invoices|payments|payment-providers|messages|assets|service-catalog|media|account)(?:\/|$)/.test(path);
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
  if (path === '/payments/manual') return 'payments.manage';
  if (path.match(/^\/(payments|payment-providers)/)) return 'payments.view';
  if (path.match(/^\/(assets|cmms)/)) return 'cmms.view';
  if (path.match(/^\/(service-catalog)/)) return 'service_catalog.view';
  if (path.match(/^\/(messages)/)) return 'messages.view';
  if (path.match(/^\/(media)/)) return 'media.view';
  if (path.match(/^\/(dashboard)/)) return 'dashboard.view';
  if (path.match(/^\/(portal)/)) return 'portal.view';
  if (path.match(/^\/(account)/)) return 'account.view';
  return '';
}

function scopeForRole(role: string) {
  if (['Owner', 'Admin'].includes(role)) return 'company';
  if (role === 'Technician') return 'assigned-technician-records';
  if (role === 'Client') return 'own-client-records';
  if (role === 'Vendor') return 'vendor-assigned-records';
  return 'permission-scoped-company-records';
}


function headerValue(headers: Record<string, string | undefined> | undefined, name: string) {
  const target = name.toLowerCase();
  const entry = Object.entries(headers || {}).find(([key]) => key.toLowerCase() === target);
  return entry?.[1] || '';
}

function parseMultipartUpload(event: NetlifyEvent) {
  const contentType = headerValue(event.headers, 'content-type');
  const boundary = contentType.match(/boundary=(?:(?:"([^"]+)")|([^;]+))/i)?.[1] || contentType.match(/boundary=(?:(?:"([^"]+)")|([^;]+))/i)?.[2];
  if (!boundary) throw new HttpError(400, 'multipart/form-data boundary is missing');
  const body = Buffer.from(event.body || '', event.isBase64Encoded ? 'base64' : 'binary');
  const parts = splitMultipart(body, boundary);
  const fields = new Map<string, string>();
  let file: { filename: string; contentType: string; data: Buffer } | null = null;

  for (const part of parts) {
    const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd < 0) continue;
    const rawHeaders = part.subarray(0, headerEnd).toString('utf8');
    const data = part.subarray(headerEnd + 4);
    const disposition = rawHeaders.match(/content-disposition:\s*([^\r\n]+)/i)?.[1] || '';
    const name = disposition.match(/name="([^"]+)"/)?.[1] || '';
    const filename = disposition.match(/filename="([^"]*)"/)?.[1] || '';
    const partContentType = rawHeaders.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim() || 'application/octet-stream';
    if (name === 'file' && filename) file = { filename, contentType: partContentType, data };
    else if (name) fields.set(name, data.toString('utf8'));
  }

  if (!file) throw new HttpError(400, 'Upload field "file" is required');
  const purpose = fields.get('purpose') || '';
  if (!purpose) throw new HttpError(400, 'Upload field "purpose" is required');
  return { ...file, purpose };
}

function splitMultipart(body: Buffer, boundary: string) {
  const delimiter = Buffer.from(`--${boundary}`);
  const parts: Buffer[] = [];
  let cursor = body.indexOf(delimiter);
  while (cursor >= 0) {
    cursor += delimiter.length;
    if (body[cursor] === 45 && body[cursor + 1] === 45) break;
    if (body[cursor] === 13 && body[cursor + 1] === 10) cursor += 2;
    const next = body.indexOf(delimiter, cursor);
    if (next < 0) break;
    let end = next;
    if (body[end - 2] === 13 && body[end - 1] === 10) end -= 2;
    parts.push(body.subarray(cursor, end));
    cursor = next;
  }
  return parts;
}
