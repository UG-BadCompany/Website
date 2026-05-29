// Phase 34: sidebar-only dashboard workspaces.
// This makes the sidebar the single source of dashboard workspace routing.

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
      targets: ['.hero', '#executive-overview', '.executive-suite'],
    },

    'estimate-review': {
      title: 'Estimate Review',
      description: 'AI estimate review, quote editing, inventory matches, draft saving, and customer sending.',
      targets: ['#estimate-review', '#admin-quotes', '[data-phase2-command-center]'],
    },

    'work-orders': {
      title: 'Work Orders',
      description: 'Active jobs, blocked work, assignments, status updates, materials, completion review, and invoice readiness.',
      targets: ['#admin-requests', '[data-admin-inbox]', '[data-phase3-workflow-suite]', '.workflow-suite'],
    },

    'client-requests': {
      title: 'Requests',
      description: 'Client request intake, status, updates, files, and property-aware service details.',
      targets: ['#client-requests', '[data-client-requests]'],
    },

    'client-quotes': {
      title: 'Quotes',
      description: 'Client quote review, approval, decline/request-change actions, and quote history.',
      targets: ['#client-quotes', '[data-client-quotes]'],
    },

    'client-invoices': {
      title: 'Client Invoices',
      description: 'Client invoice balances, payment status, invoice details, and payment actions.',
      targets: ['#client-invoices', '[data-client-invoices]'],
    },

    scheduling: {
      title: 'Scheduling and Dispatch',
      description: 'Schedule board, upcoming jobs, unscheduled work, assigned worker, date/time, priority, and dispatch notes.',
      targets: ['#smart-schedule-suite', '.smart-schedule-suite'],
    },

    finance: {
      title: 'Finance Center',
      description: 'Financial command center, payment readiness, Square links, deposits, balances, and billing overview.',
      targets: ['#finance-command-center', '[data-phase4-finance-suite]', '.finance-suite', '.finance-command-panel'],
    },

    invoices: {
      title: 'Invoices',
      description: 'Modern invoice list, filters, search, payment links, mark-paid actions, client invoice view, and payment status.',
      targets: ['#admin-invoices', '[data-admin-invoices]'],
    },

    'customer-status': {
      title: 'Customer Status',
      description: 'Client-friendly request, quote, job, invoice/payment, and maintenance timeline status.',
      targets: ['#customer-experience-center', '.customer-experience-suite'],
    },

    'worker-jobs': {
      title: 'Worker Jobs',
      description: 'Assigned jobs, status updates, reserved materials, notes, evidence status, and completion actions.',
      targets: ['#worker-jobs', '[data-worker-jobs]', '#worker-tools-upgrade'],
    },

    'worker-mobile': {
      title: 'Worker Mobile',
      description: 'Phone-first field cards for today’s jobs, start/progress/complete, materials, notes, and evidence.',
      targets: ['#worker-mobile-field', '.worker-mobile-suite'],
    },

    'ai-troubleshooting': {
      title: 'AI Troubleshooting',
      description: 'Safety-first AI field assistant for equipment details, symptoms, fault codes, readings, and work-order notes.',
      targets: ['#worker-ai-troubleshooting', '[data-worker-ai-troubleshooting]', '.ai-troubleshooting-suite'],
    },

    'photo-docs': {
      title: 'Photo Documentation',
      description: 'Before, progress, after, completion notes, evidence checklist, upload hooks, and admin review status.',
      targets: ['.photo-doc-suite'],
    },

    maintenance: {
      title: 'Maintenance Plans',
      description: 'Recurring property care, HVAC, plumbing, electrical, frequency, due dates, and plan status.',
      targets: ['.maintenance-suite'],
    },

    'roles-users': {
      title: 'Roles & Users',
      description: 'Access Manager role editor, user editor, permissions, search, create role, and create user.',
      targets: ['#admin-access', '[data-admin-access-workspace]'],
    },

    deployment: {
      title: 'Deployment and Readiness',
      description: 'API route coverage, environment checklist, audit commands, Netlify function notes, and workflow health.',
      targets: ['#system-readiness', '[data-phase8-readiness-suite]', '.readiness-suite'],
    },
  };

  const workspaceAliases = {
    quotes: 'estimate-review',
    requests: 'work-orders',
    workers: 'worker-jobs',
    settings: 'roles-users',
  };

  const labelWorkspace = new Map([
    ['overview', 'overview'],
    ['estimate review', 'estimate-review'],
    ['work orders', 'work-orders'],
    ['requests', 'client-requests'],
    ['quotes', 'client-quotes'],
    ['client invoices', 'client-invoices'],
    ['scheduling', 'scheduling'],
    ['finance center', 'finance'],
    ['invoices', 'invoices'],
    ['customer status', 'customer-status'],
    ['worker jobs', 'worker-jobs'],
    ['worker mobile', 'worker-mobile'],
    ['ai troubleshooting', 'ai-troubleshooting'],
    ['ai technician', 'ai-troubleshooting'],
    ['photo docs', 'photo-docs'],
    ['maintenance plans', 'maintenance'],
    ['roles & users', 'roles-users'],
    ['deployment health', 'deployment'],
  ]);

  const closeSidebar = () => {
    document.querySelectorAll('[data-sidebar-backdrop], .dashboard-sidebar-backdrop').forEach((element) => {
      element.dataset.open = 'false';
    });

    document.querySelectorAll('.dashboard-sidebar-v2').forEach((element) => {
      element.dataset.open = 'false';
    });
  };

  const clearSidebarActiveStates = () => {
    document.querySelectorAll('.sidebar-nav-link, .mobile-quick-action').forEach((element) => {
      element.removeAttribute('aria-current');
    });
  };

  const normalizeSidebarButtons = () => {
    document.querySelectorAll('.sidebar-nav-link').forEach((button) => {
      if (button.dataset.sidebarHref) return;

      const existing = button.dataset.sidebarWorkspace;
      if (workspaces[existing]) return;

      const text = (button.querySelector('span')?.textContent || button.textContent || '').trim().toLowerCase();
      const workspace = labelWorkspace.get(text);

      if (workspace) button.dataset.sidebarWorkspace = workspace;
    });
  };

  const tagWorkspaceSections = () => {
    root.querySelectorAll('[data-sidebar-workspace-section]').forEach((element) => {
      element.removeAttribute('data-sidebar-workspace-section');
    });

    Object.entries(workspaces).forEach(([workspace, config]) => {
      config.targets.forEach((selector) => {
        let matches = [];

        try {
          matches = Array.from(document.querySelectorAll(selector));
        } catch {
          matches = [];
        }

        matches.forEach((element) => {
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
    header.innerHTML = `
      <h2>Overview</h2>
      <p>Quick business snapshot and daily attention items.</p>
      <p class="session-status" data-sidebar-missing-module-status hidden></p>
    `;

    const shell = document.querySelector('.dashboard-workspace-v2') || root;
    const first = shell.firstElementChild;

    if (first) shell.insertBefore(header, first);
    else shell.appendChild(header);

    return header;
  };

  const resolveWorkspace = (workspace = 'overview') => workspaceAliases[workspace] || workspace;

  const visibleTargetsFor = (workspace) => {
    const config = workspaces[workspace];
    if (!config) return [];

    return config.targets.flatMap((selector) => {
      try {
        return Array.from(document.querySelectorAll(selector));
      } catch {
        return [];
      }
    });
  };

  const setActiveButton = (workspace) => {
    document.querySelectorAll('[data-sidebar-workspace]').forEach((button) => {
      const active = resolveWorkspace(button.dataset.sidebarWorkspace) === workspace;
      if (active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
  };

  const scrollWorkspaceTarget = (workspace, preferredTarget = '') => {
    const preferred = preferredTarget
      ? (() => {
          try {
            return document.querySelector(preferredTarget);
          } catch {
            return null;
          }
        })()
      : null;

    const destination = preferred || visibleTargetsFor(workspace)[0] || null;
    if (!destination) return false;

    window.requestAnimationFrame(() => {
      destination.scrollIntoView({ behavior: 'smooth', block: 'start' });
      destination.classList.add('dashboard-section-highlight');
      setTimeout(() => destination.classList.remove('dashboard-section-highlight'), 1200);
    });

    return true;
  };

  const setWorkspace = (workspace = 'overview', options = {}) => {
    workspace = resolveWorkspace(workspace);
    if (!workspaces[workspace]) workspace = 'overview';

    normalizeSidebarButtons();
    tagWorkspaceSections();

    document.body.dataset.sidebarWorkspace = workspace;
    setActiveButton(workspace);

    const header = ensureHeader();
    header.querySelector('h2').textContent = workspaces[workspace].title;
    header.querySelector('p').textContent = workspaces[workspace].description;

    const missingStatus = header.querySelector('[data-sidebar-missing-module-status]');
    const visibleTargets = visibleTargetsFor(workspace);

    if (missingStatus) {
      const missing = visibleTargets.length === 0;
      missingStatus.hidden = !missing;
      missingStatus.textContent = missing
        ? `Missing module target for ${workspaces[workspace].title}. Check sidebar workspace routing.`
        : '';
    }

    if (!visibleTargets.length && window.location.hostname === 'localhost') {
      console.warn(`No dashboard module targets found for sidebar workspace: ${workspace}`);
    }

    const url = new URL(window.location.href);
    if (url.searchParams.has('workspace')) {
      url.searchParams.delete('workspace');
      window.history.replaceState({}, '', url);
    }

    if (workspace === 'roles-users') {
      window.taDashboardActions?.bindAdminAccessForms?.();
      window.taDashboardActions?.loadAdminAccess?.();
    }

    if (options.scroll) {
      scrollWorkspaceTarget(workspace, options.target || '');
    }
  };

  document.addEventListener(
    'click',
    (event) => {
      const link = event.target.closest('[data-sidebar-href]');

      if (link) {
        clearSidebarActiveStates();
        link.setAttribute('aria-current', 'page');
        closeSidebar();
        return;
      }

      const button = event.target.closest('[data-sidebar-workspace]');
      if (!button || button.dataset.sidebarHref || !button.dataset.sidebarWorkspace) return;

      event.preventDefault();
      event.stopPropagation();

      setWorkspace(button.dataset.sidebarWorkspace, {
        scroll: true,
        target: button.dataset.sidebarTarget || '',
      });

      closeSidebar();
    },
    true
  );

  const initial = resolveWorkspace(document.body.dataset.sidebarWorkspace || 'overview');

  const boot = () => {
    normalizeSidebarButtons();
    tagWorkspaceSections();
    ensureHeader();
    setWorkspace(initial);
  };

  const retagCurrentWorkspace = () => {
    const current = document.body.dataset.sidebarWorkspace || initial;

    normalizeSidebarButtons();
    tagWorkspaceSections();
    setWorkspace(current);
  };

  setTimeout(boot, 1200);
  setTimeout(retagCurrentWorkspace, 1800);
  setTimeout(retagCurrentWorkspace, 2600);

  const observer = new MutationObserver(() => {
    clearTimeout(window.__phase34SidebarWorkspaceTimer);
    window.__phase34SidebarWorkspaceTimer = setTimeout(retagCurrentWorkspace, 200);
  });

  observer.observe(root, { childList: true, subtree: true });

  window.taSetSidebarWorkspace = setWorkspace;
})();