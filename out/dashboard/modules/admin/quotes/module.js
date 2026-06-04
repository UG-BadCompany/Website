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
  const dollarsToCents = (value) => Math.round(Math.max(0, Number(value || 0)) * 100);
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
  const parseLine = (item = {}, type = 'labor') => {
    const qty = Number(item.quantity ?? item.qty ?? (type === 'labor' ? item.hours ?? item.lowHours ?? item.highHours ?? 1 : 1));
    const unitCostCents = Number(item.unitCostCents ?? item.unit_cost_cents ?? item.rateCents ?? item.rate_cents ?? item.estimatedBuyCostCents ?? dollarsToCents(item.unitCost ?? item.rate ?? 0));
    const markupPct = Number(item.markupPct ?? item.markup_percent ?? item.markup ?? 0);
    const totalCents = Number(item.totalCents ?? item.totalCostCents ?? item.total_cents ?? Math.round(qty * unitCostCents * (1 + (markupPct / 100))));
    return { description: item.description || item.name || item.label || item.phase || (type === 'labor' ? 'Labor line' : 'Material line'), quantity: Number.isFinite(qty) ? qty : 1, unit: item.unit || (type === 'labor' ? 'hours' : 'each'), unitCostCents: Number.isFinite(unitCostCents) ? unitCostCents : 0, markupPct: Number.isFinite(markupPct) ? markupPct : 0, totalCents: Number.isFinite(totalCents) ? totalCents : 0, notes: item.notes || '' };
  };
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
      customerEmail: item.clientEmail || item.request?.requesterEmail || item.requesterEmail || item.requester_email || item.client?.email || '',
      customerPhone: item.request?.requesterPhone || item.requesterPhone || item.requester_phone || item.client?.phone || '',
      serviceType: compact(draft.serviceType || item.serviceType || item.service_type || item.title, 'Service request'),
      address: compact([item.streetAddress || item.street_address || item.request?.streetAddress, item.city || item.request?.city].filter(Boolean).join(', ') || draft.propertySummary, 'No property listed'),
      description: compact(item.description || item.request?.description || item.summary || draft.description || data.customerReadySummary, ''),
      status: item.status || item.request_status || 'new',
      createdAt: item.createdAt || item.created_at || item.submittedAt || item.request_created_at,
      updatedAt: item.updatedAt || item.updated_at || item.request_updated_at || item.createdAt,
      scopeOfWork: compact(item.scopeOfWork || data.scopeOfWork || data.scope_of_work || item.summary || '', ''),
      laborLineItems: asArray(item.laborLineItems || data.laborLineItems || data.labor_line_items || data.laborPhases || data.labor_phases).map((line) => parseLine(line, 'labor')),
      materialLineItems: asArray(item.materialLineItems || data.materialLineItems || data.material_line_items || data.materials || data.materialBreakdown || data.material_breakdown).map((line) => parseLine(line, 'material')),
      assumptions: asArray(item.assumptions || data.assumptions || data.keyAssumptions || data.key_assumptions),
      exclusions: asArray(item.exclusions || data.exclusions),
      customerNotes: item.customerNotes || data.customerNotes || data.customer_notes || data.customerReadySummary || '',
      internalNotes: item.internalNotes || item.internalAdminNotes || item.adminNotes || data.internalAdminNotes || data.internal_admin_notes || '',
      expirationDate: item.expirationDate || item.expiresAt || '',
    };
  };
  const pricingFromRecord = (record = {}) => {
    const data = ai(record);
    const engine = data.pricingEngine || record.pricingEngine || data.pricing_engine || {};
    const labor = asArray(record.laborLineItems).map((line) => parseLine(line, 'labor'));
    const materials = asArray(record.materialLineItems).map((line) => parseLine(line, 'material'));
    const laborTotal = labor.reduce((sum, line) => sum + line.totalCents, 0) || Number(engine.laborCents || 0);
    const materialTotal = materials.reduce((sum, line) => sum + line.totalCents, 0) || Number(engine.materialCostCents || 0);
    const other = {
      tripChargeCents: Number(record.tripChargeCents ?? engine.travelCents ?? 0), permitCents: Number(record.permitCents ?? engine.permitCents ?? 0),
      disposalCents: Number(record.disposalCents ?? engine.disposalCents ?? 0), rentalCents: Number(record.rentalCents ?? engine.rentalCents ?? 0),
      markupCents: Number(record.markupCents ?? engine.markupCents ?? 0), taxCents: Number(record.taxCents ?? engine.taxCents ?? 0), discountCents: Number(record.discountCents ?? engine.discountCents ?? 0),
    };
    const otherTotal = other.tripChargeCents + other.permitCents + other.disposalCents + other.rentalCents + other.markupCents;
    const subtotal = laborTotal + materialTotal + otherTotal;
    const grandTotal = Number(record.amountCents ?? engine.recommendedRangeCents ?? data.fixedPriceRecommendationCents ?? (subtotal + other.taxCents - other.discountCents));
    return { laborTotal, materialTotal, otherTotal, subtotal, grandTotal, ...other };
  };
  const nextAction = (record) => record.recommendedAction || ai(record).recommendedAction || ai(record).recommended_action || ({ new:'Generate AI draft or create a manual draft.', draft:'Edit, save, then send to client.', quote_in_progress:'Finish draft review.', sent:'Wait for client decision or resend.', accepted:'Convert to work order and invoice when ready.', declined:'Reopen as draft if needed.', cancelled:'View or restore if allowed.' }[record.status] || 'Review details and choose the next safe action.');

  window.TAModules.register({
    id:'admin.quotes', role:'admin', title:'Estimate & Quote Center', icon:'💰', permissions:['quotes.manage'],
    async mount({ root, api, user }) {
      let records = [];
      let active = 'inbox';
      let selectedId = '';
      let query = '';
      let editing = false;
      let dirty = false;
      let working = '';
      const roles = user?.roles || user?.roleKeys || [];
      const keys = user?.permissions?.permissionKeys || user?.permissionKeys || [];
      const can = (permission) => roles.includes('owner') || keys.includes(permission) || keys.includes('admin.tools');
      const selected = () => records.find((record) => String(record.id) === String(selectedId)) || records[0] || null;
      const toast = (message, type = 'info') => window.TAUi?.toast ? TAUi.toast(message, type) : alert(message);

      const load = async (keepId = selectedId) => {
        root.innerHTML = '<article class="card module-loading"><h3>Loading Estimate & Quote Center</h3><p>Loading live requests, draft quotes, sent quotes, and AI review details.</p></article>';
        const [quoteData, requestData] = await Promise.all([api.get('/api/admin/quotes?status=all'), api.get('/api/admin/job-requests').catch(() => ({}))]);
        const quotes = asArray(quoteData.quotes).map((item) => normalize(item, item.isRequestOnly ? 'request' : 'quote'));
        const seen = new Set(quotes.map((item) => String(item.requestId || item.id)));
        const requests = asArray(requestData.requests).map((item) => normalize(item, 'request')).filter((item) => !seen.has(String(item.requestId || item.id)));
        records = [...quotes, ...requests].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
        selectedId = keepId && records.some((record) => String(record.id) === String(keepId)) ? keepId : records[0]?.id || '';
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
      const card = (record) => {
        const c = confidence(record); const price = pricingFromRecord(record).grandTotal;
        return `<article class="module-record-card ${String(selectedId)===String(record.id)?'active':''}" data-select="${escapeHtml(record.id)}" tabindex="0"><p class="eyebrow">${escapeHtml(record.kind === 'request' ? 'Request' : 'Quote')} · ${escapeHtml(titleize(record.status))}</p><h3>${escapeHtml(record.customerName)}</h3><p><strong>${escapeHtml(record.serviceType)}</strong> · ${escapeHtml(record.address)}</p><p>${escapeHtml(record.description).slice(0, 180)}</p><div class="quote-card-meta"><span>${escapeHtml(dateText(record.createdAt))}</span><span>Updated ${escapeHtml(dateText(record.updatedAt))}</span>${price ? `<strong>${money(price)}</strong>` : '<span>No price yet</span>'}</div><div class="action-row"><span class="status-badge ${badgeClass(record)}">${c.label} ${c.pct}%</span><span class="status-badge">${escapeHtml(nextAction(record))}</span></div></article>`;
      };
      const rows = (items, type) => asArray(items).map((line, index) => `<tr data-line-row="${type}" data-index="${index}"><td>${escapeHtml(line.description)}</td><td>${escapeHtml(line.quantity)} ${escapeHtml(line.unit)}</td><td>${money(line.unitCostCents)}</td><td>${escapeHtml(line.markupPct)}%</td><td><strong>${money(line.totalCents)}</strong></td></tr>`).join('') || '<tr><td colspan="5">No line items yet.</td></tr>';
      const list = (items, empty = 'None listed') => `<ul class="quote-clean-list">${asArray(items).length ? asArray(items).map((item) => `<li>${escapeHtml(typeof item === 'string' ? item : item.description || item.name || item.label || item.reason || JSON.stringify(item))}</li>`).join('') : `<li>${escapeHtml(empty)}</li>`}</ul>`;
      const confidencePanel = (record) => {
        const data = ai(record); const c = confidence(record); const { scores } = rawConfidence(record);
        const keysToShow = [['overall', c.pct], ['labor', scores.labor], ['materials', scores.materials], ['pricing', scores.pricing], ['scope', scores.scope], ['information_completeness', scores.information_completeness ?? record.informationCompletenessScore], ['research', scores.research]];
        return `<section class="module-card quote-section quote-confidence-box"><h3>12. Confidence Breakdown</h3><div class="confidence-grid">${keysToShow.map(([key, value]) => { const pct = confidencePercent(value ?? 0); return `<span>${escapeHtml(titleize(key))}<strong>${confidenceLabel(pct)} · ${pct}%</strong></span>`; }).join('')}</div><p>${escapeHtml(c.explanation || data.pricingConfidenceReason || nextAction(record))}</p></section>`;
      };
      const pricingPanel = (record) => {
        const totals = pricingFromRecord(record);
        return `<section class="module-card quote-section quote-totals-box"><h3>7. Pricing</h3><div class="quote-total-grid"><span>Labor total<strong>${money(totals.laborTotal)}</strong></span><span>Material total<strong>${money(totals.materialTotal)}</strong></span><span>Other charges<strong>${money(totals.otherTotal)}</strong></span><span>Subtotal<strong>${money(totals.subtotal)}</strong></span><span>Tax<strong>${money(totals.taxCents)}</strong></span><span>Discount<strong>-${money(totals.discountCents)}</strong></span><span class="grand">Grand total<strong>${money(totals.grandTotal)}</strong></span></div><div class="quote-line-table compact"><div><strong>Trip charge</strong><span>${money(totals.tripChargeCents)}</span></div><div><strong>Permit</strong><span>${money(totals.permitCents)}</span></div><div><strong>Disposal</strong><span>${money(totals.disposalCents)}</span></div><div><strong>Rental</strong><span>${money(totals.rentalCents)}</span></div><div><strong>Markup</strong><span>${money(totals.markupCents)}</span></div></div></section>`;
      };
      const readOnlyDetail = (record) => {
        if (!record) return '<article class="card module-empty"><h3>No record selected</h3><p>Select a request or quote to review.</p></article>';
        const data = ai(record); const c = confidence(record); const labor = record.laborLineItems; const materials = record.materialLineItems;
        return `<article class="card module-section stack estimate-detail"><div class="module-header"><div><p class="eyebrow">${escapeHtml(titleize(record.status))}</p><h2>${escapeHtml(record.customerName)}</h2><p>${escapeHtml(record.serviceType)} · ${escapeHtml(record.address)}</p></div><span class="status-badge ${badgeClass(record)}">${c.label} ${c.pct}%</span></div>${actionBar(record)}<div class="quote-workflow-grid"><section class="module-card quote-section"><h3>1. Customer Information</h3><p><strong>Name:</strong> ${escapeHtml(record.customerName)}</p><p><strong>Email:</strong> ${escapeHtml(record.customerEmail || 'Missing email')}</p><p><strong>Phone:</strong> ${escapeHtml(record.customerPhone || 'Not provided')}</p><p><strong>Property:</strong> ${escapeHtml(record.address)}</p></section><section class="module-card quote-section"><h3>2. Request / Job Intake</h3><p><strong>Service:</strong> ${escapeHtml(record.serviceType)}</p><p>${escapeHtml(record.description || 'No intake description provided.')}</p><p><strong>Next recommended action:</strong> ${escapeHtml(nextAction(record))}</p></section><section class="module-card quote-section"><h3>3. AI Analysis</h3><p><strong>AI summary:</strong> ${escapeHtml(data.jobSummary || data.customerReadySummary || record.summary || 'No AI summary yet.')}</p><p><strong>Why AI priced it this way:</strong> ${escapeHtml(data.pricingConfidenceReason || data.rangeSpreadReason || record.sourcingNotes || 'No AI pricing explanation yet.')}</p><h4>Risk flags</h4>${list(data.riskFlags || data.safetyNotes, 'No risk flags listed.')}<h4>Missing information</h4>${list(record.missingInformation || data.missingInformation, 'No missing information listed.')}</section><section class="module-card quote-section quote-output"><h3>4. Quote Scope</h3><p>${escapeHtml(record.scopeOfWork || record.summary || 'Create or generate a draft to add scope.')}</p></section><section class="module-card quote-section"><h3>5. Labor</h3><table class="quote-editor-table"><tbody>${rows(labor, 'labor')}</tbody></table></section><section class="module-card quote-section"><h3>6. Materials</h3><table class="quote-editor-table"><tbody>${rows(materials, 'material')}</tbody></table></section>${pricingPanel(record)}<section class="module-card quote-section"><h3>8. Assumptions</h3>${list(record.assumptions, 'No assumptions listed.')}</section><section class="module-card quote-section"><h3>9. Exclusions</h3>${list(record.exclusions, 'No exclusions listed.')}</section><section class="module-card quote-section"><h3>10. Customer Notes</h3><p>${escapeHtml(record.customerNotes || 'No customer-facing notes yet.')}</p></section><section class="module-card quote-section"><h3>11. Internal Notes</h3><p>${escapeHtml(record.internalNotes || 'No internal notes yet.')}</p></section>${confidencePanel(record)}<section class="module-card quote-section"><h3>13. Activity / History</h3><p>Created ${escapeHtml(dateText(record.createdAt))}. Last updated ${escapeHtml(dateText(record.updatedAt))}. Current status: <strong>${escapeHtml(titleize(record.status))}</strong>.</p></section></div></article>`;
      };
      const actionBar = (record) => {
        const status = String(record.status || '').toLowerCase();
        const isDraft = record.kind !== 'request' && ['draft','draft_admin_review','quote_in_progress','pending_review','needs_review'].includes(status);
        const isSent = ['sent','quote_sent','viewed'].includes(status);
        const actions = [];
        if (['new','needs_review'].includes(status) || record.kind === 'request') actions.push(['generate-ai','Generate AI Draft','',can('ai.quote.use')], ['manual','Create Manual Draft','secondary',can('quotes.create')], ['request-info','Request More Information','secondary',can('requests.manage')]);
        if (isDraft) actions.push(['edit','Edit Quote','',can('quotes.edit')], ['send','Send to Client','secondary',can('quotes.send')], ['recalculate','Recalculate AI','secondary',can('ai.quote.use')], ['request-info','Request More Information','secondary',can('requests.manage')], ['delete-draft','Delete Draft','danger',can('quotes.delete')]);
        if (isSent) actions.push(['send','Resend','secondary',can('quotes.send')], ['mark-accepted','Mark Accepted','secondary',can('quotes.manage')], ['mark-declined','Mark Declined','secondary',can('quotes.manage')], ['request-info','Request Changes','secondary',can('requests.manage')], ['cancel-quote','Cancel Quote','danger',can('quotes.delete')]);
        if (status === 'accepted') actions.push(['convert-work-order','Convert to Work Order','',can('workorders.create')], ['create-invoice','Create Invoice','secondary',can('invoices.create')], ['cancel-quote','Cancel Quote','danger',can('quotes.delete')]);
        if (status === 'declined') actions.push(['reopen-draft','Reopen as Draft','secondary',can('quotes.edit')]);
        if (status === 'cancelled') actions.push(['restore-draft','Restore as Draft','secondary',can('quotes.edit')]);
        return `<div class="module-tabs quote-actions sticky-actions">${actions.filter((a) => a[3]).map(([action, label, cls]) => `<button class="btn ${cls || ''}" data-action="${action}" type="button" ${working ? 'disabled' : ''}>${working === action ? 'Working…' : label}</button>`).join('')}</div>`;
      };
      const editor = (record) => {
        const totals = pricingFromRecord(record);
        return `<article class="card module-section stack estimate-detail quote-editor" data-editor><div class="module-header"><div><p class="eyebrow">Edit mode</p><h2>${escapeHtml(record.customerName)}</h2><p>One Save Draft button persists all editable quote fields.</p></div><span class="status-badge warning">Unsaved edits stay local until saved</span></div><form id="quote-edit-form" class="quote-edit-form"><section class="module-card quote-section"><h3>Quote Basics</h3><div class="grid grid-2"><label class="field"><span>Title</span><input name="title" value="${escapeHtml(record.title || `${record.serviceType} quote`)}"></label><label class="field"><span>Status</span><select name="status"><option value="draft" ${record.status==='draft'?'selected':''}>Draft</option><option value="quote_in_progress" ${record.status==='quote_in_progress'?'selected':''}>Quote In Progress</option><option value="needs_review" ${record.status==='needs_review'?'selected':''}>Needs Review</option></select></label><label class="field"><span>Expiration date</span><input type="date" name="expirationDate" value="${escapeHtml(String(record.expirationDate || '').slice(0,10))}"></label><label class="field"><span>Grand total</span><input name="grandTotal" data-money-field value="${centsToDollars(totals.grandTotal)}"></label></div><label class="field"><span>Scope of work</span><textarea name="scopeOfWork">${escapeHtml(record.scopeOfWork || record.summary || '')}</textarea></label></section><section class="module-card quote-section"><h3>Labor</h3><div data-lines="labor">${lineEditor(record.laborLineItems, 'labor')}</div><button class="btn secondary" type="button" data-add-line="labor">Add labor line</button></section><section class="module-card quote-section"><h3>Materials</h3><div data-lines="material">${lineEditor(record.materialLineItems, 'material')}</div><button class="btn secondary" type="button" data-add-line="material">Add material</button></section><section class="module-card quote-section"><h3>Other Pricing</h3><div class="grid grid-3"><label class="field"><span>Trip charge</span><input data-money-field name="tripCharge" value="${centsToDollars(totals.tripChargeCents)}"></label><label class="field"><span>Permit</span><input data-money-field name="permit" value="${centsToDollars(totals.permitCents)}"></label><label class="field"><span>Disposal</span><input data-money-field name="disposal" value="${centsToDollars(totals.disposalCents)}"></label><label class="field"><span>Rental</span><input data-money-field name="rental" value="${centsToDollars(totals.rentalCents)}"></label><label class="field"><span>Tax</span><input data-money-field name="tax" value="${centsToDollars(totals.taxCents)}"></label><label class="field"><span>Discount</span><input data-money-field name="discount" value="${centsToDollars(totals.discountCents)}"></label></div><div class="quote-live-total" data-live-total>Grand total: ${money(totals.grandTotal)}</div></section><section class="module-card quote-section"><h3>Notes</h3><label class="field"><span>Assumptions</span><textarea name="assumptions">${escapeHtml(record.assumptions.join('\n'))}</textarea></label><label class="field"><span>Exclusions</span><textarea name="exclusions">${escapeHtml(record.exclusions.join('\n'))}</textarea></label><label class="field"><span>Customer-facing notes</span><textarea name="customerNotes">${escapeHtml(record.customerNotes || '')}</textarea></label><label class="field"><span>Internal admin notes</span><textarea name="internalNotes">${escapeHtml(record.internalNotes || '')}</textarea></label></section></form><div class="module-tabs quote-actions sticky-actions"><button class="btn" data-action="save-draft" type="button" ${working?'disabled':''}>${working==='save-draft'?'Saving…':'Save Draft'}</button><button class="btn secondary" data-action="cancel-edit" type="button">Cancel Editing</button><button class="btn secondary" data-action="send" type="button" ${working?'disabled':''}>${working==='send'?'Sending…':'Send to Client'}</button></div></article>`;
      };
      const lineEditor = (items, type) => asArray(items).map((line) => `<div class="quote-edit-line" data-edit-line="${type}"><input name="description" placeholder="Description" value="${escapeHtml(line.description)}"><input name="quantity" type="number" step="0.01" min="0" value="${escapeHtml(line.quantity)}"><input name="unit" value="${escapeHtml(line.unit)}"><input name="unitCost" type="number" step="0.01" min="0" value="${centsToDollars(line.unitCostCents)}"><input name="markupPct" type="number" step="0.01" min="0" value="${escapeHtml(line.markupPct)}"><strong data-line-total>${money(line.totalCents)}</strong><button class="btn danger" type="button" data-remove-line>Delete</button></div>`).join('') || `<div class="module-empty">No ${type} lines yet. Add one below.</div>`;
      const collectPayload = (record) => {
        const form = root.querySelector('#quote-edit-form'); const fd = new FormData(form);
        const collectLines = (type) => [...root.querySelectorAll(`[data-edit-line="${type}"]`)].map((row) => { const q = Number(row.querySelector('[name="quantity"]')?.value || 0); const unit = dollarsToCents(row.querySelector('[name="unitCost"]')?.value || 0); const markup = Number(row.querySelector('[name="markupPct"]')?.value || 0); return { description: row.querySelector('[name="description"]')?.value || '', quantity: q, unit: row.querySelector('[name="unit"]')?.value || '', unitCostCents: unit, markupPct: markup, totalCents: Math.round(q * unit * (1 + markup / 100)) }; }).filter((line) => line.description || line.totalCents);
        const laborLineItems = collectLines('labor'); const materialLineItems = collectLines('material');
        const other = { tripChargeCents: dollarsToCents(fd.get('tripCharge')), permitCents: dollarsToCents(fd.get('permit')), disposalCents: dollarsToCents(fd.get('disposal')), rentalCents: dollarsToCents(fd.get('rental')), taxCents: dollarsToCents(fd.get('tax')), discountCents: dollarsToCents(fd.get('discount')) };
        const subtotal = laborLineItems.reduce((s,l)=>s+l.totalCents,0) + materialLineItems.reduce((s,l)=>s+l.totalCents,0) + other.tripChargeCents + other.permitCents + other.disposalCents + other.rentalCents;
        const amountCents = dollarsToCents(fd.get('grandTotal')) || subtotal + other.taxCents - other.discountCents;
        return { quoteId: record.quoteId || record.id, jobRequestId: record.requestId, title: fd.get('title') || `${record.serviceType} quote`, summary: fd.get('scopeOfWork') || '', amountCents, status: fd.get('status') || 'draft', expirationDate: fd.get('expirationDate') || '', aiMetadata: { ...(record.aiMetadata || {}), aiStructuredQuote: { ...(ai(record) || {}), scopeOfWork: fd.get('scopeOfWork') || '', laborLineItems, materialLineItems, assumptions: String(fd.get('assumptions') || '').split('\n').filter(Boolean), exclusions: String(fd.get('exclusions') || '').split('\n').filter(Boolean), customerNotes: fd.get('customerNotes') || '', internalAdminNotes: fd.get('internalNotes') || '', pricingEngine: other }, quoteEditor: { laborLineItems, materialLineItems, ...other } } };
      };
      const refreshAfter = async (id) => { await load(id); };
      const saveDraft = async (send = false) => {
        const record = selected(); const payload = editing ? collectPayload(record) : { quoteId: record.quoteId || record.id, jobRequestId: record.requestId, title: record.title || `${record.serviceType} quote`, summary: record.scopeOfWork || record.summary || record.description, amountCents: pricingFromRecord(record).grandTotal, aiMetadata: record.aiMetadata || ai(record) || {} };
        payload.action = send ? 'send' : 'save_draft'; payload.sendToClient = send;
        if (send) { if (!record.customerEmail) throw new Error('Customer email is required before sending.'); if (!payload.summary) throw new Error('Scope of work is required before sending.'); if (!payload.amountCents) throw new Error('Pricing is required before sending.'); }
        const method = payload.quoteId && !String(payload.quoteId).startsWith('request:') ? 'patch' : 'post';
        const response = await api[method]('/api/admin/quotes', payload);
        return response.quote;
      };
      const runAction = async (action) => {
        const record = selected(); if (!record) return;
        try {
          if (action === 'edit') { editing = true; dirty = false; render(); return; }
          if (action === 'cancel-edit') { if (dirty && !confirm('Discard unsaved quote edits?')) return; editing = false; dirty = false; render(); return; }
          working = action; render();
          if (action === 'save-draft') { const quote = await saveDraft(false); toast('Draft saved and persisted.', 'success'); await refreshAfter(quote?.id || record.id); return; }
          if (action === 'send') { const quote = await saveDraft(true); toast('Quote sent to the client.', 'success'); await refreshAfter(quote?.id || record.id); return; }
          if (action === 'manual') { editing = true; selectedId = record.id; render(); return; }
          if (action === 'generate-ai' || action === 'recalculate') { const response = await TAAI.draftQuote({ jobRequestId: record.requestId || record.id, requestContext: record, researchMode:'internal_live', workflowMode:'quote_2_component_pricing' }); toast('AI draft recalculated. Review and save the draft.', 'success'); await load(response.draft?.id || record.id); return; }
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
        if (visible.length && !visible.some((item) => String(item.id) === String(selectedId))) selectedId = visible[0].id;
        const record = selected();
        if (!record && records[0]) selectedId = records[0].id;
        root.innerHTML = `<section class="module-page stack estimate-request-center"><div class="module-hero module-header card"><div><p class="eyebrow">Owner · Admin · Manager quoting workflow</p><h2 class="module-title">💰 Estimate & Quote Center</h2><p class="module-description">One permission-safe center for customer requests, AI review, editable quote drafts, sending, acceptance, work orders, and invoices.</p></div><div class="action-row">${can('ai.quote.use') ? '<button class="btn" data-action="generate-ai" type="button">Generate AI Draft</button>' : ''}${can('quotes.create') ? '<button class="btn secondary" data-action="manual" type="button">Create Manual Draft</button>' : ''}</div></div><div class="module-stat-grid">${kpis()}</div><section class="card module-section stack"><div class="module-panel-head"><div class="module-tabs">${tabs()}</div><label class="field module-search"><span>Search</span><input data-search placeholder="Customer, address, service, status, confidence" value="${escapeHtml(query)}"></label></div><div class="estimate-split"><aside class="module-record-list">${visible.length ? visible.map(card).join('') : '<article class="module-empty"><h3>No records in this tab</h3><p>Try All or change your search.</p></article>'}</aside><div class="estimate-detail-panel">${editing && record ? editor(record) : readOnlyDetail(record)}</div></div></section></section>`;
        root.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => { active = button.dataset.tab; editing = false; render(); }));
        root.querySelector('[data-search]')?.addEventListener('input', (event) => { query = event.target.value; render(); });
        root.querySelectorAll('[data-select]').forEach((item) => item.addEventListener('click', () => { if (dirty && editing && !confirm('Discard unsaved quote edits?')) return; selectedId = item.dataset.select; editing = false; dirty = false; render(); }));
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
