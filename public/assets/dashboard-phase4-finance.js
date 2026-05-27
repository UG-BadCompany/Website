// Phase 40 finance invoice fix
// public/assets/dashboard-phase4-finance.js
// Phase 4: invoice/payment command center for admin and clearer client payment experience.

(() => {
  const root = document.querySelector('[data-dashboard-root]');
  if (!root || window.__taDashboardPhase4Loaded) return;
  window.__taDashboardPhase4Loaded = true;

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

  // Phase 38 finance fix
const mount = () => {
  const safeInvoices = Array.isArray(window.__taFinanceInvoices)
    ? window.__taFinanceInvoices
    : [];

    if (document.querySelector('[data-phase4-finance-suite]')) return;

    const phase3 = document.querySelector('[data-phase3-workflow-suite]');
    const phase2 = document.querySelector('[data-phase2-command-center]');
    const after = phase3 || phase2 || root.querySelector('.hero') || root.firstElementChild;

    const suite = document.createElement('section');
    suite.className = 'finance-suite';
    suite.dataset.phase4FinanceSuite = 'true';
    suite.innerHTML = `
      <section class="finance-command-panel" id="finance-command-center">
        <span class="eyebrow">Financial Command Center</span>
        <h2>Invoices, payments, Square links, and closeout.</h2>
        <p>Admin can track open money, paid revenue, overdue invoices, missing checkout links, and payment readiness without digging through separate screens.</p>

        <div class="finance-kpi-grid">
          <div class="finance-kpi"><span>Open invoices</span><strong data-finance-open-count>—</strong></div>
          <div class="finance-kpi"><span>Open amount</span><strong data-finance-open-amount>—</strong></div>
          <div class="finance-kpi"><span>Paid amount</span><strong data-finance-paid-amount>—</strong></div>
          <div class="finance-kpi"><span>Overdue</span><strong data-finance-overdue-count>—</strong></div>
        </div>

        <div class="finance-grid">
          <section class="admin-payment-panel">
            <div class="finance-meta">
              <span class="finance-pill" data-finance-square-status>Square: checking…</span>
              <span class="finance-pill warn" data-finance-missing-checkout>Missing checkout: —</span>
            </div>
            <h3>Admin invoice action queue</h3>
            <p class="session-status" data-finance-status>Loading finance overview…</p>
            <div class="finance-list" data-finance-list></div>
          </section>

          <section class="client-payment-panel">
            <h3>Client payment experience</h3>
            <p>Clients should see a simple path from approved work to paid invoice without seeing admin-only tools.</p>
            <div class="payment-timeline">
              <div class="payment-step" data-state="done"><strong>Quote approved</strong><span>Client accepts estimate.</span></div>
              <div class="payment-step" data-state="done"><strong>Work complete</strong><span>Admin verifies closeout.</span></div>
              <div class="payment-step" data-state="active"><strong>Invoice open</strong><span>Checkout link or manual payment.</span></div>
              <div class="payment-step"><strong>Paid</strong><span>Receipt and closeout.</span></div>
            </div>
        <div class="finance-actions">
              <a class="btn btn-primary" href="#client-invoices">Client invoices</a>
              <a class="btn btn-soft" href="#admin-invoices">Admin invoices</a>
              <button class="btn btn-soft" type="button" data-finance-refresh>Refresh finance</button>
            </div>
          </section>
        </div>
      </section>
    `;

    after.parentNode.insertBefore(suite, after.nextSibling);

    suite.querySelectorAll('[data-finance-refresh]').forEach((button) => {
      button.addEventListener('click', loadFinanceOverview);
    });
  };


  const renderPaymentPlan = (plan = {}) => {
    const score = Number(plan.readinessScore || 0);
    const level = plan.overdue ? 'hot' : score < 75 ? 'warn' : '';
    const structure = plan.paymentStructure || {};
    const actions = Array.isArray(plan.actions) ? plan.actions : [];
    const warnings = Array.isArray(plan.warnings) ? plan.warnings : [];

    return `
      <div class="payment-intel-box ${level}">
        <strong>Payment readiness: ${score}/100</strong>
        <p>Status: ${escapeHtml(plan.closeoutStatus || 'review')} ${plan.dueInDays !== null && plan.dueInDays !== undefined ? `• Due in ${escapeHtml(plan.dueInDays)} day(s)` : ''}</p>
        <div class="finance-meta">
          <span class="payment-structure-pill">${escapeHtml(structure.recommended || 'single_payment')}</span>
          ${plan.hasCheckout ? '<span class="payment-structure-pill">checkout ready</span>' : '<span class="payment-structure-pill">needs checkout link</span>'}
          ${plan.depositRecommended ? '<span class="payment-structure-pill">deposit suggested</span>' : ''}
        </div>
        ${actions.length ? `<ul>${actions.slice(0, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
        ${warnings.length ? `<ul>${warnings.slice(0, 2).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
      </div>
    `;
  };

  const renderInvoiceCard = (invoice, type = 'open') => {
    const isOverdue = type === 'overdue';
    const missingCheckout = !invoice.provider?.checkoutUrl && (invoice?.status || 'draft') === 'open';
    const checkoutUrl = invoice.provider?.checkoutUrl;
    return `
      <article class="finance-card">
        <h4>${escapeHtml((invoice?.title || 'Invoice') || 'Invoice')}</h4>
        <p><strong>${escapeHtml(invoice.client?.fullName || invoice.client?.email || 'Client')}</strong><br>${escapeHtml(invoice.jobRequest?.serviceType || '')} • ${escapeHtml(invoice.jobRequest?.streetAddress || '')} ${escapeHtml(invoice.jobRequest?.city || '')}</p>
        <div class="finance-meta">
          <span class="finance-pill ${(invoice?.status || 'draft') === 'paid' ? 'good' : isOverdue ? 'hot' : 'warn'}">${escapeHtml((invoice?.status || 'draft') || 'open')}</span>
          <span class="finance-pill">${money((invoice?.amountCents || 0))}</span>
          ${invoice.dueAt ? `<span class="finance-pill ${isOverdue ? 'hot' : ''}">Due ${escapeHtml(String(invoice.dueAt).slice(0, 10))}</span>` : ''}
          ${missingCheckout ? '<span class="finance-pill warn">needs checkout link</span>' : ''}
        </div>
        <div class="finance-actions">
          ${checkoutUrl ? `<a class="btn btn-primary" href="${escapeHtml(checkoutUrl)}" target="_blank" rel="noopener">Open payment link</a>` : `<button class="btn btn-primary" type="button" data-create-checkout="${escapeHtml(invoice.id)}">Create checkout link</button>`}
          <button class="btn btn-soft" type="button" data-mark-paid="${escapeHtml(invoice.id)}" data-amount="${Number((invoice?.amountCents || 0) || 0)}">Mark paid</button>
          <a class="btn btn-soft" href="#admin-invoices">Open invoices</a>
        </div>
      </article>
    `;
  };

  const renderFinance = (result) => {
    const stats = result.stats || {};
    const setText = (selector, value) => {
      const el = document.querySelector(selector);
      if (el) el.textContent = value;
    };

    setText('[data-finance-open-count]', String(stats.openCount ?? '—'));
    setText('[data-finance-open-amount]', money(stats.openAmountCents || 0));
    setText('[data-finance-paid-amount]', money(stats.paidAmountCents || 0));
    setText('[data-finance-overdue-count]', String(stats.overdueCount ?? '—'));

    const square = document.querySelector('[data-finance-square-status]');
    if (square) {
      square.textContent = stats.squareConfigured ? 'Square: configured' : 'Square: needs setup';
      square.className = `finance-pill ${stats.squareConfigured ? 'good' : 'warn'}`;
    }

    const missing = document.querySelector('[data-finance-missing-checkout]');
    if (missing) missing.textContent = `Missing checkout: ${stats.missingCheckoutCount || 0}`;

    const status = document.querySelector('[data-finance-status]');
    if (status) status.textContent = 'Finance overview loaded.';

    const list = document.querySelector('[data-finance-list]');
    if (!list) return;

    const priority = [
      ...(result.overdueInvoices || []).map((invoice) => ({ ...invoice, __type: 'overdue' })),
      ...(result.missingCheckout || []).map((invoice) => ({ ...invoice, __type: 'missing' })),
      ...(result.openInvoices || []).map((invoice) => ({ ...invoice, __type: 'open' })),
    ];

    const deduped = [];
    const seen = new Set();
    priority.forEach((invoice) => {
      if (seen.has(invoice.id)) return;
      seen.add(invoice.id);
      deduped.push(invoice);
    });

    if (!deduped.length) {
      list.innerHTML = '<div class="finance-empty">No open invoice actions right now.</div>';
      return;
    }

    list.innerHTML = deduped.slice(0, 8).map((invoice) => renderInvoiceCard(invoice, invoice.__type)).join('');

    list.querySelectorAll('[data-create-checkout]').forEach((button) => {
      button.addEventListener('click', async () => {
        const invoiceId = button.dataset.createCheckout;
        button.disabled = true;
        button.textContent = 'Creating…';
        try {
          await fetchJson('/api/square/create-payment-link', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ invoiceId }),
          });
          button.textContent = 'Created';
          window.TAUX?.toast({ title: 'Payment link created', message: 'Square checkout link is ready.', type: 'success' });
          setTimeout(loadFinanceOverview, 600);
        } catch (error) {
          button.textContent = 'Error';
          (window.TAUX ? window.TAUX.toast({ title: 'Payment link error', message: error.message || 'Could not create payment link.', type: 'error' }) : alert(error.message || 'Could not create payment link.'));
        } finally {
          button.disabled = false;
        }
      });
    });

    list.querySelectorAll('[data-mark-paid]').forEach((button) => {
      button.addEventListener('click', async () => {
        const invoiceId = button.dataset.markPaid;
        const amountCents = Number(button.dataset.amount || 0);
        const reference = window.TAUX ? await window.TAUX.prompt({ title: 'Mark invoice paid', message: 'Enter the payment reference or note.', confirmText: 'Save payment', defaultValue: 'Manual payment verified' }) : window.prompt('Payment reference or note:', 'Manual payment verified');
        if (reference === null) return;

        button.disabled = true;
        button.textContent = 'Saving…';

        try {
          await fetchJson('/api/admin/invoices', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              invoiceId,
              amountCents,
              method: 'manual',
              reference,
            }),
          });
          button.textContent = 'Paid';
          window.TAUX?.toast({ title: 'Invoice marked paid', message: 'Payment was recorded and job closeout was updated.', type: 'success' });
          setTimeout(loadFinanceOverview, 700);
        } catch (error) {
          button.textContent = 'Error';
          (window.TAUX ? window.TAUX.toast({ title: 'Invoice error', message: error.message || 'Could not mark invoice paid.', type: 'error' }) : alert(error.message || 'Could not mark invoice paid.'));
        } finally {
          button.disabled = false;
        }
      });
    });
  };

  const loadFinanceOverview = async () => {
    const status = document.querySelector('[data-finance-status]');
    if (status) status.textContent = 'Loading finance overview…';

    try {
      const result = await fetchJson('/api/admin/finance-overview');
      renderFinance(result);
    } catch (error) {
      if (status) status.textContent = error.message || 'Could not load finance overview.';
      const list = document.querySelector('[data-finance-list]');
      if (list) list.innerHTML = '<div class="finance-empty">Finance overview requires an admin session with invoice permission.</div>';
    }
  };

  mount();

  window.addEventListener('ta:dashboard-refresh', loadFinanceOverview);
  setTimeout(loadFinanceOverview, 1400);
})();
