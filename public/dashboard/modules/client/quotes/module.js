(() => {
  const esc = (v = '') => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const money = (cents = 0) => window.TAUi?.money ? TAUi.money(Number(cents || 0) / 100) : `$${(Number(cents || 0) / 100).toFixed(2)}`;
  const date = (v) => v ? new Date(v).toLocaleDateString([], { month:'short', day:'numeric', year:'numeric' }) : 'Not set';
  const arr = (v) => Array.isArray(v) ? v : v ? [v] : [];
  const clean = (v = '') => String(v ?? '').replace(/ADMIN REVIEW DRAFT[\s\S]*/ig, '').replace(/Do not send without review\.?/ig, '').replace(/Internal AI confidence|Accuracy review|Internal risk flags|Supplier\/pricing review|Troubleshooting review|Admin next steps|Raw AI output|Research metadata/ig, '').trim();
  const quotePayload = (q = {}) => q.clientQuote || q.client_quote || {};
  const title = (q) => clean(quotePayload(q).title || q.title || 'Service quote');
  const service = (q) => clean(quotePayload(q).serviceType || q.jobRequest?.serviceType || title(q));
  const property = (q) => clean(quotePayload(q).propertySummary || [q.property?.street, q.property?.city, q.property?.state].filter(Boolean).join(', ') || 'Property address on file');
  const status = (q) => String(q.status || '').replace(/_/g, ' ');
  const lines = (items = []) => arr(items).map((line) => `<tr><td>${esc(clean(line.category || 'Item'))}</td><td><strong>${esc(clean(line.name || line.description || 'Line item'))}</strong><br><small>${esc(clean(line.description || ''))}</small></td><td>${esc(line.quantity || 1)} ${esc(line.unit || '')}</td><td><strong>${money(line.totalCents || line.total_cents || 0)}</strong></td></tr>`).join('');
  const list = (items, empty) => `<ul class="quote-clean-list">${arr(items).length ? arr(items).map((item) => `<li>${esc(clean(typeof item === 'string' ? item : item.description || item.name || item.label || ''))}</li>`).join('') : `<li>${esc(empty)}</li>`}</ul>`;
  const expanded = (q) => {
    const p = quotePayload(q);
    const grouped = p.groupedPricing;
    const canDecide = ['sent', 'viewed'].includes(String(q.status || '').toLowerCase());
    return `<div class="client-quote-expanded" data-quote-id="${esc(q.id)}">
      <section><h3>Job summary</h3><p>${esc(clean(p.jobSummary || q.summary || q.jobRequest?.description || 'Review the scope below for quoted work.'))}</p></section>
      <section><h3>Scope</h3><p>${esc(clean(p.scopeOfWork || q.summary || 'Scope details will be confirmed before work begins.'))}</p></section>
      <div class="grid grid-2"><section><h3>Included labor summary</h3><p>${esc(clean(p.laborSummary || 'Service labor is included in the quote total.'))}</p></section><section><h3>Included materials summary</h3><p>${esc(clean(p.materialsSummary || 'Materials and allowances are included in the quote total.'))}</p></section></div>
      <section><h3>Assumptions</h3>${list(p.assumptions, 'No special assumptions listed.')}</section>
      <section><h3>Exclusions</h3>${list(p.exclusions, 'No exclusions listed.')}</section>
      <section><h3>Warranty</h3><p>${esc(clean(p.warrantyNotes || p.customerNotes || 'Warranty and notes will be confirmed in writing.'))}</p></section>
      ${grouped ? `<section><h3>Grouped pricing</h3><div class="quote-total-grid"><span>Labor<strong>${money(grouped.laborTotalCents)}</strong></span><span>Materials<strong>${money(grouped.materialTotalCents)}</strong></span><span>Other<strong>${money(grouped.otherTotalCents)}</strong></span></div></section>` : ''}
      ${arr(p.lineItems).length ? `<section><h3>Detailed line items</h3><table class="quote-editor-table"><tbody>${lines(p.lineItems)}</tbody></table></section>` : ''}
      <section class="client-quote-total"><span>Total</span><strong>${money(p.totalCents || q.amountCents)}</strong></section>
      <div class="quote-client-actions"><button class="btn" data-decision="accept" ${canDecide ? '' : 'disabled'}>Approve</button><button class="btn secondary" data-decision="decline" ${canDecide ? '' : 'disabled'}>Decline</button><button class="btn secondary" data-decision="request_changes" ${canDecide ? '' : 'disabled'}>Request Changes</button></div>
    </div>`;
  };
  const card = (q, open) => {
    const p = quotePayload(q);
    return `<article class="module-record-card client-quote-card ${open ? 'active' : ''}" data-quote-card="${esc(q.id)}" aria-expanded="${open}"><div class="client-quote-card-head"><div><p class="eyebrow">${esc(status(q))}</p><h3>${esc(service(q))}</h3><p>${esc(property(q))}</p></div><strong>${money(p.totalCents || q.amountCents)}</strong></div><div class="client-quote-card-meta"><span>Status <strong>${esc(status(q))}</strong></span><span>Updated <strong>${esc(date(q.updatedAt || q.sentAt || q.createdAt))}</strong></span></div><button class="btn secondary client-quote-toggle" type="button" data-toggle-quote="${esc(q.id)}">${open ? 'Collapse' : 'Expand'}</button>${open ? expanded(q) : ''}</article>`;
  };
  window.TAModules.register({id:'client.quotes',role:'client',title:'My Quotes',icon:'💰',permissions:[],async mount({root,api}){
    let data = { quotes: [] }; const openIds = new Set();
    const render = () => {
      const quotes = arr(data.quotes);
      root.innerHTML = `<section class="module-page stack client-quotes-page"><div class="module-hero module-header card"><div><p class="eyebrow">Client workspace</p><h2 class="module-title">💰 My Quotes</h2><p class="module-description">Quote cards are collapsed by default. Expand a quote to review customer-facing scope, totals, and decision actions.</p></div></div><div class="client-quote-list">${quotes.length ? quotes.map((item) => card(item, openIds.has(String(item.id)))).join('') : '<article class="module-empty"><h3>No quotes yet</h3><p>Sent quotes will appear here.</p></article>'}</div></section>`;
      root.querySelectorAll('[data-toggle-quote]').forEach((btn) => btn.addEventListener('click', () => { const id = String(btn.dataset.toggleQuote || ''); if (openIds.has(id)) openIds.delete(id); else openIds.add(id); render(); }));
      root.querySelectorAll('[data-decision]').forEach((btn) => btn.addEventListener('click', async () => { const host = btn.closest('[data-quote-id]'); const quoteId = host?.dataset.quoteId; btn.disabled = true; const response = await api.patch('/api/client/quotes', { quoteId, action: btn.dataset.decision }); data.quotes = data.quotes.map((item) => item.id === quoteId ? response.quote : item); render(); }));
    };
    root.innerHTML = '<section class="stack"><div class="card"><h2>Quotes</h2><p>Loading...</p></div></section>';
    data = await api.get('/api/client/quotes'); render();
  },async destroy(){},async refresh(){}});
})();
