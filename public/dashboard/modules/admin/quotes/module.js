(() => {
  const escapeHtml = (value = '') => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const asArray = (value) => Array.isArray(value) ? value : value ? [value] : [];
  const titleize = (value = '') => String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  const dateText = (value) => value ? new Date(value).toLocaleDateString([], { month:'short', day:'numeric', year:'numeric' }) : 'No date';
  const money = (cents) => window.TAUi?.money ? TAUi.money(Number(cents || 0) / 100) : `$${(Number(cents || 0) / 100).toFixed(2)}`;
  const statuses = { inbox:['new'], needs_review:['needs_review','quote_in_progress','pending_review'], information_needed:['information_needed'], draft:['draft','draft_admin_review'], sent:['sent','quote_sent','viewed'], accepted:['accepted'], declined:['declined'], all:[] };
  const confidencePercent = (value) => window.TAQuotes?.confidencePercent ? TAQuotes.confidencePercent(value) : Math.round(Number(value || 0) <= 1 ? Number(value || 0) * 100 : Number(value || 0));
  const confidenceLabel = (pct) => pct >= 88 ? 'Very High' : pct >= 74 ? 'High' : pct >= 55 ? 'Medium' : 'Low';
  const confidence = (record = {}) => {
    const scores = record.confidenceScores || record.aiMetadata?.confidenceScores || record.structuredEstimate?.confidence_scores || {};
    const explanation = record.confidenceExplanation || record.structuredEstimate?.confidence_explanation || {};
    const raw = Number(explanation.score ?? scores.overall ?? record.confidence ?? 0);
    const pct = confidencePercent(raw);
    return { pct, label: explanation.label || confidenceLabel(pct) };
  };
  const normalize = (item = {}, kind = 'record') => {
    const draft = window.TAQuotes?.normalizeAiDraft ? TAQuotes.normalizeAiDraft(item) : item;
    return {
      ...draft,
      kind,
      id: item.id || item.quoteId || item.requestId || item.jobRequestId || item.job_request_id,
      requestId: item.requestId || item.request_id || item.jobRequestId || item.job_request_id || item.id,
      customerName: draft.customerName || item.requesterName || item.requester_name || item.clientName || item.client_name || item.email || item.requester_email || 'Customer',
      serviceType: draft.serviceType || item.serviceType || item.service_type || item.title || 'Service request',
      address: item.streetAddress || item.street_address || item.address || draft.propertySummary || item.city || '',
      description: item.description || item.summary || draft.description || '',
      status: item.status || item.request_status || 'new',
      createdAt: item.createdAt || item.created_at || item.request_created_at,
      updatedAt: item.updatedAt || item.updated_at || item.request_updated_at,
    };
  };
  const ai = (record = {}) => record.aiStructuredQuote || record.aiStructuredEstimate || record.structuredEstimate?.aiStructuredQuote || record.aiMetadata?.aiStructuredQuote || record.structuredEstimate || record;
  const getPricingEngine = (record) => ai(record).pricingEngine || record.structuredEstimate?.pricing_engine || record.pricingEngine || {};
  const getPricingSummary = (record) => record.structuredEstimate?.pricing_summary || ai(record).pricingSummary || record.pricingSummary || {};
  const nextAction = (record) => record.recommendedAction || record.structuredEstimate?.recommended_action || (confidence(record).pct >= 74 ? 'Ready for estimator/admin review.' : confidence(record).pct >= 55 ? 'Review assumptions or request one detail.' : 'Request more information before sending.');
  const list = (items, empty = 'None listed') => `<ul>${asArray(items).length ? asArray(items).map((item) => `<li>${escapeHtml(typeof item === 'string' ? item : item.name || item.label || item.cause || JSON.stringify(item))}</li>`).join('') : `<li>${escapeHtml(empty)}</li>`}</ul>`;
  const lineItems = (items, type = 'material') => {
    const rows = asArray(items);
    if (!rows.length) return '<p class="module-empty">No line items yet.</p>';
    return `<div class="quote-line-table">${rows.map((item) => `<div><strong>${escapeHtml(item.name || item.label || item.phase || 'Line item')}</strong><span>${escapeHtml(item.quantity ? `${item.quantity} ${item.unit || ''}` : item.lowHours || item.highHours ? `${item.lowHours || '?'}-${item.highHours || '?'} hrs` : item.notes || '')}</span><span>${type === 'material' ? money(item.totalCostCents || item.estimatedBuyCostCents || item.unitCostCents || 0) : escapeHtml(item.notes || item.description || '')}</span></div>`).join('')}</div>`;
  };

  window.TAModules.register({
    id:'admin.quotes', role:'admin', title:'Estimate Management Center', icon:'💰', permissions:['quotes.manage'],
    async mount({ root, api }) {
      let records = [];
      let active = 'pending';
      let selected = null;
      let query = '';
      const detailSections = ['Customer information','Job intake','AI analysis','AI quote output','Pricing engine','Admin review workflow','Confidence explanation','Activity'];
      const load = async () => {
        root.innerHTML = '<article class="card module-loading"><h3>Loading AI Quote Studio</h3><p>Combining customer requests, AI analysis, quote drafts, and admin review workflow.</p></article>';
        try {
          const [quoteData, requestData] = await Promise.all([api.get('/api/admin/quotes').catch(() => ({})), api.get('/api/admin/job-requests').catch(() => ({}))]);
          const quotes = asArray(quoteData.quotes).map((item) => normalize(item, 'quote'));
          const requests = asArray(requestData.requests).map((item) => normalize(item, 'request'));
          const seen = new Set(quotes.map((item) => String(item.requestId || item.id)));
          records = [...requests.filter((item) => !seen.has(String(item.requestId || item.id))), ...quotes].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
          selected = records[0] || null;
          render();
        } catch (error) {
          root.innerHTML = `<section class="module-page stack"><article class="card module-error"><h2>AI Quote Studio</h2><p>${escapeHtml(error.message || 'Unable to load requests and quotes.')}</p><button class="btn secondary" id="retry-estimates">Retry</button></article></section>`;
          root.querySelector('#retry-estimates')?.addEventListener('click', load);
        }
      };
      const filtered = () => records.filter((record) => {
        const statusMatch = active === 'history' || (statuses[active] || []).includes(String(record.status || '').toLowerCase());
        const c = confidence(record);
        const text = `${record.customerName} ${record.address} ${record.serviceType} ${record.status} ${record.description} ${c.label} ${c.pct}`.toLowerCase();
        return statusMatch && (!query || text.includes(query.toLowerCase()));
      });
      const count = (keys) => records.filter((record) => keys.includes(String(record.status || '').toLowerCase())).length;
      const kpis = () => [ ['New Requests', count(['new']), '🆕'], ['Needs AI Review', count(['needs_review','quote_in_progress','pending_review']), '🤖'], ['Info Needed', count(['information_needed']), '❓'], ['Draft Quotes', count(['draft','draft_admin_review']), '📝'], ['Sent', count(['sent','quote_sent','viewed']), '📬'], ['Accepted', count(['accepted']), '✅'] ].map(([label, value, icon]) => `<article class="module-stat stat-card"><span>${icon}</span><strong>${value}</strong><small>${label}</small></article>`).join('');
      const tabs = () => [['inbox','Inbox'],['needs_review','Needs Review'],['information_needed','Information Needed'],['draft','Drafts'],['sent','Sent'],['accepted','Accepted'],['declined','Declined'],['all','All']].map(([key,label]) => `<button class="btn secondary ${active===key?'active':''}" data-tab="${key}">${label}</button>`).join('');
      const card = (record) => { const c = confidence(record); return `<article class="module-record-card ${selected?.id===record.id?'active':''}" data-select="${escapeHtml(record.id)}"><div><p class="eyebrow">${escapeHtml(titleize(record.status))}</p><h3>${escapeHtml(record.customerName)}</h3><p>${escapeHtml(record.serviceType)} • ${escapeHtml(record.address || 'No property listed')}</p><p>${escapeHtml(record.description).slice(0, 160)}</p><small>Created ${escapeHtml(dateText(record.createdAt))} • Updated ${escapeHtml(dateText(record.updatedAt))}</small><div class="action-row"><span class="status-badge ${c.pct>=74?'success':c.pct>=55?'warning':'danger'}">${c.label} ${c.pct}%</span><span class="status-badge">${escapeHtml(nextAction(record))}</span></div></div></article>`; };
      const confidencePanel = (record) => {
        const data = ai(record);
        const scores = record.confidenceScores || record.structuredEstimate?.confidence_scores || data.confidenceScores || {};
        const explanation = data.confidenceExplanation || record.structuredEstimate?.confidence_explanation || {};
        const factors = explanation.factors || {};
        const keys = ['trade_certainty','scope','photo_quality','equipment_identification','pricing','measurements','materials','regional_data','code_requirements','customer_description_quality','labor','information_completeness','research'];
        return `<section class="module-card quote-section"><h3>SECTION 3 · AI Analysis & Confidence</h3><div class="analysis-grid"><span>Trade Detection<strong>${escapeHtml(data.aiAnalysis?.tradeDetection || data.tradeCategory || record.serviceType)}</strong></span><span>Scope Detection<strong>${escapeHtml(data.aiAnalysis?.scopeDetection || data.jobClassification || 'Pending')}</strong></span><span>Complexity<strong>${escapeHtml(data.aiAnalysis?.complexityScore ?? '—')}/10</strong></span><span>Risk<strong>${escapeHtml(data.aiAnalysis?.riskScore ?? '—')}/10</strong></span><span>Confidence<strong>${confidence(record).label} ${confidence(record).pct}%</strong></span></div><p>${escapeHtml(explanation.explanation || data.pricingConfidenceReason || nextAction(record))}</p><div class="confidence-grid">${keys.map((key) => `<span>${escapeHtml(titleize(key))}<strong>${confidencePercent(scores[key] ?? factors[key] ?? 0)}%</strong></span>`).join('')}</div>${list(data.confidenceReasons || record.structuredEstimate?.confidence_reasons, 'AI has not listed confidence reasons yet.')}</section>`;
      };
      const pricingPanel = (record) => {
        const engine = getPricingEngine(record);
        const summary = getPricingSummary(record);
        const low = engine.lowRangeCents ?? summary.low_range_cents ?? summary.total_low_cents ?? ai(record).totalLowCents;
        const recommended = engine.recommendedRangeCents ?? summary.recommended_range_cents ?? summary.fixed_price_recommendation_cents ?? ai(record).fixedPriceRecommendationCents ?? record.amountCents;
        const premium = engine.premiumRangeCents ?? summary.premium_range_cents ?? summary.total_high_cents ?? ai(record).totalHighCents;
        return `<section class="module-card quote-section pricing-engine"><h3>SECTION 5 · Pricing Engine</h3><div class="price-range-grid"><span>Low Range<strong>${money(low)}</strong></span><span>Recommended<strong>${money(recommended)}</strong></span><span>Premium Range<strong>${money(premium)}</strong></span></div><div class="quote-line-table"><div><strong>Labor</strong><span>${escapeHtml(engine.laborHours || ai(record).laborHoursHigh || '—')} Hours × $${escapeHtml(engine.laborRate || ai(record).laborRateUsed || '—')}/hr</span><span>${money(engine.laborCents || 0)}</span></div><div><strong>Materials</strong><span>Quantity-based allowance</span><span>${money(engine.materialCostCents || 0)}</span></div><div><strong>Equipment / Rental</strong><span>Equipment + rental</span><span>${money((engine.equipmentCents || 0) + (engine.rentalCents || 0))}</span></div><div><strong>Permit</strong><span>Code/permit allowance</span><span>${money(engine.permitCents || 0)}</span></div><div><strong>Travel / Disposal</strong><span>Travel + disposal</span><span>${money((engine.travelCents || 0) + (engine.disposalCents || 0))}</span></div><div><strong>Overhead / Markup</strong><span>${escapeHtml(`${Math.round((engine.overheadRate || 0) * 100)}% overhead • ${Math.round((engine.markupRate || 0) * 100)}% markup`)}</span><span>${money((engine.overheadCents || 0) + (engine.markupCents || 0))}</span></div></div><h4>Why</h4>${list(engine.why || summary.why || [engine.totalFormula].filter(Boolean), 'Generate AI draft to show component pricing logic.')}</section>`;
      };
      const detail = (record) => {
        if (!record) return '<article class="card module-empty"><h3>No request selected</h3><p>Select a request or quote to review details.</p></article>';
        const data = ai(record);
        return `<article class="card module-section stack estimate-detail ai-quote-studio"><div class="module-header"><div><p class="eyebrow">${escapeHtml(titleize(record.status))}</p><h2>${escapeHtml(record.customerName)}</h2><p>${escapeHtml(record.serviceType)} • ${escapeHtml(record.address || 'No address')}</p></div><span class="status-badge ${confidence(record).pct>=74?'success':confidence(record).pct>=55?'warning':'danger'}">${confidence(record).label} ${confidence(record).pct}%</span></div><div class="module-tabs"><button class="btn" data-action="generate-ai">Regenerate Quote</button><button class="btn secondary" data-action="accept-quote">Accept AI Quote</button><button class="btn secondary" data-action="manual">Modify AI Quote</button><button class="btn secondary" data-action="info">Request More Information</button><button class="btn secondary" data-action="save-final">Save Final Version</button><button class="btn secondary" data-action="send">Send Quote</button></div><div class="quote-workflow-grid"><section class="module-card quote-section"><h3>SECTION 1 · Customer Information</h3><p><strong>Customer:</strong> ${escapeHtml(record.customerName)}</p><p><strong>Property Type:</strong> ${escapeHtml(record.propertyType || data.propertyType || record.structuredEstimate?.property_summary || 'Not specified')}</p><p><strong>Location:</strong> ${escapeHtml(record.address || 'Not provided')}</p><p><strong>Trade:</strong> ${escapeHtml(data.tradeCategory || data.trade || record.serviceType)}</p><p><strong>Priority:</strong> ${escapeHtml(record.priority || record.urgency || 'Normal')}</p></section><section class="module-card quote-section"><h3>SECTION 2 · Job Intake</h3><p><strong>Description:</strong> ${escapeHtml(record.description || data.customerReadySummary || '')}</p><p><strong>Photos:</strong> ${escapeHtml(data.photoAnalysis?.quality || data.photoConfidenceImpact || 'No photo analysis yet')}</p><p><strong>Measurements:</strong> ${escapeHtml(asArray(data.missingMeasurementsNeeded).length ? `Needed: ${asArray(data.missingMeasurementsNeeded).join(', ')}` : 'No missing measurements listed')}</p><p><strong>Existing Equipment:</strong> ${escapeHtml(data.photoAnalysis?.equipment || data.equipmentBreakdown?.[0]?.name || 'Not identified')}</p><p><strong>Notes:</strong> ${escapeHtml(record.internalAdminNotes || record.admin_notes || record.notes || '')}</p></section>${confidencePanel(record)}<section class="module-card quote-section quote-output"><h3>SECTION 4 · AI Quote Output</h3><h4>Job Summary</h4><p>${escapeHtml(data.jobSummary || data.customerReadySummary || record.summary || 'Generate an AI draft to populate.')}</p><h4>Detailed Scope</h4>${list(data.detailedScope || record.structuredEstimate?.detailed_scope || data.scopeOfWork)}<h4>Labor Breakdown</h4>${lineItems(data.laborPhases || record.structuredEstimate?.labor_line_items, 'labor')}<h4>Material Breakdown</h4>${lineItems(data.materialBreakdown || record.structuredEstimate?.material_line_items, 'material')}<h4>Equipment Breakdown</h4>${lineItems(data.equipmentBreakdown || record.structuredEstimate?.equipment_breakdown, 'material')}<h4>Permits</h4>${list(data.permitBreakdown || record.structuredEstimate?.permit_breakdown, 'No permit listed or permit not expected.')}<h4>Recommended Upsells</h4>${list(data.recommendedUpsells || record.structuredEstimate?.recommended_upsells)}<h4>Maintenance Opportunities</h4>${list(data.maintenanceOpportunities || record.structuredEstimate?.maintenance_opportunities)}<h4>Safety Notes</h4>${list(data.safetyNotes || data.riskFlags || record.structuredEstimate?.safety_notes)}<h4>Warranty Notes</h4><p>${escapeHtml(data.warrantyNotes || record.structuredEstimate?.warranty_notes || 'Admin to confirm warranty language before sending.')}</p></section>${pricingPanel(record)}<section class="module-card quote-section"><h3>Admin Review Workflow</h3><p>Use Accept, Modify, Regenerate, Request Info, Save Final Version, and Send Quote controls above. Confidence is tracked with every generated AI draft and correction-ready final quote.</p>${list(data.adminReviewChecklist, 'No admin checklist yet.')}</section></div></article>`;
      };
      const runAction = async (action) => {
        if (!selected) return;
        if (action === 'generate-ai') {
          try {
            const response = await TAAI.draftQuote({ jobRequestId: selected.requestId || selected.id, requestContext: selected, researchMode:'internal_live', workflowMode:'quote_2_component_pricing' });
            selected = normalize(response.draft || response.result || response, 'quote');
            records = [selected, ...records.filter((record) => String(record.id) !== String(selected.id))];
            TAUi.toast('AI Quote 2.0 draft generated with component pricing and explainable confidence.', 'success');
            render();
          } catch (error) {
            selected = normalize(error.data?.manualDraft || selected, 'manual');
            TAUi.toast(error.data?.message || 'AI estimate generation failed. Continue manually?');
            render();
          }
          return;
        }
        if (action === 'manual' || action === 'accept-quote' || action === 'save-final') { TAModuleKit.openDetail(root, { title:'AI Quote Studio', detailSections }, { ...selected, status: action === 'accept-quote' ? 'draft_admin_review' : selected.status, aiConfidence: confidence(selected) }); return; }
        TAUi.toast(`${titleize(action)} action is connected to the admin review workflow. Continue review before sending.`);
      };
      const render = () => {
        const visible = filtered();
        if (!visible.includes(selected)) selected = visible[0] || records[0] || null;
        root.innerHTML = `<section class="module-page stack estimate-request-center"><div class="module-hero module-header card"><div><p class="eyebrow">Admin AI Workflow</p><h2 class="module-title">💰 AI Quote Studio 2.0</h2><p class="module-description">Customer intake → AI analysis → component pricing → explainable confidence → admin approval.</p></div><div class="action-row"><button class="btn" data-action="generate-ai">Generate AI Quote</button><button class="btn secondary" data-action="manual">Create Manual Draft</button></div></div><div class="module-stat-grid">${kpis()}</div><section class="card module-section stack"><div class="module-panel-head"><div>${tabs()}</div><label class="field module-search"><span>Search/filter</span><input data-search placeholder="Customer, address, service, status, confidence" value="${escapeHtml(query)}"></label></div><div class="estimate-split"><div class="module-record-list">${visible.length ? visible.map(card).join('') : '<article class="module-empty"><h3>No records in this tab</h3><p>Try All or change your search.</p></article>'}</div><div class="estimate-detail-panel">${detail(selected)}</div></div></section></section>`;
        root.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => { active = button.dataset.tab; render(); }));
        root.querySelector('[data-search]')?.addEventListener('input', (event) => { query = event.target.value; render(); });
        root.querySelectorAll('[data-select]').forEach((item) => item.addEventListener('click', () => { selected = records.find((record) => String(record.id) === item.dataset.select); render(); }));
        root.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => runAction(button.dataset.action)));
      };
      await load();
    }, async destroy(){}, async refresh(){}
  });
})();
