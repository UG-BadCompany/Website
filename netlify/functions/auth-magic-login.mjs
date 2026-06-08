import crypto from 'node:crypto';
import { json, readStore, writeStore } from './shared/data-store.mjs';
const normalizedEmail = (email = '') => String(email).trim().toLowerCase();
export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, message: 'Method not allowed.' });
  const { email } = event.body ? JSON.parse(event.body) : {};
  const normalized = normalizedEmail(email);
  if (!normalized) return json(422, { ok: false, message: 'Email is required.' });
  const store = await readStore();
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  store.magic_tokens.push({ id: tokenHash, email: normalized, token_hash: tokenHash, used_at: null, expires_at: new Date(Date.now() + 1000 * 60 * 30).toISOString(), created_at: new Date().toISOString() });
  await writeStore(store);
  const emailConfigured = Boolean(process.env.RESEND_API_KEY && process.env.MAGIC_LINK_FROM_EMAIL);
  return json(200, { ok: true, emailConfigured, message: emailConfigured ? 'Magic link sent.' : 'Email not configured yet.', setupMode: !emailConfigured, devLoginPath: emailConfigured ? undefined : `/login/?token=${token}` });
}
