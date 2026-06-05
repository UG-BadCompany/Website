(() => {
  const esc = (v = '') => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const money = (cents = 0) => window.TAUi?.money ? TAUi.money(Number(cents || 0) / 100) : `$${(Number(cents || 0) / 100).toFixed(2)}`;
  const date = (v) => v ? new Date(v).toLocaleDateString([], { month:'short', day:'numeric', year:'numeric' }) : 'Not set';
  const title = (v = '') => String(v || 'open').replace(/_/g, ' ');
  const promptCents = () => { const dollars = window.prompt('Invoice amount in dollars (example: 125.00)'); if (dollars === null) return null; const cents = Math.round(Number(dollars) * 100); return Number.isInteger(cents) && cents > 0 ? cents : null; };
  window.TAModules.register({ id:'admin.invoices', role:'admin', title:'Invoices', icon:'🧾', permissions:['invoices.manage'], async mount({ root, api }) {
    root = root?.querySelector ? root : root?.root || root?.element || document.querySelector('[data-module-root], #module-root');
    if (!root?.querySelector) throw new TypeError('Module root element was not found.');
    let data = { invoices: [], summary: {} }; let filter = 'all';
    const load = async () => { data = await api.get('/api/admin/invoices', { status: filter }); };
    const toast = (m, t = 'success') => window.TAUi?.toast?.(m, t);
    const createInvoice = async () => {
      const jobRequestId = window.prompt('Job request ID for this invoice');
      if (!jobRequestId) return toast('Job request ID is required. No invoice was created.', 'error');
      const amountCents = promptCents();
      if (!amountCents) return toast('A positive amount is required. No invoice was created.', 'error');
      const title = window.prompt('Invoice title', 'Service invoice') || 'Service invoice';
      const result = await api.post('/api/admin/invoices', { jobRequestId, amountCents, title });
      toast(result.message || 'Invoice created.'); await load(); render();
    };
    const markPaid = async (invoice) => {
      const result = await api.patch('/api/admin/invoices', { invoiceId: invoice.id, amountCents: invoice.amountCents, method:'manual', reference:'Admin verification' });
      toast(result.message || 'Invoice marked paid.'); await load(); render();
    };
    const voidInvoice = async (invoice) => {
      if (!window.confirm(`Void invoice ${invoice.title || invoice.id}?`)) return;
      const result = await api.delete('/api/admin/invoices', { invoiceId: invoice.id });
      toast(result.message || 'Invoice voided.'); await load(); render();
    };
    const paymentLink = async (invoice) => {
      if (invoice.provider?.checkoutUrl) { window.open(invoice.provider.checkoutUrl, '_blank', 'noopener'); return; }
      const result = await api.post('/api/admin/square/payment-link', { invoiceId: invoice.id });
      if (result.provider?.checkoutUrl) window.open(result.provider.checkoutUrl, '_blank', 'noopener');
      toast('Square payment link ready.'); await load(); render();
    };
    const render = () => {
      const invoices = data.invoices || [];
      root.innerHTML = `<section class="module-page stack"><div class="module-hero module-header card"><div><p class="eyebrow">Admin / Manager workflow</p><h2 class="module-title">🧾 Invoices</h2><p class="module-description">Handle invoice-ready work, sent invoices, payment pending, paid, and void/cancelled invoices after Work Orders are complete.</p></div><div class="action-row"><button class="btn" type="button" data-create>Create Invoice</button><button class="btn secondary" type="button" data-refresh>Refresh</button></div></div><div class="module-tabs">${['all','open','paid','void'].map((item) => `<button class="btn secondary ${filter === item ? 'active' : ''}" type="button" data-filter="${item}">${esc(title(item))}</button>`).join('')}</div><div class="module-stat-grid"><article class="module-stat stat-card"><span>🧾</span><strong>${esc(data.summary?.open ?? 0)}</strong><small>Open</small></article><article class="module-stat stat-card"><span>✅</span><strong>${esc(data.summary?.paid ?? 0)}</strong><small>Paid</small></article><article class="module-stat stat-card"><span>💳</span><strong>${esc(money(data.summary?.amountDueCents || 0))}</strong><small>Due</small></article><article class="module-stat stat-card"><span>📥</span><strong>${esc(money(data.summary?.amountCollectedCents || 0))}</strong><small>Collected</small></article></div><div class="module-panel module-section card"><h3>Invoice queue</h3><div class="module-record-list">${invoices.length ? invoices.map((invoice) => `<article class="module-record-card"><div><p class="eyebrow">${esc(title(invoice.status))}</p><h3>${esc(invoice.title || 'Invoice')}</h3><p>${esc(invoice.client?.fullName || invoice.client?.email || invoice.jobRequest?.serviceType || 'Customer invoice')}</p><small>${esc(money(invoice.amountCents))} · Due ${esc(date(invoice.dueAt))} · ${esc(invoice.provider?.name || 'manual')}</small></div><div class="module-record-actions"><button class="btn secondary" type="button" data-view="${esc(invoice.id)}">View Invoice</button>${invoice.status === 'open' ? `<button class="btn secondary" type="button" data-link="${esc(invoice.id)}">Payment Link</button><button class="btn secondary" type="button" data-paid="${esc(invoice.id)}">Mark Paid</button><button class="btn secondary" type="button" data-void="${esc(invoice.id)}">Void Invoice</button>` : ''}</div></article>`).join('') : '<article class="module-empty"><h3>No invoices</h3><p>Invoice-ready work orders and created invoices will appear here.</p></article>'}</div></div></section>`;
      root.querySelector('[data-create]')?.addEventListener('click', createInvoice);
      root.querySelector('[data-refresh]')?.addEventListener('click', async () => { await load(); render(); });
      root.querySelectorAll('[data-filter]').forEach((btn) => btn.addEventListener('click', async () => { filter = btn.dataset.filter; await load(); render(); }));
      root.querySelectorAll('[data-view]').forEach((btn) => btn.addEventListener('click', () => TAModuleKit.openDetail(root, { title:'Invoice', detailMode:'readonly', readOnlyDetail:true, detailSections:['Customer information','Invoice lines','Payment status','Due date','Payment link','Notes'], canEdit:false }, invoices.find((i) => String(i.id) === btn.dataset.view))));
      root.querySelectorAll('[data-link]').forEach((btn) => btn.addEventListener('click', () => paymentLink(invoices.find((i) => String(i.id) === btn.dataset.link))));
      root.querySelectorAll('[data-paid]').forEach((btn) => btn.addEventListener('click', () => markPaid(invoices.find((i) => String(i.id) === btn.dataset.paid))));
      root.querySelectorAll('[data-void]').forEach((btn) => btn.addEventListener('click', () => voidInvoice(invoices.find((i) => String(i.id) === btn.dataset.void))));
    };
    root.innerHTML = '<section class="stack"><article class="card"><h2>Invoices</h2><p>Loading invoices...</p></article></section>';
    await load(); render();
  }, async destroy(){}, async refresh(){} });
})();
