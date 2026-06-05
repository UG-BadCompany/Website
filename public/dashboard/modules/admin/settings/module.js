(() => {
  const escapeHtml = (value = '') => String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[char]));
  const asArray = (value) => Array.isArray(value) ? value : value ? [value] : [];
  const boolText = (value) => value ? 'Ready' : 'Needs review';

  window.TAModules.register({
    id: 'admin.settings',
    role: 'admin',
    title: 'Settings',
    icon: '⚙️',
    permissions: ['settings.manage'],
    async mount(ctx) {
      const current = ctx.router?.state?.currentModule;
      if (current === 'owner.system-center') return mountSystemCenter(ctx);
      if (current === 'owner.audit-logs') return mountAuditLogs(ctx);
      return mountAdminSettings(ctx);
    },
    async destroy() {},
    async refresh() {},
  });


  async function mountAdminSettings({ root, api, router }) {
    const tabs = {
      company: ['Legal name','Business phone','Business address','Service area','Default timezone','Default currency'],
      branding: ['Logo URL','Favicon URL','Company display name','Theme mode','Primary color','Accent color'],
      users: ['Default user role','Invite email template','User profile requirements','Deactivate inactive users'],
      roles: ['Default manager permissions','Default worker permissions','Default client permissions','Permission escalation protection'],
      permissions: ['Workspace access review','Permission audit cadence','Require Owner approval for escalations'],
      ai: ['AI quoting enabled','AI troubleshooting enabled','Research mode','Admin review required','Confidence threshold warning'],
      notifications: ['Magic link email sender','Quote email sender','Request notification email','Admin notification toggles'],
      integrations: ['Square payments','Email provider','Supplier catalog sync','Calendar integration'],
      security: ['Session timeout minutes','Magic link expiration','Audit logging enabled','Require Owner for destructive actions'],
      billing: ['Invoice numbering prefix','Payment terms','Tax rate','Billing contact email'],
      system: ['Deployment health check','Migration check','Netlify function audit','Database readiness'],
    };
    const labels = { company:'Company', branding:'Branding', users:'Users', roles:'Roles', permissions:'Permissions', ai:'AI', notifications:'Notifications', integrations:'Integrations', security:'Security', billing:'Billing', system:'System' };
    let active = 'company';
    let company = {};
    let saved = {};
    const defaults = { timezone:'America/Phoenix', currency:'USD', researchMode:'internal_live', confidenceThreshold:'55', requireAdminReview:'true', defaultRequestStatus:'new' };
    const valueFor = (key) => saved[key] ?? defaults[key] ?? '';
    const fieldName = (label) => label.toLowerCase().replace(/[^a-z0-9]+(.)/g, (_, chr) => chr.toUpperCase()).replace(/[^a-z0-9]/g, '');
    const renderFields = () => tabs[active].map((label) => {
      const name = fieldName(label);
      if (/enabled|required|review|toggle|tracking|scheduling|assignments|photos/i.test(label)) return `<label class="pill"><input type="checkbox" name="${name}" ${String(valueFor(name)) === 'true' ? 'checked' : ''}> ${escapeHtml(label)}</label>`;
      if (label === 'Research mode') return `<label class="field"><span>${label}</span><select name="researchMode"><option value="off">OFF</option><option value="internal_only">INTERNAL KNOWLEDGE ONLY</option><option value="internal_live" ${valueFor('researchMode') === 'internal_live' ? 'selected' : ''}>INTERNAL + LIVE RESEARCH</option><option value="aggressive">LIVE RESEARCH AGGRESSIVE</option></select></label>`;
      return `<label class="field"><span>${escapeHtml(label)}</span><input name="${name}" value="${escapeHtml(valueFor(name))}" placeholder="${escapeHtml(label)}"></label>`;
    }).join('');
    const render = () => {
      root.innerHTML = `<section class="module-page stack admin-settings-page"><div class="module-hero module-header card"><div><p class="eyebrow">Admin Workspace</p><h2 class="module-title">⚙️ Settings</h2><p class="module-description">Organized settings center for Company, Branding, Users, Roles, Permissions, AI, Notifications, Integrations, Security, Billing, and System controls.</p></div></div><article class="card module-section stack"><div class="module-tabs">${Object.entries(labels).map(([key,label]) => `<button class="btn secondary ${active===key?'active':''}" type="button" data-settings-tab="${key}">${label}</button>`).join('')}</div><form data-admin-settings class="stack"><div class="form-grid">${renderFields()}</div><p class="notice" data-settings-status>Loaded ${escapeHtml(labels[active])} settings. Changes are not saved yet.</p><div class="action-row"><button class="btn" type="submit">Save ${escapeHtml(labels[active])} Settings</button><button class="btn secondary" type="button" data-reset-section>Reset Section</button></div></form></article><div class="module-grid"><article class="module-card card"><h3>Safe Admin Scope</h3><p>General, quote, request, work order, AI, and notification settings are available without duplicating Owner-only platform controls.</p></article><article class="module-card card"><h3>AI Review Controls</h3><p>Research mode and confidence warning threshold are admin-visible while API keys remain server-side only.</p></article><article class="module-card card"><h3>🧩 Module Manager</h3><p>Enable or disable drop-in modules, hide disabled navigation, and block direct routes.</p><button class="btn secondary" type="button" data-open-module-manager>Open Module Manager</button></article></div></section>`;
      root.querySelector('[data-open-module-manager]')?.addEventListener('click', () => router?.go?.('admin.module-manager'));
      root.querySelectorAll('[data-settings-tab]').forEach((button) => button.addEventListener('click', () => { active = button.dataset.settingsTab; render(); }));
      root.querySelector('[data-admin-settings]').addEventListener('input', () => { const status = root.querySelector('[data-settings-status]'); if (status) status.textContent = 'Unsaved changes — save this section before leaving.'; });
      root.querySelector('[data-reset-section]').addEventListener('click', async () => {
        tabs[active].forEach((label) => delete saved[fieldName(label)]);
        if (active === 'ai') delete saved.researchMode;
        const resetButton = root.querySelector('[data-reset-section]');
        resetButton.disabled = true;
        resetButton.textContent = 'Resetting...';
        try {
          const response = await api.patch('/.netlify/functions/company-settings', { ...company, adminSettings: saved });
          company = response.company || company;
          TAUi.toast('Section reset and saved.', 'success');
          render();
        } catch (error) {
          TAUi.toast(error.message || 'Reset failed.', 'error');
          resetButton.disabled = false;
          resetButton.textContent = 'Reset Section';
        }
      });
      root.querySelector('[data-admin-settings]').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const values = Object.fromEntries(new FormData(form).entries());
        form.querySelectorAll('input[type="checkbox"]').forEach((input) => { values[input.name] = input.checked ? 'true' : 'false'; });
        saved = { ...saved, ...values };
        const submit = form.querySelector('[type="submit"]');
        submit.disabled = true;
        submit.textContent = 'Saving...';
        root.querySelector('[data-settings-status]').textContent = 'Saving through company settings backend...';
        try {
          const response = await api.patch('/.netlify/functions/company-settings', {
            ...company,
            serviceArea: values.serviceArea || company.serviceArea,
            timezone: values.defaultTimezone || values.timezone || company.timezone,
            currency: values.defaultCurrency || values.currency || company.currency,
            adminSettings: saved,
          });
          company = response.company || company;
          saved = company.adminSettings || saved;
          TAUi.toast(`${labels[active]} settings saved.`, 'success');
          render();
        } catch (error) {
          root.querySelector('[data-settings-status]').textContent = error.message || 'Settings save failed.';
          TAUi.toast(error.message || 'Settings save failed.', 'error');
          submit.disabled = false;
          submit.textContent = `Save ${labels[active]} Settings`;
        }
      });
    };
    root.innerHTML = '<article class="card module-loading"><h3>Loading Admin Settings</h3><p>Preparing allowed business settings.</p></article>';
    try { const response = await api.get('/.netlify/functions/company-settings'); company = response.company || {}; saved = { serviceArea: company.serviceArea || '', defaultTimezone: company.timezone || defaults.timezone, defaultCurrency: company.currency || defaults.currency, ...(company.adminSettings || {}) }; }
    catch (error) { root.innerHTML = `<article class="card module-error"><h3>Settings loaded with limited data</h3><p>${escapeHtml(error.message || 'Company settings unavailable.')}</p></article>`; }
    render();
  }

  async function fetchAll(api) {
    const endpoints = ['/.netlify/functions/install-status', '/.netlify/functions/company-settings', '/api/system-health'];
    const results = await Promise.all(endpoints.map(async (endpoint) => {
      try { return { endpoint, data: await api.get(endpoint) }; }
      catch (error) { return { endpoint, error: error.message || 'Unavailable' }; }
    }));
    return results.reduce((acc, item) => {
      if (item.error) acc.errors.push(item);
      else Object.assign(acc.data, item.data);
      return acc;
    }, { data: {}, errors: [] });
  }

  function statusCard(icon, title, status, detail, tone = 'success') {
    return `<article class="system-health-card module-card"><div class="system-health-card-head"><div><h3>${icon} ${escapeHtml(title)}</h3><p>${escapeHtml(detail)}</p></div><span class="status-badge ${tone}">${escapeHtml(status)}</span></div></article>`;
  }

  function tabButtons(active) {
    return `<div class="module-tabs">${['Overview', 'Modules', 'Platform', 'Installer', 'Health'].map((label) => `<button class="btn secondary ${active === label.toLowerCase() ? 'active' : ''}" type="button" data-system-tab="${label.toLowerCase()}">${label}</button>`).join('')}</div>`;
  }

  async function mountSystemCenter({ root, api }) {
    let active = 'overview';
    root.innerHTML = '<article class="card module-loading"><h3>Loading System Center</h3><p>Checking install, module, platform, installer, and health status.</p></article>';
    const { data, errors } = await fetchAll(api);
    const company = data.company || data.settings || window.TACompany?.current || {};
    const checks = asArray(data.checks || data.functions || data.items);
    const modules = asArray(data.modules);
    const warnings = asArray(data.warnings || data.missingConfig || data.missingEnvironmentVariables).concat(errors.map((error) => `${error.endpoint}: ${error.error}`));

    const renderPanel = () => {
      if (active === 'modules') return `<section class="module-grid">${(modules.length ? modules : [
        { name:'Owner', status:'enabled' }, { name:'Admin', status:'enabled' }, { name:'Manager', status:'enabled' }, { name:'Worker', status:'enabled' }, { name:'Client', status:'enabled' },
      ]).map((item) => statusCard('📦', item.name || item.title || 'Module', item.status || 'enabled', item.description || 'Workspace module available.', item.status === 'disabled' ? 'warning' : 'success')).join('')}</section>`;
      if (active === 'platform') return `<section class="module-grid">${statusCard('⚙️', 'Global Settings', boolText(company.companyName), `Company defaults are loaded for ${company.displayName || company.companyName || 'Contractor Portal'}.`)}${statusCard('📋', 'Business Rules', 'Review', 'Business rules and company defaults live in Company Management and Theme Manager.', 'warning')}${statusCard('🏢', 'Company Defaults', company.timezone || 'Configured', `Currency ${company.currency || 'USD'} and service area ${company.serviceArea || 'not set'}.`)}</section>`;
      if (active === 'installer') return `<section class="module-grid">${statusCard('🔒', 'Installer Locked', data.installer_locked ? 'Locked' : 'Unlocked', 'Installer lock status is shown here without exposing unsafe reset controls.', data.installer_locked ? 'success' : 'warning')}${statusCard('🚧', 'Maintenance Mode', data.maintenanceMode ? 'Enabled' : 'Off', 'Maintenance mode state is informational unless a safe backend toggle exists.', data.maintenanceMode ? 'warning' : 'success')}${statusCard('⚠️', 'Reinstall Warning', 'Protected', 'Reinstall/reset actions are not duplicated here and require owner-safe backend workflows.', 'warning')}</section>`;
      if (active === 'health') return `<section class="stack"><div class="module-grid">${statusCard('λ', 'Function Status', checks.length ? `${checks.length} checks` : 'Limited data', 'Function checks appear here when system-health returns them.', checks.length ? 'success' : 'warning')}${statusCard('🧩', 'Broken Modules', modules.some((m) => m.status === 'broken') ? 'Review' : 'None reported', 'Broken module reports are isolated to System Center.', modules.some((m) => m.status === 'broken') ? 'danger' : 'success')}${statusCard('🌎', 'Environment', warnings.length ? `${warnings.length} warning(s)` : 'No warnings', 'Missing config and environment warnings are summarized without exposing secrets.', warnings.length ? 'warning' : 'success')}</div><article class="card module-section"><h3>Warnings</h3>${warnings.length ? `<ul>${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul>` : '<p>No missing configuration warnings were reported.</p>'}</article></section>`;
      return `<section class="module-grid">${statusCard('✅', 'Install Status', data.installed ? 'Installed' : 'Not installed', 'First-run installer status and owner presence are consolidated here.', data.installed ? 'success' : 'warning')}${statusCard('🏢', 'Company Status', company.companyName ? 'Configured' : 'Missing', company.displayName || company.companyName || 'Company settings are not loaded.', company.companyName ? 'success' : 'warning')}${statusCard('🗄️', 'Database Status', data.database?.ok ? 'Ready' : (errors.length ? 'Limited data' : 'Unknown'), 'Database readiness is reported by system health when available.', data.database?.ok ? 'success' : 'warning')}${statusCard('🤖', 'AI Status', data.ai?.ok ? 'Ready' : 'Safe check only', 'AI key status is shown only as configured/missing and never reveals secrets.', data.ai?.ok ? 'success' : 'warning')}${statusCard('🔐', 'Auth Status', data.auth?.ok ? 'Ready' : 'Session active', 'Auth and magic-link readiness stay separate from settings management.', data.auth?.ok ? 'success' : 'warning')}${statusCard('📦', 'Modules', modules.length ? `${modules.length} listed` : 'Defaults active', 'Enabled/disabled module status is consolidated here.')}</section>`;
    };

    const render = () => {
      root.innerHTML = `<section class="module-page stack system-center-page"><div class="card module-header"><div><p class="eyebrow">Owner Workspace</p><h2 class="module-title">📊 System Center</h2><p class="module-description">One consolidated place for system overview, modules, platform defaults, installer state, and health checks. No duplicate settings rows or repeated fake actions.</p></div></div><div class="module-stat-grid">${statusCard('🗄️', 'Database', data.database?.ok ? 'Ready' : 'Limited', 'Database').replace('system-health-card module-card', 'module-stat stat-card')}${statusCard('λ', 'Functions', errors.length ? 'Warnings' : 'Checked', 'Functions').replace('system-health-card module-card', 'module-stat stat-card')}${statusCard('🔐', 'Auth', data.auth?.ok ? 'Ready' : 'Active', 'Auth').replace('system-health-card module-card', 'module-stat stat-card')}${statusCard('🤖', 'AI', data.ai?.ok ? 'Ready' : 'Safe', 'AI').replace('system-health-card module-card', 'module-stat stat-card')}${statusCard('🔒', 'Installer', data.installer_locked ? 'Locked' : 'Review', 'Installer').replace('system-health-card module-card', 'module-stat stat-card')}${statusCard('📦', 'Modules', modules.length || 5, 'Modules').replace('system-health-card module-card', 'module-stat stat-card')}</div><div class="card module-section stack">${tabButtons(active)}<div data-system-panel>${renderPanel()}</div></div></section>`;
      root.querySelectorAll('[data-system-tab]').forEach((button) => button.addEventListener('click', () => { active = button.dataset.systemTab; render(); }));
    };
    render();
  }

  async function mountAuditLogs({ root, api }) {
    root.innerHTML = '<article class="card module-loading"><h3>Loading Audit Logs</h3><p>Checking recent user, quote, permission, company, login, and admin activity.</p></article>';
    const { data, errors } = await fetchAll(api);
    const events = asArray(data.events || data.auditLogs || data.activity || data.items);
    const allowedTypes = ['user', 'quote', 'permission', 'company', 'login', 'admin'];
    const filtered = events.filter((event) => !event.type || allowedTypes.some((type) => String(event.type).toLowerCase().includes(type) || String(event.category || '').toLowerCase().includes(type)));
    root.innerHTML = `<section class="module-page stack audit-logs-page"><div class="card module-header"><div><p class="eyebrow">Owner Workspace</p><h2 class="module-title">📋 Audit Logs</h2><p class="module-description">User actions, quote actions, permission changes, company changes, login history, and admin activity only. Settings, module, and workspace management are intentionally excluded.</p></div></div>${errors.length ? `<article class="module-error"><h3>Limited audit data</h3><p>${escapeHtml(errors.map((error) => error.endpoint).join(', '))} unavailable.</p></article>` : ''}<div class="module-grid">${['User Actions', 'Quote Actions', 'Permission Changes', 'Company Changes', 'Login History', 'Admin Activity'].map((label) => statusCard('📋', label, filtered.length ? 'Review' : 'No live data', `${label} will appear here when audit endpoints return events.`, filtered.length ? 'success' : 'warning')).join('')}</div><section class="card module-section stack"><h3>Recent Audit Activity</h3>${filtered.length ? `<div class="module-record-list">${filtered.slice(0, 25).map((event) => `<article class="module-record-card"><div><p class="eyebrow">${escapeHtml(event.type || event.category || 'Audit')}</p><h3>${escapeHtml(event.title || event.action || 'Audit event')}</h3><p>${escapeHtml(event.description || event.summary || event.actorEmail || 'Recorded activity')}</p><small>${escapeHtml(event.createdAt || event.created_at || '')}</small></div></article>`).join('')}</div>` : '<article class="module-empty"><h3>No audit events returned</h3><p>Audit Logs is intentionally separate from settings, workspace, and module management.</p></article>'}</section></section>`;
  }
})();
