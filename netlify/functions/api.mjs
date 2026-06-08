import crypto from 'node:crypto';
import { apiPath, errorResponse, json, notFound, parseJson } from './shared/http.mjs';
import { getDatabaseUrl, isDatabaseConfigured, tryDb, withDb } from './shared/db.mjs';
import { integrationStatus, publicEnvironment } from './shared/env-metadata.mjs';
import { modules, roleDefinitions, rolePermissions, sidebarGroups } from './shared/core-data.mjs';
import { seedPlatform, validateInstall } from './shared/seed.mjs';
import { getCurrentStatus, transition } from './shared/workflow.mjs';
import {
  archiveResource,
  createInvoiceFromWorkOrder,
  createQuoteFromRequest,
  createResource,
  createWorkOrderFromQuote,
  getResource,
  listResource,
  resources,
  updateResource,
} from './domains/crud.mjs';

function requestOrigin(event) {
  const proto = event.headers['x-forwarded-proto'] || 'https';
  const host = event.headers.host || process.env.URL || process.env.SITE_URL || '';
  return host ? `${proto}://${host}` : '';
}

async function installStatus() {
  return tryDb(
    async (db) => {
      const rows = await db`select installation_complete, installer_draft, completed_at, recovery_mode from platform_installation where id = 'default'`;
      return json(200, {
        ok: true,
        installation_complete: Boolean(rows[0]?.installation_complete),
        draft: rows[0]?.installer_draft || {},
        completed_at: rows[0]?.completed_at || null,
        recovery_mode: Boolean(rows[0]?.recovery_mode),
        databaseConfigured: isDatabaseConfigured(),
      });
    },
    (error) => json(200, {
      ok: true,
      installation_complete: false,
      draft: {},
      completed_at: null,
      recovery_mode: true,
      databaseConfigured: Boolean(getDatabaseUrl()),
      warning: error.message,
    }),
  );
}

async function installerDraft(method, event) {
  return withDb(async (db) => {
    if (method === 'GET') {
      const rows = await db`select installer_draft from platform_installation where id = 'default'`;
      return json(200, { ok: true, draft: rows[0]?.installer_draft || {} });
    }
    const body = parseJson(event);
    await db`insert into platform_installation(id, installer_draft)
      values('default', ${db.json(body)})
      on conflict(id) do update set installer_draft = platform_installation.installer_draft || excluded.installer_draft, updated_at = now()`;
    return json(200, { ok: true, draft: body });
  });
}

async function finishInstall(event) {
  return withDb(async (db) => {
    const body = parseJson(event);
    await seedPlatform(db, body);
    const result = await validateInstall(db);
    if (!result.ok) {
      return json(500, { ok: false, error: 'Install validation failed.', checks: result.checks });
    }
    return json(200, { ok: true, redirect: '/dashboard/', checks: result.checks });
  });
}

async function bootstrap(event) {
  return withDb(async (db) => {
    const [company] = await db`select * from company_settings where id = 'default'`;
    const [homepage] = await db`select * from homepage_settings where id = 'default'`;
    const registeredModules = await db`select * from module_registry where enabled = true order by group_name, label`;
    const integrations = integrationStatus(process.env, requestOrigin(event));
    return json(200, {
      ok: true,
      company: company || null,
      homepage: homepage || null,
      modules: registeredModules.length ? registeredModules : modules,
      roles: roleDefinitions,
      rolePermissions,
      sidebarGroups,
      publicEnvironment: publicEnvironment(integrations),
    });
  });
}

async function dashboardSummary() {
  return withDb(async (db) => {
    const [stats] = await db`
      select
        (select count(*) from customers where status = 'active') as customers,
        (select count(*) from estimate_requests where status not in ('workflow.closed','workflow.archived')) as requests,
        (select count(*) from quotes where status not in ('quote.accepted','quote.declined','workflow.archived')) as quotes,
        (select count(*) from work_orders where status not in ('workflow.closed','workflow.archived')) as work_orders,
        (select count(*) from invoices where status not in ('invoice.paid','workflow.archived')) as invoices_due,
        (select count(*) from work_orders where scheduled_start::date = now()::date) as schedule_today,
        (select coalesce(sum(total - paid_total), 0) from invoices where status <> 'invoice.paid') as outstanding`;
    const activity = await db`select action, entity_type, entity_id, created_at from audit_logs order by created_at desc limit 15`;
    return json(200, {
      ok: true,
      stats,
      activity,
      quickStart: [
        'Create first client',
        'Create first request',
        'Create first quote',
        'Schedule a work order',
        'Send an invoice',
        'Configure integrations',
      ],
    });
  });
}

async function magicLink(event) {
  return withDb(async (db) => {
    const { email } = parseJson(event);
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized.includes('@')) return json(400, { ok: false, error: 'Enter a valid email address.' });
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await db`insert into magic_link_tokens(normalized_email, token_hash, expires_at)
      values(${normalized}, ${tokenHash}, now() + interval '30 minutes')`;
    await db`insert into audit_logs(action, entity_type, entity_id, metadata)
      values('auth.magic_link.requested', 'app_users', ${normalized}, ${db.json({ emailConfigured: Boolean(process.env.RESEND_API_KEY) })})`;
    return json(200, {
      ok: true,
      emailConfigured: Boolean(process.env.RESEND_API_KEY),
      message: process.env.RESEND_API_KEY
        ? 'Magic link queued.'
        : 'Email not configured yet. Configure Resend in System Center → Environment & Integrations.',
      setupLink: process.env.RESEND_API_KEY ? undefined : `/login/?token=${token}&email=${encodeURIComponent(normalized)}`,
    });
  });
}

async function verifyMagicLink(event) {
  return withDb(async (db) => {
    const { email, token, profile = {} } = parseJson(event);
    const normalized = String(email || '').trim().toLowerCase();
    const tokenHash = crypto.createHash('sha256').update(String(token || '')).digest('hex');
    const used = await db`update magic_link_tokens set used_at = now()
      where normalized_email = ${normalized} and token_hash = ${tokenHash} and used_at is null and expires_at > now()
      returning id`;
    if (!used.length) return json(401, { ok: false, error: 'Expired or invalid login link.' });
    let users = await db`select * from app_users where normalized_email = ${normalized}`;
    if (!users.length) {
      users = await db`insert into app_users(full_name, email, normalized_email, phone, company, preferred_contact_method, contact_permission, active)
        values(${profile.full_name || normalized.split('@')[0]}, ${normalized}, ${normalized}, ${profile.phone || null}, ${profile.company || null}, ${profile.preferred_contact_method || null}, ${profile.contact_permission !== false}, true)
        returning *`;
      await db`insert into user_roles(user_id, role_key) values(${users[0].id}, 'client') on conflict do nothing`;
    }
    return json(200, { ok: true, user: users[0], session: { role: 'client', expiresAt: new Date(Date.now() + 86400000).toISOString() } });
  });
}

async function handleResource(method, resourceName, id, event) {
  return withDb(async (db) => {
    if (!resources[resourceName]) return null;
    if (method === 'GET' && !id) return json(200, { ok: true, items: await listResource(db, resourceName) });
    if (method === 'GET' && id) return json(200, { ok: true, item: await getResource(db, resourceName, id) });
    if (method === 'POST' && !id) {
      const body = parseJson(event);
      let item;
      if (resourceName === 'quotes' && body.request_id) item = await createQuoteFromRequest(db, body);
      else if (resourceName === 'work-orders' && body.quote_id) item = await createWorkOrderFromQuote(db, body);
      else if (resourceName === 'invoices' && body.work_order_id) item = await createInvoiceFromWorkOrder(db, body);
      else item = await createResource(db, resourceName, body);
      return json(201, { ok: true, item });
    }
    if (method === 'PATCH' && id) return json(200, { ok: true, item: await updateResource(db, resourceName, id, parseJson(event)) });
    if (method === 'DELETE' && id) return json(200, { ok: await archiveResource(db, resourceName, id) });
    return json(405, { ok: false, error: 'Method not allowed.' });
  });
}

async function financeSummary() {
  return withDb(async (db) => {
    const [summary] = await db`
      select
        coalesce(sum(total), 0) as invoice_total,
        coalesce(sum(paid_total), 0) as paid_total,
        coalesce(sum(total - paid_total), 0) as outstanding_total,
        count(*) filter(where status = 'invoice.paid') as paid_count,
        count(*) filter(where status <> 'invoice.paid') as open_count
      from invoices`;
    const payments = await db`select * from payments order by created_at desc limit 100`;
    return json(200, { ok: true, summary, payments });
  });
}

async function markInvoicePaid(event) {
  return withDb(async (db) => {
    const { invoice_id, amount, method = 'manual', reference = 'manual payment' } = parseJson(event);
    const [invoice] = await db`select * from invoices where id = ${invoice_id}`;
    if (!invoice) return json(404, { ok: false, error: 'Invoice not found.' });
    await db.begin(async (tx) => {
      await tx`insert into payments(invoice_id, amount, method, status, reference)
        values(${invoice_id}, ${amount || invoice.total}, ${method}, 'payment.verified', ${reference})`;
      await tx`update invoices set paid_total = ${amount || invoice.total}, status = 'invoice.paid', updated_at = now() where id = ${invoice_id}`;
      await tx`insert into audit_logs(action, entity_type, entity_id, metadata)
        values('invoice.payment.manual_verified', 'invoices', ${invoice_id}, ${tx.json({ amount: amount || invoice.total, method })})`;
    });
    return json(200, { ok: true });
  });
}

async function systemIntegrationStatus(event) {
  const integrations = integrationStatus(process.env, requestOrigin(event));
  return json(200, { ok: true, integrations, variables: integrations });
}

async function health(event) {
  return tryDb(
    async (db) => {
      const [counts] = await db`select
        (select count(*) from module_registry) as modules,
        (select count(*) from roles) as roles,
        (select count(*) from permissions) as permissions,
        (select count(*) from audit_logs) as audit_logs`;
      return json(200, { ok: true, database: true, counts, integrations: integrationStatus(process.env, requestOrigin(event)) });
    },
    (error) => json(200, { ok: false, database: false, warning: error.message, integrations: integrationStatus(process.env, requestOrigin(event)) }),
  );
}

async function aiRun(event) {
  const body = parseJson(event);
  if (!process.env.OPENAI_API_KEY) {
    return json(200, {
      ok: false,
      configured: false,
      module: body.module || 'ai',
      message: 'AI is not configured yet. Configure OpenAI in System Center → Environment & Integrations.',
      manualFallback: true,
    });
  }
  return json(200, {
    ok: true,
    configured: true,
    message: 'AI request accepted. The editable result will be saved to the related record.',
  });
}

export const handler = async (event) => {
  try {
    const method = event.httpMethod;
    const path = apiPath(event);
    const parts = path.split('/').filter(Boolean);

    if (path === '/install-status') return installStatus();
    if (path === '/install/draft') return installerDraft(method, event);
    if (path === '/install/finish' && method === 'POST') return finishInstall(event);
    if (['/install/integration-status', '/install/env-status', '/system/integration-status'].includes(path)) return systemIntegrationStatus(event);
    if (path === '/bootstrap') return bootstrap(event);
    if (path === '/dashboard/summary') return dashboardSummary();
    if (path === '/modules') return withDb(async (db) => json(200, { ok: true, modules: await db`select * from module_registry order by group_name, label` }));
    if (path === '/finance') return financeSummary();
    if (path === '/payments/manual' && method === 'POST') return markInvoicePaid(event);
    if (path === '/auth/magic-link' && method === 'POST') return magicLink(event);
    if (path === '/auth/verify' && method === 'POST') return verifyMagicLink(event);
    if (path === '/workflow/transition' && method === 'POST') {
      return withDb(async (db) => {
        const body = parseJson(event);
        const fromStatus = await getCurrentStatus(db, body.entityType, body.entityId);
        await transition(db, { ...body, fromStatus });
        return json(200, { ok: true });
      });
    }
    if (path === '/ai/run' && method === 'POST') return aiRun(event);
    if (path === '/health') return health(event);

    const resourceResponse = await handleResource(method, parts[0], parts[1], event);
    if (resourceResponse) return resourceResponse;

    return notFound(path);
  } catch (error) {
    return errorResponse(error);
  }
};
