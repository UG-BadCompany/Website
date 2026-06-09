import { Resend } from 'resend';
import { json, ok, fail, safe, parseBody } from './lib/response.mjs';
import { databaseStatus, databaseRuntimeDiagnostics, bootstrapSchema, getDraft, saveDraft, finishInstall, dashboardBootstrap, query, createMagicLoginToken, verifyMagicLoginToken, getSessionFromToken, revokeSessionToken } from './lib/db.mjs';
import { getIntegrationStatus } from './lib/integrations.mjs';

function bearerToken(event) {
  const header = event.headers?.authorization || event.headers?.Authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

function siteUrlFromEvent() {
  return process.env.SITE_URL.replace(/\/$/, '');
}

function requiredMagicEmailConfiguration() {
  const required = ['RESEND_API_KEY', 'MAGIC_LINK_FROM_EMAIL', 'SITE_URL'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    console.error('Missing magic email configuration', { missing });
    for (const name of missing) console.error(`Missing magic email configuration variable: ${name}`);
    return { ok: false, missing };
  }
  return { ok: true, missing: [] };
}

function stringifyError(error) {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  try { return JSON.stringify(error); }
  catch (stringifyFailure) { console.error('Failed to stringify error', stringifyFailure); return String(error); }
}

function fromEmailDomain(fromEmail='') {
  const match = String(fromEmail).toLowerCase().match(/@([^>\s]+)>?$/);
  return match?.[1]?.replace(/>$/, '') || '';
}

async function verifyResendFromDomain(resend) {
  const fromDomain = fromEmailDomain(process.env.MAGIC_LINK_FROM_EMAIL);

  if (!fromDomain) {
    throw new Error('MAGIC_LINK_FROM_EMAIL must include a valid email domain');
  }

  const result = await resend.domains.list();

  if (result?.error) {
    throw new Error(`Resend domain verification failed: ${stringifyError(result.error)}`);
  }

  const domains = Array.isArray(result?.data?.data)
    ? result.data.data
    : Array.isArray(result?.data)
      ? result.data
      : [];

  const sendingDomain = domains.find((domain) => {
    const sameDomain = String(domain.name || '').toLowerCase() === fromDomain;
    const sendingEnabled = domain.capabilities?.sending === 'enabled';
    const fullyVerified = domain.status === 'verified';

    return sameDomain && (fullyVerified || sendingEnabled);
  });

  if (!sendingDomain) {
    throw new Error(
      `Resend domain ${fromDomain} is not enabled for sending or does not match MAGIC_LINK_FROM_EMAIL`
    );
  }

  console.log('Resend from domain sending enabled', {
    domain: fromDomain,
    status: sendingDomain.status,
    sending: sendingDomain.capabilities?.sending,
    receiving: sendingDomain.capabilities?.receiving
  });
}

async function sendMagicLinkEmail({ email, loginUrl }) {
  console.log('Sending magic email to', email);
  console.log('Magic login URL', loginUrl);
  console.log('Magic email send attempted', { to: email, from: process.env.MAGIC_LINK_FROM_EMAIL });
  const resend = new Resend(process.env.RESEND_API_KEY);
  await verifyResendFromDomain(resend);
  const result = await resend.emails.send({
    from: process.env.MAGIC_LINK_FROM_EMAIL,
    to: email,
    subject: 'Your Login Link',
    html: `<a href="${loginUrl}">Login</a>`
  });
  if (result?.error) {
    const error = new Error(stringifyError(result.error));
    error.cause = result.error;
    throw error;
  }
  console.log('Magic email sent successfully');
  return result?.data || result;
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
      const config = requiredMagicEmailConfiguration();
      if (!config.ok) return json(200, { ok: false, code: 'MISSING_EMAIL_CONFIGURATION' });
      const body = parseBody(event);
      const email = String(body.email || '').trim().toLowerCase();
      const created = await createMagicLoginToken(email, { ip: event.headers?.['x-forwarded-for'] || null, userAgent: event.headers?.['user-agent'] || null });
      if (!created) {
        console.error('Magic token not created', { email });
        return json(200, { ok: false, emailSent: false, error: 'No active user found for email' });
      }
      console.log('Magic token created', created.user.id);
      const callback = new URL('/auth/callback', siteUrlFromEvent());
      callback.searchParams.set('token', created.token);
      const loginUrl = callback.toString();
      try {
        await sendMagicLinkEmail({ email: created.user.email, loginUrl });
        return json(200, { ok: true, emailSent: true });
      } catch (error) {
        console.error('Magic email failed', error);
        return json(200, { ok: false, emailSent: false, error: stringifyError(error) });
      }
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
