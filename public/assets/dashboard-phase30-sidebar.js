// public/assets/dashboard-phase30-sidebar.js
// Phase 30: app-style sidebar navigation for the dashboard.

(() => {
  if (window.__taPhase30SidebarLoaded) return;
  window.__taPhase30SidebarLoaded = true;

  const root = document.querySelector('[data-dashboard-root]');
  if (!root) return;

  const navItems = [
    { group: 'Daily work', label: 'Overview', target: '.hero', hint: 'Start' },
    { group: 'Daily work', label: 'Estimate Review', target: '#estimate-review', hint: 'AI quotes' },
    { group: 'Daily work', label: 'Work Orders', target: '#admin-requests', hint: 'Jobs' },
    { group: 'Daily work', label: 'Scheduling', target: '.smart-schedule-suite', hint: 'Dispatch' },

    { group: 'Money', label: 'Finance Center', target: '#finance-command-center', hint: 'KPIs' },
    { group: 'Money', label: 'Invoices', target: '#admin-invoices', hint: 'Billing' },
    { group: 'Money', label: 'Customer Status', target: '#customer-experience-center', hint: 'Client' },

    { group: 'Field', label: 'Worker Jobs', target: '#worker-jobs', hint: 'Field' },
    { group: 'Field', label: 'Worker Mobile', target: '#worker-mobile-field', hint: 'Phone' },
    { group: 'Field', label: 'Photo Docs', target: '.photo-doc-suite', hint: 'Proof' },

    { group: 'Operations', label: 'Inventory', href: '/inventory/', hint: 'Stock', permission: 'canManageInventory' },
    { group: 'Operations', label: 'Maintenance Plans', target: '.maintenance-suite', hint: 'Recurring' },
    { group: 'Operations', label: 'Roles & Users', target: '#admin-access', hint: 'Access' },

    { group: 'Dev', label: 'Deployment Health', target: '#system-readiness', hint: 'Workflow' },
  ];

  const groupItems = () => navItems.reduce((groups, item) => {
    groups[item.group] ||= [];
    groups[item.group].push(item);
    return groups;
  }, {});

  const targetExists = (target) => {
    try { return Boolean(document.querySelector(target)); }
    catch { return false; }
  };

  const openModalShortcut = (name) => {
    const selector = '[data-admin-access-shortcut]';
    const button = document.querySelector(selector);
    if (button) {
      button.click();
      return true;
    }
    window.TAUX?.toast?.({
      title: 'Section unavailable',
      message: 'That admin tool is not available for this account or has not loaded yet.',
      type: 'warn',
    });
    return false;
  };

  const scrollToTarget = (target) => {
    let destination = null;
    try { destination = document.querySelector(target); } catch { destination = null; }

    if (!destination) {
      window.TAUX?.toast?.({
        title: 'Section unavailable',
        message: 'That workspace is not available for this role or has not loaded yet.',
        type: 'warn',
      });
      return;
    }

    destination.scrollIntoView({ behavior: 'smooth', block: 'start' });
    destination.classList.add('dashboard-section-highlight');
    setTimeout(() => destination.classList.remove('dashboard-section-highlight'), 1200);
  };

  const mount = () => {
    if (document.querySelector('[data-phase30-sidebar]')) return;

    const originalChildren = Array.from(root.children);
    const shell = document.createElement('div');
    shell.className = 'dashboard-shell-v2';
    shell.dataset.phase30Sidebar = 'true';

    const sidebar = document.createElement('aside');
    sidebar.className = 'dashboard-sidebar-v2';
    sidebar.setAttribute('aria-label', 'Dashboard workspace navigation');
    sidebar.innerHTML = `
      <button class="btn btn-soft" type="button" data-sidebar-close>Close menu</button>
      <div class="dashboard-sidebar-head">
        <h2>Workspace</h2>
        <button class="btn btn-soft dashboard-sidebar-collapse" type="button" data-sidebar-collapse aria-label="Collapse sidebar" title="Collapse sidebar" aria-pressed="false"><span class="sidebar-collapse-icon" aria-hidden="true"></span></button>
      </div>
      <nav class="sidebar-nav-group" data-sidebar-nav></nav>
    `;

    const nav = sidebar.querySelector('[data-sidebar-nav]');
    const groups = groupItems();
    nav.innerHTML = Object.entries(groups).map(([group, items]) => `
      <div class="sidebar-nav-label">${group}</div>
      ${items.map((item) => item.href ? `
        <a class="sidebar-nav-link" href="${item.href}" data-sidebar-href="${item.href}" data-sidebar-permission="${item.permission || ''}">
          <span>${item.label}</span>
          <small>${item.hint || ''}</small>
        </a>
      ` : `
        <button class="sidebar-nav-link" type="button" data-sidebar-target="${item.target || ''}" data-sidebar-action="${item.action || ''}" data-sidebar-permission="${item.permission || ''}">
          <span>${item.label}</span>
          <small>${item.hint || ''}</small>
        </button>
      `).join('')}
    `).join('');

    const workspace = document.createElement('div');
    workspace.className = 'dashboard-workspace-v2';
    originalChildren.forEach((child) => workspace.appendChild(child));

    shell.appendChild(sidebar);
    shell.appendChild(workspace);

    const toggle = document.createElement('button');
    toggle.className = 'btn btn-primary dashboard-mobile-nav-toggle';
    toggle.type = 'button';
    toggle.textContent = 'Open workspace menu';
    toggle.dataset.sidebarToggle = 'true';

    const backdrop = document.createElement('div');
    backdrop.className = 'dashboard-sidebar-backdrop';
    backdrop.dataset.sidebarBackdrop = 'true';

    root.appendChild(toggle);
    root.appendChild(backdrop);
    root.appendChild(shell);

    const setOpen = (open) => {
      sidebar.dataset.open = open ? 'true' : 'false';
      backdrop.dataset.open = open ? 'true' : 'false';
    };

    const setCollapsed = (collapsed) => {
      shell.dataset.sidebarCollapsed = collapsed ? 'true' : 'false';
      sidebar.dataset.collapsed = collapsed ? 'true' : 'false';
      root.dataset.sidebarCollapsed = collapsed ? 'true' : 'false';
      document.body.dataset.sidebarCollapsed = collapsed ? 'true' : 'false';
      const collapseButton = sidebar.querySelector('[data-sidebar-collapse]');
      if (collapseButton) {
        collapseButton.setAttribute('aria-pressed', String(collapsed));
        collapseButton.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
        collapseButton.setAttribute('title', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
      }
      try { window.localStorage.setItem('ta_dashboard_sidebar_collapsed', collapsed ? 'true' : 'false'); } catch {}
    };

    const initialCollapsed = (() => {
      try { return window.localStorage.getItem('ta_dashboard_sidebar_collapsed') === 'true'; } catch { return false; }
    })();
    setCollapsed(initialCollapsed);

    const syncPermissionLinks = () => {
      const view = document.body.dataset.currentDashboardView || document.documentElement.dataset.currentDashboardView || '';
      nav.querySelectorAll('[data-sidebar-permission="canManageInventory"]').forEach((link) => {
        link.hidden = Boolean(view && view !== 'admin');
        link.setAttribute('aria-disabled', view && view !== 'admin' ? 'true' : 'false');
      });
    };
    syncPermissionLinks();
    try {
      new MutationObserver(syncPermissionLinks).observe(document.body, { attributes: true, attributeFilter: ['data-current-dashboard-view'] });
      new MutationObserver(syncPermissionLinks).observe(document.documentElement, { attributes: true, attributeFilter: ['data-current-dashboard-view'] });
    } catch {}

    toggle.addEventListener('click', () => setOpen(true));
    sidebar.querySelector('[data-sidebar-close]')?.addEventListener('click', () => setOpen(false));
    document.addEventListener('click', (event) => {
      const collapseButton = event.target.closest('[data-sidebar-collapse]');
      if (!collapseButton || !sidebar.contains(collapseButton)) return;
      event.preventDefault();
      event.stopPropagation();
      setCollapsed(shell.dataset.sidebarCollapsed !== 'true');
    }, true);
    backdrop.addEventListener('click', () => setOpen(false));

    sidebar.addEventListener('click', (event) => {
      const link = event.target.closest('[data-sidebar-href]');
      if (link) {
        sidebar.querySelectorAll('.sidebar-nav-link').forEach((item) => item.removeAttribute('aria-current'));
        link.setAttribute('aria-current', 'page');
        setOpen(false);
        return;
      }

      const button = event.target.closest('[data-sidebar-target], [data-sidebar-action]');
      if (!button) return;

      const action = button.dataset.sidebarAction;
      const target = button.dataset.sidebarTarget;

      if (action) openModalShortcut(action);
      else if (target) scrollToTarget(target);

      sidebar.querySelectorAll('.sidebar-nav-link').forEach((item) => item.removeAttribute('aria-current'));
      button.setAttribute('aria-current', 'true');
      setOpen(false);
    });
  };

  // Wait until earlier phase scripts mount dynamic sections.
  setTimeout(mount, 550);
})();
