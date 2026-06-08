import crypto from 'node:crypto';
import { json, readStore, writeStore } from './shared/data-store.mjs';
export async function handler(event) {
  const token = event.queryStringParameters?.token || (event.body ? JSON.parse(event.body).token : '');
  const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
  const store = await readStore();
  const record = store.magic_tokens.find((item) => item.token_hash === tokenHash);
  if (!record || record.used_at || new Date(record.expires_at) < new Date()) return json(401, { ok: false, message: 'This magic link is invalid or expired.' });
  record.used_at = new Date().toISOString();
  const user = store.app_users.find((item) => item.normalized_email === record.email) || { email: record.email, role: 'client', needsSetup: true };
  await writeStore(store);
  return json(200, { ok: true, user, redirectTo: user.needsSetup ? '/login/?setup=1' : '/dashboard/' });
}
