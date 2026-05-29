// public/assets/dashboard-phase30-sidebar.js
// Phase 30: app-style sidebar navigation for the dashboard.
// Safe shell version: preserves the hero/role switcher above the sidebar shell.

(() => {
  if (window.__taPhase30SidebarLoaded) return;
  window.__taPhase30SidebarLoaded = true;

  const root = document.querySelector('[data-dashboard-root]');
  if (!root) return;

  const navItems = [
    { group: 'Daily work', label: 'Overview', workspace: 'overview', target: '#executive-overview, .executive-suite, [data-overview-workspace]', hint: 'Start', views: ['admin', 'client', 'worker'] },
    { group: 'Daily work', label: 'Estimate Review', workspace: 'estimate-review', target: '#estimate-review', hint: 'AI quotes', views: ['admin'] },
    { group: 'Daily work', label: 'Work Orders', workspace: 'work-orders', target: '#admin-requests', hint: 'Jobs', views: ['admin'] },
    { group: 'Daily work', label: 'Scheduling', workspace: 'scheduling', target: '#smart-schedule-suite', hint: 'Dispatch', views: ['admin', 'worker'] },

    { group: 'Client', label: 'Requests', workspace: 'client-requests', target: '#client-requests', hint: 'Requests', views: ['client'] },
    { group: 'Client', label: 'Quotes', workspace: 'client-quotes', target: '#client-quotes', hint: 'Quotes', views: ['client'] },
    { group: 'Client', label: 'Invoices', workspace: 'client-invoices', target: '#client-invoices', hint: 'Payments', views: ['client'] },
    { group: 'Client', label: 'Profile', action: 'client-profile', hint: 'Profile', views: ['client'] },

    { group: 'Money', label: 'Finance Center', workspace: 'finance', target: '#finance-command-center', hint: 'KPIs', views: ['admin'] },
    { group: 'Money', label: 'Invoices', workspace: 'invoices', target: '#admin-invoices', hint: 'Billing', views: ['admin'] },
    { group: 'Money', label: 'Customer Status', workspace: 'customer-status', target: '#customer-experience-center', hint: 'Client', views: ['admin', 'client'] },

    { group: 'Field', label: 'Worker Jobs', workspace: 'worker-jobs', target: '#worker-jobs', hint: 'Field', views: ['admin', 'worker'] },
    { group: 'Field', label: 'Worker Mobile', workspace: 'worker-mobile', target: '#worker-mobile-field', hint: 'Phone', views: ['admin', 'worker'] },
    { group: 'Field', label: 'AI Troubleshooting', workspace: 'ai-troubleshooting', target: '#worker-ai-troubleshooting', hint: 'AI Help', views: ['admin', 'worker'] },
    { group: 'Field', label: 'Photo Docs', workspace: 'photo-docs', target: '.photo-doc-suite', hint: 'Proof', views: ['admin', 'worker'] },

    { group: 'Operations', label: 'Inventory', workspace: 'inventory', href: '/inventory/', hint: 'Stock', permission: 'canManageInventory', views: ['admin'] },
    { group: 'Operations', label: 'Maintenance Plans', workspace: 'maintenance', target: '.maintenance-suite', hint: 'Recurring', views: ['admin', 'client'] },
    { group: 'Operations', label: 'Roles & Users', workspace: 'roles-users', target: '#admin-access', hint: 'Access', views: ['admin'] },

    { group: 'Dev', label: 'Deployment Health', workspace: 'deployment', target: '#system-readiness', hint: 'Workflow', views: ['admin'] },
  ];

  const mobileQuickActions = [
    { label: 'Requests', workspace: 'work-orders', target: '#admin-requests', views: ['admin'] },
    { label: 'Quotes', workspace: 'estimate-review', target: '#estimate-review', views: ['admin'] },
    { label: 'Jobs', workspace: 'worker-jobs', target: '#worker-jobs', views: ['admin', 'worker'] },
    { label: 'Invoices', workspace: 'invoices', target: '#admin-invoices', views: ['admin'] },
    { label: 'Stock', workspace: 'inventory', href: '/inventory/', views: ['admin'], permission: 'canManageInventory' },
    { label: 'Today', workspace: 'worker-mobile', target: '#worker-mobile-field', views: ['worker'] },
    { label: 'Troubleshoot', workspace: 'ai-troubleshooting', target: '#worker-ai-troubleshooting', views: ['worker', 'admin'] },
    { label: 'Materials', workspace: 'worker-jobs', target: '#worker-jobs', views: ['worker'] },
    { label: 'Photos', workspace: 'photo-docs', target: '.photo-doc-suite', views: ['worker'] },
    { label: 'Request', workspace: 'client-requests', target: '#client-requests', views: ['client'] },
    { label: 'Quotes', workspace: 'client-quotes', target: '#client-quotes', views: ['client'] },
    { label: 'Invoices', workspace: 'client-invoices', target: '#client-invoices', views: ['client'] },
    { label: 'Profile', action: 'client-profile', views: ['client'] },
  ];

  const groupItems = () => navItems.reduce((groups, item) => {
    groups[item.group] ||= [];
    groups[item.group].push(item);
    return groups;
  }, {});

  const queryFirst = (selector) => {
    if (!selector) return null;
    for (const part of selector.split(',').map((item) => item.trim()).filter(Boolean)) {
      try {
        const found = document.querySelector(part);
        if (found) return found;
      } catch {}
    }
    return null;
  };

  const openModalShortcut = (name) => {
    const selector = name === 'client-profile'
      ? '[data-client-profile-shortcut], #client-profile, [data-client-profile]'
      : '[data-admin-access-shortcut]';

    const target = queryFirst(selector);

    if (target?.click && target.matches('button, a')) {
      target.click();
      return true;
    }

    if (target?.scrollIntoView) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return true;
    }

    window.TAUX?.toast?.({
      title: 'Section unavailable',
      message: 'That dashboard tool is not available for this account or has not loaded yet.',
      type: 'warn',
    });

    return false;
  };

  const scrollToTarget = (target) => {
    const destination = queryFirst(target);

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

  const detectViewFromText = (value = '') => {
    const text = String(value).toLowerCase();
    if (text.includes('admin')) return 'admin';
    if (text.includes('worker')) return 'worker';
    if (text.includes('client')) return 'client';
    return '';
  };

  const mount = () => {
    if (document.querySelector('[data-phase30-sidebar]')) return;

    const originalChildren = Array.from(root.children);

    const preservedTop = [];
    const workspaceChildren = [];

    originalChildren.forEach((child) => {
      const preserve =
        child.matches?.('.hero, [data-dashboard-hero], [data-role-bar], .role-bar, [data-dashboard-role-switcher]') ||
        child.querySelector?.('.role-bar, [data-role], [data-dashboard-role]');

      if (preserve && preservedTop.length < 3) preservedTop.push(child);
      else workspaceChildren.push(child);
    });

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
        <button class="btn btn-soft dashboard-sidebar-collapse" type="button" data-sidebar-collapse aria-label="Collapse sidebar" title="Collapse sidebar" aria-pressed="false">
          <span class="sidebar-collapse-icon" aria-hidden="true"></span>
        </button>
      </div>
      <nav class="sidebar-nav-group" data-sidebar-nav></nav>
    `;

    const nav = sidebar.querySelector('[data-sidebar-nav]');
    const groups = groupItems();

    nav.innerHTML = Object.entries(groups).map(([group, items]) => `
      <div class="sidebar-nav-label">${group}</div>
      ${items.map((item) => item.href ? `
        <a class="sidebar-nav-link"
          href="${item.href}"
          data-sidebar-href="${item.href}"
          data-sidebar-workspace="${item.workspace || ''}"
          data-sidebar-permission="${item.permission || ''}"
          data-sidebar-views="${(item.views || []).join(' ')}">
          <span>${item.label}</span>
          <small>${item.hint || ''}</small>
        </a>
      ` : `
        <button class="sidebar-nav-link"
          type="button"
          data-sidebar-target="${item.target || ''}"
          data-sidebar-action="${item.action || ''}"
          data-sidebar-workspace="${item.workspace || ''}"
          data-sidebar-permission="${item.permission || ''}"
          data-sidebar-views="${(item.views || []).join(' ')}">
          <span>${item.label}</span>
          <small>${item.hint || ''}</small>
        </button>
      `).join('')}
    `).join('');

    const workspace = document.createElement('div');
    workspace.className = 'dashboard-workspace-v2';
    workspaceChildren.forEach((child) => workspace.appendChild(child));

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

    const quickBar = document.createElement('nav');
    quickBar.className = 'mobile-quick-action-bar';
    quickBar.setAttribute('aria-label', 'Mobile quick actions');
    quickBar.innerHTML = mobileQuickActions.map((item) => item.href ? `
      <a class="mobile-quick-action"
        href="${item.href}"
        data-mobile-quick-href="${item.href}"
        data-mobile-quick-workspace="${item.workspace || ''}"
        data-mobile-quick-views="${item.views.join(' ')}"
        data-sidebar-permission="${item.permission || ''}">
        ${item.label}
      </a>
    ` : `
      <button class="mobile-quick-action"
        type="button"
        data-mobile-quick-target="${item.target || ''}"
        data-mobile-quick-action="${item.action || ''}"
        data-mobile-quick-workspace="${item.workspace || ''}"
        data-mobile-quick-views="${item.views.join(' ')}">
        ${item.label}
      </button>
    `).join('');

    root.innerHTML = '';
    preservedTop.forEach((child) => root.appendChild(child));
    root.appendChild(toggle);
    root.appendChild(backdrop);
    root.appendChild(shell);
    root.appendChild(quickBar);

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

      try {
        window.localStorage.setItem('ta_dashboard_sidebar_collapsed', collapsed ? 'true' : 'false');
      } catch {}
    };

    const initialCollapsed = (() => {
      try {
        return window.localStorage.getItem('ta_dashboard_sidebar_collapsed') === 'true';
      } catch {
        return false;
      }
    })();

    setCollapsed(initialCollapsed);

    const getCurrentDashboardView = () => {
      const direct =
        document.body.dataset.currentDashboardView ||
        document.documentElement.dataset.currentDashboardView ||
        document.body.dataset.dashboardView ||
        document.documentElement.dataset.dashboardView ||
        '';

      if (['admin', 'worker', 'client'].includes(direct)) return direct;

      const activeRole =
        document.querySelector('.role.active-admin') ||
        document.querySelector('.role.active-worker') ||
        document.querySelector('.role.active-client') ||
        document.querySelector('[data-role].active') ||
        document.querySelector('[data-dashboard-role].active') ||
        document.querySelector('[aria-pressed="true"][data-role]') ||
        document.querySelector('[aria-current="true"][data-role]');

      const roleView = detectViewFromText(
        activeRole?.dataset?.role ||
        activeRole?.dataset?.dashboardRole ||
        activeRole?.textContent ||
        ''
      );

      if (roleView) return roleView;

      if (document.body.classList.contains('view-admin')) return 'admin';
      if (document.body.classList.contains('view-worker')) return 'worker';
      if (document.body.classList.contains('view-client')) return 'client';

      return 'admin';
    };

    const setCurrentDashboardView = (view) => {
      if (!['admin', 'worker', 'client'].includes(view)) return;
      document.body.dataset.currentDashboardView = view;
      document.documentElement.dataset.currentDashboardView = view;
    };

    const syncPermissionLinks = () => {
      const view = getCurrentDashboardView();
      setCurrentDashboardView(view);

      nav.querySelectorAll('[data-sidebar-views]').forEach((item) => {
        const views = String(item.dataset.sidebarViews || '').split(/\s+/).filter(Boolean);
        const blockedByView = Boolean(view && views.length && !views.includes(view));
        const blockedByPermission = item.dataset.sidebarPermission === 'canManageInventory' && view !== 'admin';
        const hidden = blockedByView || blockedByPermission;

        item.hidden = hidden;
        item.setAttribute('aria-disabled', hidden ? 'true' : 'false');
      });

      nav.querySelectorAll('.sidebar-nav-label').forEach((label) => {
        let next = label.nextElementSibling;
        let hasVisibleItem = false;

        while (next && !next.classList.contains('sidebar-nav-label')) {
          if (next.classList.contains('sidebar-nav-link') && !next.hidden) {
            hasVisibleItem = true;
          }
          next = next.nextElementSibling;
        }

        label.hidden = !hasVisibleItem;
      });

      quickBar.querySelectorAll('[data-mobile-quick-views]').forEach((item) => {
        const views = String(item.dataset.mobileQuickViews || '').split(/\s+/).filter(Boolean);
        const blockedByView = Boolean(view && views.length && !views.includes(view));
        const blockedByPermission = item.dataset.sidebarPermission === 'canManageInventory' && view !== 'admin';
        const hidden = blockedByView || blockedByPermission;

        item.hidden = hidden;
        item.setAttribute('aria-disabled', hidden ? 'true' : 'false');
      });
    };

    syncPermissionLinks();

    try {
      new MutationObserver(syncPermissionLinks).observe(document.body, {
        attributes: true,
        attributeFilter: ['data-current-dashboard-view', 'data-dashboard-view', 'class'],
      });

      new MutationObserver(syncPermissionLinks).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-current-dashboard-view', 'data-dashboard-view', 'class'],
      });

      new MutationObserver(syncPermissionLinks).observe(root, {
        attributes: true,
        subtree: true,
        attributeFilter: ['class', 'aria-pressed', 'aria-current', 'data-role', 'data-dashboard-role'],
      });
    } catch {}

    document.addEventListener(
      'click',
      (event) => {
        const roleButton = event.target.closest('.role, [data-role], [data-dashboard-role]');
        if (!roleButton) return;

        const view = detectViewFromText(
          roleButton.dataset.role ||
          roleButton.dataset.dashboardRole ||
          roleButton.textContent ||
          ''
        );

        if (view) {
          setCurrentDashboardView(view);

          if (window.taSetSidebarWorkspace) {
            window.taSetSidebarWorkspace('overview', { scroll: false });
          }
        }

        setTimeout(syncPermissionLinks, 50);
        setTimeout(syncPermissionLinks, 250);
      },
      true
    );

    toggle.addEventListener('click', () => setOpen(true));
    sidebar.querySelector('[data-sidebar-close]')?.addEventListener('click', () => setOpen(false));
    backdrop.addEventListener('click', () => setOpen(false));

    document.addEventListener('click', (event) => {
      const collapseButton = event.target.closest('[data-sidebar-collapse]');
      if (!collapseButton || !sidebar.contains(collapseButton)) return;

      event.preventDefault();
      event.stopPropagation();

      setCollapsed(shell.dataset.sidebarCollapsed !== 'true');
    }, true);

    quickBar.addEventListener('click', (event) => {
      const link = event.target.closest('[data-mobile-quick-href]');
      if (link) {
        quickBar.querySelectorAll('.mobile-quick-action').forEach((item) => item.removeAttribute('aria-current'));
        link.setAttribute('aria-current', 'page');
        return;
      }

      const button = event.target.closest('[data-mobile-quick-target], [data-mobile-quick-action]');
      if (!button) return;

      const action = button.dataset.mobileQuickAction;

      if (action) {
        openModalShortcut(action);
      } else if (window.taSetSidebarWorkspace && button.dataset.mobileQuickWorkspace) {
        window.taSetSidebarWorkspace(button.dataset.mobileQuickWorkspace, {
          scroll: true,
          target: button.dataset.mobileQuickTarget || '',
        });
      } else if (button.dataset.mobileQuickTarget) {
        scrollToTarget(button.dataset.mobileQuickTarget);
      }

      quickBar.querySelectorAll('.mobile-quick-action').forEach((item) => item.removeAttribute('aria-current'));
      button.setAttribute('aria-current', 'true');
      setOpen(false);
    });

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
      const workspaceKey = button.dataset.sidebarWorkspace;

      if (action) {
        openModalShortcut(action);
      } else if (window.taSetSidebarWorkspace && workspaceKey) {
        window.taSetSidebarWorkspace(workspaceKey, {
          scroll: true,
          target: target || '',
        });
      } else if (target) {
        scrollToTarget(target);
      }

      sidebar.querySelectorAll('.sidebar-nav-link').forEach((item) => item.removeAttribute('aria-current'));
      button.setAttribute('aria-current', 'true');
      setOpen(false);
    });
  };

  setTimeout(mount, 550);
})();
