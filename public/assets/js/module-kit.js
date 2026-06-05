(() => {
  const escapeHtml = (value = '') => String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[char]));
  const titleize = (value = '') => String(value).replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  const asArray = (value) => Array.isArray(value) ? value : value ? [value] : [];
  const getPath = (object, path, fallback) => String(path || '').split('.').filter(Boolean).reduce((current, key) => current?.[key], object) ?? fallback;
  const currency = (value) => window.TAUi?.money ? TAUi.money(Number(value || 0) / (Math.abs(Number(value || 0)) > 999 ? 100 : 1)) : `$${Number(value || 0).toFixed(2)}`;
  const dateText = (value) => value ? new Date(value).toLocaleString([], { dateStyle:'medium', timeStyle:'short' }) : 'Not scheduled';
  const statusText = (value) => titleize(value || 'pending');
  const includesText = (record, query) => !query || JSON.stringify(record).toLowerCase().includes(query.toLowerCase());
  const findRecords = (data, paths = []) => {
    for (const path of paths) {
      const value = getPath(data, path);
      if (Array.isArray(value)) return value;
    }
    for (const value of Object.values(data || {})) if (Array.isArray(value)) return value;
    return [];
  };
  const button = (label, action = 'toast', style = 'secondary') => `<button class="btn ${style}" type="button" data-module-action="${escapeHtml(action)}">${escapeHtml(label)}</button>`;
  const toast = (message, type = 'info') => window.TAUi?.toast ? TAUi.toast(message, type) : console.warn(message);
  const actionConfig = (action) => typeof action === 'object' && action ? action : { label: action, action };
  const actionName = (action) => cleanAction(actionConfig(action).action || actionConfig(action).label || action);
  const cleanAction = (value = '') => String(value || '').trim();
  const actionRequiresRecordId = (action) => /view|open|detail|history|download|send|mark|payment|pay|void|cancel|status|assign|approve|decline|complete|update/i.test(action);
  const actionRequiresStatus = (action) => /status|mark|move|change-status/i.test(action);
  const mutatingAction = (action) => /create|new|post|save|send|mark|payment|pay|void|cancel|status|assign|approve|decline|complete|update|upload|photo|information/i.test(action);

  const stateCard = (type, title, body) => `<article class="module-state module-state-${type} module-${type}"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></article>`;
  const normalizeRoot = (root) => root?.querySelector ? root : root?.root || root?.element || document.querySelector('[data-module-root], #module-root');
  const defaultRecordTitle = (record, fallback = 'Record') => record.title || record.name || record.fullName || record.full_name || record.customerName || record.customer_name || record.email || record.serviceType || record.service_type || fallback;
  const defaultRecordMeta = (record) => [record.status && statusText(record.status), record.amountCents && currency(record.amountCents), record.createdAt && dateText(record.createdAt), record.updatedAt && dateText(record.updatedAt)].filter(Boolean).join(' • ');
  const defaultRecords = (config, data) => findRecords(data, config.recordPaths || ['items','requests','quotes','invoices','jobs','workOrders','workOrders.items','inventory','users','roles','properties','updates']);
  const summarize = (records, field, match) => records.filter((record) => match ? String(record[field] || '').toLowerCase() === String(match).toLowerCase() : record[field]).length;
  const metricValue = (metric, data, records) => {
    if (typeof metric.value === 'function') return metric.value(data, records);
    if (metric.path) return getPath(data, metric.path, 0);
    if (metric.sum) return records.reduce((total, record) => total + Number(getPath(record, metric.sum, 0) || 0), 0);
    if (metric.status) return summarize(records, 'status', metric.status);
    if (metric.filter) return records.filter(metric.filter).length;
    return records.length;
  };
  const renderMetrics = (metrics, data, records) => `<div class="module-stat-grid">${metrics.map((metric) => {
    const raw = metricValue(metric, data, records);
    const formatted = metric.format === 'money' ? currency(raw) : metric.format === 'percent' ? `${Number(raw || 0).toFixed(0)}%` : raw;
    return `<article class="module-stat stat-card"><span>${escapeHtml(metric.icon || '📌')}</span><strong>${escapeHtml(formatted)}</strong><small>${escapeHtml(metric.label)}</small></article>`;
  }).join('')}</div>`;
  const renderRecordActions = (actions = []) => actions.map((action) => button(action.label || action, action.action || action, action.primary ? '' : 'secondary')).join('');
  const primaryEndpoint = (config) => asArray(config.endpoint || config.endpoints)[0] || '';
  const runGenericAction = async (control, action, context = {}) => {
    const { root, api, config, record = {}, data, records } = context;
    const previous = control?.textContent || '';
    const normalizedAction = cleanAction(action);
    const actionKey = normalizedAction.toLowerCase();
    const recordId = record.id || record.requestId || record.quoteId || record.invoiceId || record.jobRequestId || '';
    const configuredActions = [...asArray(config?.actions), ...asArray(config?.recordActions)].map(actionConfig);
    const configured = configuredActions.find((item) => cleanAction(item.action || item.label).toLowerCase() === actionKey) || {};
    if (control) { control.disabled = true; control.textContent = 'Working...'; }
    try {
      if (/refresh|reload/i.test(normalizedAction)) {
        await mount(context, config);
        toast('Data refreshed.', 'success');
        return;
      }
      if (/open|view|detail|history|download|map|route/i.test(normalizedAction)) {
        openDetail(root, config, recordId ? record : (records?.[0] || record), { api, data, records });
        return;
      }

      const method = cleanAction(configured.method || configured.httpMethod).toUpperCase();
      const endpoint = configured.endpoint || primaryEndpoint(config);
      const requiresId = configured.requiresId ?? actionRequiresRecordId(normalizedAction);
      const requiresAction = configured.requiresAction ?? Boolean(method);
      const requiresStatus = configured.requiresStatus ?? actionRequiresStatus(normalizedAction);
      const status = configured.status || record.status || '';
      const allowedMethods = asArray(config.allowedMethods || ['GET', 'POST', 'PATCH', 'DELETE']).map((item) => String(item).toUpperCase());
      const genericAllowed = configured.generic === true || configured.allowGeneric === true || config.allowGenericActions === true;

      if (!method || !endpoint || !api || !allowedMethods.includes(method) || config.disableGenericActions || config.allowGenericActions === false || (mutatingAction(normalizedAction) && !genericAllowed)) {
        openDetail(root, { ...config, detailMode:'readonly', readOnlyDetail:true }, recordId ? record : (records?.[0] || record), { api, data, records });
        toast('This action needs a module-specific handler. No API request was sent.', 'info');
        return;
      }
      if (requiresId && !recordId) {
        toast('Select a record before running this action. No API request was sent.', 'error');
        return;
      }
      if (requiresAction && !normalizedAction) {
        toast('This action is missing an action name. No API request was sent.', 'error');
        return;
      }
      if (requiresStatus && !status) {
        toast('This action is missing a target status. No API request was sent.', 'error');
        return;
      }

      const payload = { action: normalizedAction, recordId, id: recordId, status: configured.status, record, values: {} };
      const result = method === 'PATCH' ? await api.patch(endpoint, payload) : method === 'DELETE' ? await api.delete(endpoint, payload) : await api.post(endpoint, payload);
      toast(result.message || `${titleize(normalizedAction)} completed.`, 'success');
      await mount(context, config);
    } catch (error) {
      toast(error.message || `${titleize(normalizedAction)} failed.`, 'error');
    } finally {
      if (control) { control.disabled = false; control.textContent = previous; }
    }
  };
  const openDetail = (root, config, record = {}, context = {}) => {
    const modal = document.getElementById('modal-root') || root;
    const sections = config.detailSections || ['Customer information','Request summary','Scope of work','Notes','Status history','Files/photos'];
    const readonly = config.detailMode === 'readonly' || config.readOnlyDetail;
    const openLabel = config.openFullLabel || 'Open Full Work Order';
    const editLabel = config.editLabel || 'Edit Work Order';
    if (readonly) {
      modal.innerHTML = `<div class="module-drawer"><article class="module-editor module-readonly-detail card stack"><div class="module-editor-head"><div><p class="eyebrow">${escapeHtml(config.title)} · View only</p><h2>${escapeHtml(defaultRecordTitle(record, config.title))}</h2><p>Read-only details are shown first. Use Edit only when you explicitly need editable work order controls.</p></div><button class="btn secondary" type="button" data-close-module-drawer>Close</button></div><div class="module-editor-grid module-readonly-grid">${sections.map((section) => `<section class="module-readonly-field"><span>${escapeHtml(section)}</span><p>${escapeHtml(sectionValue(section, record) || 'Not available')}</p></section>`).join('')}</div><div class="module-toolbar">${button(openLabel,'open-full-work-order','')} ${config.canEdit !== false ? button(editLabel,'edit-work-order','secondary') : ''}</div></article></div>`;
      modal.querySelector('[data-close-module-drawer]').onclick = () => { modal.innerHTML = ''; };
      modal.querySelectorAll('[data-module-action]').forEach((control) => control.onclick = () => {
        if (control.dataset.moduleAction === 'edit-work-order') {
          openDetail(root, { ...config, detailMode: 'edit', readOnlyDetail: false }, record, context);
          return;
        }
        if (control.dataset.moduleAction === 'open-full-work-order') {
          window.TADashboardRouter?.go?.('admin.work-orders');
          modal.innerHTML = '';
          return;
        }
        runGenericAction(control, control.dataset.moduleAction, { ...context, root, config, record, records: context.records || [] });
      });
      return;
    }
    modal.innerHTML = `<div class="module-drawer"><form class="module-editor card stack"><div class="module-editor-head"><div><p class="eyebrow">${escapeHtml(config.title)}</p><h2>${escapeHtml(defaultRecordTitle(record, config.title))}</h2></div><button class="btn secondary" type="button" data-close-module-drawer>Close</button></div><div class="module-editor-grid">${sections.map((section) => `<label class="field"><span>${escapeHtml(section)}</span><textarea name="${escapeHtml(section)}">${escapeHtml(sectionValue(section, record))}</textarea></label>`).join('')}</div><p class="notice" data-module-action-status>Review details, then save or request more information through the configured endpoint.</p><div class="module-toolbar">${button('Save Draft','save-draft','')} ${button('Request Information','request-info')} ${button('Continue Manually','manual')}</div></form></div>`;
    modal.querySelector('[data-close-module-drawer]').onclick = () => { modal.innerHTML = ''; };
    modal.querySelectorAll('[data-module-action]').forEach((control) => control.onclick = async () => {
      const values = Object.fromEntries(new FormData(modal.querySelector('form')).entries());
      await runGenericAction(control, control.dataset.moduleAction, { ...context, root, config, record: { ...record, values }, records: context.records || [] });
    });
  };
  const stringify = (value) => Array.isArray(value) || (value && typeof value === 'object') ? JSON.stringify(value, null, 2) : (value || '');
  const sectionValue = (section, record) => {
    const key = section.toLowerCase();
    const ai = record.structuredEstimate || record.aiStructuredQuote || record.aiMetadata?.structuredEstimate || record.aiMetadata || {};
    if (key.includes('customer')) return record.customerName || record.customer_name || record.requesterName || record.requester_name || record.clientName || record.client_name || record.email || record.requester_email || ai.customer_summary || '';
    if (key.includes('property') || key.includes('address')) return record.propertySummary || record.property_summary || record.streetAddress || record.street_address || record.address || [record.city, record.state].filter(Boolean).join(', ') || ai.property_summary || '';
    if (key.includes('request summary') || key.includes('description')) return record.description || record.summary || record.requestSummary || ai.customer_summary || '';
    if (key.includes('uploaded') || key.includes('file') || key.includes('photo')) return stringify(record.files || record.photos || record.attachments || record.photoContext || '');
    if (key.includes('scope')) return stringify(ai.scope_of_work || record.scopeOfWork || record.scope || record.summary || record.description || '');
    if (key.includes('labor')) return stringify(ai.labor_line_items || record.laborLineItems || record.labor_items || record.laborPhases || record.labor || '');
    if (key.includes('material')) return stringify(ai.material_line_items || record.materialLineItems || record.materials || record.materialBreakdown || '');
    if (key.includes('price') || key.includes('pricing') || key.includes('tax') || key.includes('markup')) return stringify(ai.pricing_summary || record.pricingSummary || (record.amountCents ? currency(record.amountCents) : ''));
    if (key.includes('assumption')) return stringify(ai.assumptions || record.assumptions || '');
    if (key.includes('exclusion')) return stringify(ai.exclusions || record.exclusions || '');
    if (key.includes('warranty')) return stringify(ai.warranty_notes || record.warrantyNotes || record.notes || '');
    if (key.includes('customer-facing') || key.includes('customer notes')) return stringify(ai.customer_notes || record.customerNotes || record.customer_facing_quote || '');
    if (key.includes('internal')) return stringify(ai.internal_admin_notes || record.internalAdminNotes || record.admin_notes || record.notes || '');
    if (key.includes('recommend')) return stringify(ai.recommended_questions || record.recommendedQuestions || record.missingInfoQuestions || record.questions || '');
    if (key.includes('confidence')) return stringify(ai.confidence_scores || record.confidenceScores || record.confidence || record.aiMetadata || '');
    if (key.includes('status')) return record.status || record.reviewStatus || '';
    return record.notes || '';
  };
  const renderRecords = (root, config, data, allRecords) => {
    const query = root.querySelector('[data-module-search]')?.value || '';
    const tab = root.querySelector('[data-module-tab].active')?.dataset.moduleTab || 'all';
    const records = allRecords.filter((record) => includesText(record, query)).filter((record) => tab === 'all' || String(record.status || record.reviewStatus || '').toLowerCase().includes(tab));
    const list = root.querySelector('[data-module-records]');
    if (!records.length) {
      list.innerHTML = stateCard('empty', config.emptyTitle || 'No records yet', config.emptyText || 'When real records are available, they will appear here with actions and detail views.');
      return;
    }
    list.innerHTML = records.map((record, index) => `<article class="module-record-card" data-record-index="${index}"><div><p class="eyebrow">${escapeHtml(statusText(record.status || record.reviewStatus || config.title))}</p><h3>${escapeHtml(defaultRecordTitle(record, config.title))}</h3><p>${escapeHtml(record.description || record.summary || record.address || record.notes || config.recordDescription || 'Open this record to review details, notes, timeline, and next actions.')}</p><small>${escapeHtml(defaultRecordMeta(record) || config.title)}</small></div><div class="module-record-actions">${renderRecordActions(config.recordActions || ['View Detail','Add Note'])}</div></article>`).join('');
    list.querySelectorAll('.module-record-card').forEach((card, index) => card.querySelectorAll('[data-module-action]').forEach((control) => control.onclick = () => config.onRecordAction ? config.onRecordAction(control.dataset.moduleAction, { root, api: window.TAApi, config, record: records[index], records, data, router: window.TADashboardRouter }) : runGenericAction(control, control.dataset.moduleAction, { root, api: window.TAApi, config, record: records[index], records, data })));
  };
  const endpointFetch = async (api, endpoint) => {
    if (!endpoint) return { ok:false, missing:true, message:'No endpoint configured yet.' };
    try { return await api.get(endpoint); } catch (error) { return { ok:false, error:true, message:error.message || 'Endpoint unavailable.', endpoint }; }
  };
  const mount = async ({ root, api, user, company, router, workspace }, config) => {
    root = normalizeRoot(root);
    if (!root?.querySelector) throw new TypeError('Module root element was not found.');
    const effective = { ...config, ...(config.aliases?.[router?.state?.currentModule] || {}) };
    if (effective.permissions?.length && !TAPermissions.has(user, effective.permissions)) {
      root.innerHTML = stateCard('error', 'Permission required', 'Your current role cannot open this module.');
      return;
    }
    root.innerHTML = `<section class="module-shell module-page stack"><div class="module-hero module-header card"><div><p class="eyebrow">${escapeHtml(effective.workspaceLabel || titleize(workspace || effective.role))}</p><h2 class="module-title">${escapeHtml(effective.icon || '📌')} ${escapeHtml(effective.title)}</h2><p class="module-description">${escapeHtml(effective.description || 'Operational tools for this workspace.')}</p></div><div class="module-toolbar module-actions action-row">${(effective.actions || []).map((action) => button(action.label || action, action.action || action, action.primary ? '' : 'secondary')).join('')}</div></div>${stateCard('loading', 'Loading module data', 'Checking available endpoints and preparing your workspace...')}</section>`;
    const endpoints = asArray(effective.endpoints || effective.endpoint);
    const results = await Promise.all(endpoints.map((endpoint) => endpointFetch(api, endpoint)));
    const data = Object.assign({}, ...results.filter((result) => result && !result.error).map((result) => result));
    const errors = results.filter((result) => result?.error);
    const records = effective.records ? effective.records(data) : defaultRecords(effective, data);
    const tabs = effective.tabs || [];
    root.innerHTML = `<section class="module-shell module-page stack"><div class="module-hero module-header card"><div><p class="eyebrow">${escapeHtml(effective.workspaceLabel || titleize(workspace || effective.role))}</p><h2 class="module-title">${escapeHtml(effective.icon || '📌')} ${escapeHtml(effective.title)}</h2><p class="module-description">${escapeHtml(effective.description || 'Operational tools for this workspace.')}</p></div><div class="module-toolbar module-actions action-row">${(effective.actions || []).map((action) => button(action.label || action, action.action || action, action.primary ? '' : 'secondary')).join('')}</div></div>${errors.length ? stateCard('error', 'Limited live data', `${errors.map((error) => error.endpoint).filter(Boolean).join(', ') || 'Endpoint'} is unavailable, so this module is showing usable controls and empty states.`) : ''}${renderMetrics(effective.metrics || [{ label:'Records', icon:'📌' }], data, records)}<div class="module-panel module-section card"><div class="module-panel-head"><div><h3>${escapeHtml(effective.mainTitle || 'Workspace queue')}</h3><p>${escapeHtml(effective.mainDescription || 'Search, filter, review details, and take the next action.')}</p></div><label class="field module-search"><span>Search</span><input data-module-search placeholder="Search records"></label></div>${tabs.length ? `<div class="module-tabs">${tabs.map((tab, index) => `<button class="btn secondary ${index === 0 ? 'active' : ''}" type="button" data-module-tab="${escapeHtml(tab.key || tab.toLowerCase())}">${escapeHtml(tab.label || tab)}</button>`).join('')}</div>` : ''}<div data-module-records class="module-record-list"></div></div>${effective.secondary ? `<div class="grid grid-2">${effective.secondary.map((item) => `<article class="card module-card"><h3>${escapeHtml(item.icon || '✅')} ${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></article>`).join('')}</div>` : ''}</section>`;
    root.querySelectorAll('[data-module-action]').forEach((control) => control.onclick = () => effective.onAction ? effective.onAction(control.dataset.moduleAction, { root, api, user, company, data, records, config:effective }) : runGenericAction(control, control.dataset.moduleAction, { root, api, user, company, data, records, config:effective, router, workspace }));
    root.querySelectorAll('[data-module-tab]').forEach((tab) => tab.onclick = () => { root.querySelectorAll('[data-module-tab]').forEach((item) => item.classList.remove('active')); tab.classList.add('active'); renderRecords(root, effective, data, records); });
    root.querySelector('[data-module-search]')?.addEventListener('input', () => renderRecords(root, effective, data, records));
    renderRecords(root, effective, data, records);
  };
  window.TAModuleKit = { mount, escapeHtml, titleize, currency, dateText, stateCard, openDetail, runGenericAction };
})();
