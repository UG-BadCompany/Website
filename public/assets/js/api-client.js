(() => {
  const inflight = new Map();
  const invalidateConfig = () => {
    window.TACompany?.invalidatePublicConfig?.();
    window.TACompany?.loadPublicConfig?.({ force: true, refreshOnly: true }).catch(() => {});
  };
  const shouldRefreshConfig = (path, method) => method !== 'GET' && /company-settings|homepage-settings|homepage-gallery/.test(String(path));
  window.TAApi = {
    async request(path, { method = 'GET', body, headers = {} } = {}) {
      const key = method === 'GET' ? String(path) : '';
      if (key && inflight.has(key)) return inflight.get(key);
      const run = (async () => {
        const res = await fetch(path, { method, headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined, credentials: 'include' });
        let data = {};
        try { data = await res.json(); } catch {}
        if (!res.ok) throw Object.assign(new Error(data.message || 'Request failed'), { status: res.status, data });
        if (shouldRefreshConfig(path, method)) {
          document.dispatchEvent(new CustomEvent(path.includes('homepage') ? 'homepage-settings:updated' : 'company-settings:updated', { detail: data }));
          if (path.includes('company-settings')) document.dispatchEvent(new CustomEvent('theme:updated', { detail: data }));
          invalidateConfig();
        }
        return data;
      })();
      if (key) inflight.set(key, run.finally(() => inflight.delete(key)));
      return run;
    },
    withQuery(path, params = {}) { const url = new URL(path, location.origin); Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value); }); return `${url.pathname}${url.search}`; },
    get(p, params) { return this.request(params ? this.withQuery(p, params) : p); },
    post(p, b) { return this.request(p, { method: 'POST', body: b }); },
    patch(p, b) { return this.request(p, { method: 'PATCH', body: b }); },
    delete(p, b) { return this.request(p, { method: 'DELETE', body: b }); },
  };
})();
