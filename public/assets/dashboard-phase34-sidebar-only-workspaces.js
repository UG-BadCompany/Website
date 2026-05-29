// Phase 34: sidebar-only dashboard workspaces.
// Fixes sidebar collisions:
// - Finance Center targets the newer Phase 4 finance command module.
// - Work Orders and Scheduling are separate workspaces.
// - Inventory stays a real /inventory/ link.
// - Maintenance Plans and Roles & Users are separate.
// - Roles & Users opens Access Manager.
// - Only one sidebar item highlights at a time.

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
        '#customer-experience-center',
        '.customer-experience-suite',
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
      title: 'Quotes',
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
      description: 'Active jobs, assignments, status updates, blocked work, and completion review.',
      targets: ['#admin-requests', '[data-admin-inbox]', '[data-phase3-workflow-suite]', '.workflow-suite', '#worker-jobs', '[data-worker-jobs]']
    },
    scheduling: {
      title: 'Scheduling and dispatch',
      description: 'Schedule board, upcoming jobs, unscheduled work, assigned worker, date/time, priority, and dispatch notes.',
      targets: ['#smart-schedule-suite', '.smart-schedule-suite']
    },

    invoices: {
      title: 'Invoices',
      description: 'Invoice workflow, client balances, payment status, and closeout.',
      targets: [
        '[data-admin-invoice-kpi-summary]',
        '[data-admin-invoice-summary]',
        '[data-admin-invoice-list]',
        '[data-client-invoices]',
        '#client-invoices',
        '.client-invoices',
        '.invoice-workspace',
        '.invoice-suite',
      ],
    },

    workers: {
      title: 'Workers',
      description: 'Worker jobs, field workflow, mobile tools, and job documentation.',
      targets: ['#worker-jobs', '#worker-tools-upgrade', '#worker-mobile-field', '.worker-mobile-suite', '.photo-doc-suite']
    },
    'photo-docs': {
      title: 'Photo documentation',
      description: 'Before, progress, after, completion notes, evidence checklist, and admin review status.',
      targets: ['.photo-doc-suite']
    },

    settings: {
      title: 'Settings',
      description: 'Admin settings, roles, users, and access management.',
      targets: [
        '#admin-access',
        '[data-admin-access]',
        '[data-admin-access-workspace]',
      ],
    },
    maintenance: {
      title: 'Maintenance plans',
      description: 'Recurring property care, HVAC, plumbing, electrical, frequency, due dates, and plan status.',
      targets: ['.maintenance-suite']
    },
    deployment: {
      title: 'Deployment and workflow health',
      description: 'Developer-focused deployment readiness, environment checks, critical API routes, and workflow health.',
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

  const detectWorkspace = (button) => {
    const label = (button.querySelector('span')?.textContent || button.textContent || '').trim().toLowerCase();
    const hint = (button.querySelector('small')?.textContent || '').trim().toLowerCase();
    const target = (button.dataset.sidebarTarget || '').trim().toLowerCase();
    const action = (button.dataset.sidebarAction || '').trim().toLowerCase();
    const source = `${label} ${hint} ${target} ${action}`;

    // Exact labels first so buttons do not collide.
    if (label === 'overview') return 'overview';
    if (label === 'estimate review') return 'quotes';

    if (label === 'work orders') return 'work-orders';
    if (label === 'scheduling') return 'scheduling';

    if (label === 'finance center') return 'finance';
    if (label === 'invoices') return 'invoices';

    if (label === 'worker jobs') return 'workers';
    if (label === 'worker mobile') return 'workers';
    if (label === 'photo docs') return 'workers';

    if (label === 'maintenance plans') return 'maintenance';

    if (label === 'roles & users') return 'settings';
    if (label === 'roles and users') return 'settings';

    if (label === 'inventory') return null; // Inventory must remain a normal /inventory/ link.
    if (label === 'customer status') return 'overview';
    if (label === 'deployment health') return 'deployment';

    const map = [
      ['overview', ['overview']],
      ['requests', ['request']],
      ['quotes', ['quote', 'estimate']],
      ['work-orders', ['work order', 'job']],
      ['scheduling', ['scheduling', 'schedule', 'dispatch']],
      ['invoices', ['invoice', 'finance']],
      ['workers', ['worker mobile', 'worker', 'field']],
      ['photo-docs', ['photo', 'proof', 'documentation']],
      ['settings', ['setting', 'roles', 'users', 'inventory']],
      ['maintenance', ['maintenance', 'recurring', 'plan']],
      ['deployment', ['deployment', 'deploy', 'workflow health', 'system readiness', 'readiness', 'health']]
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
    Object.entries(workspaces).forEach(([workspace, config]) => {
      config.targets.forEach((selector) => {
        document.querySelectorAll(selector).forEach((element) => {
          const existing = element.getAttribute('data-sidebar-workspace-section') || '';
          const values = new Set(existing.split(/\s+/).filter(Boolean));
          values.add(workspace);
          element.setAttribute('data-sidebar-workspace-section', Array.from(values).join(' '));
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

    tagWorkspaceSections();
    normalizeSidebarButtons();

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
      normalizeSidebarButtons();
      tagWorkspaceSections();

      const current = document.body.dataset.sidebarWorkspace || initial;
      setWorkspace(current);
    }, 200);
  });

  observer.observe(root, { childList: true, subtree: true });

  window.taSetSidebarWorkspace = setWorkspace;
})();