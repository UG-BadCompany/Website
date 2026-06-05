(() => {
  const esc = (v = '') => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const list = (items) => Array.isArray(items) && items.length ? items.join(', ') : 'None';
  const meta = (label, value) => `<div><span>${esc(label)}</span><strong>${esc(value || 'Not set')}</strong></div>`;
  const workspaceOptions = (selected) => ['owner','admin','manager','worker','client'].map((workspace) => `<option value="${workspace}" ${workspace === selected ? 'selected' : ''}>${workspace}</option>`).join('');
  window.TAModules.register({ id:'admin.module-manager', role:'admin', title:'Module Manager', icon:'🧩', permissions:['settings.manage'], async mount({ root, api, router }) { root = root?.querySelector ? root : root?.root || root?.element || document.querySelector('[data-module-root], #module-root'); if (!root?.querySelector) throw new TypeError('Module root element was not found.');
    let data = { modules: [] };
    const load = async () => { data = await api.get('/api/admin/modules'); };
    const saveModule = async (id, updates) => {
      const result = await api.patch('/api/admin/modules', { id, ...updates });
      window.TAUi?.toast?.(result.message || 'Module updated.', 'success');
      await load();
      render();
      await router?.refreshModuleRegistry?.();
      router?.state && (router.state.moduleRegistry = router.state.moduleRegistry);
    };
    const renderError = (error) => {
      root.innerHTML = `<section class="module-page stack"><article class="card module-error"><h2>Module Manager unavailable</h2><p>${esc(error?.message || 'Could not load module registry.')}</p><button class="btn" type="button" data-refresh-modules>Retry</button></article></section>`;
      root.querySelector('[data-refresh-modules]')?.addEventListener('click', async () => { await start(); });
    };
    const render = () => {
      const modules = data.modules || [];
      root.innerHTML = `<section class="module-page stack"><div class="module-hero module-header card"><div><p class="eyebrow">Admin / Owner Settings</p><h2 class="module-title">🧩 Module Manager</h2><p class="module-description">Enable or disable dashboard modules, set workspace visibility, and review required permissions and dependencies. Disabled modules are hidden from navigation and blocked before JavaScript loads.</p></div><button class="btn secondary" type="button" data-refresh-modules>Refresh</button></div><div class="module-manager-grid">${modules.map((module) => `<article class="card module-manager-card ${module.enabled ? '' : 'disabled'}" data-module-card="${esc(module.id)}"><header><p class="eyebrow">${esc(module.workspace)} workspace</p><h3>${esc(module.navIcon || '📌')} ${esc(module.title)}</h3><span class="status-badge">${module.enabled ? 'Enabled' : 'Disabled'}</span></header><p>${esc(module.description || 'No description provided.')}</p><label class="module-manager-workspace"><span>Workspace visibility</span><select data-module-workspace="${esc(module.id)}">${workspaceOptions(module.workspace)}</select></label><div class="module-manager-meta">${meta('Permissions', list(module.requiredPermissions))}${meta('Dependencies', list(module.dependencies))}${meta('Route / module id', module.id)}${meta('Module path', module.modulePath)}${meta('Last loaded status', module.lastLoadedStatus)}${meta('Sort order', module.sortOrder)}</div><div class="module-manager-toggle"><button class="btn" type="button" data-enable-module="${esc(module.id)}" ${module.enabled ? 'disabled' : ''}>Enable</button><button class="btn secondary" type="button" data-disable-module="${esc(module.id)}" ${!module.enabled ? 'disabled' : ''}>Disable</button><button class="btn secondary" type="button" data-save-workspace="${esc(module.id)}">Save Workspace</button></div></article>`).join('')}</div>${modules.length ? '' : '<article class="card module-empty"><h3>No modules registered</h3><p>Default module records will be created automatically when the registry is available.</p></article>'}</section>`;
      root.querySelector('[data-refresh-modules]')?.addEventListener('click', async () => { await start(); });
      root.querySelectorAll('[data-enable-module]').forEach((button) => button.addEventListener('click', () => saveModule(button.dataset.enableModule, { enabled:true })));
      root.querySelectorAll('[data-disable-module]').forEach((button) => button.addEventListener('click', () => saveModule(button.dataset.disableModule, { enabled:false })));
      root.querySelectorAll('[data-save-workspace]').forEach((button) => button.addEventListener('click', () => saveModule(button.dataset.saveWorkspace, { workspace: root.querySelector(`[data-module-workspace="${CSS.escape(button.dataset.saveWorkspace)}"]`)?.value })));
    };
    const start = async () => {
      root.innerHTML = '<section class="stack"><article class="card"><h2>Module Manager</h2><p>Loading modules...</p></article></section>';
      try { await load(); render(); } catch (error) { console.error('Module Manager failed to load registry', error); renderError(error); }
    };
    await start();
  }, async destroy(){}, async refresh(){} });
})();
