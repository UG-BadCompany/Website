// Phase 34: sidebar-only dashboard workspaces.
// This removes top workspace tabs and makes the existing sidebar the single source of navigation.

(() => {
  if (window.__phase34SidebarOnlyWorkspacesLoaded) return;
  window.__phase34SidebarOnlyWorkspacesLoaded = true;

  const root = document.querySelector('[data-dashboard-root]');
  if (!root) return;

  const workspaces = {
    overview: {
      title: 'Overview',
      description: 'Quick business snapshot and daily attention items.',
      targets: ['.hero', '#executive-overview', '.executive-suite', '#customer-experience-center', '.customer-experience-suite']
    },
    requests: {
      title: 'Requests',
      description: 'New customer requests and request review workflow.',
      targets: ['#admin-requests', '#client-requests', '[data-client-requests]', '[data-admin-inbox]']
    },
    quotes: {
      title: 'Quotes',
      description: 'AI estimate review, quote approval, risks, materials, and customer quote status.',
      targets: ['#estimate-review', '#admin-quotes', '#client-quotes', '[data-client-quotes]', '[data-phase2-command-center]']
    },
    'work-orders': {
      title: 'Work Orders',
      description: 'Active jobs, assignments, status updates, blocked work, and completion review.',
      targets: ['#admin-work-orders', '#worker-jobs', '[data-worker-jobs]']
    },
    invoices: {
      title: 'Invoices',
      description: 'Finance center, customer invoices, payment readiness, and closeout.',
      targets: ['#finance-command-center', '#admin-invoices', '#client-invoices', '[data-admin-invoices]', '[data-client-invoices]', '[data-phase4-finance-suite]']
    },
    workers: {
      title: 'Workers',
      description: 'Worker jobs, field workflow, mobile tools, and job documentation.',
      targets: ['#worker-jobs', '#worker-tools-upgrade', '#worker-mobile-field', '.worker-mobile-suite']
    },
    settings: {
      title: 'Settings',
      description: 'Admin settings, roles, users, and inventory access.',
      targets: ['#admin-access', '#admin-inventory', '[data-admin-inventory]', '.inventory-suite']
    },
    deployment: {
      title: 'Deployment and workflow health',
      description: 'Developer-focused deployment readiness, environment checks, critical API routes, and workflow health.',
      targets: ['#system-readiness', '[data-phase8-readiness-suite]', '.readiness-suite']
    }
  };

  const normalizeSidebarButtons = () => {
    const map = [
      ['overview', ['overview']],
      ['requests', ['request']],
      ['quotes', ['quote', 'estimate']],
      ['work-orders', ['work order', 'job']],
      ['invoices', ['invoice', 'finance']],
      ['workers', ['worker', 'field']],
      ['settings', ['setting', 'roles', 'users', 'inventory']],
      ['deployment', ['deployment', 'deploy', 'workflow health', 'system readiness', 'readiness', 'health']]
    ];

    document.querySelectorAll('.sidebar-nav-link').forEach((button) => {
      const text = (button.textContent || '').toLowerCase();
      const target = (button.dataset.sidebarTarget || '').toLowerCase();
      const action = (button.dataset.sidebarAction || '').toLowerCase();
      const source = `${text} ${target} ${action}`;

      const found = map.find(([, words]) => words.some((word) => source.includes(word)));
      if (found) {
        button.dataset.sidebarWorkspace = found[0];
        button.removeAttribute('data-sidebar-target');
      }
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

    document.querySelectorAll('[data-sidebar-workspace]').forEach((button) => {
      const active = button.dataset.sidebarWorkspace === workspace;
      button.setAttribute('aria-current', active ? 'true' : 'false');
    });

    const header = ensureHeader();
    header.querySelector('h2').textContent = workspaces[workspace].title;
    header.querySelector('p').textContent = workspaces[workspace].description;

    // Keep the dashboard URL clean. Old ?workspace=... links are no longer used.
    const url = new URL(window.location.href);
    if (url.searchParams.has('workspace')) {
      url.searchParams.delete('workspace');
      window.history.replaceState({}, '', url);
    }
  };

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-sidebar-workspace]');
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();

    setWorkspace(button.dataset.sidebarWorkspace);

    const sidebar = document.querySelector('.dashboard-sidebar-v2');
    const backdrop = document.querySelector('.dashboard-sidebar-backdrop');
    if (sidebar) sidebar.dataset.open = 'false';
    if (backdrop) backdrop.dataset.open = 'false';
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
      setWorkspace(document.body.dataset.sidebarWorkspace || initial);
    }, 200);
  });

  observer.observe(root, { childList: true, subtree: true });

  window.taSetSidebarWorkspace = setWorkspace;
})();
