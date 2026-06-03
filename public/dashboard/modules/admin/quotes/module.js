(() => {
  const escapeHtml = (value = '') => String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[char]));
  const asArray = (value) => Array.isArray(value) ? value : value ? [value] : [];
  const titleize = (value = '') => String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  const dateText = (value) => value ? new Date(value).toLocaleDateString([], { month:'short', day:'numeric', year:'numeric' }) : 'No date';
  const money = (cents) => window.TAUi?.money ? TAUi.money(Number(cents || 0) / 100) : `$${(Number(cents || 0) / 100).toFixed(2)}`;
  const statuses = {
    inbox:['new'], needs_review:['needs_review','quote_in_progress','pending_review'], information_needed:['information_needed'], draft:['draft','draft_admin_review'], sent:['sent','quote_sent','viewed'], accepted:['accepted'], declined:['declined'], all:[],
  };
  const confidence = (record = {}) => {
    const scores = record.confidenceScores || record.aiMetadata?.confidenceScores || record.structuredEstimate?.confidence_scores || {};
    const raw = Number(scores.overall ?? record.confidence ?? 0);
    const pct = window.TAQuotes?.confidencePercent ? TAQuotes.confidencePercent(raw) : Math.round(raw <= 1 ? raw * 100 : raw);
    return { pct, label: window.TAQuotes?.confidenceLabel ? TAQuotes.confidenceLabel(raw) : (pct >= 80 ? 'High' : pct >= 55 ? 'Medium' : 'Low') };
  };
  const normalize = (item = {}, kind = 'record') => {
    const draft = window.TAQuotes?.normalizeAiDraft ? TAQuotes.normalizeAiDraft(item) : item;
    return { ...draft, kind, id: item.id || item.quoteId || item.requestId || item.jobRequestId || item.job_request_id, requestId: item.requestId || item.request_id || item.jobRequestId || item.job_request_id || item.id, customerName: draft.customerName || item.requesterName || item.requester_name || item.clientName || item.client_name || item.email || item.requester_email || 'Customer', serviceType: draft.serviceType || item.serviceType || item.service_type || item.title || 'Service request', address: item.streetAddress || item.street_address || item.address || draft.propertySummary || item.city || '', description: item.description || item.summary || draft.description || '', status: item.status || item.request_status || 'new', createdAt: item.createdAt || item.created_at || item.request_created_at, updatedAt: item.updatedAt || item.updated_at || item.request_updated_at };
  };
  const confidencePercent = (value) => window.TAQuotes?.confidencePercent ? TAQuotes.confidencePercent(value) : Math.round(Number(value || 0) <= 1 ? Number(value || 0) * 100 : Number(value || 0));
  const nextAction = (record) => record.recommendedAction || record.structuredEstimate?.recommended_action || (confidence(record).pct >= 80 ? 'Ready for admin review.' : confidence(record).pct >= 55 ? 'Review assumptions before sending.' : 'Request more information or continue manually.');

  window.TAModules.register({
    id:'admin.quotes', role:'admin', title:'Estimate & Request Center', icon:'💰', permissions:['quotes.manage'],
    async mount({ root, api }) {
      let records = [];
      let active = 'inbox';
      let selected = null;
      let query = '';
      const detailSections = ['Customer information','Address/property','Service category','Description','Preferred timeframe','Uploaded files/photos','Internal notes','AI confidence','AI recommendations','Scope of work','Labor line items','Material line items','Pricing','Tax / markup / discounts','Assumptions','Exclusions','Customer-facing notes','Activity','Status'];

      const load = async () => {
        root.innerHTML = '<article class="card module-loading"><h3>Loading Estimate & Request Center</h3><p>Combining customer requests, AI review, quote drafts, sent quotes, and accepted work.</p></article>';
        try {
          const [quoteData, requestData] = await Promise.all([api.get('/api/admin/quotes').catch(() => ({})), api.get('/api/admin/job-requests').catch(() => ({}))]);
          const quotes = asArray(quoteData.quotes).map((item) => normalize(item, 'quote'));
          const requests = asArray(requestData.requests).map((item) => normalize(item, 'request'));
          const seen = new Set(quotes.map((item) => String(item.requestId || item.id)));
          records = [...requests.filter((item) => !seen.has(String(item.requestId || item.id))), ...quotes].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
          selected = records[0] || null;
          render();
        } catch (error) {
          root.innerHTML = `<section class="module-page stack"><article class="card module-error"><h2>Estimate & Request Center</h2><p>${escapeHtml(error.message || 'Unable to load requests and quotes.')}</p><button class="btn secondary" id="retry-estimates">Retry</button></article></section>`;
          root.querySelector('#retry-estimates')?.addEventListener('click', load);
        }
      };

      const filtered = () => records.filter((record) => {
        const statusMatch = active === 'all' || statuses[active].includes(String(record.status || '').toLowerCase());
        const c = confidence(record);
        const text = `${record.customerName} ${record.address} ${record.serviceType} ${record.status} ${record.description} ${c.label} ${c.pct} ${record.assignedWorker || record.assigned_worker || ''}`.toLowerCase();
        return statusMatch && (!query || text.includes(query.toLowerCase()));
      });
      const count = (keys) => records.filter((record) => keys.includes(String(record.status || '').toLowerCase())).length;
      const kpis = () => [
        ['New Requests', count(['new']), '🆕'], ['Needs AI Review', count(['needs_review','quote_in_progress','pending_review']), '🤖'], ['Information Needed', count(['information_needed']), '❓'], ['Draft Quotes', count(['draft','draft_admin_review']), '📝'], ['Quotes Sent', count(['sent','quote_sent','viewed']), '📬'], ['Accepted Quotes', count(['accepted']), '✅'], ['Overdue Follow-Ups', records.filter((r) => ['information_needed','sent','quote_sent'].includes(String(r.status).toLowerCase()) && (Date.now() - new Date(r.updatedAt || r.createdAt || Date.now()).getTime()) > 7 * 86400000).length, '⏰'],
      ].map(([label, value, icon]) => `<article class="module-stat stat-card"><span>${icon}</span><strong>${value}</strong><small>${label}</small></article>`).join('');
      const tabs = () => [['inbox','Inbox'],['needs_review','Needs Review'],['information_needed','Information Needed'],['draft','Drafts'],['sent','Sent'],['accepted','Accepted'],['declined','Declined'],['all','All']].map(([key,label]) => `<button class="btn secondary ${active===key?'active':''}" data-tab="${key}">${label}</button>`).join('');
      const card = (record) => { const c = confidence(record); return `<article class="module-record-card ${selected?.id===record.id?'active':''}" data-select="${escapeHtml(record.id)}"><div><p class="eyebrow">${escapeHtml(titleize(record.status))}</p><h3>${escapeHtml(record.customerName)}</h3><p>${escapeHtml(record.serviceType)} • ${escapeHtml(record.address || 'No property listed')}</p><p>${escapeHtml(record.description).slice(0, 160)}</p><small>Created ${escapeHtml(dateText(record.createdAt))} • Updated ${escapeHtml(dateText(record.updatedAt))}</small><div class="action-row"><span class="status-badge ${c.pct>=80?'success':c.pct>=55?'warning':'danger'}">${c.label} Confidence ${c.pct}%</span><span class="status-badge">${escapeHtml(nextAction(record))}</span></div></div></article>`; };
      const detail = (record) => {
        if (!record) return '<article class="card module-empty"><h3>No request selected</h3><p>Select a request or quote to review details.</p></article>';
        const c = confidence(record); const scores = record.confidenceScores || record.structuredEstimate?.confidence_scores || {}; const reasons = asArray(record.confidenceReasons || record.structuredEstimate?.confidence_reasons);
        return `<article class="card module-section stack estimate-detail"><div class="module-header"><div><p class="eyebrow">${escapeHtml(titleize(record.status))}</p><h2>${escapeHtml(record.customerName)}</h2><p>${escapeHtml(record.serviceType)} • ${escapeHtml(record.address || 'No address')}</p></div><span class="status-badge ${c.pct>=80?'success':c.pct>=55?'warning':'danger'}">${c.label} ${c.pct}%</span></div><div class="module-tabs"><button class="btn" data-action="generate-ai">Generate AI Draft</button><button class="btn secondary" data-action="manual">Create Manual Draft</button><button class="btn secondary" data-action="info">Request More Information</button><button class="btn secondary" data-action="send">Send Quote</button><button class="btn secondary" data-action="work-order">Convert to Work Order</button></div><div class="grid grid-2"><section class="module-card"><h3>Request Information</h3><p><strong>Email:</strong> ${escapeHtml(record.email || record.requester_email || '')}</p><p><strong>Phone:</strong> ${escapeHtml(record.phone || record.requester_phone || '')}</p><p><strong>Description:</strong> ${escapeHtml(record.description || '')}</p><p><strong>Preferred timeframe:</strong> ${escapeHtml(record.preferredTimeframe || record.preferred_timeframe || 'Not provided')}</p></section><section class="module-card"><h3>AI Confidence</h3><p><strong>Overall:</strong> ${c.pct}% — ${escapeHtml(nextAction(record))}</p><ul>${['labor','materials','pricing','scope','information_completeness','research'].map((key) => `<li>${escapeHtml(titleize(key))}: ${confidencePercent(scores[key] || 0)}%</li>`).join('')}</ul>${reasons.length ? `<p>${reasons.map(escapeHtml).join('<br>')}</p>` : ''}</section><section class="module-card"><h3>Quote Draft</h3><p><strong>Scope:</strong> ${escapeHtml(JSON.stringify(record.scopeOfWork || record.structuredEstimate?.scope_of_work || record.summary || '', null, 2))}</p><p><strong>Labor:</strong> ${escapeHtml(JSON.stringify(record.laborLineItems || record.structuredEstimate?.labor_line_items || [], null, 2))}</p><p><strong>Materials:</strong> ${escapeHtml(JSON.stringify(record.materialLineItems || record.structuredEstimate?.material_line_items || [], null, 2))}</p><p><strong>Pricing:</strong> ${record.amountCents ? money(record.amountCents) : escapeHtml(JSON.stringify(record.pricingSummary || record.structuredEstimate?.pricing_summary || {}, null, 2))}</p></section><section class="module-card"><h3>Activity</h3><p>Status changes, emails, quote updates, and admin notes will appear here when returned by the endpoints.</p><p>${escapeHtml(record.internalAdminNotes || record.admin_notes || record.notes || '')}</p></section></div></article>`;
      };
      const runAction = async (action) => {
        if (!selected) return;
        if (action === 'generate-ai') {
          try { const response = await TAAI.draftQuote({ jobRequestId: selected.requestId || selected.id, requestContext: selected, researchMode:'internal_live' }); selected = normalize(response.draft || response.result || response, 'quote'); TAUi.toast('AI draft generated. Review before sending.', 'success'); render(); }
          catch (error) { selected = normalize(error.data?.manualDraft || selected, 'manual'); TAUi.toast(error.data?.message || 'AI estimate generation failed. Continue manually?'); render(); }
          return;
        }
        if (action === 'manual') { TAModuleKit.openDetail(root, { title:'Estimate & Request Center', detailSections }, { ...selected, status:'draft' }); return; }
        TAUi.toast(`${titleize(action)} action is ready for backend workflow review. Admin can continue manually.`);
      };
      const render = () => {
        const visible = filtered(); if (!visible.includes(selected)) selected = visible[0] || records[0] || null;
        root.innerHTML = `<section class="module-page stack estimate-request-center"><div class="module-hero module-header card"><div><p class="eyebrow">Admin Workspace</p><h2 class="module-title">💰 Estimate & Request Center</h2><p class="module-description">Customer Request → AI Review → Information Needed → Quote Draft → Quote Sent → Accepted → Work Order.</p></div><div class="action-row"><button class="btn" data-action="generate-ai">Generate AI Draft</button><button class="btn secondary" data-action="manual">Create Manual Draft</button></div></div><div class="module-stat-grid">${kpis()}</div><section class="card module-section stack"><div class="module-panel-head"><div>${tabs()}</div><label class="field module-search"><span>Search/filter</span><input data-search placeholder="Customer, address, service, status, confidence, worker" value="${escapeHtml(query)}"></label></div><div class="estimate-split"><div class="module-record-list">${visible.length ? visible.map(card).join('') : '<article class="module-empty"><h3>No records in this tab</h3><p>Try All or change your search.</p></article>'}</div><div class="estimate-detail-panel">${detail(selected)}</div></div></section></section>`;
        root.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => { active = button.dataset.tab; render(); }));
        root.querySelector('[data-search]')?.addEventListener('input', (event) => { query = event.target.value; render(); });
        root.querySelectorAll('[data-select]').forEach((item) => item.addEventListener('click', () => { selected = records.find((record) => String(record.id) === item.dataset.select); render(); }));
        root.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => runAction(button.dataset.action)));
      };
      await load();
    }, async destroy(){}, async refresh(){}
  });
})();
