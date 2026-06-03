// Phase 33: route-style dashboard workspaces.
(() => {
  if (window.__phase33WorkspaceRoutesLoaded) return;
  window.__phase33WorkspaceRoutesLoaded = true;

  const root = document.querySelector('[data-dashboard-root]');
  if (!root) return;

  const routes = [
    ['overview','Overview'],
    ['requests','Requests'],
    ['quotes','Quotes'],
    ['work-orders','Work Orders'],
    ['invoices','Invoices'],
    ['workers','Workers'],
    ['settings','Settings'],
  ];

  const tagSections = () => {
    const pairs = [
      ['.hero, #executive-overview, .executive-suite, .customer-experience-suite', 'overview'],
      ['#client-requests, [data-client-requests], #admin-requests', 'requests'],
      ['#estimate-review, #client-quotes, [data-client-quotes], #admin-quotes', 'quotes'],
      ['#admin-work-orders, #worker-jobs, [data-worker-jobs]', 'work-orders'],
      ['#finance-command-center, #admin-invoices, #client-invoices, [data-admin-invoices], [data-client-invoices]', 'invoices'],
      ['#worker-mobile-field, #worker-tools-upgrade, .worker-mobile-suite', 'workers'],
      ['#admin-access, #admin-activity, #admin-inventory, [data-admin-inventory]', 'settings'],
    ];

    pairs.forEach(([selector, route]) => {
      document.querySelectorAll(selector).forEach((el) => {
        el.setAttribute('data-workspace-route-section', route);
      });
    });
  };

  const ensureTabs = () => {
    if (document.querySelector('[data-workspace-route-tabs]')) return;

    const tabs = document.createElement('nav');
    tabs.className = 'workspace-route-tabs';
    tabs.dataset.workspaceRouteTabs = 'true';
    tabs.setAttribute('aria-label', 'Dashboard workspace routes');
    tabs.innerHTML = routes.map(([key, label]) =>
      `<button class="workspace-route-tab" type="button" data-workspace-route-tab="${key}">${label}</button>`
    ).join('');

    const note = document.createElement('div');
    note.className = 'workspace-route-note';
    note.dataset.workspaceRouteNote = 'true';

    const hero = root.querySelector('.hero') || root.firstElementChild;
    hero?.parentNode?.insertBefore(tabs, hero);
    tabs.parentNode?.insertBefore(note, tabs.nextSibling);

    tabs.addEventListener('click', (event) => {
      const button = event.target.closest('[data-workspace-route-tab]');
      if (!button) return;
      setRoute(button.dataset.workspaceRouteTab);
    });
  };

  const routeLabels = Object.fromEntries(routes);

  const setRoute = (route = 'overview') => {
    tagSections();
    document.body.dataset.workspaceRoute = route;

    document.querySelectorAll('[data-workspace-route-tab]').forEach((button) => {
      button.setAttribute('aria-current', button.dataset.workspaceRouteTab === route ? 'true' : 'false');
    });

    const note = document.querySelector('[data-workspace-route-note]');
    if (note) note.textContent = `${routeLabels[route] || 'Overview'} workspace`;

    const url = new URL(window.location.href);
    url.searchParams.set('workspace', route);
    window.history.replaceState({}, '', url);
  };

  const initialRoute = new URLSearchParams(window.location.search).get('workspace') || 'overview';

  setTimeout(() => {
    ensureTabs();
    setRoute(initialRoute);
  }, 900);

  window.taSetWorkspaceRoute = setRoute;
})();
