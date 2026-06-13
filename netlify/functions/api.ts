import { auditLog, clearSessionCookie, consumeMagicLink, getCurrentUser, hasPermission, HttpError, invalidateCurrentSession, redirectAfterLogin, requireAuth, requirePermission, sendMagicLink, serializeSessionCookie } from '../../lib/server/auth';
import { readConfig } from '../../lib/server/config';
import { detectDatabaseAdapter } from '../../lib/server/database';
import { completeInstallation, createPublicEstimateRequest, getInstallStatus, getPublicMedia, getPublicServiceCatalog, getPublicSiteSettings, getSystemDiagnostics, repairOwnerAccess, uploadBrandingMedia } from '../../lib/server/installation';
import { paymentAdapter } from '../../lib/server/payments';
import { getDashboardLayout, getDashboardOverview, getPortalOverview, getViewAsOptions, handleDiagnostics, handleSettingsRoute, saveDashboardLayout } from '../../lib/server/admin-settings';
import { validateEnvironment } from '../../lib/server/env-validation';
import { handleModuleRoute } from '../../lib/server/modules';
import { handleWorkflowRoute } from '../../lib/server/workflow';
import { checkLicense, getDefaultLicenseApiUrl, getLicenseStatus, requireActiveLicense, requireLicensedModule, updateAndVerifyLicense, verifyLicense, LicenseModuleLockedError, LicenseRequiredError } from '../../lib/server/license-client';
import { getHomepageBuilder, getPublicHomepage, homepageSectionLibrary, homepageTemplates, listHomepageVersions, publishHomepage, restoreHomepageVersion, revertHomepage, saveHomepageDraft, uploadHomepageMedia, listHomepageMedia, listProjectShowcases, saveProjectShowcase, deleteProjectShowcase, getGoogleBusinessIntegration, saveGoogleBusinessIntegration, refreshGoogleReviews } from '../../lib/server/homepage-builder';
import { getAiSettings, patchAiSettings, runAiQuoteForRequest, getAiQuoteForRequest, quoteDraftAction, runTroubleshooting, getTroubleshooting, troubleshootingAction, aiResponseError } from '../../lib/server/ai/ai-service';

type NetlifyEvent = { httpMethod?: string; path: string; rawUrl?: string; body?: string | null; headers?: Record<string, string | undefined>; queryStringParameters?: Record<string, string | undefined>; isBase64Encoded?: boolean };
type NetlifyResponse = { statusCode: number; headers?: Record<string, string>; multiValueHeaders?: Record<string, string[]>; body: string; isBase64Encoded?: boolean };
const json = (statusCode: number, body: unknown, headers = {}): NetlifyResponse => ({ statusCode, headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const readBody = (event: NetlifyEvent) => event.body ? JSON.parse(event.body) : {};
const toApiRoute = (path: string) => `/api${path === '/' ? '' : path}`;


function moduleForLicensedPath(path: string): string | null {
  if (path.startsWith('/jobs')) return 'jobs';
  if (path.startsWith('/work-orders')) return 'work_orders';
  if (path.startsWith('/payments')) return 'payments';
  if (path.startsWith('/messages')) return 'messages';
  if (path.startsWith('/service-catalog')) return 'service_catalog';
  if (path.startsWith('/project-showcases')) return 'project_showcase';
  if (path.startsWith('/integrations/google-business')) return 'google_reviews';
  if (path.startsWith('/portal')) return 'client_portal';
  if (path.startsWith('/assets')) return 'assets';
  if (path.startsWith('/cmms')) return 'cmms';
  if (path.startsWith('/admin/view-as')) return 'owner_view_as';
  if (path.startsWith('/settings/roles') || path.startsWith('/settings/permissions')) return 'advanced_roles_permissions';
  if (path.startsWith('/settings/roles-permissions')) return 'advanced_roles_permissions';
  if (path.startsWith('/settings/workflow-automation') || path.startsWith('/workflow-automation')) return 'workflow_automation';
  if (path.startsWith('/reports') || path.startsWith('/analytics')) return 'advanced_reporting';
  if (path.startsWith('/ai/quote')) return 'ai_quoting';
  if (path.startsWith('/ai/quoting')) return 'ai_quoting';
  if (path.startsWith('/ai/troubleshooting')) return 'ai_troubleshooting';
  return null;
}

async function enforceLicensedPath(path: string) {
  const moduleKey = moduleForLicensedPath(path);
  if (moduleKey) await requireLicensedModule(moduleKey);
}

async function licenseRequiredGuardAllows(path: string) {
  if (path === '/license/status' || path === '/license/recheck' || path === '/license/update') return true;
  if (path.startsWith('/auth/')) return true;
  if (path === '/auth/me' || path === '/auth/verify' || path === '/me') return true;
  if (path === '/settings/license') return true;
  if (path === '/install/status' || path === '/install/check') return true;
  if (path.startsWith('/install/')) return !(await getInstallStatus()).installed;
  return false;
}

async function enforceActiveLicenseForApi(path: string) {
  if (await licenseRequiredGuardAllows(path)) return;
  await requireActiveLicense();
}

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

    await enforceActiveLicenseForApi(path);

    if (path === '/public/homepage' && event.httpMethod === 'GET') return json(200, await getPublicHomepage(), { 'cache-control': 'no-store, max-age=0' });
    if (path === '/public/site-settings') return json(200, await getPublicSiteSettings(), { 'cache-control': 'no-store, max-age=0' });
    if (path === '/public/service-catalog' && event.httpMethod === 'GET') return json(200, await getPublicServiceCatalog(), { 'cache-control': 'no-store, max-age=0' });
    if (path === '/public/request-estimate' && event.httpMethod === 'POST') return json(200, await createPublicEstimateRequest(readBody(event)));
    if (path === '/media/upload' && event.httpMethod === 'POST') {
      if ((headerValue(event.headers, 'content-type') || '').includes('application/json')) {
        const user = await requirePermission(event, 'homepage.manage');
        return json(200, await uploadHomepageMedia(readBody(event), user));
      }
      const upload = parseMultipartUpload(event);
      return json(200, await uploadBrandingMedia(upload));
    }
    if (path === '/media' && event.httpMethod === 'GET') {
      const user = await requirePermission(event, 'homepage.view');
      return json(200, await listHomepageMedia(event.queryStringParameters || {}, user), { 'cache-control': 'no-store, max-age=0' });
    }
    if (path.startsWith('/media/')) {
      const media = await getPublicMedia(decodeURIComponent(path.slice('/media/'.length).split('?')[0]));
      if (!media) return json(404, { error: 'Media not found' });
      return { statusCode: 200, headers: { 'content-type': media.mimeType, 'cache-control': 'public, max-age=31536000, immutable' }, body: media.data.toString('base64'), isBase64Encoded: true };
    }
    if (path === '/install/status') return json(200, await getInstallStatus());
    if (path === '/install/check') return json(200, { ...(await getInstallStatus()), databaseAdapter: detectDatabaseAdapter(), config: { appUrl: readConfig().appUrl, paymentProvider: readConfig().paymentProvider } });
    if (path === '/install/database') return json(200, { adapter: detectDatabaseAdapter(), migrationsReady: true, netlifyDatabasePreferred: Boolean(process.env.NETLIFY) });
    if (path === '/install/env-validation') return json(200, validateEnvironment(process.env, readBody(event)));
    if (path === '/install/license-defaults' && event.httpMethod === 'GET') return json(200, { licenseApiUrl: getDefaultLicenseApiUrl() }, { 'cache-control': 'no-store, max-age=0' });
    if (path === '/install/license' && event.httpMethod === 'POST') return json(200, await verifyLicense(readBody(event)));
    if (path === '/license/status' && event.httpMethod === 'GET') return json(200, await getLicenseStatus(), { 'cache-control': 'no-store, max-age=0' });
    if (path === '/license/recheck' && event.httpMethod === 'POST') { await requirePermission(event, 'license.manage'); return json(200, await checkLicense(), { 'cache-control': 'no-store, max-age=0' }); }
    if (path === '/license/update' && event.httpMethod === 'POST') { await requirePermission(event, 'license.manage'); return json(200, await updateAndVerifyLicense(readBody(event)), { 'cache-control': 'no-store, max-age=0' }); }
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

    await enforceLicensedPath(path);

    if (path === '/admin/view-as/options' && event.httpMethod === 'GET') {
      const user = await requireAuth(event);
      return json(200, await getViewAsOptions(user), { 'cache-control': 'no-store, max-age=0' });
    }
    if (path === '/audit' && event.httpMethod === 'POST') {
      const user = await requireAuth(event);
      const body = readBody(event);
      await auditLog(String(body.event || 'client audit'), typeof body.metadata === 'object' && body.metadata ? body.metadata as Record<string, unknown> : {}, user.id);
      return json(200, { ok: true });
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

    if (path === '/homepage-builder' && event.httpMethod === 'GET') {
      const user = await requirePermission(event, 'homepage.view');
      return json(200, await getHomepageBuilder(user), { 'cache-control': 'no-store, max-age=0' });
    }
    if (path === '/homepage-builder/draft' && event.httpMethod === 'POST') {
      const user = await requirePermission(event, 'homepage.manage');
      return json(200, await saveHomepageDraft(readBody(event), user), { 'cache-control': 'no-store, max-age=0' });
    }
    if (path === '/homepage-builder/publish' && event.httpMethod === 'POST') {
      const user = await requirePermission(event, 'homepage.manage');
      return json(200, await publishHomepage(readBody(event), user), { 'cache-control': 'no-store, max-age=0' });
    }
    if (path === '/homepage-builder/revert' && event.httpMethod === 'POST') {
      const user = await requirePermission(event, 'homepage.manage');
      return json(200, await revertHomepage(user), { 'cache-control': 'no-store, max-age=0' });
    }
    if (path === '/homepage-builder/versions' && event.httpMethod === 'GET') {
      const user = await requirePermission(event, 'homepage.view');
      return json(200, await listHomepageVersions(user), { 'cache-control': 'no-store, max-age=0' });
    }
    const homepageRestoreMatch = path.match(/^\/homepage-builder\/versions\/([^/]+)\/restore$/);
    if (homepageRestoreMatch && event.httpMethod === 'POST') {
      const user = await requirePermission(event, 'homepage.manage');
      return json(200, await restoreHomepageVersion(homepageRestoreMatch[1], user), { 'cache-control': 'no-store, max-age=0' });
    }
    if (path === '/homepage-builder/templates' && event.httpMethod === 'GET') return json(200, await homepageTemplates(), { 'cache-control': 'no-store, max-age=0' });
    if (path === '/homepage-builder/section-library' && event.httpMethod === 'GET') return json(200, await homepageSectionLibrary(), { 'cache-control': 'no-store, max-age=0' });
    if (path === '/project-showcases' && event.httpMethod === 'GET') return json(200, await listProjectShowcases(await requirePermission(event, 'project_showcase.view')), { 'cache-control': 'no-store, max-age=0' });
    if (path === '/project-showcases' && event.httpMethod === 'POST') return json(200, await saveProjectShowcase(readBody(event), await requirePermission(event, 'project_showcase.manage')));
    const projectDeleteMatch = path.match(/^\/project-showcases\/([^/]+)$/);
    if (projectDeleteMatch && event.httpMethod === 'DELETE') return json(200, await deleteProjectShowcase(decodeURIComponent(projectDeleteMatch[1]), await requirePermission(event, 'project_showcase.manage')));
    if (path === '/integrations/google-business' && event.httpMethod === 'GET') return json(200, await getGoogleBusinessIntegration(await requireAuth(event)), { 'cache-control': 'no-store, max-age=0' });
    if (path === '/integrations/google-business' && event.httpMethod === 'POST') return json(200, await saveGoogleBusinessIntegration(readBody(event), await requirePermission(event, 'integrations.manage')));
    if (path === '/integrations/google-business/refresh' && event.httpMethod === 'POST') return json(200, await refreshGoogleReviews(await requirePermission(event, 'integrations.manage')));

    if (path === '/settings/ai') {
      const user = await requirePermission(event, 'settings.view');
      if (event.httpMethod === 'GET') return json(200, await getAiSettings(), { 'cache-control': 'no-store, max-age=0' });
      if (event.httpMethod === 'PATCH') { await requirePermission(event, 'settings.manage'); return json(200, await patchAiSettings(readBody(event), user), { 'cache-control': 'no-store, max-age=0' }); }
      throw new HttpError(405, 'Method not allowed');
    }
    if (path.startsWith('/ai/quote/')) {
      const user = await requirePermission(event, 'quotes.manage');
      try {
        const runMatch = path.match(/^\/ai\/quote\/request\/([^/]+)\/run$/);
        const getMatch = path.match(/^\/ai\/quote\/request\/([^/]+)$/);
        const actionMatch = path.match(/^\/ai\/quote\/([^/]+)\/(create-quote|approve|reject|rerun)$/);
        if (runMatch && event.httpMethod === 'POST') return json(200, await runAiQuoteForRequest(runMatch[1], user), { 'cache-control': 'no-store, max-age=0' });
        if (getMatch && event.httpMethod === 'GET') return json(200, await getAiQuoteForRequest(getMatch[1]), { 'cache-control': 'no-store, max-age=0' });
        if (actionMatch && event.httpMethod === 'POST') {
          if (actionMatch[2] === 'rerun') return json(200, await quoteDraftAction(actionMatch[1], 'rerun', user), { 'cache-control': 'no-store, max-age=0' });
          return json(200, await quoteDraftAction(actionMatch[1], actionMatch[2], user), { 'cache-control': 'no-store, max-age=0' });
        }
      } catch (error) { return json(400, aiResponseError(error), { 'cache-control': 'no-store, max-age=0' }); }
    }
    if (path.startsWith('/ai/troubleshooting')) {
      const user = await requirePermission(event, 'jobs.view');
      try {
        const getMatch = path.match(/^\/ai\/troubleshooting\/([^/]+)$/);
        const actionMatch = path.match(/^\/ai\/troubleshooting\/([^/]+)\/(save-to-job|create-checklist|rerun)$/);
        if (path === '/ai/troubleshooting/run' && event.httpMethod === 'POST') return json(200, await runTroubleshooting(readBody(event), user), { 'cache-control': 'no-store, max-age=0' });
        if (getMatch && event.httpMethod === 'GET') return json(200, await getTroubleshooting(getMatch[1]), { 'cache-control': 'no-store, max-age=0' });
        if (actionMatch && event.httpMethod === 'POST') return json(200, await troubleshootingAction(actionMatch[1], actionMatch[2], readBody(event)), { 'cache-control': 'no-store, max-age=0' });
      } catch (error) { return json(400, aiResponseError(error), { 'cache-control': 'no-store, max-age=0' }); }
    }

    if (path.startsWith('/settings/')) {
      const user = await requirePermission(event, 'settings.view');
      return json(200, await handleSettingsRoute(path, event.httpMethod || 'GET', event.body ? readBody(event) : {}, user), { 'cache-control': 'no-store, max-age=0' });
    }
    if (path === '/system/diagnostics') {
      const user = await requirePermission(event, 'diagnostics.view');
      return json(200, await handleDiagnostics(user), { 'cache-control': 'no-store, max-age=0' });
    }
    if (isWorkflowApiPath(path)) {
      const permission = permissionForWorkflowPath(path) || permissionForPath(path) || 'dashboard.view';
      const user = await requirePermission(event, permission);
      return json(200, await handleWorkflowRoute(path, event.httpMethod || 'GET', event.body ? readBody(event) : {}, user, event.queryStringParameters), { 'cache-control': 'no-store, max-age=0' });
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
    if (error instanceof LicenseRequiredError) return json(error.statusCode, error.toResponse());
    if (error instanceof LicenseModuleLockedError) return json(error.statusCode, error.toResponse());
    if (error instanceof HttpError) return json(error.statusCode, { ok: false, error: error.statusCode === 404 ? 'Route not found' : error.statusCode === 405 ? 'Method not allowed' : 'Route failed', route, method, step: stepForRoute(route, method), message: error.message });
    const details = errorDetails(error);
    console.error('ContractorOS API unhandled error', { route, method, ...details });
    return json(500, {
      ok: false,
      error: 'Route failed',
      route,
      method,
      step: stepForRoute(route, method),
      message: details.message,
      ...(process.env.NODE_ENV === 'development' ? { details } : {}),
    });
  }
}

function stepForRoute(route: string, method: string) {
  const clean = route.replace(/^\/api/, '') || '/';
  const module = clean.split('/').filter(Boolean)[0] || 'root';
  const action = clean.split('/').filter(Boolean).slice(1).join('_') || (method === 'GET' ? 'list' : method.toLowerCase());
  return `${method.toLowerCase()}_${module}${action ? '_' + action : ''}`.replace(/[^a-z0-9_]+/gi, '_');
}

function permissionForWorkflowPath(path: string) {
  if (/^\/quotes\/[^/]+\/(approve|decline)$/.test(path)) return 'portal.view';
  if (/^\/workflow\//.test(path)) return 'dashboard.view';
  return '';
}

function isWorkflowApiPath(path: string) {
  return /^(?:\/(?:requests|quotes|jobs|invoices)\/[^/]+\/(?:convert-to-quote|convert-to-job|notes|media|send|approve|decline|start|complete|create-invoice|mark-paid|closeout)|\/workflow\/[^/]+\/[^/]+\/(?:timeline|summary))$/.test(path);
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
