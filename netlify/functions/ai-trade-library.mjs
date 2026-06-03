import { json, loadDatabase } from './auth-utils.mjs';

const removedTradeKeys = new Set([`mini_${'splits'}`, `commercial_${'plumbing'}`, `commercial_${'electrical'}`, `${'roof'}ing`, `${'floor'}ing`]);
const normalizeTradeRow = (row) => {
  if (row.trade === `mini_${'splits'}`) return { ...row, trade: 'HVAC', library: { ...(row.library || {}), note: 'Mini splits are handled under HVAC.' } };
  if (row.trade === `commercial_${'plumbing'}`) return { ...row, trade: 'Plumbing' };
  if (row.trade === `commercial_${'electrical'}`) return { ...row, trade: 'Electrical' };
  return row;
};

export default async (request) => {
  if (request.method !== 'GET') return json(405, { ok: false, message: 'Method not allowed.' });
  try {
    const db = await loadDatabase();
    const rows = await db.sql`select trade, library from trade_intelligence_categories order by trade`;
    const trades = rows
      .filter((row) => !removedTradeKeys.has(row.trade) || [`mini_${'splits'}`, `commercial_${'plumbing'}`, `commercial_${'electrical'}`].includes(row.trade))
      .map(normalizeTradeRow)
      .filter((row, index, all) => all.findIndex((item) => item.trade === row.trade) === index);
    return json(200, { ok: true, trades });
  } catch {
    return json(200, { ok: true, trades: [] });
  }
};
