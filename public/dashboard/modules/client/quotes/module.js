(() => {
  const esc = (v = '') => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const money = (cents = 0) => window.TAUi?.money ? TAUi.money(Number(cents || 0) / 100) : `$${(Number(cents || 0) / 100).toFixed(2)}`;
  const date = (v) => v ? new Date(v).toLocaleDateString([], { month:'short', day:'numeric', year:'numeric' }) : 'Not set';
  const arr = (v) => Array.isArray(v) ? v : v ? [v] : [];
  const clean = (v = '') => String(v ?? '').replace(/ADMIN REVIEW DRAFT[\s\S]*/ig, '').replace(/Do not send without review\.?/ig, '').replace(/Internal AI confidence|Accuracy review|Internal risk flags|Supplier\/pricing review|Troubleshooting review|Admin next steps|Raw AI output|Research metadata/ig, '').trim();
  const quotePayload = (q = {}) => q.clientQuote || q.client_quote || {};
  const title = (q) => clean(quotePayload(q).title || q.title || 'Service quote');
  const status = (q) => String(q.status || '').replace(/_/g, ' ');
  const lines = (items = []) => arr(items).map((line) => `<tr><td>${esc(clean(line.category || 'Item'))}</td><td><strong>${esc(clean(line.name || line.description || 'Line item'))}</strong><br><small>${esc(clean(line.description || ''))}</small></td><td>${esc(line.quantity || 1)} ${esc(line.unit || '')}</td><td><strong>${money(line.totalCents || line.total_cents || 0)}</strong></td></tr>`).join('');
  const list = (items, empty) => `<ul class="quote-clean-list">${arr(items).length ? arr(items).map((item) => `<li>${esc(clean(typeof item === 'string' ? item : item.description || item.name || item.label || ''))}</li>`).join('') : `<li>${esc(empty)}</li>`}</ul>`;
  const detail = (q) => {
    const p = quotePayload(q);
    const grouped = p.groupedPricing;
    const canDecide = ['sent', 'viewed'].includes(String(q.status || '').toLowerCase());
    return `<article class="card client-quote-detail" data-quote-id="${esc(q.id)}">
      <div class="client-quote-brand"><div><p class="eyebrow">${esc(p.company?.name || 'Ugly Guys Bad Company')}</p><h2>${esc(title(q))}</h2><p>${esc(p.company?.phone || '')} ${p.company?.email ? `· ${esc(p.company.email)}` : ''}</p></div><strong>${money(p.totalCents || q.amountCents)}</strong></div>
      <div class="client-quote-meta"><span>Quote #<strong>${esc(p.quoteNumber || q.id)}</strong></span><span>Date<strong>${esc(date(p.quoteDate || q.createdAt))}</strong></span><span>Expires<strong>${esc(date(p.expirationDate))}</strong></span><span>Status<strong>${esc(status(q))}</strong></span></div>
      <section><h3>Customer & property</h3><p><strong>${esc(p.customerName || 'Customer')}</strong></p><p>${esc(p.propertySummary || [q.property?.street, q.property?.city, q.property?.state].filter(Boolean).join(', ') || 'Property address on file')}</p><p><strong>Service category:</strong> ${esc(p.serviceType || q.jobRequest?.serviceType || 'Service')}</p></section>
      <section><h3>Job summary</h3><p>${esc(clean(p.jobSummary || q.summary || q.jobRequest?.description || 'Review the scope below for quoted work.'))}</p></section>
      <section><h3>Scope of work</h3><p>${esc(clean(p.scopeOfWork || q.summary || 'Scope details will be confirmed before work begins.'))}</p></section>
      <div class="grid grid-2"><section><h3>What is included</h3>${list(p.included, 'Labor and materials listed in this quote.')}</section><section><h3>Materials / allowances</h3><p>${esc(clean(p.materialsSummary || 'Materials and allowances are included in the quote total.'))}</p></section><section><h3>Labor / service summary</h3><p>${esc(clean(p.laborSummary || 'Service labor is included in the quote total.'))}</p></section><section><h3>Estimated timeline</h3><p>${esc(clean(p.estimatedTimeline || 'Scheduling timeline will be confirmed after approval.'))}</p></section></div>
      <section><h3>Assumptions</h3>${list(p.assumptions, 'No special assumptions listed.')}</section>
      <section><h3>Exclusions</h3>${list(p.exclusions, 'No exclusions listed.')}</section>
      <section><h3>Warranty / notes</h3><p>${esc(clean(p.warrantyNotes || p.customerNotes || 'Warranty and notes will be confirmed in writing.'))}</p></section>
      ${grouped ? `<section><h3>Grouped pricing</h3><div class="quote-total-grid"><span>Labor<strong>${money(grouped.laborTotalCents)}</strong></span><span>Materials<strong>${money(grouped.materialTotalCents)}</strong></span><span>Other<strong>${money(grouped.otherTotalCents)}</strong></span></div></section>` : ''}
      ${arr(p.lineItems).length ? `<section><h3>Detailed line items</h3><table class="quote-editor-table"><tbody>${lines(p.lineItems)}</tbody></table></section>` : ''}
      <section class="client-quote-total"><span>Total price</span><strong>${money(p.totalCents || q.amountCents)}</strong></section>
      <div class="quote-client-actions"><button class="btn" data-decision="accept" ${canDecide ? '' : 'disabled'}>Approve Quote</button><button class="btn secondary" data-decision="request_changes" ${canDecide ? '' : 'disabled'}>Request Changes</button><button class="btn secondary" data-decision="decline" ${canDecide ? '' : 'disabled'}>Decline</button></div>
    </article>`;
  };
  window.TAModules.register({id:'client.quotes',role:'client',title:'My Quotes',icon:'💰',permissions:[],async mount({root,api}){
    let data = { quotes: [] }; let selected = '';
    const render = () => {
      const quotes = arr(data.quotes); if (!selected && quotes[0]) selected = quotes[0].id;
      const q = quotes.find((item) => String(item.id) === String(selected)) || quotes[0];
      root.innerHTML = `<section class="module-page stack client-quotes-page"><div class="module-hero module-header card"><div><p class="eyebrow">Client workspace</p><h2 class="module-title">💰 My Quotes</h2><p class="module-description">Review customer-facing quote details, approve, decline, or request changes.</p></div></div><div class="estimate-split"><aside class="module-record-list">${quotes.length ? quotes.map((item) => `<article class="module-record-card ${String(item.id)===String(q?.id)?'active':''}" data-select="${esc(item.id)}"><p class="eyebrow">${esc(status(item))}</p><h3>${esc(title(item))}</h3><p>${esc(clean(item.summary || quotePayload(item).scopeOfWork || 'Quote ready for review.')).slice(0,180)}</p><strong>${money(quotePayload(item).totalCents || item.amountCents)}</strong></article>`).join('') : '<article class="module-empty"><h3>No quotes yet</h3><p>Sent quotes will appear here.</p></article>'}</aside><div>${q ? detail(q) : ''}</div></div></section>`;
      root.querySelectorAll('[data-select]').forEach((el) => el.addEventListener('click', () => { selected = el.dataset.select; render(); }));
      root.querySelectorAll('[data-decision]').forEach((btn) => btn.addEventListener('click', async () => { btn.disabled = true; const response = await api.patch('/api/client/quotes', { quoteId: q.id, action: btn.dataset.decision }); data.quotes = data.quotes.map((item) => item.id === q.id ? response.quote : item); render(); }));
    };
    root.innerHTML = '<section class="stack"><div class="card"><h2>Quotes</h2><p>Loading...</p></div></section>';
    data = await api.get('/api/client/quotes'); render();
  },async destroy(){},async refresh(){}});
})();
