(() => {
  const esc = (v = '') => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const money = (cents = 0) => window.TAUi?.money ? TAUi.money(Number(cents || 0) / 100) : `$${(Number(cents || 0) / 100).toFixed(2)}`;
  const date = (v) => v ? new Date(v).toLocaleDateString([], { month:'short', day:'numeric', year:'numeric' }) : 'Not set';
  const status = (v = '') => String(v || 'open').replace(/_/g, ' ');
  const serviceSummary = (invoice = {}) => invoice.jobRequest?.serviceType || invoice.title || 'Service invoice';
  const printableInvoice = (invoice = {}) => `<!doctype html><html><head><title>${esc(invoice.title || 'Invoice')}</title><style>body{font-family:system-ui,sans-serif;margin:2rem;color:#111}.invoice{max-width:760px;margin:auto}.row{display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding:.75rem 0}.total{font-size:1.4rem;font-weight:800}.muted{color:#666}@media print{button{display:none}}</style></head><body><main class="invoice"><button onclick="window.print()">Print / Save PDF</button><h1>${esc(invoice.title || 'Invoice')}</h1><p class="muted">Invoice #${esc(invoice.id || '')}</p><div class="row"><span>Service summary</span><strong>${esc(serviceSummary(invoice))}</strong></div><div class="row"><span>Due date</span><strong>${esc(date(invoice.dueAt))}</strong></div><div class="row"><span>Payment status</span><strong>${esc(status(invoice.status))}</strong></div><div class="row total"><span>Amount due</span><strong>${esc(money(invoice.status === 'paid' ? 0 : invoice.amountCents))}</strong></div><p>${esc(invoice.jobRequest?.streetAddress || '')} ${esc(invoice.jobRequest?.city || '')}</p></main><script>window.print()</script></body></html>`;
  const openInvoice = (invoice) => {
    const modal = document.getElementById('modal-root') || document.body;
    modal.innerHTML = `<div class="module-drawer"><article class="card module-readonly-detail stack"><div class="module-editor-head"><div><p class="eyebrow">Client invoice · view only</p><h2>${esc(invoice.title || 'Invoice')}</h2><p>No admin fields or internal notes are shown here.</p></div><button class="btn secondary" type="button" data-close-invoice>Close</button></div><div class="module-editor-grid module-readonly-grid"><section class="module-readonly-field"><span>Invoice number</span><p>${esc(invoice.id)}</p></section><section class="module-readonly-field"><span>Service summary</span><p>${esc(serviceSummary(invoice))}</p></section><section class="module-readonly-field"><span>Amount due</span><p>${esc(money(invoice.status === 'paid' ? 0 : invoice.amountCents))}</p></section><section class="module-readonly-field"><span>Due date</span><p>${esc(date(invoice.dueAt))}</p></section><section class="module-readonly-field"><span>Payment status</span><p>${esc(status(invoice.status))}</p></section></div></article></div>`;
    modal.querySelector('[data-close-invoice]')?.addEventListener('click', () => { modal.innerHTML = ''; });
  };
  const downloadInvoice = (invoice) => {
    const blob = new Blob([printableInvoice(invoice)], { type:'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoice.id || 'download'}.html`;
    a.click();
    URL.revokeObjectURL(url);
    const printWindow = window.open('', '_blank');
    if (printWindow) { printWindow.document.write(printableInvoice(invoice)); printWindow.document.close(); }
  };
  window.TAModules.register({ id:'client.invoices', role:'client', title:'My Invoices', icon:'🧾', permissions:[], async mount({ root, api }) {
    root = root?.querySelector ? root : root?.root || root?.element || document.querySelector('[data-module-root], #module-root');
    if (!root?.querySelector) throw new TypeError('Module root element was not found.');
    let data = { invoices: [], summary: {} };
    const load = async () => { data = await api.get('/api/client/invoices'); };
    const pay = async (invoice, button) => {
      if (invoice.status === 'paid') { window.TAUi?.toast?.('This invoice is already paid.', 'info'); return; }
      button.disabled = true;
      try {
        const existing = invoice.provider?.checkoutUrl;
        const result = existing ? { provider:{ checkoutUrl: existing } } : await api.post('/api/client/invoices', { invoiceId: invoice.id, action:'payment_link' });
        if (!result.provider?.checkoutUrl) throw new Error('Square payment link is not available yet.');
        window.location.assign(result.provider.checkoutUrl);
      } catch (error) {
        window.TAUi?.toast?.(error.message || 'Could not open Square checkout.', 'error');
      } finally { button.disabled = false; }
    };
    const render = () => {
      const invoices = data.invoices || [];
      root.innerHTML = `<section class="module-page stack"><div class="module-hero module-header card"><div><p class="eyebrow">Client workflow</p><h2 class="module-title">🧾 My Invoices</h2><p class="module-description">View invoices, download a print-friendly copy, pay securely through Square, and track paid/unpaid status.</p></div><button class="btn secondary" type="button" data-refresh>Refresh</button></div><div class="module-stat-grid"><article class="module-stat stat-card"><span>🧾</span><strong>${esc(invoices.length)}</strong><small>Invoices</small></article><article class="module-stat stat-card"><span>📬</span><strong>${esc(data.summary?.open || 0)}</strong><small>Unpaid</small></article><article class="module-stat stat-card"><span>✅</span><strong>${esc(data.summary?.paid || 0)}</strong><small>Paid</small></article><article class="module-stat stat-card"><span>💳</span><strong>${esc(money(data.summary?.amountDueCents || 0))}</strong><small>Amount due</small></article></div><div class="module-panel module-section card"><h3>Invoice list</h3><div class="module-record-list">${invoices.length ? invoices.map((invoice) => `<article class="module-record-card"><div><p class="eyebrow">${esc(status(invoice.status))}</p><h3>${esc(invoice.title || 'Invoice')}</h3><p>${esc(serviceSummary(invoice))}</p><small>Invoice #${esc(invoice.id)} · Due ${esc(date(invoice.dueAt))} · ${esc(money(invoice.status === 'paid' ? 0 : invoice.amountCents))}</small></div><div class="module-record-actions"><button class="btn secondary" type="button" data-view="${esc(invoice.id)}">View Invoice</button><button class="btn secondary" type="button" data-download="${esc(invoice.id)}">Download Invoice</button>${invoice.status === 'paid' ? '<span class="status-badge">Paid</span>' : `<button class="btn" type="button" data-pay="${esc(invoice.id)}">Pay Invoice</button>`}</div></article>`).join('') : '<article class="module-empty"><h3>No invoices</h3><p>Approved and completed work will appear here when an invoice is ready.</p></article>'}</div></div></section>`;
      root.querySelector('[data-refresh]')?.addEventListener('click', async () => { await load(); render(); });
      root.querySelectorAll('[data-view]').forEach((btn) => btn.addEventListener('click', () => openInvoice(invoices.find((i) => String(i.id) === btn.dataset.view))));
      root.querySelectorAll('[data-download]').forEach((btn) => btn.addEventListener('click', () => downloadInvoice(invoices.find((i) => String(i.id) === btn.dataset.download))));
      root.querySelectorAll('[data-pay]').forEach((btn) => btn.addEventListener('click', () => pay(invoices.find((i) => String(i.id) === btn.dataset.pay), btn)));
    };
    root.innerHTML = '<section class="stack"><article class="card"><h2>My Invoices</h2><p>Loading invoices...</p></article></section>';
    await load(); render();
  }, async destroy(){}, async refresh(){} });
})();
