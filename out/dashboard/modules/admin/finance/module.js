(() => {
  const esc = (v = '') => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const money = (cents = 0) => window.TAUi?.money ? TAUi.money(Number(cents || 0) / 100) : `$${(Number(cents || 0) / 100).toFixed(2)}`;
  const date = (v) => v ? new Date(v).toLocaleString([], { dateStyle:'medium', timeStyle:'short' }) : 'Not recorded';
  const title = (v = '') => String(v || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const normalizeRoot = (root) => root?.querySelector ? root : root?.root || root?.element || document.querySelector('[data-module-root], #module-root');
  const card = (label, value, icon = '📊') => `<article class="module-stat stat-card"><span>${esc(icon)}</span><strong>${esc(value)}</strong><small>${esc(label)}</small></article>`;
  const invoiceRow = (invoice) => `<article class="module-record-card"><div><p class="eyebrow">${esc(title(invoice.status))}</p><h3>${esc(invoice.title || 'Invoice')}</h3><p>${esc(invoice.client?.fullName || invoice.client?.email || 'Client')} · ${esc(invoice.jobRequest?.serviceType || 'Service')}</p><small>${esc(money(invoice.amountCents))} · Due ${esc(date(invoice.dueAt))} · Square/provider: ${esc(invoice.provider?.status || invoice.provider?.name || 'manual')}</small></div></article>`;
  const paymentRow = (payment) => `<article class="module-record-card"><div><p class="eyebrow">${esc(payment.provider || 'manual')} ${esc(payment.providerStatus || '')}</p><h3>${esc(money(payment.amountCents))}</h3><p>${esc(payment.providerPaymentId || 'Manual payment')}</p><small>${esc(date(payment.confirmedAt))}</small></div>${payment.receiptUrl ? `<a class="btn secondary" href="${esc(payment.receiptUrl)}" target="_blank" rel="noreferrer">Receipt</a>` : ''}</article>`;
  window.TAModules.register({ id:'admin.finance', role:'admin', title:'Finance', icon:'📊', permissions:[], async mount({ root, api } = {}) {
    root = normalizeRoot(root);
    if (!root?.querySelector) throw new TypeError('Module root element was not found.');
    let data = null;
    const load = async () => { data = await api.get('/api/admin/finance-overview'); };
    const render = () => {
      const s = data?.stats || {};
      const open = data?.openInvoices || [];
      const overdue = data?.overdueInvoices || [];
      const paid = data?.paidInvoices || [];
      const payments = data?.recentPayments || [];
      root.innerHTML = `<section class="module-page stack admin-finance-page"><div class="module-hero module-header card"><div><p class="eyebrow">Finance</p><h2 class="module-title">📊 Finance</h2><p class="module-description">Live revenue, invoice, quote, payment, aging, and Square payment status from real invoice/payment/quote/work-order records.</p></div><button class="btn secondary" data-refresh-finance>Refresh</button></div><div class="module-stat-grid">${[
        card('Revenue today', money(s.revenueTodayCents), '💵'), card('Revenue this week', money(s.revenueWeekCents), '📈'), card('Revenue this month', money(s.revenueMonthCents), '🗓️'), card('Outstanding invoices', money(s.openAmountCents), '🧾'), card('Paid invoices', money(s.paidAmountCents), '✅'), card('Payment pending', s.openCount || 0, '⏳'), card('Overdue invoices', money(s.overdueAmountCents), '⚠️'), card('Average quote value', money(s.averageQuoteValueCents), '💰'), card('Accepted quote value', money(s.acceptedQuoteValueCents), '🎯'), card('Collected revenue', money(s.collectedRevenueCents), '🏦'), card('Uncollected revenue', money(s.uncollectedRevenueCents), '📬'), card('Square configured', s.squareConfigured ? 'Yes' : 'No', '◼️')
      ].join('')}</div><div class="grid grid-2"><section class="card module-panel"><h3>Invoice aging</h3>${overdue.length ? `<p>${esc(overdue.length)} overdue invoice(s) need follow-up.</p><div class="module-record-list">${overdue.map(invoiceRow).join('')}</div>` : '<article class="module-empty"><h3>No overdue invoices</h3><p>No overdue invoice records were returned.</p></article>'}</section><section class="card module-panel"><h3>Recent payments</h3>${payments.length ? `<div class="module-record-list">${payments.map(paymentRow).join('')}</div>` : '<article class="module-empty"><h3>No payments yet</h3><p>Payments will appear after Square webhooks or manual verification records are saved.</p></article>'}</section></div><div class="grid grid-2"><section class="card module-panel"><h3>Outstanding invoices</h3>${open.length ? `<div class="module-record-list">${open.map(invoiceRow).join('')}</div>` : '<article class="module-empty"><h3>No outstanding invoices</h3><p>No unpaid invoices are currently active.</p></article>'}</section><section class="card module-panel"><h3>Paid / verified invoices</h3>${paid.length ? `<div class="module-record-list">${paid.map(invoiceRow).join('')}</div>` : '<article class="module-empty"><h3>No paid invoices</h3><p>Paid invoices will appear here when payment records exist.</p></article>'}</section></div><section class="card module-panel"><h3>Profit / margin</h3><p class="module-empty">Profit and margin will calculate when labor/material cost fields are available on invoice or work-order records. No fake margin data is shown.</p></section></section>`;
      root.querySelector('[data-refresh-finance]')?.addEventListener('click', async () => { await load(); render(); });
    };
    root.innerHTML = '<section class="stack"><article class="card"><h2>Finance</h2><p>Loading real finance data...</p></article></section>';
    await load(); render();
    const off = window.TAWorkflow?.on?.('*', async (event) => { if (/^(invoice|payment|quote|workorder):/.test(event)) { await load(); render(); } });
    this.destroy = () => off?.();
  }, async destroy(){}, async refresh(){} });
})();
