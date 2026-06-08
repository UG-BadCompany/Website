export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    ...options,
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  });
  const payload = await response.json().catch(() => ({ ok: false, error: 'Invalid JSON response from API.' }));
  if (!response.ok || payload.ok === false) {
    const error = new Error(payload.error || 'API request failed.');
    error.payload = payload;
    throw error;
  }
  return payload;
}
