// public/assets/dashboard-phase23-customer-experience.js
// Phase 23: customer-facing portal polish.

(() => {
  const root = document.querySelector('[data-dashboard-root]');
  if (!root || window.__taCustomerExperiencePhase23Loaded) return;
  window.__taCustomerExperiencePhase23Loaded = true;

  const fetchJson = async (url) => {
    const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin', headers: { accept: 'application/json' } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.message || `Request failed: ${url}`);
    return data;
  };

  const money = (cents) => `$${(Number(cents || 0) / 100).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));

  const friendlyStatus = (status = '') => {
    const map = {
      new: 'Request received',
      needs_review: 'Being reviewed',
      quote_in_progress: 'Estimate being prepared',
      quote_sent: 'Quote ready',
      accepted: 'Approved',
      scheduled: 'Scheduled',
      in_progress: 'Work in progress',
      pending_review: 'Final review',
      completed: 'Completed',
      cancelled: 'Cancelled',
      draft: 'Preparing quote',
      sent: 'Quote ready',
      paid: 'Paid',
      open: 'Payment due',
    };
    return map[status] || String(status || 'In review').replaceAll('_', ' ');
  };

  const mount = () => {
    if (document.querySelector('[data-phase23-customer-experience]')) return;
    const after = document.querySelector('[data-phase12-client-worker]') ||
      document.querySelector('[data-phase4-finance-suite]') ||
      root.firstElementChild;

    const section = document.createElement('section');
    section.className = 'customer-experience-suite';
    section.dataset.phase23CustomerExperience = 'true';
    section.id = 'customer-experience-center';
    section.innerHTML = `
      <section class="customer-experience-panel">
        <span class="eyebrow">Customer Experience</span>
        <h2>Client status center</h2>
        <p>Simple customer-friendly view of requests, quotes, payments, and what happens next.</p>

        <div class="customer-kpi-row">
          <div class="customer-kpi"><span>Requests</span><strong data-cx-requests>—</strong></div>
          <div class="customer-kpi"><span>Quotes</span><strong data-cx-quotes>—</strong></div>
          <div class="customer-kpi"><span>Open invoices</span><strong data-cx-open-invoices>—</strong></div>
          <div class="customer-kpi"><span>Next action</span><strong data-cx-action-count>—</strong></div>
        </div>

        <div class="customer-status-grid">
          <article class="customer-next-step-card">
            <h3>Next best step</h3>
            <p data-cx-next-step>Loading customer status…</p>
            <div class="customer-action-row">
              <a class="btn btn-primary" href="/#estimate">New Request Estimate</a>
              <a class="btn btn-soft" href="#client-quotes">View Quotes</a>
              <a class="btn btn-soft" href="#client-invoices">View Invoices</a>
            </div>
          </article>

          <article class="customer-update-card">
            <h3>Typical job timeline</h3>
            <div class="customer-timeline">
              <div class="customer-timeline-step" data-state="done"><div class="customer-step-dot">1</div><div><strong>Request received</strong><span>We collect details, photos, property, and scope.</span></div></div>
              <div class="customer-timeline-step" data-state="active"><div class="customer-step-dot">2</div><div><strong>Estimate review</strong><span>Admin verifies price, materials, risk, and schedule.</span></div></div>
              <div class="customer-timeline-step"><div class="customer-step-dot">3</div><div><strong>Quote approval</strong><span>You accept, decline, or ask a question.</span></div></div>
              <div class="customer-timeline-step"><div class="customer-step-dot">4</div><div><strong>Work scheduled</strong><span>A worker is assigned and the job moves forward.</span></div></div>
              <div class="customer-timeline-step"><div class="customer-step-dot">5</div><div><strong>Invoice and receipt</strong><span>Payment status and receipts stay in your portal.</span></div></div>
            </div>
          </article>
        </div>

        <div class="customer-update-card" style="margin-top:16px">
          <h3>Latest customer update</h3>
          <p data-cx-latest-update>Loading latest update…</p>
        </div>
      </section>
    `;

    after.parentNode.insertBefore(section, after.nextSibling);
  };

  const loadCustomerExperience = async () => {
    const set = (selector, value) => {
      const el = document.querySelector(selector);
      if (el) el.textContent = value;
    };

    try {
      const [requestsResult, quotesResult, invoicesResult] = await Promise.allSettled([
        fetchJson('/api/client/job-requests'),
        fetchJson('/api/client/quotes'),
        fetchJson('/api/client/invoices'),
      ]);

      const requests = requestsResult.status === 'fulfilled' ? (requestsResult.value.requests || requestsResult.value.jobRequests || []) : [];
      const quotes = quotesResult.status === 'fulfilled' ? (quotesResult.value.quotes || []) : [];
      const invoices = invoicesResult.status === 'fulfilled' ? (invoicesResult.value.invoices || []) : [];
      const openInvoices = invoices.filter((invoice) => invoice.status === 'open');
      const readyQuotes = quotes.filter((quote) => ['sent', 'viewed'].includes(quote.status));
      const activeRequests = requests.filter((request) => !['completed', 'cancelled'].includes(request.status));

      const actionCount = openInvoices.length + readyQuotes.length;

      set('[data-cx-requests]', String(requests.length));
      set('[data-cx-quotes]', String(quotes.length));
      set('[data-cx-open-invoices]', String(openInvoices.length));
      set('[data-cx-action-count]', String(actionCount));

      let next = 'Submit a Request Estimate when you are ready for new work.';
      if (openInvoices[0]) next = `Payment due: ${openInvoices[0].title || 'Open invoice'} ${openInvoices[0].amountCents ? `for ${money(openInvoices[0].amountCents)}` : ''}.`;
      else if (readyQuotes[0]) next = `Quote ready for review: ${readyQuotes[0].title || 'Your quote'}.`;
      else if (activeRequests[0]) next = `Current status: ${friendlyStatus(activeRequests[0].status)} for ${activeRequests[0].serviceType || activeRequests[0].service || 'your request'}.`;

      set('[data-cx-next-step]', next);

      const latest = openInvoices[0] || readyQuotes[0] || activeRequests[0] || requests[0];
      set('[data-cx-latest-update]', latest
        ? `${friendlyStatus(latest.status)} — ${escapeHtml(latest.title || latest.serviceType || latest.service || 'Latest item')}`
        : 'No active customer updates yet.');
    } catch (error) {
      set('[data-cx-next-step]', 'Customer status loads after sign-in.');
      set('[data-cx-latest-update]', 'Sign in to see requests, quotes, invoices, and updates.');
    }
  };

  mount();
  setTimeout(loadCustomerExperience, 1400);
  window.addEventListener('ta:dashboard-refresh', loadCustomerExperience);
})();
