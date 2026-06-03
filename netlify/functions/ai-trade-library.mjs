import { json, loadDatabase } from './auth-utils.mjs';
export default async (request) => {
  if (request.method !== 'GET') return json(405, { ok: false, message: 'Method not allowed.' });
  try {
    const db = await loadDatabase();
    const rows = await db.sql`select trade, library from trade_intelligence_categories order by trade`;
    return json(200, { ok: true, trades: rows });
  } catch {
    return json(200, { ok: true, trades: [] });
  }
};
