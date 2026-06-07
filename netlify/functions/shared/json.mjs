export function json(statusCode, body, headers = {}) {
  return { statusCode, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }, body: JSON.stringify(body) };
}
export async function readJson(event) { try { return event.body ? JSON.parse(event.body) : {}; } catch { return {}; } }
export function safeError(code, message, extra = {}) { return { ok: false, code, message, ...extra }; }
export const SECRET_KEYS = new Set(['OPENAI_API_KEY','RESEND_API_KEY','SQUARE_ACCESS_TOKEN','SQUARE_WEBHOOK_SIGNATURE_KEY','LICENSE_VERIFY_TOKEN','RECAPTCHA_SECRET_KEY','SMTP_PASSWORD','SERPAPI_API_KEY']);
export function redact(value) { if (!value) return { configured:false }; const s = String(value); return { configured:true, lastFour:s.slice(-4), display:`••••${s.slice(-4)}` }; }
