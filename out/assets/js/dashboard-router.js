(() => {
  const categoryFor = (workspace, slug) => {
    if (['company-management','customers','users','roles','permissions-workspaces','workers'].includes(slug)) return 'People';
    if (['estimate-management-center','estimate-request-center','work-orders','schedule','inventory','materials','finance','invoices','requests','quotes','jobs','project-updates','properties','maintenance-plans'].includes(slug)) return 'Operations';
    if (['ai-knowledge','ai-tools','troubleshooting'].includes(slug)) return 'AI';
    if (['theme-manager','brand-settings','settings','system-center','audit-logs','reports'].includes(slug)) return 'Administration';
    if (workspace === 'owner') return 'Business';
    return 'Business';
  };
  const as = (workspace, slug, title, icon, base, registerId, permissions = [], category) => ({ id: `${workspace}.${slug}`, role: workspace, slug, title, icon, base, registerId, permissions, category: category || categoryFor(workspace, slug) });
  const defs = [
    as('owner','overview','Overview','🏠','/dashboard/modules/admin/overview','admin.overview'),
    as('owner','company-management','Company Management','👥','/dashboard/modules/admin/users','admin.users',['users.manage']),
    as('owner','workspace-permissions-center','Workspace & Permissions Center','🛡','/dashboard/modules/admin/roles','admin.roles',['roles.manage'],'Administration'),
    as('owner','system-center','System Center','📊','/dashboard/modules/admin/settings','admin.settings',['settings.manage']),
    as('owner','theme-manager','Theme Manager','🎨','/dashboard/modules/admin/brand-settings','admin.brand-settings',['branding.manage']),
    as('owner','audit-logs','Audit Logs','📋','/dashboard/modules/admin/settings','admin.settings',['reports.view']),
    as('admin','overview','Overview','🏠','/dashboard/modules/admin/overview'),
    as('admin','estimate-management-center','Estimate Management Center','💰','/dashboard/modules/admin/quotes','admin.quotes',['quotes.manage'],'Operations'),
    as('admin','work-orders','Work Orders','🔧','/dashboard/modules/admin/work-orders','admin.work-orders',['requests.manage']),
    as('admin','schedule','Schedule','📅','/dashboard/modules/admin/schedule','admin.schedule',['scheduling.manage']),
    as('admin','customers','Customers','👥','/dashboard/modules/admin/customers','admin.customers',['customers.manage']),
    as('admin','invoices','Invoices','🧾','/dashboard/modules/admin/invoices','admin.invoices',['invoices.manage']),
    as('admin','finance','Finance','📊','/dashboard/modules/admin/finance','admin.finance'),
    as('admin','inventory','Inventory','📦','/dashboard/modules/admin/inventory','admin.inventory',['inventory.manage']),
    as('admin','users','Users','👤','/dashboard/modules/admin/users','admin.users',['users.manage']),
    as('admin','roles','Roles & Permissions','🛡','/dashboard/modules/admin/roles','admin.roles',['roles.manage']),
    as('admin','ai-knowledge','AI Knowledge','🤖','/dashboard/modules/admin/ai-knowledge','admin.ai-knowledge',['ai.knowledge.manage']),
    as('admin','reports','Reports','📈','/dashboard/modules/admin/reports','admin.reports',['reports.view']),
    as('admin','brand-settings','Branding','🎨','/dashboard/modules/admin/brand-settings','admin.brand-settings',['branding.manage']),
    as('admin','settings','Settings','⚙️','/dashboard/modules/admin/settings','admin.settings',['settings.manage']),
    as('manager','overview','Overview','🏠','/dashboard/modules/admin/overview','admin.overview'),
    as('manager','estimate-management-center','Estimate Management Center','💰','/dashboard/modules/admin/quotes','admin.quotes',['quotes.manage'],'Operations'),
    as('manager','work-orders','Work Orders','🔧','/dashboard/modules/admin/work-orders','admin.work-orders',['requests.manage']),
    as('manager','schedule','Schedule','📅','/dashboard/modules/admin/schedule','admin.schedule',['scheduling.manage']),
    as('manager','customers','Customers','👥','/dashboard/modules/admin/customers','admin.customers',['customers.manage']),
    as('manager','workers','Workers','👷','/dashboard/modules/admin/users','admin.users',['workers.manage']),
    as('manager','materials','Materials','📦','/dashboard/modules/admin/inventory','admin.inventory',['inventory.manage']),
    as('manager','ai-tools','AI Tools','🤖','/dashboard/modules/admin/ai-knowledge','admin.ai-knowledge',['ai.quote.use']),
    as('manager','reports','Reports','📈','/dashboard/modules/admin/reports','admin.reports',['reports.view']),
    as('worker','overview','Overview','🏠','/dashboard/modules/worker/overview','worker.overview'),
    as('worker','jobs','Jobs','🔧','/dashboard/modules/worker/jobs','worker.jobs'),
    as('worker','schedule','Schedule','📅','/dashboard/modules/worker/schedule','worker.schedule'),
    as('worker','materials','Materials','📦','/dashboard/modules/worker/materials','worker.materials'),
    as('worker','photos','Photos','📸','/dashboard/modules/worker/photos','worker.photos'),
    as('worker','notes','Notes','📝','/dashboard/modules/worker/notes','worker.notes'),
    as('worker','troubleshooting','Troubleshooting','🤖','/dashboard/modules/worker/troubleshooting','worker.troubleshooting'),
    as('client','overview','Overview','🏠','/dashboard/modules/client/overview','client.overview'),
    as('client','requests','My Requests','📋','/dashboard/modules/client/requests','client.requests'),
    as('client','quotes','My Quotes','💰','/dashboard/modules/client/quotes','client.quotes'),
    as('client','invoices','My Invoices','🧾','/dashboard/modules/client/invoices','client.invoices'),
    as('client','project-updates','Project Updates','📈','/dashboard/modules/client/project-updates','client.project-updates'),
    as('client','properties','Properties','🏡','/dashboard/modules/client/properties','client.properties'),
    as('client','profile','Profile','👤','/dashboard/modules/client/profile','client.profile'),
  ];
  const workspaceLabels = { owner:'👑 Owner', admin:'🛠 Admin', manager:'📋 Manager', worker:'👷 Worker', client:'🏠 Client' };
  const workspaceOrder = ['owner','admin','manager','worker','client'];
  const state = { currentView:null, currentModule:null, currentWorkspace:null, user:null, company:null, currentController:null, currentModuleInstance:null };
  const permissionKeys = () => state.user?.permissions?.permissionKeys || state.user?.permissionKeys || [];
  const hasAllPermissions = (perms = []) => !perms.length || state.user?.roles?.includes('owner') || perms.every((perm) => permissionKeys().includes(perm) || permissionKeys().includes('admin.tools'));
  const userRoles = () => state.user?.roles || ['client'];
  const allowedWorkspaces = () => {
    const roles = userRoles();
    const views = state.user?.permissions?.availableViews || [];
    const keys = new Set([...roles, ...views]);
    if (roles.includes('owner')) return workspaceOrder;
    if (permissionKeys().includes('dashboard.view.admin') || permissionKeys().includes('admin.tools')) keys.add('admin');
    if (permissionKeys().includes('dashboard.view.worker') || permissionKeys().includes('worker.tools')) keys.add('worker');
    if (permissionKeys().includes('dashboard.view.client') || permissionKeys().includes('client.tools')) keys.add('client');
    return workspaceOrder.filter((workspace) => keys.has(workspace));
  };
  const moduleAllowed = (def) => allowedWorkspaces().includes(def.role) && hasAllPermissions(def.permissions);
  const moduleFor = (workspace, slug) => defs.find((def) => def.role === workspace && def.slug === slug && moduleAllowed(def));
  const modulesForWorkspace = (workspace) => defs.filter((def) => def.role === workspace && moduleAllowed(def));
  const defaultModuleFor = (workspace) => moduleFor(workspace, 'overview') || modulesForWorkspace(workspace)[0];
  const currentWorkspace = () => state.currentWorkspace || allowedWorkspaces()[0] || state.user?.permissions?.defaultView || 'client';
  const mobileTargets = () => {
    const workspace = currentWorkspace();
    const jobSlug = workspace === 'worker' ? 'jobs' : workspace === 'admin' || workspace === 'manager' ? 'work-orders' : workspace === 'client' ? 'project-updates' : 'system-center';
    return [
      { label:'🏠 Home', module: moduleFor(workspace, 'overview')?.id },
      { label:'💰 Estimates', module: moduleFor(workspace, 'estimate-management-center')?.id || moduleFor(workspace, 'requests')?.id || moduleFor(workspace, 'audit-logs')?.id },
      { label:'💰 Quotes', module: moduleFor(workspace, 'quotes')?.id || moduleFor(workspace, 'system-center')?.id },
      { label:'🔧 Jobs', module: moduleFor(workspace, jobSlug)?.id },
      { label:'☰ More', more:true },
    ].filter((item) => item.more || item.module);
  };
  const moreModules = () => {
    const primary = new Set(mobileTargets().map((item) => item.module).filter(Boolean));
    return modulesForWorkspace(currentWorkspace()).filter((def) => !primary.has(def.id));
  };
  function renderNav() {
    state.currentWorkspace ||= allowedWorkspaces()[0] || 'client';
    const workspace = currentWorkspace();
    const sidebarItems = modulesForWorkspace(workspace);
    const groupedItems = sidebarItems.reduce((groups, def) => {
      const category = def.category || 'Business';
      groups[category] ||= [];
      groups[category].push(def);
      return groups;
    }, {});
    const sidebar = document.getElementById('dashboard-sidebar');
    sidebar.innerHTML = `<div class="sidebar-brand-row"><div class="brand" data-brand></div><span class="workspace-badge">${workspaceLabels[workspace]} Workspace</span></div><div class="sidebar-section"><h2>Views</h2><div class="workspace-switcher">${allowedWorkspaces().map((role) => `<button data-workspace="${role}">${workspaceLabels[role]}</button>`).join('')}</div></div>${Object.entries(groupedItems).map(([category, items]) => `<div class="sidebar-section"><h2>${category}</h2><div class="side-nav">${items.map((def) => `<button data-module="${def.id}"><span>${def.icon}</span><span>${def.title}</span></button>`).join('')}</div></div>`).join('')}`;
    const mobile = document.getElementById('mobile-bottom-nav');
    mobile.className = 'mobile-nav';
    mobile.innerHTML = mobileTargets().map((item) => `<button ${item.more ? 'data-more-menu="1"' : `data-module="${item.module}"`}>${item.label}</button>`).join('');
    TACompany.apply(state.company);
    document.querySelectorAll('[data-module]').forEach((button) => { button.onclick = () => go(button.dataset.module); });
    document.querySelectorAll('[data-workspace]').forEach((button) => { button.onclick = () => switchWorkspace(button.dataset.workspace); });
    const moreButton = document.querySelector('[data-more-menu]');
    if (moreButton) moreButton.onclick = showMoreMenu;
    markActive();
  }
  function showMoreMenu() {
    const modal = document.getElementById('modal-root');
    modal.innerHTML = `<div class="mobile-more-panel"><div class="card stack"><h2>More</h2><h3>Switch View</h3><div class="grid grid-2">${allowedWorkspaces().map((role) => `<button class="btn secondary" data-workspace="${role}">${workspaceLabels[role]}</button>`).join('')}</div><h3>${workspaceLabels[currentWorkspace()]} Tools</h3><div class="grid grid-2">${moreModules().map((def) => `<button class="btn secondary" data-module="${def.id}">${def.icon} ${def.title}</button>`).join('')}</div><button class="btn" data-close-more>Close</button></div></div>`;
    modal.querySelectorAll('[data-workspace]').forEach((button) => { button.onclick = () => { modal.innerHTML = ''; switchWorkspace(button.dataset.workspace); }; });
    modal.querySelectorAll('[data-module]').forEach((button) => { button.onclick = () => { modal.innerHTML = ''; go(button.dataset.module); }; });
    modal.querySelector('[data-close-more]').onclick = () => { modal.innerHTML = ''; };
  }
  function markActive() {
    document.querySelectorAll('[data-module]').forEach((button) => button.classList.toggle('active', button.dataset.module === state.currentModule));
    document.querySelectorAll('[data-workspace]').forEach((button) => button.classList.toggle('active', button.dataset.workspace === state.currentWorkspace));
  }
  async function cleanupCurrentModule() {
    state.currentController?.abort?.();
    const previous = state.currentModuleInstance || TAModules.get(state.currentModule);
    if (previous?.destroy) await previous.destroy();
    state.currentController = null;
    state.currentModuleInstance = null;
    document.getElementById('modal-root').innerHTML = '';
    document.getElementById('module-root').replaceChildren();
  }
  async function switchWorkspace(workspace) {
    if (!allowedWorkspaces().includes(workspace)) return;
    await cleanupCurrentModule();
    state.currentWorkspace = workspace;
    state.currentView = workspace;
    state.currentModule = null;
    renderNav();
    await go(defaultModuleFor(workspace)?.id);
  }
  async function go(id) {
    const requested = defs.find((def) => def.id === id);
    const def = requested && moduleAllowed(requested) ? requested : defaultModuleFor(currentWorkspace());
    if (!def) return;
    if (state.currentModule === def.id && state.currentModuleInstance) return;
    await cleanupCurrentModule();
    state.currentWorkspace = def.role;
    state.currentView = def.role;
    state.currentModule = def.id;
    history.replaceState(null, '', `#${def.id}`);
    markActive();
    document.getElementById('workspace-header').innerHTML = `<div class="workspace-title-card"><span class="pill">${workspaceLabels[state.currentWorkspace]} Workspace · ${def.category || 'Business'}</span><h1>${def.title}</h1><p>Premium command center for ${def.title.toLowerCase()} workflows, mobile actions, and role-safe access.</p></div>`;
    const root = document.getElementById('module-root');
    root.innerHTML = `<div class="card">Loading ${def.title}...</div>`;
    state.currentController = new AbortController();
    const mod = await TAModules.load(def);
    state.currentModuleInstance = mod;
    root.replaceChildren();
    if (mod?.mount) await mod.mount({ root, api:TAApi, user:state.user, company:state.company, router:window.TADashboardRouter, signal:state.currentController.signal, workspace:state.currentWorkspace });
    renderNav();
    window.scrollTo({ top:0, behavior:'smooth' });
  }
  async function start() {
    if (!await TACompany.requireInstalled()) return;
    state.company = await TACompany.load();
    const me = await TAAuth.me().catch(() => ({ authenticated:false }));
    if (!me.authenticated) { location.href = '/login/'; return; }
    state.user = me.user;
    state.currentWorkspace = userRoles().includes('owner') ? 'owner' : userRoles().includes('manager') ? 'manager' : (state.user?.permissions?.defaultView && allowedWorkspaces().includes(state.user.permissions.defaultView) ? state.user.permissions.defaultView : allowedWorkspaces()[0] || 'client');
    document.getElementById('dashboard-topbar').innerHTML = `<div><strong>${state.company.displayName || 'Contractor Portal'}</strong><br><small>${userRoles().join(', ') || 'user'}</small></div><button class="btn secondary" id="logout">Log out</button>`;
    document.getElementById('logout').onclick = async () => { await TAAuth.logout(); location.href = '/login/'; };
    renderNav();
    const requested = location.hash.slice(1);
    const requestedDef = defs.find((def) => def.id === requested && moduleAllowed(def));
    await go(requestedDef?.id || defaultModuleFor(state.currentWorkspace)?.id);
  }
  window.TADashboardRouter = { start, go, switchWorkspace, state, defs, allowedWorkspaces };
})();
