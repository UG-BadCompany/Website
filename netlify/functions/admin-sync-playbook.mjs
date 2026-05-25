import { getSessionToken, hashToken, json, loadDatabase } from './auth-utils.mjs';
import { sync } from '../../scripts/import-estimate-playbook.mjs';

const asRows = (result) => (Array.isArray(result) ? result : (Array.isArray(result?.rows) ? result.rows : []));

const requireAdmin = async (db, request) => {
  const sessionToken = getSessionToken(request);
  if (!sessionToken) return { ok: false, response: json(401, { ok: false, message: 'Sign in required.' }) };
  const [session] = asRows(await db.sql`select user_id, expires_at from auth_sessions where token_hash = ${hashToken(sessionToken)} and revoked_at is null and expires_at > now() limit 1`);
  if (!session) return { ok: false, response: json(401, { ok: false, message: 'Session expired.' }) };
  const roles = asRows(await db.sql`select r.key from user_roles ur join roles r on r.id = ur.role_id where ur.user_id = ${session.user_id}`);
  if (!roles.some((r) => r.key === 'admin')) return { ok: false, response: json(403, { ok: false, message: 'Admin role required.' }) };
  return { ok: true };
};

const loadSyncStatus = async (db, sheetKey) => {
  const rows = asRows(await db.sql`
    select source_gid, source_tab, count(*)::int as rows, max(updated_at) as last_updated
    from estimate_playbook_entries
    where sheet_key = ${sheetKey}
    group by source_gid, source_tab
    order by source_tab asc
  `);
  const total = rows.reduce((sum, row) => sum + Number(row.rows || 0), 0);
  return { rows, total };
};

export default async (request) => {
  if (request.method !== 'POST' && request.method !== 'GET') return json(405, { ok: false, message: 'Method not allowed.' });
  try {
    const db = await loadDatabase();
    const auth = await requireAdmin(db, request);
    if (!auth.ok) return auth.response;

    if (request.method === 'GET') {
      const sheetKey = process.env.ESTIMATOR_PLAYBOOK_SHEET_KEY || '1ndbMbAbD2R4LmB9PUspQsM3eyCyx6QdTiB4Iy36lE-U';
      const status = await loadSyncStatus(db, sheetKey);
      return json(200, { ok: true, sheetKey, synced: status.rows, totalRows: status.total });
    }

    const synced = await sync({ db, failFast: false });
    const status = await loadSyncStatus(db, synced.sheetKey);
    return json(200, {
      ok: true,
      message: 'Playbook sync completed from Google Sheets.',
      synced,
      database: { totalRows: status.total, byTab: status.rows },
    });
  } catch (error) {
    console.error('Playbook sync failed', error);
    return json(500, { ok: false, message: error?.message || 'Sync failed.' });
  }
};

export const config = { path: '/api/admin/sync-playbook' };
