(() => {
  const defs = [
    { id:'admin.overview', role:'admin', slug:'overview', title:'Overview', icon:'🏠', base:'/dashboard/modules/admin/overview' },
    { id:'admin.quotes', role:'admin', slug:'quotes', title:'Quotes', icon:'💰', base:'/dashboard/modules/admin/quotes' },
    { id:'admin.requests', role:'admin', slug:'requests', title:'Requests', icon:'📋', base:'/dashboard/modules/admin/requests' },
    { id:'admin.work-orders', role:'admin', slug:'work-orders', title:'Jobs', icon:'🔧', base:'/dashboard/modules/admin/work-orders' },
    { id:'admin.schedule', role:'admin', slug:'schedule', title:'Schedule', icon:'📅', base:'/dashboard/modules/admin/schedule' },
    { id:'admin.customers', role:'admin', slug:'customers', title:'Customers', icon:'👥', base:'/dashboard/modules/admin/customers' },
    { id:'admin.invoices', role:'admin', slug:'invoices', title:'Invoices', icon:'🧾', base:'/dashboard/modules/admin/invoices' },
    { id:'admin.finance', role:'admin', slug:'finance', title:'Finance', icon:'📊', base:'/dashboard/modules/admin/finance' },
    { id:'admin.inventory', role:'admin', slug:'inventory', title:'Inventory', icon:'📦', base:'/dashboard/modules/admin/inventory' },
    { id:'admin.users', role:'admin', slug:'users', title:'Users', icon:'👥', base:'/dashboard/modules/admin/users' },
    { id:'admin.roles', role:'admin', slug:'roles', title:'Roles', icon:'🛡️', base:'/dashboard/modules/admin/roles' },
    { id:'admin.ai-knowledge', role:'admin', slug:'ai-knowledge', title:'AI Center', icon:'🤖', base:'/dashboard/modules/admin/ai-knowledge' },
    { id:'admin.brand-settings', role:'admin', slug:'brand-settings', title:'Brand Settings', icon:'🎨', base:'/dashboard/modules/admin/brand-settings' },
    { id:'admin.settings', role:'admin', slug:'settings', title:'Settings', icon:'⚙️', base:'/dashboard/modules/admin/settings' },
    { id:'client.overview', role:'client', slug:'overview', title:'Overview', icon:'🏠', base:'/dashboard/modules/client/overview' },
    { id:'client.requests', role:'client', slug:'requests', title:'Requests', icon:'📋', base:'/dashboard/modules/client/requests' },
    { id:'client.quotes', role:'client', slug:'quotes', title:'Quotes', icon:'💰', base:'/dashboard/modules/client/quotes' },
    { id:'client.invoices', role:'client', slug:'invoices', title:'Invoices', icon:'🧾', base:'/dashboard/modules/client/invoices' },
    { id:'client.project-updates', role:'client', slug:'project-updates', title:'Project Updates', icon:'🔧', base:'/dashboard/modules/client/project-updates' },
    { id:'client.profile', role:'client', slug:'profile', title:'Profile', icon:'⚙️', base:'/dashboard/modules/client/profile' },
    { id:'client.properties', role:'client', slug:'properties', title:'Properties', icon:'🏠', base:'/dashboard/modules/client/properties' },
    { id:'worker.overview', role:'worker', slug:'overview', title:'Overview', icon:'🏠', base:'/dashboard/modules/worker/overview' },
    { id:'worker.jobs', role:'worker', slug:'jobs', title:'Jobs', icon:'🔧', base:'/dashboard/modules/worker/jobs' },
    { id:'worker.schedule', role:'worker', slug:'schedule', title:'Schedule', icon:'📅', base:'/dashboard/modules/worker/schedule' },
    { id:'worker.materials', role:'worker', slug:'materials', title:'Materials', icon:'📦', base:'/dashboard/modules/worker/materials' },
    { id:'worker.photos', role:'worker', slug:'photos', title:'Photos', icon:'📷', base:'/dashboard/modules/worker/photos' },
    { id:'worker.notes', role:'worker', slug:'notes', title:'Notes', icon:'📝', base:'/dashboard/modules/worker/notes' },
    { id:'worker.troubleshooting', role:'worker', slug:'troubleshooting', title:'AI Center', icon:'🤖', base:'/dashboard/modules/worker/troubleshooting' },
  ];
  const state = { currentView:null, currentModule:null, currentWorkspace:null, user:null, company:null, currentController:null, currentModuleInstance:null };
  const workspaceLabels = { owner:'👑 Owner', admin:'🛠 Admin', manager:'📋 Manager', worker:'👷 Worker', client:'🏠 Client' };
  const roleToWorkspace = (role) => role === 'owner' || role === 'manager' ? 'admin' : role;
  const userRoles = () => state.user?.roles || ['client'];
  const allowedWorkspaces = () => {
    const roles = userRoles();
    const views = state.user?.permissions?.availableViews || [];
    const keys = new Set([...roles, ...views]);
    if (roles.includes('owner')) keys.add('owner');
    if (roles.includes('manager')) keys.add('manager');
    return ['owner','admin','manager','worker','client'].filter((role) => keys.has(role) || keys.has(roleToWorkspace(role)));
  };
  const moduleAllowed = (def) => allowedWorkspaces().some((workspace) => roleToWorkspace(workspace) === def.role);
  const moduleFor = (workspace, slug) => defs.find((def) => def.role === roleToWorkspace(workspace) && def.slug === slug && moduleAllowed(def));
  const defaultModuleFor = (workspace) => moduleFor(workspace, 'overview') || defs.find((def) => def.role === roleToWorkspace(workspace) && moduleAllowed(def));
  const currentWorkspace = () => state.currentWorkspace || allowedWorkspaces()[0] || state.user?.permissions?.defaultView || 'client';
  const mobileTargets = () => {
    const workspace = currentWorkspace();
    const mapped = roleToWorkspace(workspace);
    return [
      { label:'🏠 Home', module: moduleFor(workspace, 'overview')?.id },
      { label:'📋 Requests', module: moduleFor(workspace, 'requests')?.id },
      { label:'💰 Quotes', module: moduleFor(workspace, 'quotes')?.id },
      { label:'🔧 Jobs', module: mapped === 'worker' ? moduleFor(workspace, 'jobs')?.id : mapped === 'admin' ? moduleFor(workspace, 'work-orders')?.id : moduleFor(workspace, 'project-updates')?.id },
      { label:'☰ More', more:true },
    ].filter((item) => item.more || item.module);
  };
  const moreModules = () => {
    const workspace = currentWorkspace();
    const slugs = ['customers','schedule','invoices','inventory','ai-knowledge','troubleshooting','users','roles','brand-settings','settings','profile','properties','materials','photos','notes','finance'];
    return slugs.map((slug) => moduleFor(workspace, slug)).filter(Boolean);
  };
  function renderNav() {
    state.currentWorkspace ||= allowedWorkspaces()[0] || 'client';
    const workspace = currentWorkspace();
    const sidebarItems = defs.filter((def) => def.role === roleToWorkspace(workspace) && moduleAllowed(def));
    const sidebar = document.getElementById('dashboard-sidebar');
    sidebar.innerHTML = `<div class="brand" data-brand></div><div class="workspace-switcher">${allowedWorkspaces().map((role) => `<button data-workspace="${role}">${workspaceLabels[role]}</button>`).join('')}</div><div class="side-nav">${sidebarItems.map((def) => `<button data-module="${def.id}">${def.icon} ${def.title}</button>`).join('')}</div>`;
    const mobile = document.getElementById('mobile-bottom-nav');
    mobile.className = 'mobile-nav';
    mobile.innerHTML = mobileTargets().map((item) => `<button ${item.more ? 'data-more-menu="1"' : `data-module="${item.module}"`}>${item.label}</button>`).join('');
    TACompany.apply(state.company);
    document.querySelectorAll('[data-module]').forEach((button) => { button.onclick = () => go(button.dataset.module); });
    document.querySelectorAll('[data-workspace]').forEach((button) => { button.onclick = () => switchWorkspace(button.dataset.workspace); });
    document.querySelector('[data-more-menu]')?.addEventListener('click', showMoreMenu);
    markActive();
  }
  function showMoreMenu() {
    const modal = document.getElementById('modal-root');
    modal.innerHTML = `<div class="mobile-more-panel"><div class="card stack"><h2>More</h2><h3>Workspace</h3><div class="grid grid-2">${allowedWorkspaces().map((role) => `<button class="btn secondary" data-workspace="${role}">${workspaceLabels[role]}</button>`).join('')}</div><h3>Tools</h3><div class="grid grid-2">${moreModules().map((def) => `<button class="btn secondary" data-module="${def.id}">${def.icon} ${def.title}</button>`).join('')}</div><button class="btn" data-close-more>Close</button></div></div>`;
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
    state.currentView = roleToWorkspace(workspace);
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
    state.currentView = def.role;
    state.currentWorkspace ||= allowedWorkspaces().find((workspace) => roleToWorkspace(workspace) === def.role) || def.role;
    state.currentModule = def.id;
    history.replaceState(null, '', `#${def.id}`);
    markActive();
    document.getElementById('workspace-header').innerHTML = `<span class="pill">${workspaceLabels[state.currentWorkspace] || def.role}</span><h1>${def.title}</h1>`;
    const root = document.getElementById('module-root');
    root.innerHTML = `<div class="card">Loading ${def.title}...</div>`;
    state.currentController = new AbortController();
    const mod = await TAModules.load(def);
    state.currentModuleInstance = mod;
    root.replaceChildren();
    if (mod?.mount) await mod.mount({ root, api:TAApi, user:state.user, company:state.company, router:window.TADashboardRouter, signal:state.currentController.signal });
    renderNav();
    window.scrollTo({ top:0, behavior:'smooth' });
  }
  async function start() {
    if (!await TACompany.requireInstalled()) return;
    state.company = await TACompany.load();
    const me = await TAAuth.me().catch(() => ({ authenticated:false }));
    if (!me.authenticated) { location.href = '/login/'; return; }
    state.user = me.user;
    state.currentWorkspace = me.user?.roles?.includes('owner') ? 'owner' : (me.user?.roles?.includes('manager') ? 'manager' : me.user?.permissions?.defaultView || allowedWorkspaces()[0] || 'client');
    document.getElementById('dashboard-topbar').innerHTML = `<div><strong>${state.company.displayName || 'Contractor Portal'}</strong><br><small>${(userRoles()).join(', ') || 'user'}</small></div><button class="btn secondary" id="logout">Log out</button>`;
    document.getElementById('logout').onclick = async () => { await TAAuth.logout(); location.href = '/login/'; };
    renderNav();
    const requested = location.hash.slice(1);
    const requestedDef = defs.find((def) => def.id === requested && moduleAllowed(def));
    if (requestedDef) state.currentWorkspace = allowedWorkspaces().find((workspace) => roleToWorkspace(workspace) === requestedDef.role) || state.currentWorkspace;
    await go(requestedDef?.id || defaultModuleFor(state.currentWorkspace)?.id);
  }
  window.TADashboardRouter = { start, go, switchWorkspace, state, defs, allowedWorkspaces };
})();
