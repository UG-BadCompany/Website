// Mobile dashboard UX enhancements: additive only, preserves bootstrap role/workspace ownership.
(() => {
  if (window.__taMobileDashboardUxLoaded) return;
  window.__taMobileDashboardUxLoaded = true;

  const q = (selector) => document.querySelector(selector);
  const qa = (selector) => Array.from(document.querySelectorAll(selector));
  const textOf = (selector, fallback = '0') => q(selector)?.textContent?.trim() || fallback;

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
      settings: ['roles-users', '#admin-access'],
    },
    client: {
      requests: ['client-requests', '#client-requests'],
      quotes: ['client-quotes', '#client-quotes'],
      jobs: ['customer-status', '#customer-experience-center'],
      dashboard: ['overview', '#executive-overview'],
      invoices: ['client-invoices', '#client-invoices'],
      finance: ['client-invoices', '#client-invoices'],
      customers: ['customer-status', '#customer-experience-center'],
      schedule: ['maintenance', '.maintenance-suite'],
      profile: ['client-profile-action', '[data-client-profile-shortcut]'],
      employees: ['client-profile-action', '[data-client-profile-shortcut]'],
      reports: ['customer-status', '#customer-experience-center'],
      settings: ['client-profile-action', '[data-client-profile-shortcut]'],
    },
    worker: {
      requests: ['worker-mobile', '#worker-mobile-field'],
      quotes: ['ai-troubleshooting', '#worker-ai-troubleshooting'],
      jobs: ['worker-jobs', '#worker-jobs'],
      dashboard: ['overview', '#executive-overview'],
      invoices: ['worker-jobs', '#worker-jobs'],
      finance: ['worker-jobs', '#worker-jobs'],
      troubleshooter: ['ai-troubleshooting', '#worker-ai-troubleshooting'],
      customers: ['photo-docs', '.photo-doc-suite'],
      schedule: ['scheduling', '#smart-schedule-suite'],
      profile: ['worker-mobile', '#worker-mobile-field'],
      employees: ['worker-mobile', '#worker-mobile-field'],
      reports: ['photo-docs', '.photo-doc-suite'],
      settings: ['worker-mobile', '#worker-mobile-field'],
    },
  };

  const routeFor = (key) => {
    const role = currentRole();
    return (roleRoutes[role] && roleRoutes[role][key]) || roleRoutes.admin[key] || null;
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

  function syncMobileMoreVisibility() {
    const role = currentRole();
    qa('[data-mobile-more-key]').forEach((item) => {
      const key = item.dataset.mobileMoreKey;
      let visible = true;
      if (key === 'admin-tools') visible = role === 'admin';
      if (['troubleshooter', 'inventory', 'dashboard', 'invoices', 'finance', 'customers', 'employees', 'reports', 'settings', 'sign-out'].includes(key)) visible = true;
      item.hidden = !visible;
      item.setAttribute('aria-disabled', visible ? 'false' : 'true');
    });
  }

  const bind = () => {
    qa('[data-mobile-workspace-link]').forEach((link) => {
      if (link.dataset.mobileWorkspaceBound) return;
      link.dataset.mobileWorkspaceBound = 'true';
      link.addEventListener('click', (event) => {
        const href = link.getAttribute('href') || '';
        if (!href.startsWith('#')) return;
        event.preventDefault();
        const opened = openWorkspace(link.dataset.mobileWorkspaceLink, href);
        if (!opened) q(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    qa('[data-mobile-bottom-key]').forEach((button) => {
      if (button.dataset.mobileBottomBound) return;
      button.dataset.mobileBottomBound = 'true';
      button.addEventListener('click', (event) => {
        const key = button.dataset.mobileBottomKey;
        if (key === 'home') return;
        event.preventDefault();
        routeMobileKey(key);
      });
    });

    qa('[data-mobile-more-key]').forEach((item) => {
      if (item.dataset.mobileMoreBound) return;
      item.dataset.mobileMoreBound = 'true';
      item.addEventListener('click', (event) => {
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
      more.addEventListener('click', () => setMoreOpen(q('[data-mobile-more-menu]')?.hidden !== false));
    }
    const closeMore = q('[data-mobile-close-more]');
    if (closeMore && !closeMore.dataset.mobileCloseMoreBound) {
      closeMore.dataset.mobileCloseMoreBound = 'true';
      closeMore.addEventListener('click', () => setMoreOpen(false));
    }
    const moreBackdrop = q('[data-mobile-more-backdrop]');
    if (moreBackdrop && !moreBackdrop.dataset.mobileMoreBackdropBound) {
      moreBackdrop.dataset.mobileMoreBackdropBound = 'true';
      moreBackdrop.addEventListener('click', () => setMoreOpen(false));
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
      let lastFabActivation = 0;
      const toggleFab = (event) => {
        const now = Date.now();
        if (event?.type === 'click' && now - lastFabActivation < 450) {
          event?.preventDefault?.();
          return;
        }
        lastFabActivation = now;
        event?.preventDefault?.();
        event?.stopPropagation?.();
        setFabOpen(menu.hidden);
      };
      fab.addEventListener('click', toggleFab);
      fab.addEventListener('pointerup', toggleFab, { passive: false });
      fab.addEventListener('touchend', toggleFab, { passive: false });
      menu.addEventListener('click', (event) => {
        const action = event.target.closest('[data-mobile-more-key]');
        if (action && action.tagName === 'BUTTON') {
          event.preventDefault();
          routeMobileKey(action.dataset.mobileMoreKey);
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
  try {
    new MutationObserver(scheduleRefresh).observe(document.body, { attributes: true, attributeFilter: ['data-current-dashboard-view'] });
    new MutationObserver(scheduleRefresh).observe(document.documentElement, { attributes: true, attributeFilter: ['data-current-dashboard-view'] });
  } catch {}
})();
