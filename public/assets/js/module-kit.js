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
  const stateCard = (type, title, body) => `<article class="module-state module-state-${type} module-${type}"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></article>`;
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
  const openDetail = (root, config, record = {}) => {
    const modal = document.getElementById('modal-root') || root;
    const sections = config.detailSections || ['Customer information','Request summary','Scope of work','Notes','Status history','Files/photos'];
    modal.innerHTML = `<div class="module-drawer"><form class="module-editor card stack"><div class="module-editor-head"><div><p class="eyebrow">${escapeHtml(config.title)}</p><h2>${escapeHtml(defaultRecordTitle(record, config.title))}</h2></div><button class="btn secondary" type="button" data-close-module-drawer>Close</button></div><div class="module-editor-grid">${sections.map((section) => `<label class="field"><span>${escapeHtml(section)}</span><textarea name="${escapeHtml(section)}">${escapeHtml(sectionValue(section, record))}</textarea></label>`).join('')}</div><div class="module-toolbar">${button('Save Draft','save-draft','')} ${button('Request Information','request-info')} ${button('Continue Manually','manual')}</div></form></div>`;
    modal.querySelector('[data-close-module-drawer]').onclick = () => { modal.innerHTML = ''; };
    modal.querySelectorAll('[data-module-action]').forEach((control) => control.onclick = () => TAUi.toast(`${control.textContent} is ready. Connected endpoint actions will run when the backend supports this record type.`));
  };
  const sectionValue = (section, record) => {
    const key = section.toLowerCase();
    if (key.includes('customer')) return record.customerName || record.clientName || record.email || '';
    if (key.includes('summary') || key.includes('scope')) return record.summary || record.description || record.scope || '';
    if (key.includes('price') || key.includes('tax') || key.includes('markup')) return record.amountCents ? currency(record.amountCents) : '';
    if (key.includes('confidence')) return JSON.stringify(record.confidenceScores || record.aiMetadata || {}, null, 2);
    return record.notes || record.status || '';
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
    list.querySelectorAll('.module-record-card').forEach((card, index) => card.querySelectorAll('[data-module-action]').forEach((control) => control.onclick = () => openDetail(root, config, records[index])));
  };
  const endpointFetch = async (api, endpoint) => {
    if (!endpoint) return { ok:false, missing:true, message:'No endpoint configured yet.' };
    try { return await api.get(endpoint); } catch (error) { return { ok:false, error:true, message:error.message || 'Endpoint unavailable.', endpoint }; }
  };
  const mount = async ({ root, api, user, company, router, workspace }, config) => {
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
    root.querySelectorAll('[data-module-action]').forEach((control) => control.onclick = () => effective.onAction ? effective.onAction(control.dataset.moduleAction, { root, api, user, company, data, records, config:effective }) : openDetail(root, effective, records[0] || {}));
    root.querySelectorAll('[data-module-tab]').forEach((tab) => tab.onclick = () => { root.querySelectorAll('[data-module-tab]').forEach((item) => item.classList.remove('active')); tab.classList.add('active'); renderRecords(root, effective, data, records); });
    root.querySelector('[data-module-search]')?.addEventListener('input', () => renderRecords(root, effective, data, records));
    renderRecords(root, effective, data, records);
  };
  window.TAModuleKit = { mount, escapeHtml, titleize, currency, dateText, stateCard, openDetail };
})();
