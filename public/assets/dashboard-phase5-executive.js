// public/assets/dashboard-phase5-executive.js
// Phase 5: executive owner dashboard overlay.

(() => {
  const root = document.querySelector('[data-dashboard-root]');
  if (!root || window.__taDashboardPhase5Loaded) return;
  window.__taDashboardPhase5Loaded = true;

  const money = (cents) => `$${(Number(cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));

  const fetchJson = async (url, options = {}) => {
    const response = await fetch(url, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { accept: 'application/json', ...(options.headers || {}) },
      ...options,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) throw new Error(result.message || `Request failed: ${url}`);
    return result;
  };

  const mount = () => {
    if (document.querySelector('[data-phase5-executive-suite]')) return;

    const phase4 = document.querySelector('[data-phase4-finance-suite]');
    const phase3 = document.querySelector('[data-phase3-workflow-suite]');
    const phase2 = document.querySelector('[data-phase2-command-center]');
    const after = phase4 || phase3 || phase2 || root.querySelector('.hero') || root.firstElementChild;

    const suite = document.createElement('section');
    suite.className = 'executive-suite';
    suite.dataset.phase5ExecutiveSuite = 'true';
    suite.innerHTML = `
      <section class="executive-panel" id="executive-overview">
        <div class="executive-header">
          <div>
            <span class="eyebrow">Owner View</span>
            <h2>Business health snapshot</h2>
            <p>One place to see requests, estimates, work orders, payments, inventory risk, and the next best actions.</p>
          </div>
          <div class="executive-actions">
            <button class="btn btn-primary" type="button" data-executive-refresh>Refresh owner view</button>
            <a class="btn btn-soft" href="#estimate-review">Estimate review</a>
            <a class="btn btn-soft" href="#finance-command-center">Finance</a>
          </div>
        </div>

        <div class="executive-kpi-grid">
          <div class="executive-kpi"><span>New requests</span><strong data-exec-new-requests>—</strong></div>
          <div class="executive-kpi"><span>Draft estimates</span><strong data-exec-drafts>—</strong></div>
          <div class="executive-kpi"><span>Active work</span><strong data-exec-active-work>—</strong></div>
          <div class="executive-kpi"><span>Blocked jobs</span><strong data-exec-blocked>—</strong></div>
          <div class="executive-kpi"><span>Open money</span><strong data-exec-open-money>—</strong></div>
          <div class="executive-kpi"><span>Paid money</span><strong data-exec-paid-money>—</strong></div>
        </div>

        <div class="executive-grid">
          <section class="executive-card">
            <h3>Health alerts</h3>
            <p class="session-status" data-exec-status>Loading owner view…</p>
            <div class="executive-alert-list" data-exec-alerts></div>
          </section>

          <section class="executive-card">
            <h3>Operational score</h3>
            <div class="executive-score">
              <strong data-exec-score-label>—</strong>
              <div class="score-bar"><span data-exec-score-bar></span></div>
              <p data-exec-score-note>Loading score…</p>
            </div>
            <h3 style="margin-top:18px">Next best actions</h3>
            <div class="executive-action-list" data-exec-actions></div>
          </section>
        </div>
      </section>
    `;

    after.parentNode.insertBefore(suite, after.nextSibling);

    suite.querySelector('[data-executive-refresh]')?.addEventListener('click', loadExecutiveOverview);
  };

  const calcScore = (stats = {}) => {
    let score = 90;
    const requests = stats.requests || {};
    const quotes = stats.quotes || {};
    const work = stats.workOrders || {};
    const invoices = stats.invoices || {};
    const inventory = stats.inventory || {};

    score -= Math.min(15, Number(requests.new_count || 0) * 3);
    score -= Math.min(15, Number(quotes.draft_count || 0) * 3);
    score -= Math.min(18, Number(work.blocked_count || 0) * 6);
    score -= Math.min(18, Number(invoices.overdue_count || 0) * 6);
    score -= Math.min(10, Number(inventory.low_stock_count || 0) * 2);

    return Math.max(50, Math.min(97, score));
  };

  const renderExecutive = (result) => {
    const stats = result.stats || {};
    const requests = stats.requests || {};
    const quotes = stats.quotes || {};
    const work = stats.workOrders || {};
    const invoices = stats.invoices || {};
    const conversion = stats.conversion || {};

    const setText = (selector, value) => {
      const el = document.querySelector(selector);
      if (el) el.textContent = value;
    };

    setText('[data-exec-new-requests]', String(requests.new_count ?? 0));
    setText('[data-exec-drafts]', String(quotes.draft_count ?? 0));
    setText('[data-exec-active-work]', String(requests.active_count ?? 0));
    setText('[data-exec-blocked]', String(work.blocked_count ?? 0));
    setText('[data-exec-open-money]', money(invoices.open_amount_cents || 0));
    setText('[data-exec-paid-money]', money(invoices.paid_amount_cents || 0));

    const status = document.querySelector('[data-exec-status]');
    if (status) status.textContent = 'Owner view loaded.';

    const alerts = document.querySelector('[data-exec-alerts]');
    if (alerts) {
      alerts.innerHTML = (result.alerts || []).map((alert) => `
        <article class="executive-alert ${escapeHtml(alert.severity || 'warn')}">
          <strong>${escapeHtml(alert.label)}</strong>
          <span>${escapeHtml(alert.message)}</span>
        </article>
      `).join('');
    }

    const score = calcScore(stats);
    setText('[data-exec-score-label]', `${score}/100 dashboard health`);
    const bar = document.querySelector('[data-exec-score-bar]');
    if (bar) bar.style.width = `${score}%`;

    const note = document.querySelector('[data-exec-score-note]');
    if (note) {
      note.textContent = `Conversion: request-to-quote ${conversion.requestToQuoteSent || 0}%, quote accepted ${conversion.quoteAccepted || 0}%, paid vs open ${conversion.paidVsOpen || 0}%.`;
    }

    const actions = document.querySelector('[data-exec-actions]');
    if (actions) {
      const recs = result.recommendations || [];
      actions.innerHTML = recs.map((item, index) => `
        <article class="executive-action">
          <strong>Action ${index + 1}</strong>
          <span>${escapeHtml(item)}</span>
        </article>
      `).join('');
    }
  };

  const loadExecutiveOverview = async () => {
    const status = document.querySelector('[data-exec-status]');
    if (status) status.textContent = 'Loading owner view…';

    try {
      const result = await fetchJson('/api/admin/executive-overview');
      renderExecutive(result);
    } catch (error) {
      if (status) status.textContent = error.message || 'Could not load owner view.';
      const alerts = document.querySelector('[data-exec-alerts]');
      if (alerts) alerts.innerHTML = '<article class="executive-alert warn"><strong>Admin access needed</strong><span>Owner view requires an admin session.</span></article>';
    }
  };

  mount();

  document.querySelectorAll('[data-executive-refresh]').forEach((button) => {
    button.addEventListener('click', loadExecutiveOverview);
  });

  window.addEventListener('ta:dashboard-refresh', loadExecutiveOverview);
  setTimeout(loadExecutiveOverview, 1600);
})();
