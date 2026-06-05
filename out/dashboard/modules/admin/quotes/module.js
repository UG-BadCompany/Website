(() => {
  const escapeHtml = (value = '') => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const asArray = (value) => Array.isArray(value) ? value : value ? [value] : [];
  const titleize = (value = '') => String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  const compact = (value, fallback = 'Not provided') => {
    const text = String(value ?? '').trim();
    return text && text !== 'quote_in_progress' ? text : fallback;
  };
  const dateText = (value) => value ? new Date(value).toLocaleDateString([], { month:'short', day:'numeric', year:'numeric' }) : 'No date';
  const money = (cents) => window.TAUi?.money ? TAUi.money(Number(cents || 0) / 100) : `$${(Number(cents || 0) / 100).toFixed(2)}`;
  const dollarsToCents = (value) => window.TAQuotes?.moneyToCents ? TAQuotes.moneyToCents(value) : Math.round(Math.max(0, Number(value || 0)) * 100);
  const centsToDollars = (value) => (Number(value || 0) / 100).toFixed(2);
  const confidencePercent = (value) => window.TAQuotes?.confidencePercent ? TAQuotes.confidencePercent(value) : Math.round(Number(value || 0) <= 1 ? Number(value || 0) * 100 : Number(value || 0));
  const confidenceLabel = (pct) => pct >= 88 ? 'Very High' : pct >= 74 ? 'High' : pct >= 55 ? 'Medium' : 'Low';
  const STATUS_TABS = {
    inbox:['new'], needs_review:['needs_review','quote_in_progress','pending_review'], information_needed:['information_needed'],
    drafts:['draft','draft_admin_review'], sent:['sent','quote_sent','viewed'], accepted:['accepted'], declined:['declined'], cancelled:['cancelled'], all:[]
  };
  const TAB_LABELS = [['inbox','Inbox'],['needs_review','Needs Review'],['information_needed','Information Needed'],['drafts','Drafts'],['sent','Sent'],['accepted','Accepted'],['declined','Declined'],['cancelled','Cancelled'],['all','All']];

  const ai = (record = {}) => record.aiStructuredQuote || record.aiStructuredEstimate || record.structuredEstimate?.aiStructuredQuote || record.aiMetadata?.aiStructuredQuote || record.structuredEstimate || record.aiMetadata || record;
  const rawConfidence = (record = {}) => {
    const data = ai(record);
    const scores = record.confidenceScores || data.confidenceScores || data.confidence_scores || record.structuredEstimate?.confidence_scores || {};
    const explanation = data.confidenceExplanation || data.confidence_explanation || record.structuredEstimate?.confidence_explanation || {};
    return { scores, explanation };
  };
  const confidence = (record = {}) => {
    const { scores, explanation } = rawConfidence(record);
    const raw = Number(explanation.score ?? scores.overall ?? record.confidence ?? record.informationCompletenessScore ?? 0);
    const pct = confidencePercent(raw);
    return { pct, label: explanation.label || confidenceLabel(pct), explanation: explanation.explanation || record.sourcingNotes || '' };
  };
  const parseLine = (item = {}, type = 'labor') => window.TAQuotes?.normalizeLine ? TAQuotes.normalizeLine(item, type) : (() => {
    const qty = Number(item.quantity ?? item.qty ?? (type === 'labor' ? item.hours ?? item.lowHours ?? item.highHours ?? 1 : 1));
    const unitCostCents = Number(item.unitCostCents ?? item.unit_cost_cents ?? item.rateCents ?? item.rate_cents ?? item.estimatedBuyCostCents ?? dollarsToCents(item.unitCost ?? item.unit_cost ?? item.rate ?? item.price ?? 0));
    const markupPct = Number(item.markupPct ?? item.markup_percent ?? item.markup ?? 0);
    const totalCents = Number(item.totalCents ?? item.totalCostCents ?? item.total_cents ?? item.total_cents ?? Math.round(qty * unitCostCents * (1 + (markupPct / 100))));
    return { description: item.description || item.name || item.material || item.label || item.phase || (type === 'labor' ? 'Labor line' : 'Material line'), quantity: Number.isFinite(qty) ? qty : 1, unit: item.unit || (type === 'labor' ? 'hours' : 'each'), unitCostCents: Number.isFinite(unitCostCents) ? unitCostCents : 0, markupPct: Number.isFinite(markupPct) ? markupPct : 0, totalCents: Number.isFinite(totalCents) ? totalCents : 0, notes: item.notes || '', source: item.source || '' };
  })();
  const normalize = (item = {}, kind = 'record') => {
    const draft = window.TAQuotes?.normalizeAiDraft ? TAQuotes.normalizeAiDraft(item) : item;
    const data = ai(draft);
    return {
      ...draft,
      kind,
      id: item.quoteId || item.id || item.requestId || item.jobRequestId || item.job_request_id,
      quoteId: item.quoteId || item.id || '',
      requestId: item.requestId || item.request_id || item.jobRequestId || item.job_request_id || item.jobRequest?.id || item.id,
      customerName: compact(draft.customerName || item.clientName || item.request?.requesterName || item.requesterName || item.requester_name || item.client?.fullName || item.email || item.requester_email, 'Customer'),
      customerEmail: draft.customerEmail || item.clientEmail || item.request?.requesterEmail || item.requesterEmail || item.requester_email || item.client?.email || '',
      customerPhone: draft.customerPhone || item.request?.requesterPhone || item.requesterPhone || item.requester_phone || item.client?.phone || '',
      serviceType: compact(draft.serviceType || draft.trade || item.serviceType || item.service_type || item.title, 'Service request'),
      address: compact([item.streetAddress || item.street_address || item.request?.streetAddress, item.city || item.request?.city, item.state || item.request?.state, item.zip || item.request?.zip].filter(Boolean).join(', ') || draft.propertySummary, 'No property listed'),
      description: compact(item.description || item.request?.description || item.summary || draft.description || data.customerReadySummary, ''),
      status: item.status || item.request_status || 'new',
      createdAt: item.createdAt || item.created_at || item.submittedAt || item.request_created_at,
      updatedAt: item.updatedAt || item.updated_at || item.request_updated_at || item.createdAt,
      scopeOfWork: compact(item.scopeOfWork || data.scopeOfWork || data.scope_of_work || item.summary || '', ''),
      laborLineItems: asArray(draft.laborLineItems || item.laborLineItems || data.laborLineItems || data.labor_line_items || data.laborPhases || data.labor_phases).map((line) => parseLine(line, 'labor')),
      materialLineItems: asArray(draft.materialLineItems || item.materialLineItems || data.materialLineItems || data.material_line_items || data.materials || data.materialBreakdown || data.material_breakdown).map((line) => parseLine(line, 'material')),
      otherPricing: draft.otherPricing || data.other_pricing || data.otherPricing || {},
      pricingSummary: draft.pricingSummary || data.pricing_summary || data.pricingSummary || {},
      researchMetadata: draft.researchMetadata || data.research_metadata || data.researchMetadata || {},
      pricingWarnings: asArray(draft.pricingWarnings || data.pricing_warnings),
      assumptions: asArray(item.assumptions || data.assumptions || data.keyAssumptions || data.key_assumptions),
      exclusions: asArray(item.exclusions || data.exclusions),
      customerNotes: item.customerNotes || data.customerNotes || data.customer_notes || data.customerReadySummary || '',
      internalNotes: item.internalNotes || item.internalAdminNotes || item.adminNotes || data.internalAdminNotes || data.internal_admin_notes || '',
      expirationDate: item.expirationDate || item.expiresAt || '',
      aiMetadata: item.aiMetadata || item.ai_metadata || draft.aiMetadata || {},
    };
  };
  const pricingFromRecord = (record = {}) => {
    const data = ai(record);
    const summary = record.pricingSummary || data.pricing_summary || data.pricingSummary || {};
    const engine = data.pricingEngine || record.pricingEngine || data.pricing_engine || record.otherPricing || data.other_pricing || {};
    const labor = asArray(record.laborLineItems).map((line) => parseLine(line, 'labor'));
    const materials = asArray(record.materialLineItems).map((line) => parseLine(line, 'material'));
    const laborTotal = labor.reduce((sum, line) => sum + line.totalCents, 0) || dollarsToCents(summary.labor_total || summary.laborTotal) || Number(summary.labor_total_cents || summary.laborTotalCents || engine.laborCents || 0);
    const materialTotal = materials.reduce((sum, line) => sum + line.totalCents, 0) || dollarsToCents(summary.material_total || summary.materials_total || summary.materialTotal) || Number(summary.material_total_cents || summary.materialTotalCents || engine.materialCostCents || 0);
    const other = {
      tripChargeCents: Number(record.tripChargeCents ?? engine.tripChargeCents ?? engine.trip_charge_cents ?? engine.travelCents ?? 0) || dollarsToCents(engine.trip_charge || engine.tripCharge || summary.trip_charge || summary.tripCharge), permitCents: Number(record.permitCents ?? engine.permitCents ?? engine.permit_cents ?? 0) || dollarsToCents(engine.permit || summary.permit),
      disposalCents: Number(record.disposalCents ?? engine.disposalCents ?? engine.disposal_cents ?? 0) || dollarsToCents(engine.disposal || summary.disposal), rentalCents: Number(record.rentalCents ?? engine.rentalCents ?? engine.rental_cents ?? 0) || dollarsToCents(engine.rental || summary.rental),
      markupCents: Number(record.markupCents ?? engine.markupCents ?? engine.markup_cents ?? 0) || dollarsToCents(engine.markup || summary.markup), taxCents: Number(record.taxCents ?? engine.taxCents ?? engine.tax_cents ?? 0) || dollarsToCents(engine.tax || summary.tax), discountCents: Number(record.discountCents ?? engine.discountCents ?? engine.discount_cents ?? 0) || dollarsToCents(engine.discount || summary.discount),
    };
    const otherTotal = other.tripChargeCents + other.permitCents + other.disposalCents + other.rentalCents + other.markupCents;
    const subtotal = laborTotal + materialTotal + otherTotal;
    const calculatedGrand = subtotal + other.taxCents - other.discountCents;
    const grandTotal = calculatedGrand || Number(record.amountCents ?? summary.grand_total_cents ?? summary.grandTotalCents ?? engine.recommendedRangeCents ?? data.fixedPriceRecommendationCents ?? 0);
    return { laborTotal, materialTotal, otherTotal, subtotal, grandTotal, ...other };
  };
  const nextAction = (record) => record.recommendedAction || ai(record).recommendedAction || ai(record).recommended_action || ({ new:'Generate AI draft or create a manual draft.', draft:'Edit, save, then send to client.', quote_in_progress:'Finish draft review.', sent:'Wait for client decision or resend.', accepted:'Convert to work order and invoice when ready.', declined:'Reopen as draft if needed.', cancelled:'View or restore if allowed.' }[record.status] || 'Review details and choose the next safe action.');

  window.TAModules.register({
    id:'admin.quotes', role:'admin', title:'Estimate & Quote Center', icon:'💰', permissions:['quotes.manage'],
    async mount({ root, api, user }) { root = root?.querySelector ? root : root?.root || root?.element || document.querySelector('[data-module-root], #module-root'); if (!root?.querySelector) throw new TypeError('Module root element was not found.');
      let records = [];
      let active = 'inbox';
      let selectedId = '';
      let query = '';
      const pinnedIds = new Set();
      let editing = false;
      let dirty = false;
      let working = '';
      const roles = user?.roles || user?.roleKeys || [];
      const keys = user?.permissions?.permissionKeys || user?.permissionKeys || [];
      const can = (permission) => roles.includes('owner') || keys.includes(permission) || keys.includes('admin.tools');
      const selected = () => selectedId ? records.find((record) => String(record.id) === String(selectedId)) || null : null;
      const toast = (message, type = 'info') => window.TAUi?.toast ? TAUi.toast(message, type) : alert(message);

      const load = async (keepId = selectedId) => {
        root.innerHTML = '<article class="card module-loading"><h3>Loading Estimate & Quote Center</h3><p>Loading live requests, draft quotes, sent quotes, and AI review details.</p></article>';
        const [quoteData, requestData] = await Promise.all([api.get('/api/admin/quotes?status=all'), api.get('/api/admin/job-requests').catch(() => ({}))]);
        const quotes = asArray(quoteData.quotes).map((item) => normalize(item, item.isRequestOnly ? 'request' : 'quote'));
        const seen = new Set(quotes.map((item) => String(item.requestId || item.id)));
        const requests = asArray(requestData.requests).map((item) => normalize(item, 'request')).filter((item) => !seen.has(String(item.requestId || item.id)));
        records = [...quotes, ...requests].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
        selectedId = keepId && records.some((record) => String(record.id) === String(keepId)) ? keepId : ''; // keep quotes collapsed by default
        editing = false; dirty = false; working = '';
        render();
      };
      const filtered = () => records.filter((record) => {
        const status = String(record.status || '').toLowerCase();
        const statusMatch = active === 'all' || (STATUS_TABS[active] || []).includes(status);
        const c = confidence(record);
        const text = `${record.customerName} ${record.customerEmail} ${record.address} ${record.serviceType} ${record.status} ${record.description} ${c.label} ${c.pct}`.toLowerCase();
        return statusMatch && (!query || text.includes(query.toLowerCase()));
      });
      const stat = (statuses) => records.filter((record) => statuses.includes(String(record.status || '').toLowerCase())).length;
      const kpis = () => [['Inbox', stat(['new']), '🆕'], ['Needs Review', stat(['needs_review','quote_in_progress','pending_review']), '🤖'], ['Drafts', stat(['draft','draft_admin_review']), '📝'], ['Sent', stat(['sent','quote_sent','viewed']), '📬'], ['Accepted', stat(['accepted']), '✅'], ['Cancelled', stat(['cancelled']), '⛔']].map(([label, value, icon]) => `<article class="module-stat stat-card"><span>${icon}</span><strong>${value}</strong><small>${label}</small></article>`).join('');
      const tabs = () => TAB_LABELS.map(([key,label]) => `<button class="btn secondary ${active===key?'active':''}" data-tab="${key}" type="button">${label}</button>`).join('');
      const badgeClass = (record) => { const pct = confidence(record).pct; return pct >= 74 ? 'success' : pct >= 55 ? 'warning' : 'danger'; };

      const scoreValue = (scores, keys, fallback = 0) => { for (const key of keys) { if (scores[key] !== undefined && scores[key] !== null) return scores[key]; } return fallback; };
      const confidenceReasons = (record = {}) => {
        const data = ai(record);
        const reasons = asArray(record.confidenceReasons || data.confidence_reasons || data.confidenceReasons);
        const positives = reasons.filter((reason) => !/missing|timed out|timeout|no photos|legacy normalized|unavailable|zero/i.test(String(reason)));
        const negatives = reasons.filter((reason) => /missing|timed out|timeout|no photos|legacy normalized|unavailable|zero/i.test(String(reason)));
        return { positives: positives.length ? positives : ['Customer request, scope, labor, material, pricing, and research signals were scored separately.'], negatives };
      };

      const fallbackActive = (record = {}, line = {}) => Boolean(record.fallbackUsed || record.aiMetadata?.fallbackUsed || ai(record).fallback_used || ai(record).fallbackUsed || line.fallbackUsed || line.fallback_used);
      const aiStatusLabel = (record = {}, line = {}) => {
        if (fallbackActive(record, line)) return 'Fallback Used';
        const meta = record.researchMetadata || ai(record).research_metadata || {};
        return meta.openai_live_search_used ? 'AI + Live Pricing' : 'AI Generated';
      };
      const sourceBadge = (record = {}, line = {}) => `<span class="status-badge ${fallbackActive(record, line) ? 'warning' : 'success'} quote-line-badge">${escapeHtml(aiStatusLabel(record, line))}</span>`;
      const collapsibleText = (value = '', limit = 180) => {
        const text = cleanText(value || '');
        if (!text) return '<p>No notes provided.</p>';
        if (text.length <= limit) return `<p>${escapeHtml(text)}</p>`;
        return `<details class="quote-show-more"><summary>Show More</summary><p>${escapeHtml(text)}</p></details>`;
      };
      const formatModel = (model = 'gpt-5.5') => String(model || 'gpt-5.5').replace(/^gpt/i, 'GPT');
      const researchStatus = (record = {}) => {
        const meta = record.researchMetadata || ai(record).research_metadata || {};
        const model = formatModel(meta.openai_model || record.meta?.model || ai(record).model || 'gpt-5.5');
        const responsesUsed = meta.responses_api_used !== false && (meta.responses_api_used || record.aiEnhanced || ai(record).aiEnhanced || model);
        const live = Boolean(meta.openai_live_search_used || meta.openai_live_search_requested || meta.openAiLiveSearchAttempted || meta.openAiLiveSearchAvailable);
        return { meta, model, mode: responsesUsed ? 'OpenAI Responses API' : (fallbackActive(record) ? 'Fallback Estimate' : 'OpenAI Responses API'), research: live ? 'Internal + Historical + Live' : 'Internal + Historical', live };
      };
      const lineCards = (items, type, record = {}) => asArray(items).map((line, index) => {
        const qty = line.quantity || line.hours || 1;
        const rate = line.unitCostCents || line.rateCents || line.unit_cost_cents || line.rate_cents || 0;
        const supplier = line.supplier || line.sourceName || line.source || 'Internal catalog';
        return `<article class="quote-line-card quote-line-card-stacked" data-line-row="${type}" data-index="${index}"><div class="quote-line-title"><h4>${escapeHtml(line.name || line.description || `${titleize(type)} item`)}</h4>${sourceBadge(record, line)}</div>${collapsibleText(line.description || line.notes || '')}<div class="quote-line-stack">${type==='labor' ? `<span>Hours:<strong>${escapeHtml(qty)}</strong></span><span>Rate:<strong>${money(rate)}/hr</strong></span><span>Total:<strong>${money(line.totalCents)}</strong></span><span>Confidence:<strong>${escapeHtml(titleize(line.confidence || 'High'))}</strong></span><span class="wide">Notes:<strong>${escapeHtml(cleanText(line.notes || line.description || 'Standard service labor.').slice(0, 140))}</strong></span>` : `<span>Qty:<strong>${escapeHtml(qty)}</strong></span><span>Unit Cost:<strong>${money(rate)}</strong></span><span>Markup:<strong>${escapeHtml(line.markupPct ?? line.markup_percent ?? 0)}%</strong></span><span>Total:<strong>${money(line.totalCents)}</strong></span><span>Supplier:<strong>${escapeHtml(supplier)}</strong></span>`}</div></article>`;
      }).join('') || `<article class="module-empty">No ${type} line items yet.</article>`;
      const analysisPanel = (record) => {
        const data = ai(record); const c = confidence(record); const { scores } = rawConfidence(record); const status = researchStatus(record);
        const detectedTrade = data.trade || record.trade || record.serviceType || 'Not detected';
        const detectedScope = data.scope_of_work || data.scopeOfWork || record.scopeOfWork || record.description || 'No detected scope yet.';
        const missing = record.missingInformation || data.missingInformation || data.recommended_questions || data.missingInfoQuestions || data.questions_needed || [];
        const assumptions = record.assumptions || data.assumptions || [];
        return `<section class="module-card quote-section quote-ai-analysis"><h3>AI Analysis</h3><div class="quote-analysis-summary"><span>Detected Trade<strong>${escapeHtml(detectedTrade)}</strong></span><span>Detected Scope<strong>${escapeHtml(cleanText(detectedScope).slice(0,180))}</strong></span><span>Confidence<strong>${escapeHtml(c.label)} · ${c.pct}%</strong></span><span>Research Status<strong>${escapeHtml(status.research)}</strong></span></div><details class="quote-analysis-detail" open><summary>Missing Information</summary>${list(missing, 'No missing information flagged.')}</details><details class="quote-analysis-detail" open><summary>Assumptions</summary>${list(assumptions, 'No assumptions listed.')}</details><details class="quote-analysis-detail"><summary>Advanced AI Details</summary><div class="confidence-grid quote-analysis-scores">${[['Overall',c.pct],['Info',scoreValue(scores,['information_completeness','data_completeness'])],['Scope',scoreValue(scores,['scope','scope_completeness'])],['Labor',scoreValue(scores,['labor'])],['Materials',scoreValue(scores,['materials','material_certainty'])],['Pricing',scoreValue(scores,['pricing','pricing_certainty'])],['Research',scoreValue(scores,['research'])]].map(([label,value])=>{const pct=label==='Overall'?value:confidencePercent(value);return `<span>${escapeHtml(label)}<strong>${pct}%</strong></span>`;}).join('')}</div>${list([data.admin_review?.accuracy_review, data.admin_review?.risk_flags, data.admin_review?.admin_next_steps].flat().filter(Boolean), 'No advanced details listed.')}</details></section>`;
      };
      const cleanText = (value = '') => String(value || '').replace(/ADMIN REVIEW DRAFT[\s\S]*/ig, '').replace(/Do not send without review\.?/ig, '').replace(/quote_in_progress/ig, '').trim();

      const card = (record) => {
        const c = confidence(record); const price = pricingFromRecord(record).grandTotal;
        const open = String(selectedId) === String(record.id);
        const addressParts = String(record.address || '').split(',').map((part) => part.trim()).filter(Boolean);
        return `<article class="module-record-card quote-accordion-card ${open?'active':''}" data-select="${escapeHtml(record.id)}" tabindex="0" aria-expanded="${open}"><div class="quote-card-main"><div class="quote-card-grid"><div class="quote-card-cell quote-customer"><span>Customer</span><strong>${escapeHtml(record.customerName)}</strong></div><div class="quote-card-cell"><span>Service</span><strong>${escapeHtml(record.serviceType)}</strong></div><div class="quote-card-cell quote-address"><span>Address</span><strong>${escapeHtml(record.address || 'No property listed')}</strong></div><div class="quote-card-cell"><span>Status</span><strong>${escapeHtml(titleize(record.status))}</strong></div><div class="quote-card-cell"><span>Confidence</span><strong>${escapeHtml(c.label)} · ${c.pct}%</strong></div><div class="quote-card-cell quote-price"><span>Price</span><strong>${price ? money(price) : 'No price yet'}</strong></div><div class="quote-card-cell"><span>Updated</span><strong>${escapeHtml(dateText(record.updatedAt))}</strong></div></div><div class="quote-card-actions quote-card-quick-actions"><button class="btn tiny secondary quote-expand-btn" type="button" data-quote-side-action="collapse">${open?'Collapse':'Expand'}</button><button class="btn tiny secondary" type="button" data-quote-side-action="pin">Pin</button><button class="btn tiny secondary" type="button" data-quote-side-action="preview">Preview Client</button></div></div>${open ? `<div class="quote-card-extra"><div class="quote-side-summary"><span>Short scope</span>${collapsibleText(record.description, 150)}</div><div class="quote-side-summary"><span>Recommended action</span><p>${escapeHtml(nextAction(record))}</p></div><div class="quote-card-actions"><button class="btn tiny" type="button" data-quote-side-action="open">Open Full Quote</button><button class="btn tiny secondary" type="button" data-quote-side-action="preview">Preview Client Quote</button><button class="btn tiny secondary" type="button" data-quote-side-action="collapse">Collapse</button></div></div>` : ''}</article>`;
      };
      const rows = (items, type) => asArray(items).map((line, index) => `<tr data-line-row="${type}" data-index="${index}"><td>${escapeHtml(line.name || line.description)}</td><td>${escapeHtml(line.quantity)} ${escapeHtml(line.unit)}</td><td>${money(line.unitCostCents || line.rateCents)}</td><td>${escapeHtml(line.markupPct || 0)}%</td><td><strong>${money(line.totalCents)}</strong></td></tr>`).join('') || '<tr><td colspan="5">No line items yet.</td></tr>';
      const list = (items, empty = 'None listed') => `<ul class="quote-clean-list">${asArray(items).length ? asArray(items).map((item) => `<li>${escapeHtml(typeof item === 'string' ? item : item.description || item.name || item.label || item.reason || JSON.stringify(item))}</li>`).join('') : `<li>${escapeHtml(empty)}</li>`}</ul>`;
      const clientPayload = (record) => window.TAQuotes?.buildClientQuotePayload ? TAQuotes.buildClientQuotePayload(record) : { title: record.title, scopeOfWork: record.scopeOfWork || record.summary, customerNotes: record.customerNotes, assumptions: record.assumptions, exclusions: record.exclusions, totalCents: pricingFromRecord(record).grandTotal, detailMode:'summary' };
      const clientPreview = (record) => { const payload = clientPayload(record); const grouped = payload.groupedPricing; const lineItems = asArray(payload.lineItems); return `<section class="module-card quote-section quote-client-preview"><div class="module-panel-head"><div><p class="eyebrow">Customer-facing preview · ${escapeHtml(payload.company?.name || 'Company')}</p><h3>${escapeHtml(payload.title || 'Service quote')}</h3><p>Quote #${escapeHtml(payload.quoteNumber || record.quoteId || record.id || '')} · ${escapeHtml(dateText(payload.quoteDate || record.createdAt))}</p></div><strong>${money(payload.totalCents || pricingFromRecord(record).grandTotal)}</strong></div><div class="quote-total-grid"><span>Customer<strong>${escapeHtml(payload.customerName || record.customerName || 'Customer')}</strong></span><span>Property<strong>${escapeHtml(payload.propertySummary || record.address || 'Property')}</strong></span><span>Service<strong>${escapeHtml(payload.serviceType || record.serviceType || 'Service')}</strong></span><span>Expires<strong>${escapeHtml(dateText(payload.expirationDate))}</strong></span></div><h4>Job summary</h4><p>${escapeHtml(payload.jobSummary || 'Job summary will be shown here.')}</p><h4>Scope of work</h4><p>${escapeHtml(payload.scopeOfWork || 'Scope will be shown here after review.')}</p><div class="grid grid-2"><div><h4>What is included</h4>${list(payload.included, 'Labor and materials listed in this quote.')}</div><div><h4>Materials / allowances</h4><p>${escapeHtml(payload.materialsSummary || '')}</p></div><div><h4>Labor / service</h4><p>${escapeHtml(payload.laborSummary || '')}</p></div><div><h4>Timeline</h4><p>${escapeHtml(payload.estimatedTimeline || 'Timeline confirmed after approval.')}</p></div></div>${payload.customerNotes ? `<h4>Notes</h4><p>${escapeHtml(payload.customerNotes)}</p>` : ''}<h4>Assumptions</h4>${list(payload.assumptions, 'No customer-facing assumptions listed.')}<h4>Exclusions</h4>${list(payload.exclusions, 'No customer-facing exclusions listed.')}${payload.warrantyNotes ? `<h4>Warranty</h4><p>${escapeHtml(payload.warrantyNotes)}</p>` : ''}${grouped ? `<div class="quote-total-grid"><span>Labor<strong>${money(grouped.laborTotalCents)}</strong></span><span>Materials<strong>${money(grouped.materialTotalCents)}</strong></span><span>Other<strong>${money(grouped.otherTotalCents)}</strong></span></div>` : ''}${lineItems.length ? `<table class="quote-editor-table"><tbody>${rows(lineItems, 'client')}</tbody></table>` : ''}<div class="quote-client-actions"><button class="btn" type="button" disabled>Approve Quote</button><button class="btn secondary" type="button" disabled>Request Changes</button><button class="btn secondary" type="button" disabled>Decline</button></div></section>`; };
      const researchPanel = (record) => {
        const status = researchStatus(record); const meta = status.meta; const sources = asArray(meta.sources).slice(0, 5);
        const fallback = fallbackActive(record); const reason = record.fallbackReason || record.aiMetadata?.fallbackReason || meta.fallback_reason || 'None';
        const ownerDebug = roles.includes('owner') ? `<details class="quote-owner-debug"><summary>Owner Debug Panel</summary><div class="quote-debug-grid"><span>OpenAI Called:<strong>${meta.responses_api_used === false ? 'NO' : 'YES'}</strong></span><span>Model:<strong>${escapeHtml(status.model)}</strong></span><span>Web Search:<strong>${status.live ? 'YES' : 'NO'}</strong></span><span>Historical Quotes:<strong>YES</strong></span><span>Internal Catalog:<strong>${meta.internal_catalog_used === false ? 'NO' : 'YES'}</strong></span><span>Fallback Used:<strong>${fallback ? 'YES' : 'NO'}</strong></span>${fallback ? `<span class="wide">Fallback Reason:<strong>${escapeHtml(reason)}</strong></span>` : ''}</div></details>` : '';
        return `<section class="module-card quote-section"><h3>Research Sources</h3><div class="quote-openai-status"><span>Mode:<strong>${escapeHtml(status.mode)}</strong></span><span>Model:<strong>${escapeHtml(status.model)}</strong></span><span>Research:<strong>${escapeHtml(status.research)}</strong></span></div><p>${escapeHtml(meta.pricing_confidence_reason || 'Internal catalog and OpenAI quote research are available for admin review.')}</p>${sources.length ? `<ul class="quote-clean-list">${sources.map((source) => `<li>${escapeHtml(source.title || source.source || 'Pricing source')} ${source.price ? `· ${escapeHtml(source.price)}` : ''}</li>`).join('')}</ul>` : ''}${ownerDebug}</section>`;
      };
      const confidencePanel = (record) => {
        const data = ai(record); const c = confidence(record); const { scores } = rawConfidence(record);
        const keysToShow = [['overall', c.pct], ['labor', scores.labor], ['materials', scores.materials], ['pricing', scores.pricing], ['scope', scores.scope], ['information_completeness', scores.information_completeness ?? record.informationCompletenessScore], ['research', scores.research]];
        return `<section class="module-card quote-section quote-confidence-box"><h3>12. Confidence Breakdown</h3><div class="confidence-grid">${keysToShow.map(([key, value]) => { const pct = confidencePercent(value ?? 0); return `<span>${escapeHtml(titleize(key))}<strong>${confidenceLabel(pct)} · ${pct}%</strong></span>`; }).join('')}</div><p>${escapeHtml(c.explanation || data.pricingConfidenceReason || nextAction(record))}</p></section>`;
      };
      const pricingPanel = (record) => {
        const totals = pricingFromRecord(record); const lineGrand = asArray(record.laborLineItems).reduce((sum,line)=>sum+Number(line.totalCents||0),0)+asArray(record.materialLineItems).reduce((sum,line)=>sum+Number(line.totalCents||0),0)+totals.otherTotal+totals.taxCents-totals.discountCents; const mismatch = totals.grandTotal && Math.abs(lineGrand - totals.grandTotal) > 1;
        return `<section class="module-card quote-section quote-totals-box"><h3>7. Pricing</h3>${mismatch ? `<p class="module-error">Line item total ${money(lineGrand)} does not match grand total ${money(totals.grandTotal)}. Recalculate or add an admin override before sending.</p>` : ''}<div class="quote-total-grid"><span>Labor total<strong>${money(totals.laborTotal)}</strong></span><span>Material total<strong>${money(totals.materialTotal)}</strong></span><span>Other charges<strong>${money(totals.otherTotal)}</strong></span><span>Subtotal<strong>${money(totals.subtotal)}</strong></span><span>Tax<strong>${money(totals.taxCents)}</strong></span><span>Discount<strong>-${money(totals.discountCents)}</strong></span><span class="grand">Grand total<strong>${money(totals.grandTotal)}</strong></span></div><div class="quote-line-table compact"><div><strong>Trip charge</strong><span>${money(totals.tripChargeCents)}</span></div><div><strong>Permit</strong><span>${money(totals.permitCents)}</span></div><div><strong>Disposal</strong><span>${money(totals.disposalCents)}</span></div><div><strong>Rental</strong><span>${money(totals.rentalCents)}</span></div><div><strong>Markup</strong><span>${money(totals.markupCents)}</span></div></div></section>`;
      };
      const readOnlyDetail = (record) => {
        if (!record) return '<article class="card module-empty"><h3>No record selected</h3><p>Select a request or quote to review.</p></article>';
        const data = ai(record); const c = confidence(record); const labor = record.laborLineItems; const materials = record.materialLineItems;
        return `<article class="card module-section stack estimate-detail"><div class="module-header"><div><p class="eyebrow">${escapeHtml(titleize(record.status))}</p><h2>${escapeHtml(record.customerName)}</h2><p>${escapeHtml(record.serviceType)} · ${escapeHtml(record.address)}</p></div><span class="status-badge ${badgeClass(record)}">${c.label} ${c.pct}%</span></div>${actionBar(record)}<div class="quote-workflow-grid"><section class="module-card quote-section"><h3>1. Customer Information</h3><p><strong>Name:</strong> ${escapeHtml(record.customerName)}</p><p><strong>Email:</strong> ${escapeHtml(record.customerEmail || 'Missing email')}</p><p><strong>Phone:</strong> ${escapeHtml(record.customerPhone || 'Not provided')}</p><p><strong>Property:</strong> ${escapeHtml(record.address)}</p></section><section class="module-card quote-section"><h3>2. Request / Job Intake</h3><p><strong>Service:</strong> ${escapeHtml(record.serviceType)}</p><p>${escapeHtml(record.description || 'No intake description provided.')}</p><p><strong>Next recommended action:</strong> ${escapeHtml(nextAction(record))}</p></section>${analysisPanel(record)}<section class="module-card quote-section quote-output"><h3>4. Quote Scope</h3><p>${escapeHtml(record.scopeOfWork || record.summary || 'Create or generate a draft to add scope.')}</p></section><section class="module-card quote-section quote-line-display"><h3>5. Labor</h3>${lineCards(labor, 'labor', record)}</section><section class="module-card quote-section quote-line-display"><h3>6. Materials</h3>${lineCards(materials, 'material', record)}</section>${pricingPanel(record)}<section class="module-card quote-section"><h3>8. Assumptions</h3>${list(record.assumptions, 'No assumptions listed.')}</section><section class="module-card quote-section"><h3>9. Exclusions</h3>${list(record.exclusions, 'No exclusions listed.')}</section><section class="module-card quote-section"><h3>10. Customer Notes</h3><p>${escapeHtml(record.customerNotes || 'No customer-facing notes yet.')}</p></section><section class="module-card quote-section"><h3>11. Internal Notes</h3><p>${escapeHtml(record.internalNotes || 'No internal notes yet.')}</p></section>${confidencePanel(record)}${researchPanel(record)}<section class="module-card quote-section"><h3>13. Activity / History</h3><p>Created ${escapeHtml(dateText(record.createdAt))}. Last updated ${escapeHtml(dateText(record.updatedAt))}. Current status: <strong>${escapeHtml(titleize(record.status))}</strong>.</p></section></div></article>`;
      };
      const actionBar = (record) => {
        const status = String(record.status || '').toLowerCase();
        const isDraft = record.kind !== 'request' && ['draft','draft_admin_review','quote_in_progress','pending_review','needs_review'].includes(status);
        const isSent = ['sent','quote_sent','viewed'].includes(status);
        const actions = [];
        if (['new','needs_review'].includes(status) || record.kind === 'request') actions.push(['generate-ai','Generate AI Draft','',can('ai.quote.use')], ['manual','Create Manual Draft','secondary',can('quotes.create')], ['request-info','Request More Information','secondary',can('requests.manage')]);
        if (isDraft) actions.push(['edit','Edit Quote','',can('quotes.edit')], ['preview-client','Preview Client Quote','secondary',can('quotes.manage')], ['send','Send to Client','secondary',can('quotes.send')], ['recalculate','Recalculate AI','secondary',can('ai.quote.use')], ['request-info','Request More Information','secondary',can('requests.manage')], ['delete-draft','Delete Draft','danger',can('quotes.delete')]);
        if (isSent) actions.push(['preview-client','Preview Client Quote','secondary',can('quotes.manage')], ['send','Resend','secondary',can('quotes.send')], ['mark-accepted','Mark Accepted','secondary',can('quotes.manage')], ['mark-declined','Mark Declined','secondary',can('quotes.manage')], ['request-info','Request Changes','secondary',can('requests.manage')], ['cancel-quote','Cancel Quote','danger',can('quotes.delete')]);
        if (status === 'accepted') actions.push(['preview-client','Preview Client Quote','secondary',can('quotes.manage')], ['convert-work-order','Convert to Work Order','',can('workorders.create')], ['create-invoice','Create Invoice','secondary',can('invoices.create')], ['cancel-quote','Cancel Quote','danger',can('quotes.delete')]);
        if (status === 'declined') actions.push(['preview-client','Preview Client Quote','secondary',can('quotes.manage')], ['reopen-draft','Reopen as Draft','secondary',can('quotes.edit')]);
        if (status === 'cancelled') actions.push(['restore-draft','Restore as Draft','secondary',can('quotes.edit')]);
        return `<div class="module-tabs quote-actions sticky-actions">${actions.filter((a) => a[3]).map(([action, label, cls]) => `<button class="btn ${cls || ''}" data-action="${action}" type="button" ${working ? 'disabled' : ''}>${working === action ? 'Working…' : label}</button>`).join('')}</div>`;
      };

      const editor = (record) => {
        const totals = pricingFromRecord(record);
        const mode = record.clientQuoteDetailMode || record.aiMetadata?.aiStructuredQuote?.client_quote_detail_mode || 'summary';
        return `<article class="card module-section stack estimate-detail quote-editor" data-editor><div class="module-header"><div><p class="eyebrow">Edit mode</p><h2>${escapeHtml(record.customerName)}</h2><p>One Save Draft button persists editable quote fields. Client preview excludes admin-only AI review details.</p></div><span class="status-badge warning">Unsaved edits stay local until saved</span></div><form id="quote-edit-form" class="quote-edit-form">${clientPreview(record)}<section class="module-card quote-section"><h3>Quote Basics</h3><div class="grid grid-2"><label class="field"><span>Title</span><input name="title" value="${escapeHtml(record.title || `${record.serviceType} quote`)}"></label><label class="field"><span>Status</span><select name="status"><option value="draft" ${record.status==='draft'?'selected':''}>Draft</option><option value="quote_in_progress" ${record.status==='quote_in_progress'?'selected':''}>Quote In Progress</option><option value="needs_review" ${record.status==='needs_review'?'selected':''}>Needs Review</option></select></label><label class="field"><span>Expiration date</span><input type="date" name="expirationDate" value="${escapeHtml(String(record.expirationDate || '').slice(0,10))}"></label><label class="field"><span>Client quote detail mode</span><select name="clientQuoteDetailMode"><option value="summary" ${mode==='summary'?'selected':''}>Customer Summary</option><option value="grouped" ${mode==='grouped'?'selected':''}>Grouped Labor/Materials</option><option value="line_items" ${mode==='line_items'?'selected':''}>Detailed Line Items</option></select></label><label class="field"><span>Grand total</span><input name="grandTotal" data-money-field value="${centsToDollars(totals.grandTotal)}"></label></div><label class="field"><span>Scope of work (customer-facing only)</span><textarea name="scopeOfWork">${escapeHtml(record.scopeOfWork || record.summary || '')}</textarea></label></section><section class="module-card quote-section quote-line-editor-section"><h3>Labor</h3><div data-lines="labor">${lineEditor(record.laborLineItems, 'labor')}</div><button class="btn secondary" type="button" data-add-line="labor">Add labor line</button></section><section class="module-card quote-section quote-line-editor-section"><h3>Materials</h3><div data-lines="material">${lineEditor(record.materialLineItems, 'material')}</div><button class="btn secondary" type="button" data-add-line="material">Add material</button></section><section class="module-card quote-section quote-other-pricing"><h3>Other Pricing</h3><div class="grid grid-3 quote-other-grid"><label class="field"><span>Trip charge</span><input data-money-field name="tripCharge" value="${centsToDollars(totals.tripChargeCents)}"></label><label class="field"><span>Permit</span><input data-money-field name="permit" value="${centsToDollars(totals.permitCents)}"></label><label class="field"><span>Disposal</span><input data-money-field name="disposal" value="${centsToDollars(totals.disposalCents)}"></label><label class="field"><span>Rental</span><input data-money-field name="rental" value="${centsToDollars(totals.rentalCents)}"></label><label class="field"><span>Tax</span><input data-money-field name="tax" value="${centsToDollars(totals.taxCents)}"></label><label class="field"><span>Discount</span><input data-money-field name="discount" value="${centsToDollars(totals.discountCents)}"></label></div><div class="quote-live-total" data-live-total>Grand total: ${money(totals.grandTotal)}</div></section><section class="module-card quote-section"><h3>Customer Notes</h3><label class="field"><span>Assumptions</span><textarea name="assumptions">${escapeHtml(record.assumptions.join('\\n'))}</textarea></label><label class="field"><span>Exclusions</span><textarea name="exclusions">${escapeHtml(record.exclusions.join('\\n'))}</textarea></label><label class="field"><span>Customer-facing notes</span><textarea name="customerNotes">${escapeHtml(record.customerNotes || '')}</textarea></label></section><details class="module-card quote-section quote-admin-details"><summary><strong>Internal AI review / admin notes</strong></summary><label class="field"><span>Internal admin notes</span><textarea name="internalNotes">${escapeHtml(record.internalNotes || '')}</textarea></label>${list(record.pricingWarnings, 'No line-item normalization warnings.')}</details></form><div class="module-tabs quote-actions sticky-actions"><button class="btn" data-action="save-draft" type="button" ${working?'disabled':''}>${working==='save-draft'?'Saving…':'Save Draft'}</button><button class="btn secondary" data-action="preview-client" type="button">Preview Client Quote</button><button class="btn secondary" data-action="send" type="button" ${working?'disabled':''}>${working==='send'?'Sending…':'Send to Client'}</button><button class="btn secondary" data-action="recalculate" type="button">Recalculate AI</button><button class="btn secondary" data-action="cancel-edit" type="button">Cancel Editing</button><button class="btn danger" data-action="delete-draft" type="button">Delete Draft</button></div></article>`;
      };

      const lineEditor = (items, type) => asArray(items).map((line) => `<div class="quote-edit-line" data-edit-line="${type}"><div class="quote-edit-line-head"><strong>${escapeHtml(line.name || line.description || (type==='labor'?'Labor item':'Material item'))}</strong></div><label class="field quote-line-description-input"><span>Description</span><input name="description" placeholder="Description" value="${escapeHtml(line.description)}"></label><label class="field"><span>Qty</span><input name="quantity" type="number" step="0.01" min="0" value="${escapeHtml(line.quantity)}"></label><label class="field"><span>Unit</span><input name="unit" value="${escapeHtml(line.unit)}"></label><label class="field"><span>Cost</span><input name="unitCost" type="number" step="0.01" min="0" value="${centsToDollars(line.unitCostCents)}"></label><label class="field"><span>Markup</span><input name="markupPct" type="number" step="0.01" min="0" value="${escapeHtml(line.markupPct)}"></label><div class="quote-edit-total"><span>Total</span><strong data-line-total>${money(line.totalCents)}</strong></div><button class="btn danger" type="button" data-remove-line>Delete</button></div>`).join('') || `<div class="module-empty">No ${type} lines yet. Add one below.</div>`;
      const collectPayload = (record) => {
        const form = root.querySelector('#quote-edit-form'); const fd = new FormData(form);
        const collectLines = (type) => [...root.querySelectorAll(`[data-edit-line="${type}"]`)].map((row) => { const q = Number(row.querySelector('[name="quantity"]')?.value || 0); const unit = dollarsToCents(row.querySelector('[name="unitCost"]')?.value || 0); const markup = Number(row.querySelector('[name="markupPct"]')?.value || 0); return { description: row.querySelector('[name="description"]')?.value || '', quantity: q, unit: row.querySelector('[name="unit"]')?.value || '', unitCostCents: unit, markupPct: markup, totalCents: Math.round(q * unit * (1 + markup / 100)) }; }).filter((line) => line.description || line.totalCents);
        const laborLineItems = collectLines('labor'); const materialLineItems = collectLines('material');
        const other = { tripChargeCents: dollarsToCents(fd.get('tripCharge')), permitCents: dollarsToCents(fd.get('permit')), disposalCents: dollarsToCents(fd.get('disposal')), rentalCents: dollarsToCents(fd.get('rental')), taxCents: dollarsToCents(fd.get('tax')), discountCents: dollarsToCents(fd.get('discount')) };
        const subtotal = laborLineItems.reduce((s,l)=>s+l.totalCents,0) + materialLineItems.reduce((s,l)=>s+l.totalCents,0) + other.tripChargeCents + other.permitCents + other.disposalCents + other.rentalCents + (other.markupCents || 0);
        const amountCents = subtotal + other.taxCents - other.discountCents;
        const pricingSummary = window.TAQuotes?.buildPricingSummary ? TAQuotes.buildPricingSummary(laborLineItems, materialLineItems, other) : { grand_total_cents: amountCents };
        return { quoteId: record.quoteId || record.id, jobRequestId: record.requestId, title: fd.get('title') || `${record.serviceType} quote`, summary: fd.get('scopeOfWork') || '', amountCents, status: fd.get('status') || 'draft', expirationDate: fd.get('expirationDate') || '', aiMetadata: { ...(record.aiMetadata || {}), aiStructuredQuote: { ...(ai(record) || {}), scopeOfWork: fd.get('scopeOfWork') || '', scope_of_work: fd.get('scopeOfWork') || '', laborLineItems, labor_line_items: laborLineItems, materialLineItems, material_line_items: materialLineItems, other_pricing: other, pricing_summary: pricingSummary, assumptions: String(fd.get('assumptions') || '').split('\n').filter(Boolean), exclusions: String(fd.get('exclusions') || '').split('\n').filter(Boolean), customerNotes: fd.get('customerNotes') || '', customer_notes: fd.get('customerNotes') || '', internalAdminNotes: fd.get('internalNotes') || '', internal_admin_notes: fd.get('internalNotes') || '', research_metadata: record.researchMetadata || ai(record).research_metadata || {}, pricingEngine: other, client_quote_detail_mode: fd.get('clientQuoteDetailMode') || 'summary' }, quoteEditor: { laborLineItems, materialLineItems, pricingSummary, ...other }, clientQuoteDetailMode: fd.get('clientQuoteDetailMode') || 'summary', clientQuotePayload: window.TAQuotes?.buildClientQuotePayload ? TAQuotes.buildClientQuotePayload({ ...record, scopeOfWork: fd.get('scopeOfWork') || '', customerNotes: fd.get('customerNotes') || '', assumptions: String(fd.get('assumptions') || '').split('\n').filter(Boolean), exclusions: String(fd.get('exclusions') || '').split('\n').filter(Boolean), laborLineItems, materialLineItems, otherPricing: other, clientQuoteDetailMode: fd.get('clientQuoteDetailMode') || 'summary' }) : null } };
      };
      const refreshAfter = async (id) => { await load(id); };
      const saveDraft = async (send = false) => {
        const record = selected(); const payload = editing ? collectPayload(record) : { quoteId: record.quoteId || record.id, jobRequestId: record.requestId, title: record.title || `${record.serviceType} quote`, summary: record.scopeOfWork || record.summary || record.description, amountCents: pricingFromRecord(record).grandTotal, aiMetadata: record.aiMetadata || ai(record) || {} };
        payload.action = send ? 'send' : 'save_draft'; payload.sendToClient = send; if (send && window.TAQuotes?.buildClientQuotePayload) payload.aiMetadata = { ...(payload.aiMetadata || {}), clientQuotePayload: TAQuotes.buildClientQuotePayload({ ...record, ...(payload.aiMetadata?.aiStructuredQuote || {}) }) };
        if (send) {
          const lines = payload.aiMetadata?.quoteEditor || {};
          const allLines = [...asArray(lines.laborLineItems), ...asArray(lines.materialLineItems)];
          const badContent = [payload.summary, payload.title, ...allLines.map((line) => line.description || line.name || '')].some((value) => /quote_in_progress|ADMIN REVIEW DRAFT|Do not send without review/i.test(String(value || '')));
          const lineTotal = allLines.reduce((sum, line) => sum + Number(line.totalCents || 0), 0) + Number(lines.tripChargeCents || 0) + Number(lines.permitCents || 0) + Number(lines.disposalCents || 0) + Number(lines.rentalCents || 0) + Number(lines.markupCents || 0) + Number(lines.taxCents || 0) - Number(lines.discountCents || 0);
          if (!record.customerEmail) throw new Error('Customer email is required before sending.');
          if (!payload.summary) throw new Error('Scope of work is required before sending.');
          if (!allLines.length) throw new Error('At least one labor or material line is required before sending.');
          if (!payload.amountCents || payload.amountCents <= 0) throw new Error('Grand total must be greater than zero before sending.');
          if (Math.abs(lineTotal - payload.amountCents) > 1) throw new Error('Line item totals must match the grand total before sending.');
          if (allLines.some((line) => !Number(line.totalCents || 0) || !Number(line.unitCostCents || 0))) throw new Error('Each labor/material line needs a price before sending. Use admin override by entering an allowance price.');
          if (badContent) throw new Error('Remove admin-only AI/status text from visible quote content before sending.');
        }
        const method = payload.quoteId && !String(payload.quoteId).startsWith('request:') ? 'patch' : 'post';
        const response = await api[method]('/api/admin/quotes', payload);
        return response.quote;
      };
      const runAction = async (action) => {
        let record = selected(); if (!record && records[0]) { selectedId = records[0].id; record = selected(); } if (!record) return;
        try {
          if (action === 'edit') { editing = true; dirty = false; render(); return; }
          if (action === 'cancel-edit') { if (dirty && !confirm('Discard unsaved quote edits?')) return; editing = false; dirty = false; render(); return; }
          if (action === 'preview-client') { const w = window.open('', '_blank', 'noopener,noreferrer'); if (w) { w.document.write(`<title>Client Quote Preview</title><link rel="stylesheet" href="/assets/css/styles.css"><main style="max-width:840px;margin:2rem auto;font-family:system-ui;padding:1rem">${clientPreview(record)}</main>`); w.document.close(); } return; }
          working = action; render();
          if (action === 'save-draft') { const quote = await saveDraft(false); toast('Draft saved and persisted.', 'success'); await refreshAfter(quote?.id || record.id); return; }
          if (action === 'send') { const quote = await saveDraft(true); toast('Quote sent to the client.', 'success'); await refreshAfter(quote?.id || record.id); return; }
          if (action === 'manual') { editing = true; selectedId = record.id; render(); return; }
          if (action === 'generate-ai' || action === 'recalculate') { const response = await TAAI.draftQuote({ jobRequestId: record.requestId || record.id, quoteId: record.quoteId || '', requestContext: record, researchMode:'internal_live', workflowMode:'quote_2_component_pricing' }); if (!response.ok && !response.draft) throw new Error(response.message || 'AI draft failed.'); const draft = window.TAQuotes?.normalizeAiDraft ? TAQuotes.normalizeAiDraft(response.draft || response.manualDraft || response.result || {}) : (response.draft || response.manualDraft || response.result || {}); if (response.manualOverride) toast(response.message || 'AI unavailable; manual draft shell is ready.', 'warning'); else toast('AI draft recalculated. Review and save the draft.', 'success'); records = records.map((item) => String(item.id) === String(record.id) ? normalize({ ...record, ...draft, id: record.id, quoteId: record.quoteId, requestId: record.requestId }, record.kind) : item); editing = true; dirty = true; working = ''; render(); return; }
          const confirmText = { 'delete-draft':'Delete this draft? This cannot be undone for unsent drafts.', 'cancel-quote':'Cancel this quote? It will be hidden from active sending.', 'mark-accepted':'Mark this quote accepted?', 'mark-declined':'Mark this quote declined?', 'convert-work-order':'Convert accepted quote to a work order?', 'create-invoice':'Create invoice from this accepted quote?' }[action];
          if (confirmText && !confirm(confirmText)) { working = ''; render(); return; }
          const response = await api.patch('/api/admin/quotes', { action: action.replace(/-/g, '_'), quoteId: record.quoteId || record.id, jobRequestId: record.requestId, title: record.title || `${record.serviceType} quote`, summary: record.scopeOfWork || record.summary || record.description || 'Quote', amountCents: pricingFromRecord(record).grandTotal, aiMetadata: record.aiMetadata || {} });
          toast(response.message || `${titleize(action)} complete.`, 'success');
          await refreshAfter(response.quote?.id || record.id);
        } catch (error) {
          working = ''; render(); toast(error.data?.message || error.message || 'Action failed.', 'error');
        }
      };
      const recalcLive = () => {
        let subtotal = 0;
        root.querySelectorAll('[data-edit-line]').forEach((row) => { const q = Number(row.querySelector('[name="quantity"]')?.value || 0); const unit = dollarsToCents(row.querySelector('[name="unitCost"]')?.value || 0); const markup = Number(row.querySelector('[name="markupPct"]')?.value || 0); const total = Math.round(q * unit * (1 + markup / 100)); subtotal += total; const target = row.querySelector('[data-line-total]'); if (target) target.textContent = money(total); });
        ['tripCharge','permit','disposal','rental','tax'].forEach((name) => { subtotal += dollarsToCents(root.querySelector(`[name="${name}"]`)?.value || 0); });
        subtotal -= dollarsToCents(root.querySelector('[name="discount"]')?.value || 0);
        const grand = root.querySelector('[name="grandTotal"]'); if (grand && document.activeElement !== grand) grand.value = centsToDollars(subtotal);
        const live = root.querySelector('[data-live-total]'); if (live) live.textContent = `Grand total: ${money(dollarsToCents(grand?.value || 0) || subtotal)}`;
      };
      const render = () => {
        const visible = filtered();
        if (selectedId && visible.length && !visible.some((item) => String(item.id) === String(selectedId))) selectedId = '';
        const record = selected();
        root.innerHTML = `<section class="module-page stack estimate-request-center"><div class="module-hero module-header card"><div><p class="eyebrow">Owner · Admin · Manager quoting workflow</p><h2 class="module-title">💰 Estimate & Quote Center</h2><p class="module-description">One permission-safe center for customer requests, AI review, editable quote drafts, sending, acceptance, work orders, and invoices.</p></div><div class="action-row">${can('ai.quote.use') ? '<button class="btn" data-action="generate-ai" type="button">Generate AI Draft</button>' : ''}${can('quotes.create') ? '<button class="btn secondary" data-action="manual" type="button">Create Manual Draft</button>' : ''}</div></div><div class="module-stat-grid">${kpis()}</div><section class="card module-section stack"><div class="module-panel-head"><div class="module-tabs">${tabs()}</div><label class="field module-search"><span>Search</span><input data-search placeholder="Customer, address, service, status, confidence" value="${escapeHtml(query)}"></label></div><div class="estimate-split"><aside class="module-record-list">${visible.length ? visible.map(card).join('') : '<article class="module-empty"><h3>No matching quotes</h3><p>Use another tab or adjust search filters.</p></article>'}</aside><div class="estimate-detail-panel">${record ? (editing ? editor(record) : readOnlyDetail(record)) : '<article class="card module-empty quote-collapsed-empty"><h3>Select a quote to review</h3><p>Quotes stay collapsed until you open one. Opening a quote collapses the previous quote unless it is pinned.</p></article>'}</div></div></section></section>`;
        root.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => { active = button.dataset.tab; editing = false; render(); }));
        root.querySelector('[data-search]')?.addEventListener('input', (event) => { query = event.target.value; render(); });
        root.querySelectorAll('[data-select]').forEach((item) => item.addEventListener('click', (event) => { if (event.target.closest('[data-pin-quote],[data-quote-side-action]')) return; if (dirty && editing && !confirm('Discard unsaved quote edits?')) return; const nextId = item.dataset.select; selectedId = String(selectedId) === String(nextId) && !pinnedIds.has(String(nextId)) ? '' : nextId; editing = false; dirty = false; render(); }));
        root.querySelectorAll('[data-quote-side-action]').forEach((button) => button.addEventListener('click', (event) => { event.stopPropagation(); const card = button.closest('[data-select]'); const id = String(card?.dataset.select || selectedId || ''); const action = button.dataset.quoteSideAction; if (action === 'collapse') selectedId = String(selectedId) === String(id) ? '' : id; if (action === 'pin') { if (pinnedIds.has(id)) pinnedIds.delete(id); else { pinnedIds.clear(); pinnedIds.add(id); selectedId = id; } } if (action === 'open') { selectedId = id; editing = false; } if (action === 'preview') { selectedId = id; editing = false; } render(); }));
        root.querySelectorAll('[data-pin-quote]').forEach((button) => button.addEventListener('click', (event) => { event.stopPropagation(); const id = String(button.dataset.pinQuote || ''); if (!id) return; if (pinnedIds.has(id)) pinnedIds.delete(id); else { pinnedIds.clear(); pinnedIds.add(id); selectedId = id; } render(); }));
        root.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => runAction(button.dataset.action)));
        root.querySelectorAll('[data-add-line]').forEach((button) => button.addEventListener('click', () => { const type = button.dataset.addLine; const container = root.querySelector(`[data-lines="${type}"]`); if (container?.querySelector('.module-empty')) container.innerHTML = ''; container?.insertAdjacentHTML('beforeend', lineEditor([{ description:'', quantity:1, unit:type==='labor'?'hours':'each', unitCostCents:0, markupPct:0, totalCents:0 }], type)); dirty = true; renderEditorEvents(); }));
        renderEditorEvents();
      };
      const renderEditorEvents = () => {
        root.querySelectorAll('#quote-edit-form input, #quote-edit-form textarea, #quote-edit-form select').forEach((input) => input.addEventListener('input', () => { dirty = true; recalcLive(); }));
        root.querySelectorAll('[data-remove-line]').forEach((button) => button.addEventListener('click', () => { button.closest('[data-edit-line]')?.remove(); dirty = true; recalcLive(); }));
      };
      await load();
    }, async destroy(){}, async refresh(){}
  });
})();
