import {
  getPermissionKeysForRoles,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  loadRolePermissionKeys,
} from './auth-utils.mjs';

const n = (value) => Number(value || 0);

const loadSession = async (db, sessionToken) => {
  const [session] = await db.sql`
    select auth_sessions.id, app_users.id as user_id, app_users.email, app_users.full_name
    from auth_sessions
    join app_users on app_users.id = auth_sessions.user_id
    where auth_sessions.session_hash = ${hashToken(sessionToken)}
      and auth_sessions.revoked_at is null
      and auth_sessions.expires_at > now()
      and app_users.is_active = true
    limit 1
  `;

  if (!session) return null;
  await db.sql`update auth_sessions set last_seen_at = now() where id = ${session.id}`;
  return session;
};

const loadAccess = async (db, userId) => {
  const roles = await db.sql`
    select roles.key
    from user_roles
    join roles on roles.id = user_roles.role_id
    where user_roles.user_id = ${userId}
    order by roles.key
  `;
  const roleKeys = roles.map((role) => role.key);
  const assignedPermissionKeys = await loadRolePermissionKeys(db, userId, {
    logPrefix: 'Failed to load executive dashboard permissions; using role defaults',
  });

  return {
    roleKeys,
    permissionKeys: getPermissionKeysForRoles(roleKeys, assignedPermissionKeys),
  };
};

export default async (request) => {
  if (request.method !== 'GET') return json(405, { ok: false, message: 'Method not allowed.' });

  const sessionToken = getSessionToken(request);
  if (!sessionToken) return json(401, { ok: false, authenticated: false, message: 'Sign in with an admin account.' });

  try {
    const db = await loadDatabase();
    const session = await loadSession(db, sessionToken);
    if (!session) return json(401, { ok: false, authenticated: false, message: 'Session expired.' });

    const { roleKeys, permissionKeys } = await loadAccess(db, session.user_id);
    if (!roleKeys.includes('admin') && !permissionKeys.includes('admin.activity.view')) {
      return json(403, { ok: false, authenticated: true, authorized: false, message: 'Admin dashboard access is required.' });
    }

    const [
      [requests],
      [quotes],
      [workOrders],
      [invoices],
      [inventory],
      [activity],
    ] = await Promise.all([
      db.sql`
        select
          count(*) filter (where status = 'new')::int as new_count,
          count(*) filter (where status in ('needs_review','quote_in_progress'))::int as estimate_count,
          count(*) filter (where status = 'quote_sent')::int as quote_sent_count,
          count(*) filter (where status = 'accepted')::int as accepted_count,
          count(*) filter (where status in ('scheduled','in_progress','pending_review'))::int as active_count,
          count(*) filter (where status = 'completed')::int as completed_count
        from job_requests
      `,
      db.sql`
        select
          count(*) filter (where status = 'draft')::int as draft_count,
          count(*) filter (where status = 'sent')::int as sent_count,
          count(*) filter (where status = 'accepted')::int as accepted_count,
          coalesce(sum(amount_cents) filter (where status in ('sent','accepted')), 0)::bigint as quoted_amount_cents
        from quotes
      `,
      db.sql`
        select
          count(*) filter (where status = 'assigned')::int as assigned_count,
          count(*) filter (where status = 'accepted')::int as worker_accepted_count,
          count(*) filter (where status = 'in_progress')::int as in_progress_count,
          count(*) filter (where status = 'blocked')::int as blocked_count,
          count(*) filter (where status = 'completed')::int as completed_count
        from worker_assignments
      `,
      db.sql`
        select
          count(*) filter (where status = 'open')::int as open_count,
          count(*) filter (where status = 'paid')::int as paid_count,
          coalesce(sum(amount_cents) filter (where status = 'open'), 0)::bigint as open_amount_cents,
          coalesce(sum(amount_cents) filter (where status = 'paid'), 0)::bigint as paid_amount_cents,
          count(*) filter (where status = 'open' and due_at is not null and due_at < now())::int as overdue_count
        from invoices
      `,
      db.sql`
        select
          count(*) filter (where is_active = true and quantity_on_hand <= reorder_point)::int as low_stock_count,
          count(*) filter (where is_active = true)::int as active_items
        from inventory_items
      `,
      db.sql`
        select count(*)::int as events_24h
        from audit_events
        where created_at >= now() - interval '24 hours'
      `,
    ]);

    const alerts = [];
    if (n(requests.new_count) > 0) alerts.push({ severity: 'warn', label: 'New requests', message: `${requests.new_count} new request(s) need intake review.` });
    if (n(quotes.draft_count) > 0) alerts.push({ severity: 'warn', label: 'Draft estimates', message: `${quotes.draft_count} estimate draft(s) are waiting for review.` });
    if (n(workOrders.blocked_count) > 0) alerts.push({ severity: 'hot', label: 'Blocked work', message: `${workOrders.blocked_count} worker assignment(s) are blocked.` });
    if (n(invoices.overdue_count) > 0) alerts.push({ severity: 'hot', label: 'Overdue invoices', message: `${invoices.overdue_count} invoice(s) are overdue.` });
    if (n(inventory.low_stock_count) > 0) alerts.push({ severity: 'warn', label: 'Low stock', message: `${inventory.low_stock_count} inventory item(s) are at/below reorder point.` });
    if (!alerts.length) alerts.push({ severity: 'good', label: 'Healthy', message: 'No urgent dashboard alerts found.' });

    const conversion = {
      requestToQuoteSent: n(requests.new_count) + n(requests.estimate_count) + n(requests.quote_sent_count) + n(requests.accepted_count) + n(requests.active_count) + n(requests.completed_count) > 0
        ? Math.round((n(requests.quote_sent_count) + n(requests.accepted_count) + n(requests.active_count) + n(requests.completed_count)) / (n(requests.new_count) + n(requests.estimate_count) + n(requests.quote_sent_count) + n(requests.accepted_count) + n(requests.active_count) + n(requests.completed_count)) * 100)
        : 0,
      quoteAccepted: n(quotes.sent_count) + n(quotes.accepted_count) > 0
        ? Math.round(n(quotes.accepted_count) / (n(quotes.sent_count) + n(quotes.accepted_count)) * 100)
        : 0,
      paidVsOpen: n(invoices.open_amount_cents) + n(invoices.paid_amount_cents) > 0
        ? Math.round(n(invoices.paid_amount_cents) / (n(invoices.open_amount_cents) + n(invoices.paid_amount_cents)) * 100)
        : 0,
    };

    return json(200, {
      ok: true,
      authenticated: true,
      authorized: true,
      user: {
        id: session.user_id,
        email: session.email,
        fullName: session.full_name,
        roles: roleKeys,
      },
      stats: {
        requests,
        quotes: {
          ...quotes,
          quoted_amount_cents: Number(quotes.quoted_amount_cents || 0),
        },
        workOrders,
        invoices: {
          ...invoices,
          open_amount_cents: Number(invoices.open_amount_cents || 0),
          paid_amount_cents: Number(invoices.paid_amount_cents || 0),
        },
        inventory,
        activity,
        conversion,
      },
      alerts,
      recommendations: [
        'Review estimate drafts before sending to customers.',
        'Move accepted quotes into scheduled work orders quickly.',
        'Use worker blocked status to trigger admin support.',
        'Create Square checkout links before sending invoices.',
        'Review low-stock parts before dispatching jobs.',
      ],
    });
  } catch (error) {
    console.error('Failed to load executive dashboard overview', error);
    return json(500, { ok: false, message: 'Could not load executive dashboard overview.' });
  }
};

export const config = {
  path: '/api/admin/executive-overview',
};
