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

export default async (request) => {
  if (request.method !== 'POST') return json(405, { ok: false, message: 'Method not allowed.' });
  try {
    const db = await loadDatabase();
    const auth = await requireAdmin(db, request);
    if (!auth.ok) return auth.response;
    const synced = await sync({ db });
    const [countRow] = asRows(await db.sql`select count(*)::int as count from estimate_playbook_entries where sheet_key = ${synced.sheetKey}`);
    return json(200, {
      ok: true,
      message: 'Playbook sync completed from Google Sheets.',
      synced,
      databaseRowCount: Number(countRow?.count || 0),
    });
  } catch (error) {
    console.error('Playbook sync failed', error);
    return json(500, { ok: false, message: error?.message || 'Sync failed.' });
  }
};

export const config = { path: '/api/admin/sync-playbook' };
