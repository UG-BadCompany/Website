export async function api(path, options = {}) {
  try {
    const response = await fetch(path, { headers: { 'content-type': 'application/json', ...(options.headers || {}) }, ...options });
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 0, data: { ok: false, error: 'network_error', message: error.message } };
  }
}
export function safeText(value, fallback='') { return typeof value === 'string' ? value : fallback; }
