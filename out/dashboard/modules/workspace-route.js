(() => {
  const revealDashboardSection = (selector) => {
    document.querySelectorAll('[data-dashboard-section]').forEach((section) => {
      section.hidden = true;
    });
    const target = document.querySelector(selector);
    if (target) {
      target.hidden = false;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const applyWorkspaceRoute = () => {
    const params = new URLSearchParams(window.location.search);
    const workspace = (params.get('workspace') || '').trim();
    if (!workspace) return;

    const root = document.querySelector('[data-dashboard-root]');
    if (root) root.removeAttribute('data-dashboard-root');

    const activate = () => {
      if (typeof window.taSetDashboardView === 'function') {
        window.taSetDashboardView('admin');
      }
      if (workspace === 'work-orders') revealDashboardSection('#admin-work-orders');
      if (workspace === 'invoices') revealDashboardSection('[data-admin-invoices]');
      if (workspace === 'audit-activity') {
        revealDashboardSection('[data-admin-activity]');
        document.querySelector('[data-admin-activity-refresh]')?.click();
      }
      if (workspace === 'inventory') revealDashboardSection('[data-admin-inventory]');
      if (workspace === 'alerts') {
        revealDashboardSection('[data-admin-alerts]');
        if (typeof window.taDashboardActions?.loadAdminAlerts === 'function') {
          window.taDashboardActions.loadAdminAlerts();
        }
      }
    };

    window.addEventListener('load', () => setTimeout(activate, 120));
  };

  window.taWorkspaceRoute = {
    applyWorkspaceRoute,
    revealDashboardSection,
  };
})();
