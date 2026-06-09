import { json, ok, fail, safe, parseBody } from './lib/response.mjs';
import { databaseStatus, databaseRuntimeDiagnostics, bootstrapSchema, getDraft, saveDraft, finishInstall, dashboardBootstrap, query, createMagicLoginToken, verifyMagicLoginToken, getSessionFromToken, revokeSessionToken } from './lib/db.mjs';
import { getIntegrationStatus } from './lib/integrations.mjs';

function bearerToken(event) {
  const header = event.headers?.authorization || event.headers?.Authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

function siteUrlFromEvent(event) {
  const configured = process.env.SITE_URL;
  if (configured) return configured.replace(/\/$/, '');
  const proto = event.headers?.['x-forwarded-proto'] || 'https';
  const host = event.headers?.host || event.headers?.Host || 'localhost:8888';
  return `${proto}://${host}`.replace(/\/$/, '');
}

async function sendMagicLinkEmail({ email, magicLink }) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAGIC_LINK_FROM_EMAIL;
  if (!resendApiKey || !from) return { configured: false, mode: 'manual' };
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${resendApiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Your dashboard magic login link',
      html: `<p>Use this secure magic link to sign in to your dashboard. It expires in 15 minutes and can only be used once.</p><p><a href="${magicLink}">Sign in to dashboard</a></p>`,
      text: `Use this secure magic link to sign in to your dashboard. It expires in 15 minutes and can only be used once.

${magicLink}`
    })
  });
  if (!response.ok) throw new Error(`Resend email request failed with status ${response.status}`);
  return { configured: true, mode: 'email' };
}

function methodPath(event) {
  const raw = event.path || '';
  const path = raw.replace(/^\/\.netlify\/functions\/api/, '/api').replace(/^\/api\/?/, '/api/').replace(/\/$/, '') || '/api';
  return { method: event.httpMethod || 'GET', path };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true }, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type,authorization' });
  return safe(async () => {
    const { method, path } = methodPath(event);

    if (method === 'GET' && path === '/api/auth/session') {
      const session = await getSessionFromToken(bearerToken(event));
      return ok({ authenticated: Boolean(session), user: session?.user || null, expiresAt: session?.expiresAt || null });
    }
    if (method === 'POST' && path === '/api/auth/magic-link') {
      const body = parseBody(event);
      const email = String(body.email || '').trim().toLowerCase();
      const safeMessage = 'If that email can access this site, a magic login link has been sent.';
      const created = await createMagicLoginToken(email, { ip: event.headers?.['x-forwarded-for'] || null, userAgent: event.headers?.['user-agent'] || null });
      let delivery = { configured: Boolean(process.env.RESEND_API_KEY && process.env.MAGIC_LINK_FROM_EMAIL), mode: process.env.RESEND_API_KEY && process.env.MAGIC_LINK_FROM_EMAIL ? 'email' : 'manual' };
      if (created) {
        const callback = new URL('/auth/callback', siteUrlFromEvent(event));
        callback.searchParams.set('token', created.token);
        try {
          delivery = await sendMagicLinkEmail({ email: created.user.email, magicLink: callback.toString() });
        } catch (error) {
          console.warn('[auth] Magic link email delivery failed', { message: error.message });
          delivery = { configured: true, mode: 'email', queued: false };
        }
      }
      return ok({ requested: true, message: delivery.configured ? safeMessage : `${safeMessage} Email delivery is not configured yet, so the site is in safe manual/dev mode.`, delivery: { configured: delivery.configured, mode: delivery.mode } });
    }
    if (method === 'POST' && path === '/api/auth/verify') {
      const body = parseBody(event);
      const verified = await verifyMagicLoginToken(body.token || '', { ip: event.headers?.['x-forwarded-for'] || null, userAgent: event.headers?.['user-agent'] || null });
      if (!verified) return fail(401, 'INVALID_OR_EXPIRED_MAGIC_LINK', 'Magic link is invalid, expired, or already used.');
      return ok({ sessionToken: verified.sessionToken, expiresAt: verified.expiresAt, user: verified.user });
    }
    if (method === 'POST' && path === '/api/auth/logout') {
      await revokeSessionToken(bearerToken(event));
      return ok({ loggedOut: true });
    }
    if (method === 'GET' && path === '/api/install-status') {
      const status = await databaseStatus();
      return ok({ ...status, installed: Boolean(status.installationComplete), requiresInstall: !status.installationComplete });
    }
    if (method === 'GET' && path === '/api/install/health') {
      const status = await databaseStatus();
      return ok({ installer: 'healthy', database: status, recoveryAvailable: true });
    }
    if (method === 'GET' && path === '/api/install/runtime-diagnostics') {
      return ok(databaseRuntimeDiagnostics());
    }
    if (method === 'POST' && path === '/api/install/bootstrap-database') {
      const result = await bootstrapSchema();
      return json(200, { ok: Boolean(result.connected && result.schemaReady && result.writeTestPassed), ...result });
    }
    if (method === 'GET' && path === '/api/install/draft') {
      const status = await databaseStatus();
      if (!status.connected) return fail(200, 'DATABASE_NOT_CONNECTED', status.message || 'Connect Netlify Database before loading draft.', { draft: {}, database: status });
      const draft = await getDraft();
      return ok({ draft: draft.draft, updatedAt: draft.updated_at });
    }
    if (method === 'POST' && path === '/api/install/draft') {
      const status = await databaseStatus();
      if (!status.connected) return fail(200, 'DATABASE_NOT_CONNECTED', status.message || 'Connect Netlify Database before saving draft.', { saved: false, database: status });
      const saved = await saveDraft(parseBody(event).draft || parseBody(event));
      return ok({ saved: true, draft: saved.draft, updatedAt: saved.updated_at });
    }
    if (method === 'POST' && path === '/api/install/finish') {
      const status = await databaseStatus();
      if (!status.connected) return fail(200, 'DATABASE_NOT_CONNECTED', 'Installation cannot finish until Netlify Database is connected.', { database: status });
      const result = await finishInstall(parseBody(event));
      return ok(result);
    }
    if (method === 'GET' && (path === '/api/install/integration-status' || path === '/api/system/integration-status')) {
      return ok({ integrations: getIntegrationStatus(), message: 'These integrations can be configured later in System Center.' });
    }
    if (method === 'GET' && path === '/api/dashboard/bootstrap') {
      return ok(await dashboardBootstrap());
    }
    if (method === 'POST' && path === '/api/files/upload') {
      const body = parseBody(event);
      await query(`insert into uploaded_files(file_name,mime_type,file_size,category,data_base64) values($1,$2,$3,$4,$5)`, [body.fileName || 'upload', body.mimeType || 'application/octet-stream', Number(body.fileSize || 0), body.category || 'general', body.dataBase64 || '']);
      return ok({ uploaded: true });
    }
    return fail(404, 'NOT_FOUND', `No API route for ${method} ${path}`);
  });
}
