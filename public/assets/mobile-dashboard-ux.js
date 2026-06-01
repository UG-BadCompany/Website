// Mobile dashboard UX enhancements: additive only, preserves bootstrap role/workspace ownership.
(() => {
  if (window.__taMobileDashboardUxLoaded) return;
  window.__taMobileDashboardUxLoaded = true;

  const q = (selector) => document.querySelector(selector);
  const qa = (selector) => Array.from(document.querySelectorAll(selector));
  const textOf = (selector, fallback = '0') => q(selector)?.textContent?.trim() || fallback;

  const bindTapOnce = (element, handler) => {
    if (!element || element.dataset.tapOnceBound === 'true') return;
    element.dataset.tapOnceBound = 'true';
    let lastTap = 0;
    let handledPointer = false;
    const activate = (event) => {
      const now = Date.now();
      if (now - lastTap < 350) {
        event?.preventDefault?.();
        return;
      }
      lastTap = now;
      if (event?.type !== 'click') {
        handledPointer = true;
        event?.preventDefault?.();
      }
      handler(event);
    };
    element.addEventListener('pointerup', activate, { passive: false });
    element.addEventListener('touchend', (event) => {
      if (window.PointerEvent) return;
      activate(event);
    }, { passive: false });
    element.addEventListener('click', (event) => {
      if (handledPointer && Date.now() - lastTap < 500) {
        handledPointer = false;
        event.preventDefault();
        return;
      }
      activate(event);
    });
  };

  const roleLabel = (role = '') => {
    if (role === 'admin') return 'Role: Admin / Owner';
    if (role === 'worker') return 'Role: Worker';
    if (role === 'client') return 'Role: Client';
    return 'Role: Dashboard';
  };

  const currentRole = () => document.body.dataset.currentDashboardView || document.documentElement.dataset.currentDashboardView || 'client';


  const mobileSummaryByRole = {
    admin: {
      eyebrow: 'Admin command',
      title: 'Business operations snapshot',
      description: 'Revenue, open jobs, pending quotes, unpaid invoices, inventory alerts, and employee activity for the business.',
      cards: [
        ['Revenue', 'revenue', 'Business income signal'],
        ['Open Jobs', 'jobs', 'Active work orders'],
        ['Pending Quotes', 'quotes', 'Estimates needing review'],
        ['Unpaid Invoices', 'invoices', 'Payment follow-up'],
        ['Inventory Alerts', 'inventory', 'Low stock and reservations'],
        ['Employee Activity', 'activity', 'Team updates and notes'],
      ],
    },
    client: {
      eyebrow: 'Client portal',
      title: 'Project snapshot',
      description: 'Requests, quotes, invoices, project updates, and upcoming service for your account.',
      cards: [
        ['My Requests', 'requests', 'Submitted service needs'],
        ['My Quotes', 'quotes', 'Estimates to review'],
        ['My Invoices', 'invoices', 'Payments and balances'],
        ['Project Updates', 'jobs', 'Safe job status updates'],
        ['Upcoming Service', 'activity', 'Visits and scheduling'],
      ],
    },
    worker: {
      eyebrow: 'Field operations',
      title: 'Today’s assignments',
      description: 'Assigned jobs, route details, materials, safety notes, and dispatch updates for field work.',
      cards: [
        ['Assigned Jobs', 'jobs', 'Work assigned to you'],
        ['Route', 'activity', 'Stops and dispatch'],
        ['Materials', 'inventory', 'Needed or used parts'],
        ['Safety Notes', 'requests', 'Stop and escalate items'],
        ['Dispatch Updates', 'quotes', 'Office and schedule notes'],
      ],
    },
  };

  const updateGreeting = () => {
    const target = q('[data-mobile-dashboard-greeting]');
    if (!target) return;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
    const icon = hour < 18 ? '☀️' : '🌙';
    const rawName = q('[data-account-status]')?.textContent?.match(/Signed in as\s+([^•]+)/i)?.[1]?.trim() || 'Thomas';
    const firstName = rawName.split(/\s+/)[0] || 'Thomas';
    target.textContent = `${greeting}, ${firstName} ${icon}`;
  };

  const updateRole = () => {
    const role = currentRole();
    const label = q('[data-mobile-current-role]');
    if (label) label.textContent = roleLabel(role);
    const moreRole = q('[data-mobile-more-role]');
    if (moreRole) moreRole.textContent = roleLabel(role).replace('Role: ', '');
    qa('[data-view-button]').forEach((button) => {
      const active = button.dataset.viewButton === role;
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
    });
    applyMobileSummary(role);
    syncMobileMoreVisibility();
    syncMobileFabVisibility();
    syncMobileBottomNavigation();
  };

  function applyMobileSummary(role = currentRole()) {
    const summary = mobileSummaryByRole[role] || mobileSummaryByRole.client;
    const eyebrow = q('[data-mobile-clean-eyebrow]');
    const title = q('[data-mobile-clean-title]');
    const description = q('[data-mobile-clean-description]');
    if (eyebrow) eyebrow.textContent = summary.eyebrow;
    if (title) title.textContent = summary.title;
    if (description) description.textContent = summary.description;
    const cards = qa('[data-mobile-clean-dashboard] .mobile-clean-grid article');
    cards.forEach((card, index) => {
      const config = summary.cards[index];
      card.hidden = !config;
      card.setAttribute('aria-hidden', config ? 'false' : 'true');
      if (!config) return;
      const [label, metric, copy] = config;
      const labelNode = card.querySelector('span');
      const valueNode = card.querySelector('strong');
      const copyNode = card.querySelector('small');
      if (labelNode) labelNode.textContent = label;
      if (valueNode) valueNode.dataset.mobileCleanMetric = metric;
      if (copyNode) copyNode.textContent = copy;
    });
  }

  const updateMetrics = () => {
    applyMobileSummary(currentRole());
    const revenue = textOf('[data-admin-open-amount-metric]', textOf('[data-admin-paid-amount-metric]', '$0'));
    const jobs = textOf('[data-worker-jobs-count]', textOf('[data-open-requests-metric]', '0'));
    const quotes = textOf('[data-quotes-metric]', '0');
    const requests = textOf('[data-open-requests-metric]', '0');
    const invoices = textOf('[data-client-invoices-count]', textOf('[data-admin-open-invoices-metric]', '0'));
    const inventory = textOf('[data-low-inventory-count]', '0');
    const values = { revenue, jobs, quotes, requests, invoices, inventory, activity: 'Live' };
    Object.entries(values).forEach(([key, value]) => {
      qa(`[data-mobile-metric="${key}"], [data-mobile-clean-metric="${key}"]`).forEach((node) => { node.textContent = value; });
    });
  };

  const openWorkspace = (workspace, target = '') => {
    const resolvedTarget = target || '';
    if (workspace && typeof window.taSetSidebarWorkspace === 'function') {
      window.taSetSidebarWorkspace(workspace, { scroll: true, target: resolvedTarget });
      return true;
    }
    const destination = resolvedTarget ? q(resolvedTarget) : null;
    if (destination) {
      destination.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return true;
    }
    return false;
  };

  const roleRoutes = {
    admin: {
      dashboard: ['overview', '#executive-overview'],
      requests: ['work-orders', '#admin-requests'],
      quotes: ['quotes', '#admin-quotes-workspace'],
      jobs: ['work-orders', '#admin-requests'],
      'work-orders': ['work-orders', '#admin-requests'],
      invoices: ['invoices', '#admin-invoices'],
      customers: ['customer-status', '#customer-experience-center'],
      employees: ['roles-users', '#admin-access'],
      inventory: ['inventory', '#admin-inventory'],
      reports: ['activity', '#admin-activity'],
      settings: ['roles-users', '#admin-access'],
      'ai-tools': ['ai-knowledge', '#ai-knowledge-center'],
      'ai-knowledge': ['ai-knowledge', '#ai-knowledge-center'],
      schedule: ['scheduling', '#smart-schedule-suite'],
      troubleshooter: ['ai-troubleshooting', '#worker-ai-troubleshooting'],
    },
    client: {
      dashboard: ['overview', '#executive-overview'],
      requests: ['client-requests', '#client-requests'],
      quotes: ['client-quotes', '#client-quotes'],
      invoices: ['client-invoices', '#client-invoices'],
      'project-updates': ['customer-status', '#customer-experience-center'],
      profile: ['client-profile-action', '[data-client-profile-shortcut]'],
      'request-estimate': ['client-requests', '#client-requests'],
    },
    worker: {
      dashboard: ['overview', '#executive-overview'],
      jobs: ['worker-jobs', '#worker-jobs'],
      schedule: ['scheduling', '#smart-schedule-suite'],
      materials: ['worker-mobile', '#worker-mobile-field'],
      photos: ['photo-docs', '.photo-doc-suite'],
      troubleshooter: ['ai-troubleshooting', '#worker-ai-troubleshooting'],
      'job-notes': ['worker-mobile', '#worker-mobile-field'],
    },
  };

  const mobileAllowedMoreKeysByView = {
    admin: ['dashboard', 'requests', 'quotes', 'work-orders', 'invoices', 'customers', 'employees', 'inventory', 'reports', 'settings', 'ai-tools', 'sign-out'],
    client: ['dashboard', 'requests', 'quotes', 'invoices', 'project-updates', 'profile', 'request-estimate', 'sign-out'],
    worker: ['dashboard', 'jobs', 'schedule', 'materials', 'photos', 'troubleshooter', 'job-notes', 'sign-out'],
  };

  const mobileFabActionsByView = {
    admin: ['estimate', 'work-order', 'customer', 'inventory-entry', 'schedule-job'],
    client: ['request', 'request-estimate', 'support'],
    worker: ['start-job', 'photo', 'material-request', 'troubleshooting'],
  };

  const mobileBottomNavByView = {
    admin: [
      ['requests', '📋', 'Requests'],
      ['quotes', '💰', 'Quotes'],
      ['jobs', '🔨', 'Jobs'],
    ],
    client: [
      ['requests', '📋', 'Requests'],
      ['quotes', '💰', 'Quotes'],
      ['invoices', '🧾', 'Invoices'],
    ],
    worker: [
      ['jobs', '🔨', 'Jobs'],
      ['schedule', '📅', 'Schedule'],
      ['troubleshooter', '🤖', 'AI / Notes'],
    ],
  };

  const routeFor = (key) => {
    const role = currentRole();
    return (roleRoutes[role] && roleRoutes[role][key]) || null;
  };

  const triggerProfile = () => {
    const shortcut = qa('[data-client-profile-shortcut], [data-admin-access-shortcut]').find((node) => !node.hidden && node.getAttribute('aria-hidden') !== 'true');
    if (shortcut && typeof shortcut.click === 'function') {
      shortcut.click();
      return true;
    }
    return false;
  };

  const routeMobileKey = (key) => {
    if (key === 'sign-out') {
      window.location.href = '/api/auth/logout?redirect=/login/?signed-out=1';
      return true;
    }
    const route = routeFor(key);
    if (!route) return false;
    const [workspace, target] = route;
    if (workspace === 'client-profile-action') return triggerProfile();
    return openWorkspace(workspace, target);
  };

  function setMoreOpen(open) {
    const moreButton = q('[data-mobile-open-more]');
    const menu = q('[data-mobile-more-menu]');
    const backdrop = q('[data-mobile-more-backdrop]');
    if (!menu || !backdrop) return;
    menu.hidden = !open;
    backdrop.hidden = !open;
    moreButton?.setAttribute('aria-expanded', String(open));
  }

  const routeFabAction = (action, item = null) => {
    const role = currentRole();
    const allowedActions = mobileFabActionsByView[role] || [];
    if (!action || !allowedActions.includes(action)) return false;
    const roleFabRoutes = {
      admin: {
        estimate: () => openWorkspace('quotes', '#admin-quotes-workspace'),
        'work-order': () => openWorkspace('work-orders', '#admin-requests'),
        customer: () => openWorkspace('customer-status', '#customer-experience-center'),
        'inventory-entry': () => { window.location.href = '/inventory/'; return true; },
        'schedule-job': () => openWorkspace('scheduling', '#smart-schedule-suite'),
      },
      client: {
        request: () => openWorkspace('client-requests', '#client-requests'),
        'request-estimate': () => openWorkspace('client-requests', '#client-requests'),
        support: () => openWorkspace('customer-status', '#customer-experience-center'),
      },
      worker: {
        'start-job': () => openWorkspace('worker-jobs', '#worker-jobs') || openWorkspace('worker-mobile', '#worker-mobile-field'),
        photo: () => openWorkspace('photo-docs', '.photo-doc-suite'),
        'material-request': () => openWorkspace('worker-mobile', '#worker-mobile-field'),
        troubleshooting: () => openWorkspace('ai-troubleshooting', '#worker-ai-troubleshooting'),
      },
    };
    const routed = roleFabRoutes[role]?.[action]?.();
    if (routed) return true;
    const workspace = item?.dataset?.mobileWorkspaceLink;
    const href = item?.getAttribute?.('href') || '';
    if (workspace) return openWorkspace(workspace, href);
    return false;
  };

  function syncMobileMoreVisibility() {
    const role = currentRole();
    const allowedKeys = new Set(mobileAllowedMoreKeysByView[role] || mobileAllowedMoreKeysByView.client);
    const labelsByRole = {
      admin: { dashboard: 'Dashboard', requests: 'Requests', quotes: 'Quotes', 'work-orders': 'Work Orders', invoices: 'Invoices', customers: 'Customers', employees: 'Employees', inventory: 'Inventory', reports: 'Reports', settings: 'Settings', 'ai-tools': 'AI Tools', 'sign-out': 'Logout' },
      client: { dashboard: 'Dashboard', requests: 'My Requests', quotes: 'My Quotes', invoices: 'My Invoices', 'project-updates': 'Project Updates', profile: 'Profile', 'request-estimate': 'Request Estimate', 'sign-out': 'Logout' },
      worker: { dashboard: 'Dashboard', jobs: 'My Jobs', schedule: 'Schedule', materials: 'Materials', photos: 'Photos', troubleshooter: 'AI Troubleshooting', 'job-notes': 'Job Notes', 'sign-out': 'Logout' },
    };
    qa('[data-mobile-more-key]').forEach((item) => {
      const key = item.dataset.mobileMoreKey;
      const visible = allowedKeys.has(key);
      item.hidden = !visible;
      item.setAttribute('aria-disabled', visible ? 'false' : 'true');
      const label = labelsByRole[role]?.[key] || labelsByRole.admin[key];
      if (label && item.textContent.trim() !== label) item.textContent = label;
    });
  }

  function syncMobileFabVisibility() {
    const role = currentRole();
    const allowedActions = new Set(mobileFabActionsByView[role] || []);
    const labelsByRole = {
      admin: { estimate: 'New Estimate', 'work-order': 'New Work Order', customer: 'Add Customer', 'inventory-entry': 'Inventory Entry', 'schedule-job': 'Schedule Job' },
      client: { request: 'New Request', 'request-estimate': 'Request Estimate', support: 'Contact Support' },
      worker: { 'start-job': 'Start Job', photo: 'Upload Photo', 'material-request': 'Material Request', troubleshooting: 'Troubleshooting' },
    };
    qa('[data-mobile-fab-action]').forEach((item) => {
      const action = item.dataset.mobileFabAction;
      const visible = allowedActions.has(action);
      item.hidden = !visible;
      item.setAttribute('aria-disabled', visible ? 'false' : 'true');
      const label = labelsByRole[role]?.[action];
      if (label && item.textContent.trim() !== label) item.textContent = label;
    });
  }

  function syncMobileBottomNavigation() {
    const role = currentRole();
    const config = mobileBottomNavByView[role] || mobileBottomNavByView.client;
    const buttons = qa('[data-mobile-bottom-key]').filter((button) => !['home'].includes(button.dataset.mobileBottomKey));
    const actionButtons = buttons.filter((button) => !button.hasAttribute('data-mobile-open-more'));
    actionButtons.forEach((button, index) => {
      const item = config[index];
      if (!item) return;
      const [key, icon, label] = item;
      button.dataset.mobileBottomKey = key;
      button.innerHTML = `<span>${icon}</span>${label}`;
    });
  }

  const bind = () => {
    qa('[data-mobile-workspace-link]').forEach((link) => {
      if (link.closest('[data-mobile-fab-menu]')) return;
      if (link.dataset.mobileWorkspaceBound) return;
      link.dataset.mobileWorkspaceBound = 'true';
      bindTapOnce(link, (event) => {
        const href = link.getAttribute('href') || '';
        const action = link.dataset.mobileFabAction;
        if (action && routeFabAction(action, link)) {
          event.preventDefault();
          const fabMenu = q('[data-mobile-fab-menu]');
          const fabButton = q('[data-mobile-fab]');
          if (fabMenu) fabMenu.hidden = true;
          fabButton?.setAttribute('aria-expanded', 'false');
          return;
        }
        if (!href.startsWith('#')) return;
        event.preventDefault();
        const opened = openWorkspace(link.dataset.mobileWorkspaceLink, href);
        if (!opened) q(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    qa('[data-mobile-bottom-key]').forEach((button) => {
      if (button.dataset.mobileBottomBound) return;
      button.dataset.mobileBottomBound = 'true';
      bindTapOnce(button, (event) => {
        const key = button.dataset.mobileBottomKey;
        if (key === 'home') return;
        event.preventDefault();
        routeMobileKey(key);
      });
    });

    qa('[data-mobile-more-key]').forEach((item) => {
      if (item.closest('[data-mobile-fab-menu]')) return;
      if (item.dataset.mobileMoreBound) return;
      item.dataset.mobileMoreBound = 'true';
      bindTapOnce(item, (event) => {
        const key = item.dataset.mobileMoreKey;
        const href = item.getAttribute('href') || '';
        if (href && !href.startsWith('#')) {
          setMoreOpen(false);
          return;
        }
        if (key === 'sign-out' || key === 'inventory') return;
        event.preventDefault();
        routeMobileKey(key);
        setMoreOpen(false);
      });
    });

    const notifications = q('[data-mobile-notifications]');
    const notificationPanel = q('[data-mobile-notification-panel]');
    if (notifications && notificationPanel && !notifications.dataset.mobileNotificationsBound) {
      notifications.dataset.mobileNotificationsBound = 'true';
      notifications.addEventListener('click', () => {
        notificationPanel.hidden = !notificationPanel.hidden;
      });
    }

    const more = q('[data-mobile-open-more]');
    if (more && !more.dataset.mobileMoreButtonBound) {
      more.dataset.mobileMoreButtonBound = 'true';
      bindTapOnce(more, () => setMoreOpen(q('[data-mobile-more-menu]')?.hidden !== false));
    }
    const closeMore = q('[data-mobile-close-more]');
    if (closeMore && !closeMore.dataset.mobileCloseMoreBound) {
      closeMore.dataset.mobileCloseMoreBound = 'true';
      bindTapOnce(closeMore, () => setMoreOpen(false));
    }
    const moreBackdrop = q('[data-mobile-more-backdrop]');
    if (moreBackdrop && !moreBackdrop.dataset.mobileMoreBackdropBound) {
      moreBackdrop.dataset.mobileMoreBackdropBound = 'true';
      bindTapOnce(moreBackdrop, () => setMoreOpen(false));
    }

    const fab = q('[data-mobile-fab]');
    const menu = q('[data-mobile-fab-menu]');
    const setFabOpen = (open) => {
      if (!fab || !menu) return;
      menu.hidden = !open;
      fab.setAttribute('aria-expanded', String(open));
    };
    if (fab && menu && !fab.dataset.mobileFabBound) {
      fab.dataset.mobileFabBound = 'true';
      const toggleFab = (event) => {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        setFabOpen(menu.hidden);
      };
      bindTapOnce(fab, toggleFab);
      qa('[data-mobile-fab-menu] [data-mobile-fab-action]').forEach((item) => {
        bindTapOnce(item, (event) => {
          const action = item.dataset.mobileFabAction;
          const routed = routeFabAction(action, item);
          if (routed || item.tagName === 'BUTTON' || (item.getAttribute('href') || '').startsWith('#')) event.preventDefault();
          setFabOpen(false);
        });
      });
      menu.addEventListener('click', (event) => {
        const moreAction = event.target.closest('[data-mobile-more-key]');
        if (moreAction && moreAction.tagName === 'BUTTON') {
          event.preventDefault();
          routeMobileKey(moreAction.dataset.mobileMoreKey);
          setFabOpen(false);
          return;
        }
        if (event.target.closest('a, button')) setFabOpen(false);
      });
      document.addEventListener('click', (event) => {
        if (event.target.closest('[data-mobile-fab], [data-mobile-fab-menu]')) return;
        setFabOpen(false);
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          setFabOpen(false);
          setMoreOpen(false);
        }
      });
      window.addEventListener('hashchange', () => setFabOpen(false));
      window.addEventListener('popstate', () => setFabOpen(false));
    }
  };

  let refreshTimer = 0;
  const refresh = () => {
    updateGreeting();
    updateRole();
    updateMetrics();
    bind();
  };
  const scheduleRefresh = () => {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(refresh, 80);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh, { once: true });
  else refresh();
  setTimeout(refresh, 900);
  if ('requestIdleCallback' in window) window.requestIdleCallback(refresh, { timeout: 2200 });
  else setTimeout(refresh, 2200);
  window.taMobileDashboardTestHooks = { bindTapOnce, routeFabAction, routeMobileKey, setMoreOpen, syncMobileMoreVisibility, syncMobileFabVisibility, syncMobileBottomNavigation, mobileAllowedMoreKeysByView, mobileFabActionsByView, roleRoutes };
  try {
    new MutationObserver(scheduleRefresh).observe(document.body, { attributes: true, attributeFilter: ['data-current-dashboard-view'] });
    new MutationObserver(scheduleRefresh).observe(document.documentElement, { attributes: true, attributeFilter: ['data-current-dashboard-view'] });
  } catch {}
})();
