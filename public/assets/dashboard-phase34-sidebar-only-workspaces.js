// Phase 34: sidebar-only dashboard workspaces.
// Current-safe update after Phase 55 mobile work.
// Fixes:
// - Finance Center points to the newer Phase 4 finance command module.
// - Finance Center and Invoices are separate.
// - Work Orders and Scheduling are separate.
// - Maintenance Plans and Roles & Users are separate.
// - Photo Docs has its own workspace.
// - Inventory stays a real /inventory/ link.
// - Old/wrong workspace tags are cleared before retagging.

(() => {
  if (window.__phase34SidebarOnlyWorkspacesLoaded) return;
  window.__phase34SidebarOnlyWorkspacesLoaded = true;

  const root = document.querySelector('[data-dashboard-root]');
  if (!root) return;

  if (!document.body.dataset.sidebarWorkspace) {
    document.body.dataset.sidebarWorkspace = 'overview';
  }

  const workspaces = {
    overview: {
      title: 'Overview',
      description: 'Quick business snapshot and daily attention items.',
      targets: [
        '.hero',
        '#executive-overview',
        '.executive-suite',
      ],
    },

    requests: {
      title: 'Requests',
      description: 'New customer requests and request review workflow.',
      targets: [
        '#admin-requests',
        '#client-requests',
        '[data-client-requests]',
        '[data-admin-inbox]',
      ],
    },

    quotes: {
      title: 'Estimate Review',
      description: 'AI estimate review, quote approval, risks, materials, and customer quote status.',
      targets: [
        '#estimate-review',
        '#admin-quotes',
        '#client-quotes',
        '[data-client-quotes]',
        '[data-phase2-command-center]',
      ],
    },

    'work-orders': {
      title: 'Work Orders',
      description: 'Active jobs, assignments, blocked work, completion review, and closeout.',
      targets: [
        '[data-phase3-workflow-suite]',
        '.workflow-suite',
        '#admin-work-orders',
        '[data-admin-work-orders]',
      ],
    },

    scheduling: {
      title: 'Scheduling and dispatch',
      description: 'Schedule board, upcoming jobs, unscheduled work, assigned workers, priority, and dispatch notes.',
      targets: [
        '#smart-schedule-suite',
        '.smart-schedule-suite',
        '[data-smart-schedule-suite]',
        '[data-scheduling-workspace]',
        '.scheduling-suite',
      ],
    },

    finance: {
      title: 'Finance Center',
      description: 'Financial command center, payment readiness, Square links, deposits, balances, and billing overview.',
      targets: [
        '#finance-command-center',
        '[data-phase4-finance-suite]',
        '.finance-suite',
        '.finance-command-panel',
      ],
    },

    invoices: {
      title: 'Invoices',
      description: 'Invoice workflow, client balances, payment status, and closeout.',
      // Keep #admin-invoices out of here if you do not want the old Invoice & payment desk.
      targets: [
        '[data-modern-invoices]',
        '.invoice-workspace',
        '.invoice-suite',
        '[data-client-invoices]',
        '#client-invoices',
        '.client-invoices',
      ],
    },

    'customer-status': {
      title: 'Customer Status',
      description: 'Client experience, project status, quote status, and customer-facing updates.',
      targets: [
        '#customer-experience-center',
        '.customer-experience-suite',
      ],
    },

    'worker-jobs': {
      title: 'Worker Jobs',
      description: 'Assigned worker jobs, field status, job notes, and completion workflow.',
      targets: [
        '#worker-jobs',
        '[data-worker-jobs]',
      ],
    },

    'worker-mobile': {
      title: 'Worker Mobile',
      description: 'Mobile field workflow, today’s jobs, materials, notes, and completion actions.',
      targets: [
        '#worker-mobile-field',
        '.worker-mobile-suite',
      ],
    },

    'photo-docs': {
      title: 'Photo Documentation',
      description: 'Before, progress, after, completion notes, evidence checklist, and admin review status.',
      targets: [
        '.photo-doc-suite',
        '#photo-doc-suite',
        '[data-photo-doc-suite]',
      ],
    },

    maintenance: {
      title: 'Maintenance Plans',
      description: 'Recurring property care, HVAC, plumbing, electrical, frequency, due dates, and plan status.',
      targets: [
        '#maintenance-plans',
        '.maintenance-suite',
        '[data-maintenance-plans]',
        '[data-maintenance-suite]',
      ],
    },

    settings: {
      title: 'Roles & Users',
      description: 'Access manager, role permissions, users, and account assignments.',
      targets: [
        '#admin-access',
        '[data-admin-access]',
        '[data-admin-access-workspace]',
      ],
    },

    deployment: {
      title: 'Deployment Health',
      description: 'Deployment readiness, environment checks, API routes, workflow health, and audit status.',
      targets: [
        '#system-readiness',
        '[data-phase8-readiness-suite]',
        '.readiness-suite',
      ],
    },
  };

  const closeSidebar = () => {
    const sidebar = document.querySelector('.dashboard-sidebar-v2');
    const backdrop = document.querySelector('.dashboard-sidebar-backdrop');

    if (sidebar) sidebar.dataset.open = 'false';
    if (backdrop) backdrop.dataset.open = 'false';
  };

  const clearSidebarActiveStates = () => {
    document.querySelectorAll('.sidebar-nav-link').forEach((item) => {
      item.removeAttribute('aria-current');
    });
  };

  const clearWorkspaceSectionTags = () => {
    document.querySelectorAll('[data-sidebar-workspace-section]').forEach((element) => {
      element.removeAttribute('data-sidebar-workspace-section');
    });
  };

  const detectWorkspace = (button) => {
    const label = (button.querySelector('span')?.textContent || button.textContent || '').trim().toLowerCase();
    const hint = (button.querySelector('small')?.textContent || '').trim().toLowerCase();
    const target = (button.dataset.sidebarTarget || '').trim().toLowerCase();
    const action = (button.dataset.sidebarAction || '').trim().toLowerCase();
    const source = `${label} ${hint} ${target} ${action}`;

    if (label === 'overview') return 'overview';
    if (label === 'estimate review') return 'quotes';
    if (label === 'requests') return 'requests';

    if (label === 'work orders') return 'work-orders';
    if (label === 'scheduling') return 'scheduling';

    if (label === 'finance center') return 'finance';
    if (label === 'invoices') return 'invoices';
    if (label === 'customer status') return 'customer-status';

    if (label === 'worker jobs') return 'worker-jobs';
    if (label === 'worker mobile') return 'worker-mobile';
    if (label === 'photo docs') return 'photo-docs';
    if (label === 'photo documentation') return 'photo-docs';

    if (label === 'maintenance plans') return 'maintenance';

    if (label === 'roles & users') return 'settings';
    if (label === 'roles and users') return 'settings';

    if (label === 'deployment health') return 'deployment';

    // Inventory must stay a real /inventory/ link.
    if (label === 'inventory') return null;

    const map = [
      ['overview', ['overview']],
      ['requests', ['request']],
      ['quotes', ['estimate review', 'quote']],
      ['work-orders', ['work order']],
      ['scheduling', ['scheduling', 'schedule', 'dispatch']],
      ['finance', ['finance center', 'financial command center', 'finance-command-center']],
      ['invoices', ['invoice', 'billing']],
      ['customer-status', ['customer status', 'customer experience']],
      ['worker-jobs', ['worker jobs']],
      ['worker-mobile', ['worker mobile', 'today']],
      ['photo-docs', ['photo docs', 'photo documentation', 'proof', 'documentation']],
      ['maintenance', ['maintenance', 'recurring', 'plan']],
      ['settings', ['roles', 'users', 'access']],
      ['deployment', ['deployment', 'deploy', 'workflow health', 'system readiness', 'readiness', 'health']],
    ];

    const found = map.find(([, words]) => words.some((word) => source.includes(word)));
    return found ? found[0] : null;
  };

  const normalizeSidebarButtons = () => {
    document.querySelectorAll('.sidebar-nav-link:not([data-sidebar-href])').forEach((button) => {
      const workspace = detectWorkspace(button);

      if (workspace) {
        button.dataset.sidebarWorkspace = workspace;
        button.removeAttribute('data-sidebar-target');
      }
    });

    document.querySelectorAll('[data-sidebar-href="/inventory/"], a[href="/inventory/"]').forEach((link) => {
      link.removeAttribute('data-sidebar-workspace');
      link.removeAttribute('data-sidebar-target');
      link.dataset.sidebarHref = '/inventory/';
      link.setAttribute('href', '/inventory/');
    });
  };

  const tagWorkspaceSections = () => {
    clearWorkspaceSectionTags();

    Object.entries(workspaces).forEach(([workspace, config]) => {
      config.targets.forEach((selector) => {
        document.querySelectorAll(selector).forEach((element) => {
          element.setAttribute('data-sidebar-workspace-section', workspace);
        });
      });
    });
  };

  const ensureHeader = () => {
    let header = document.querySelector('[data-sidebar-workspace-header]');
    if (header) return header;

    header = document.createElement('section');
    header.className = 'sidebar-workspace-header';
    header.dataset.sidebarWorkspaceHeader = 'true';
    header.innerHTML = '<h2>Overview</h2><p>Quick business snapshot and daily attention items.</p>';

    const shell = document.querySelector('.dashboard-workspace-v2') || root;
    const first = shell.firstElementChild;

    if (first) shell.insertBefore(header, first);
    else shell.appendChild(header);

    return header;
  };

  const setWorkspace = (workspace = 'overview') => {
    if (!workspaces[workspace]) workspace = 'overview';

    normalizeSidebarButtons();
    tagWorkspaceSections();

    document.body.dataset.sidebarWorkspace = workspace;

    clearSidebarActiveStates();

    document.querySelectorAll('[data-sidebar-workspace]').forEach((button) => {
      const active = button.dataset.sidebarWorkspace === workspace;

      if (active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });

    const header = ensureHeader();
    header.querySelector('h2').textContent = workspaces[workspace].title;
    header.querySelector('p').textContent = workspaces[workspace].description;

    const url = new URL(window.location.href);
    if (url.searchParams.has('workspace')) {
      url.searchParams.delete('workspace');
      window.history.replaceState({}, '', url);
    }

    if (workspace === 'settings') {
      window.taDashboardActions?.bindAdminAccessForms?.();
      window.taDashboardActions?.loadAdminAccess?.();
    }

    window.dispatchEvent(new CustomEvent('ta:sidebar-workspace-change', {
      detail: { workspace },
    }));
  };

  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-sidebar-href]');

    if (link) {
      clearSidebarActiveStates();
      link.setAttribute('aria-current', 'page');
      closeSidebar();

      // Let Inventory navigate normally.
      return;
    }

    const button = event.target.closest('[data-sidebar-workspace]');
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();

    const workspace = button.dataset.sidebarWorkspace;

    clearSidebarActiveStates();
    button.setAttribute('aria-current', 'true');

    setWorkspace(workspace);
    closeSidebar();
  }, true);

  const initial = document.body.dataset.sidebarWorkspace || 'overview';

  const boot = () => {
    normalizeSidebarButtons();
    tagWorkspaceSections();
    ensureHeader();
    setWorkspace(initial);
  };

  setTimeout(boot, 1200);

  const observer = new MutationObserver(() => {
    clearTimeout(window.__phase34SidebarWorkspaceTimer);
    window.__phase34SidebarWorkspaceTimer = setTimeout(() => {
      const current = document.body.dataset.sidebarWorkspace || initial;

      normalizeSidebarButtons();
      tagWorkspaceSections();
      setWorkspace(current);
    }, 200);
  });

  observer.observe(root, { childList: true, subtree: true });

  window.taSetSidebarWorkspace = setWorkspace;
})();