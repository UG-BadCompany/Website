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
    const role = document.body.dataset.currentDashboardView || document.documentElement.dataset.currentDashboardView || 'client';
    const label = q('[data-mobile-current-role]');
    if (label) label.textContent = roleLabel(role);
    qa('[data-mobile-role-option]').forEach((button) => {
      const option = button.dataset.mobileRoleOption;
      const mapsTo = option === 'owner' ? 'admin' : option;
      const active = mapsTo === role || (option === 'owner' && role === 'admin');
      button.dataset.active = String(active);
      button.setAttribute('aria-pressed', String(active));
    });
  };

  const updateMetrics = () => {
    const revenue = textOf('[data-admin-open-amount-metric]', textOf('[data-admin-paid-amount-metric]', '$0'));
    const jobs = textOf('[data-worker-jobs-count]', textOf('[data-open-requests-metric]', '0'));
    const quotes = textOf('[data-quotes-metric]', '0');
    const requests = textOf('[data-open-requests-metric]', '0');
    const values = { revenue, jobs, quotes, requests };
    Object.entries(values).forEach(([key, value]) => {
      qa(`[data-mobile-metric="${key}"]`).forEach((node) => { node.textContent = value; });
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

  const bind = () => {
    qa('[data-mobile-role-option]').forEach((button) => {
      if (button.dataset.mobileRoleBound) return;
      button.dataset.mobileRoleBound = 'true';
      button.addEventListener('click', () => {
        const view = button.dataset.mobileRoleOption === 'owner' ? 'admin' : button.dataset.mobileRoleOption;
        window.taSetDashboardView?.(view);
        updateRole();
      });
    });

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

    const more = q('[data-mobile-open-more]');
    if (more && !more.dataset.mobileMoreBound) {
      more.dataset.mobileMoreBound = 'true';
      more.addEventListener('click', () => {
        document.querySelector('[data-sidebar-toggle]')?.click();
      });
    }

    const fab = q('[data-mobile-fab]');
    const menu = q('[data-mobile-fab-menu]');
    if (fab && menu && !fab.dataset.mobileFabBound) {
      fab.dataset.mobileFabBound = 'true';
      fab.addEventListener('click', () => {
        const open = menu.hidden;
        menu.hidden = !open;
        fab.setAttribute('aria-expanded', String(open));
      });
      document.addEventListener('click', (event) => {
        if (event.target.closest('[data-mobile-fab], [data-mobile-fab-menu]')) return;
        menu.hidden = true;
        fab.setAttribute('aria-expanded', 'false');
      });
    }
  };

  const refresh = () => {
    updateGreeting();
    updateRole();
    updateMetrics();
    bind();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh, { once: true });
  else refresh();
  setTimeout(refresh, 900);
  setTimeout(refresh, 2200);
  try {
    new MutationObserver(refresh).observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ['data-current-dashboard-view'] });
    new MutationObserver(refresh).observe(document.documentElement, { attributes: true, attributeFilter: ['data-current-dashboard-view'] });
  } catch {}
})();
