// Phase 58: premium mobile SaaS dashboard enhancements.
(() => {
  if (window.__taMobileSaasOverhaulLoaded) return;
  window.__taMobileSaasOverhaulLoaded = true;

  const greeting = document.querySelector('[data-mobile-greeting]');
  if (greeting) {
    const hour = new Date().getHours();
    const daypart = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    greeting.textContent = `${daypart}, welcome back`;
  }

  const metricText = (selector, fallback = '0') => document.querySelector(selector)?.textContent?.trim() || fallback;
  const updateKpis = () => {
    const values = {
      jobs: metricText('[data-worker-jobs-count], [data-active-jobs-metric], [data-open-requests-metric]', '0'),
      estimates: metricText('[data-quotes-metric]', '0'),
      invoices: metricText('[data-client-invoices-count], [data-admin-open-invoices-metric]', '0'),
      requests: metricText('[data-open-requests-metric]', '0'),
    };
    Object.entries(values).forEach(([key, value]) => {
      document.querySelectorAll(`[data-mobile-kpi="${key}"]`).forEach((node) => { node.textContent = value; });
    });
  };

  updateKpis();
  setTimeout(updateKpis, 900);
  setTimeout(updateKpis, 2200);
  try { new MutationObserver(updateKpis).observe(document.querySelector('[data-dashboard-root]') || document.body, { childList: true, subtree: true, characterData: true }); } catch {}
})();
