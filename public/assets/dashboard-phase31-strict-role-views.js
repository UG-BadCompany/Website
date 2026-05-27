// Phase 31: strict role workspace separation.
(() => {
  if (window.__phase31StrictRoleViewsLoaded) return;
  window.__phase31StrictRoleViewsLoaded = true;

  const root = document.querySelector('[data-dashboard-root]');
  if (!root) return;

  const getCurrentView = () => {
    const pressed = document.querySelector('[data-view-button][aria-pressed="true"]');
    return pressed?.dataset.viewButton || document.body.dataset.currentDashboardView || 'admin';
  };

  const tagSections = () => {
    const tags = [
      ['.hero', 'admin client worker'],
      ['.admin-inbox, [data-admin-inbox], #admin-requests, #admin-work-orders', 'admin'],
      ['#estimate-review, [data-phase2-command-center], .estimate-review-suite', 'admin'],
      ['#finance-command-center, .finance-suite, [data-phase4-finance-suite]', 'admin'],
      ['#executive-overview, .executive-suite, [data-phase5-executive-suite]', 'admin'],
      ['#admin-invoices, [data-admin-invoices]', 'admin'],
      ['#admin-inventory, .inventory-suite, [data-admin-inventory]', 'admin'],
      ['#admin-activity, [data-admin-activity], [data-admin-alerts]', 'admin'],
      ['.smart-schedule-suite', 'admin'],
      ['.maintenance-suite', 'admin'],
      ['.photo-doc-suite', 'admin worker'],
      ['#client-requests, [data-client-requests], #client-quotes, [data-client-quotes], #client-invoices, [data-client-invoices]', 'client'],
      ['#customer-experience-center, .customer-experience-suite', 'client'],
      ['#client-tools-upgrade, .client-upgrade-panel', 'client'],
      ['#worker-jobs, [data-worker-jobs]', 'worker'],
      ['#worker-tools-upgrade, .worker-upgrade-panel', 'worker'],
      ['#worker-mobile-field, .worker-mobile-suite', 'worker'],
    ];

    tags.forEach(([selector, view]) => {
      document.querySelectorAll(selector).forEach((element) => {
        element.setAttribute('data-strict-view', view);
      });
    });
  };

  const updateSidebarForView = (view) => {
    document.querySelectorAll('[data-sidebar-target], [data-sidebar-action]').forEach((button) => {
      const target = (button.dataset.sidebarTarget || '').toLowerCase();
      const action = (button.dataset.sidebarAction || '').toLowerCase();
      const text = (button.textContent || '').toLowerCase();

      let allowed = true;

      if (view === 'admin') {
        allowed = !text.includes('client') &&
          !text.includes('customer') &&
          !text.includes('worker mobile') &&
          !text.includes('worker jobs') &&
          !target.includes('client') &&
          !target.includes('customer') &&
          !target.includes('worker');
      }

      if (view === 'client') {
        allowed = text.includes('client') ||
          text.includes('customer') ||
          target.includes('client') ||
          target.includes('customer') ||
          text.includes('overview');
      }

      if (view === 'worker') {
        allowed = text.includes('worker') ||
          text.includes('photo') ||
          target.includes('worker') ||
          target.includes('photo') ||
          text.includes('overview');
      }

      button.hidden = !allowed;
      button.setAttribute('aria-hidden', allowed ? 'false' : 'true');
    });
  };

  const applyStrictView = (view = getCurrentView()) => {
    document.body.dataset.currentDashboardView = view;
    tagSections();
    updateSidebarForView(view);

    let note = document.getElementById('strict-role-view-note');
    if (!note) {
      note = document.createElement('div');
      note.id = 'strict-role-view-note';
      note.className = 'role-view-clean-note';
      const hero = root.querySelector('.hero') || root.firstElementChild;
      hero?.parentNode?.insertBefore(note, hero.nextSibling);
    }

    const labels = {
      admin: 'Admin view: showing admin operations only.',
      client: 'Client view: showing client requests, quotes, invoices, and status only.',
      worker: 'Worker view: showing worker jobs, mobile field tools, and documentation only.',
    };

    note.textContent = labels[view] || labels.admin;
  };

  const originalSetView = window.taSetDashboardView;
  window.taSetDashboardView = (view) => {
    if (typeof originalSetView === 'function') originalSetView(view);
    setTimeout(() => applyStrictView(view), 80);
  };

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-view-button]');
    if (!button) return;
    setTimeout(() => applyStrictView(button.dataset.viewButton), 120);
  });

  const observer = new MutationObserver(() => {
    clearTimeout(window.__phase31StrictRoleTimer);
    window.__phase31StrictRoleTimer = setTimeout(() => applyStrictView(), 120);
  });

  observer.observe(root, { childList: true, subtree: true });
  setTimeout(() => applyStrictView(), 900);
})();
