(() => {
  const esc = (v = '') => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const list = (items) => Array.isArray(items) && items.length ? items.join(', ') : 'None';
  const meta = (label, value) => `<div><span>${esc(label)}</span><strong>${esc(value || 'Not set')}</strong></div>`;
  window.TAModules.register({ id:'admin.module-manager', role:'admin', title:'Module Manager', icon:'🧩', permissions:['settings.manage'], async mount({ root, api, router }) {
    let data = { modules: [] };
    const load = async () => { data = await api.get('/api/admin/modules'); };
    const setEnabled = async (id, enabled) => {
      const result = await api.patch('/api/admin/modules', { id, enabled });
      window.TAUi?.toast?.(result.message || 'Module updated.', 'success');
      await load();
      render();
      await router?.refreshModuleRegistry?.();
    };
    const render = () => {
      root.innerHTML = `<section class="module-page stack"><div class="module-hero module-header card"><div><p class="eyebrow">Admin / Owner Settings</p><h2 class="module-title">🧩 Module Manager</h2><p class="module-description">Enable or disable drop-in dashboard modules. Disabled modules disappear from navigation and direct routes are blocked before module JavaScript loads.</p></div><button class="btn secondary" type="button" data-refresh-modules>Refresh</button></div><div class="module-manager-grid">${(data.modules || []).map((module) => `<article class="card module-manager-card ${module.enabled ? '' : 'disabled'}"><header><p class="eyebrow">${esc(module.workspace)} workspace</p><h3>${esc(module.navIcon || '📌')} ${esc(module.title)}</h3><span class="status-badge">${module.enabled ? 'Enabled' : 'Disabled'}</span></header><p>${esc(module.description || 'No description provided.')}</p><div class="module-manager-meta">${meta('Permissions', list(module.requiredPermissions))}${meta('Dependencies', list(module.dependencies))}${meta('Route / module id', module.id)}${meta('Module path', module.modulePath)}${meta('Last loaded status', module.lastLoadedStatus)}${meta('Sort order', module.sortOrder)}</div><div class="module-manager-toggle"><button class="btn" type="button" data-enable-module="${esc(module.id)}" ${module.enabled ? 'disabled' : ''}>Enable</button><button class="btn secondary" type="button" data-disable-module="${esc(module.id)}" ${!module.enabled ? 'disabled' : ''}>Disable</button></div></article>`).join('')}</div></section>`;
      root.querySelector('[data-refresh-modules]')?.addEventListener('click', async () => { await load(); render(); });
      root.querySelectorAll('[data-enable-module]').forEach((button) => button.addEventListener('click', () => setEnabled(button.dataset.enableModule, true)));
      root.querySelectorAll('[data-disable-module]').forEach((button) => button.addEventListener('click', () => setEnabled(button.dataset.disableModule, false)));
    };
    root.innerHTML = '<section class="stack"><article class="card"><h2>Module Manager</h2><p>Loading modules...</p></article></section>';
    await load(); render();
  }, async destroy(){}, async refresh(){} });
})();
