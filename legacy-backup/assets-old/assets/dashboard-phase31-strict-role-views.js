// Phase 31: strict role workspace hints without owning role switching.
(() => {
  if (window.__phase31StrictRoleViewsLoaded) return;
  window.__phase31StrictRoleViewsLoaded = true;

  const root = document.querySelector('[data-dashboard-root]');
  if (!root) return;

  const getCurrentView = () => {
    const active = document.querySelector('[data-view-button][aria-pressed="true"]');
    return active?.dataset.viewButton || document.body.dataset.currentDashboardView || document.documentElement.dataset.currentDashboardView || 'admin';
  };

  const tagSections = () => {
    const tags = [
      ['#admin-requests, [data-admin-inbox], [data-phase3-workflow-suite], .workflow-suite', 'admin'],
      ['#estimate-review, #admin-quotes, [data-phase2-command-center], .estimate-review-suite', 'admin'],
      ['#finance-command-center, .finance-suite, .finance-command-panel, [data-phase4-finance-suite]', 'admin'],
      ['#executive-overview, .executive-suite, [data-overview-workspace], [data-phase5-executive-suite]', 'admin client worker'],
      ['#admin-invoices, [data-admin-invoices]', 'admin'],
      ['#admin-access, [data-admin-access-workspace]', 'admin'],
      ['#system-readiness, .readiness-suite, [data-phase8-readiness-suite]', 'admin'],
      ['#smart-schedule-suite, .smart-schedule-suite', 'admin'],
      ['#worker-route-suite, .worker-route-suite', 'worker'],
      ['.maintenance-suite', 'client'],
      ['#customer-experience-center, .customer-experience-suite', 'admin'],
      ['#worker-jobs, [data-worker-jobs], #worker-tools-upgrade, .worker-upgrade-panel', 'worker'],
      ['#worker-mobile-field, .worker-mobile-suite', 'worker'],
      ['#worker-ai-troubleshooting, [data-worker-ai-troubleshooting], .ai-troubleshooting-suite', 'worker'],
      ['.photo-doc-suite', 'worker'],
      ['#client-requests, [data-client-requests]', 'client'],
      ['#client-quotes, [data-client-quotes]', 'client'],
      ['#client-invoices, [data-client-invoices]', 'client'],
      ['#client-tools-upgrade, .client-upgrade-panel', 'client'],
    ];

    tags.forEach(([selector, view]) => {
      document.querySelectorAll(selector).forEach((element) => {
        element.setAttribute('data-strict-view', view);
      });
    });
  };

  const syncCurrentView = (view = getCurrentView()) => {
    document.body.dataset.currentDashboardView = view;
    document.documentElement.dataset.currentDashboardView = view;
    tagSections();
  };

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-view-button]');
    if (!button) return;
    setTimeout(() => syncCurrentView(button.dataset.viewButton), 80);
  });

  const observer = new MutationObserver(() => {
    clearTimeout(window.__phase31StrictRoleTimer);
    window.__phase31StrictRoleTimer = setTimeout(() => syncCurrentView(), 120);
  });

  observer.observe(root, { childList: true, subtree: true });
  setTimeout(() => syncCurrentView(), 900);
})();
