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
    const copy = {
      admin: ['Admin command', 'Owner operations snapshot', 'Today’s jobs, open requests, pending quotes, invoices, inventory alerts, and activity for the business.'],
      client: ['Client portal', 'Project snapshot', 'Requests, quotes, invoices, saved job updates, and recent account activity for your projects.'],
      worker: ['Worker field', 'Today’s route snapshot', 'Assigned jobs, requested materials, job notes, safety items, and recent dispatch activity.'],
    }[role] || ['Dashboard', 'Today at a glance', 'Role-aware summary cards for this workspace.'];
    const eyebrow = q('[data-mobile-clean-eyebrow]');
    const title = q('[data-mobile-clean-title]');
    const description = q('[data-mobile-clean-description]');
    if (eyebrow) eyebrow.textContent = copy[0];
    if (title) title.textContent = copy[1];
    if (description) description.textContent = copy[2];
    syncMobileMoreVisibility();
    syncMobileFabVisibility();
    syncMobileBottomNavigation();
  };

  const updateMetrics = () => {
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
      requests: ['work-orders', '#admin-requests'],
      quotes: ['estimate-review', '#estimate-review'],
      jobs: ['work-orders', '#admin-requests'],
      dashboard: ['overview', '#executive-overview'],
      invoices: ['invoices', '#admin-invoices'],
      finance: ['finance', '#finance-command-center-anchor'],
      troubleshooter: ['ai-troubleshooting', '#worker-ai-troubleshooting'],
      customers: ['customer-status', '#customer-experience-center'],
      schedule: ['scheduling', '#smart-schedule-suite'],
      profile: ['roles-users', '#admin-access'],
      'admin-tools': ['roles-users', '#admin-access'],
      employees: ['roles-users', '#admin-access'],
      reports: ['activity', '#admin-activity'],
      'ai-knowledge': ['ai-knowledge', '#ai-knowledge-center'],
      settings: ['roles-users', '#admin-access'],
    },
    client: {
      requests: ['client-requests', '#client-requests'],
      quotes: ['client-quotes', '#client-quotes'],
      jobs: ['customer-status', '#customer-experience-center'],
      dashboard: ['overview', '#executive-overview'],
      invoices: ['client-invoices', '#client-invoices'],
      customers: ['customer-status', '#customer-experience-center'],
      schedule: ['maintenance', '.maintenance-suite'],
      profile: ['client-profile-action', '[data-client-profile-shortcut]'],
      settings: ['client-profile-action', '[data-client-profile-shortcut]'],
    },
    worker: {
      jobs: ['worker-jobs', '#worker-jobs'],
      dashboard: ['overview', '#executive-overview'],
      troubleshooter: ['ai-troubleshooting', '#worker-ai-troubleshooting'],
      schedule: ['scheduling', '#smart-schedule-suite'],
      profile: ['worker-mobile', '#worker-mobile-field'],
      reports: ['photo-docs', '.photo-doc-suite'],
      settings: ['worker-mobile', '#worker-mobile-field'],
    },
  };

  const mobileAllowedMoreKeysByView = {
    admin: ['dashboard', 'inventory', 'invoices', 'finance', 'customers', 'employees', 'admin-tools', 'reports', 'ai-knowledge', 'schedule', 'settings', 'troubleshooter', 'sign-out'],
    client: ['dashboard', 'requests', 'quotes', 'invoices', 'customers', 'settings', 'sign-out'],
    worker: ['dashboard', 'jobs', 'schedule', 'troubleshooter', 'reports', 'settings', 'sign-out'],
  };

  const mobileFabActionsByView = {
    admin: ['request', 'quote', 'job', 'inventory', 'customer', 'photo', 'assistant'],
    client: ['request', 'quote', 'invoices', 'profile', 'photo'],
    worker: ['update-job', 'job-note', 'photo', 'material', 'assistant'],
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
    const shortcut = q('[data-client-profile-shortcut], [data-admin-access-shortcut]');
    if (shortcut && typeof shortcut.click === 'function') {
      shortcut.click();
      return true;
    }
    return false;
  };

  const routeMobileKey = (key) => {
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
        request: () => openWorkspace('client-requests', '#client-requests'),
        quote: () => { window.location.href = '/#estimate'; return true; },
        job: () => openWorkspace('work-orders', '#admin-requests'),
        inventory: () => { window.location.href = '/inventory/'; return true; },
        customer: () => openWorkspace('customer-status', '#customer-experience-center'),
        photo: () => openWorkspace('photo-docs', '.photo-doc-suite'),
        assistant: () => openWorkspace('ai-troubleshooting', '#worker-ai-troubleshooting'),
      },
      client: {
        request: () => openWorkspace('client-requests', '#client-requests'),
        quote: () => openWorkspace('client-quotes', '#client-quotes'),
        invoices: () => openWorkspace('client-invoices', '#client-invoices'),
        profile: () => routeMobileKey('settings'),
        photo: () => openWorkspace('client-requests', '#client-requests'),
      },
      worker: {
        'update-job': () => openWorkspace('worker-jobs', '#worker-jobs') || openWorkspace('worker-mobile', '#worker-mobile-field'),
        'job-note': () => openWorkspace('worker-mobile', '#worker-mobile-field') || openWorkspace('worker-jobs', '#worker-jobs'),
        photo: () => openWorkspace('photo-docs', '.photo-doc-suite'),
        material: () => openWorkspace('worker-mobile', '#worker-mobile-field'),
        assistant: () => openWorkspace('ai-troubleshooting', '#worker-ai-troubleshooting'),
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
      client: { customers: 'Project Status', settings: 'Profile / Properties', invoices: 'My Invoices' },
      worker: { reports: 'Upload Photos', settings: 'Job Notes', schedule: 'Schedule / Dispatch', troubleshooter: 'AI Troubleshooter' },
      admin: { customers: 'Customers', settings: 'Settings', invoices: 'Invoices', reports: 'Reports', schedule: 'Schedule', troubleshooter: 'AI Assistant' },
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
      admin: { request: 'New Request', quote: 'New Quote / Estimate', job: 'New Job / Work Order', inventory: 'Scan/Add Inventory', customer: 'Add Customer', photo: 'Upload Photo', assistant: 'Open AI Assistant' },
      client: { request: 'New Request', quote: 'View Quotes', invoices: 'View Invoices', profile: 'Profile / Property', photo: 'Upload Photo to Request' },
      worker: { 'update-job': 'Start/Update Job', 'job-note': 'Add Job Note', photo: 'Upload Before/After Photo', material: 'Use/Request Material', assistant: 'Open AI Troubleshooter' },
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
