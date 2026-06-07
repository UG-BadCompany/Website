export function json(statusCode, body, extraHeaders={}) {
  return { statusCode, headers: { 'Content-Type':'application/json', 'Cache-Control':'no-store', ...extraHeaders }, body: JSON.stringify(body) };
}
export function safeParse(raw, fallback={}) { try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
export function getPath(event) { return event.rawUrl ? new URL(event.rawUrl).pathname : event.path; }
export function originFromEvent(event) { const h=event.headers||{}; return h.origin || `${h['x-forwarded-proto']||'https'}://${h.host||process.env.URL||'localhost'}`; }
export function requireMethod(event, methods){ return methods.includes(event.httpMethod) ? null : json(405,{ok:false,code:'METHOD_NOT_ALLOWED',message:`Use ${methods.join(', ')}`}); }
export function normalizeEmail(email=''){ return String(email).trim().toLowerCase(); }
export function lastFour(value=''){ const s=String(value); return s ? s.slice(-4) : undefined; }
export function currentUser(event){ const h=event.headers||{}; return { id:h['x-user-id']||'owner-dev', email:normalizeEmail(h['x-user-email']||'owner@example.local'), role:h['x-user-role']||'owner', name:h['x-user-name']||'Owner' }; }
export function isOwner(user){ return user?.role === 'owner' || (user?.roles||[]).includes('owner'); }
