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
      views: ['admin', 'client', 'worker'],
      targets: ['#executive-overview', '.executive-suite', '[data-overview-workspace]'],
    },
    'estimate-review': {
      title: 'Estimate Review',
      description: 'AI estimate review, quote editing, inventory matches, draft saving, and customer sending.',
      views: ['admin'],
      targets: ['#estimate-review', '#admin-quotes', '[data-phase2-command-center]'],
    },
    'work-orders': {
      title: 'Work Orders',
      description: 'Active jobs, blocked work, assignments, status updates, materials, completion review, and invoice readiness.',
      views: ['admin'],
      targets: ['#admin-requests', '[data-admin-inbox]', '[data-phase3-workflow-suite]', '.workflow-suite'],
    },
    'client-requests': {
      title: 'Requests',
      description: 'Client request intake, status, updates, files, and property-aware service details.',
      views: ['client'],
      targets: ['#client-requests', '[data-client-requests]'],
    },
    'client-quotes': {
      title: 'Quotes',
      description: 'Client quote review, approval, decline/request-change actions, and quote history.',
      views: ['client'],
      targets: ['#client-quotes', '[data-client-quotes]'],
    },
    'client-invoices': {
      title: 'Client Invoices',
      description: 'Client invoice balances, payment status, invoice details, and payment actions.',
      views: ['client'],
      targets: ['#client-invoices', '[data-client-invoices]'],
    },
    scheduling: {
      title: 'Scheduling and Dispatch',
      description: 'Schedule board, upcoming jobs, unscheduled work, assigned worker, date/time, priority, and dispatch notes.',
      views: ['admin', 'worker'],
      targets: ['#smart-schedule-suite', '.smart-schedule-suite'],
    },
    finance: {
      title: 'Financial Command Center',
      description: 'Open invoices, open amount, paid amount, overdue count, Square checkout readiness, and finance action queue.',
      views: ['admin'],
      targets: ['.finance-suite', '[data-phase4-finance-suite]', '#finance-command-center', '.finance-command-panel'],
    },
    invoices: {
      title: 'Invoices',
      description: 'Modern invoice list, filters, search, payment links, mark-paid actions, client invoice view, and payment status.',
      views: ['admin'],
      targets: ['#admin-invoices', '[data-admin-invoices]'],
    },
    'customer-status': {
      title: 'Customer Status',
      description: 'Client-friendly request, quote, job, invoice/payment, and maintenance timeline status.',
      views: ['admin', 'client'],
      targets: ['#customer-experience-center', '.customer-experience-suite'],
    },
    'worker-jobs': {
      title: 'Worker Jobs',
      description: 'Assigned jobs, status updates, reserved materials, notes, evidence status, and completion actions.',
      views: ['admin', 'worker'],
      targets: ['#worker-jobs', '[data-worker-jobs]', '#worker-tools-upgrade'],
    },
    'worker-mobile': {
      title: 'Worker Mobile',
      description: 'Phone-first field cards for today’s jobs, start/progress/complete, materials, notes, and evidence.',
      views: ['admin', 'worker'],
      targets: ['#worker-mobile-field', '.worker-mobile-suite'],
    },
    'ai-troubleshooting': {
      title: 'AI Technician',
      description: 'OpenAI-powered field troubleshooting for equipment, error codes, symptoms, readings, and repair recommendations.',
      views: ['admin', 'worker'],
      targets: ['#worker-ai-troubleshooting', '[data-worker-ai-troubleshooting]', '.ai-troubleshooting-suite'],
    },
    'photo-docs': {
      title: 'Photo Documentation',
      description: 'Before, progress, after, completion notes, evidence checklist, upload hooks, and admin review status.',
      views: ['admin', 'worker'],
      targets: ['.photo-doc-suite'],
    },
    maintenance: {
      title: 'Maintenance Plans',
      description: 'Recurring property care, HVAC, plumbing, electrical, frequency, due dates, and plan status.',
      views: ['admin', 'client'],
      targets: ['.maintenance-suite'],
    },
    'roles-users': {
      title: 'Roles & Users',
      description: 'Access Manager role editor, user editor, permissions, search, create role, and create user.',
      views: ['admin'],
      targets: ['#admin-access', '[data-admin-access-workspace]'],
    },
    deployment: {
      title: 'Deployment and Readiness',
      description: 'API route coverage, environment checklist, audit commands, Netlify function notes, and workflow health.',
      views: ['admin'],
      targets: ['#system-readiness', '[data-phase8-readiness-suite]', '.readiness-suite'],
    },
  };

  window.TASidebarWorkspaceRoutes = workspaces;

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
    ['photo docs', 'photo-docs'],
    ['maintenance plans', 'maintenance'],
    ['roles & users', 'roles-users'],
    ['deployment health', 'deployment'],
  ]);

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
        document.querySelectorAll(selector).forEach((element) => {
          const existing = element.getAttribute('data-sidebar-workspace-section');
          if (existing && existing !== workspace && window.location.hostname === 'localhost') {
            console.warn(`Dashboard module ${selector} already mapped to ${existing}; keeping ${existing} instead of ${workspace}.`);
            return;
          }
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
    header.innerHTML = '<h2>Overview</h2><p>Quick business snapshot and daily attention items.</p><p class="session-status" data-sidebar-missing-module-status hidden></p>';

    const shell = document.querySelector('.dashboard-workspace-v2') || root;
    const firstContent = Array.from(shell.children).find((child) => !child.matches('.dashboard-mobile-nav-toggle, .dashboard-sidebar-backdrop, .dashboard-sidebar-v2, .mobile-quick-action-bar'));
    if (firstContent) shell.insertBefore(header, firstContent);
    else shell.appendChild(header);

    return header;
  };

  const resolveWorkspace = (workspace = 'overview') => workspaceAliases[workspace] || workspace;

  const currentView = () => document.body.dataset.currentDashboardView || document.documentElement.dataset.currentDashboardView || 'admin';

  const visibleTargetsFor = (workspace) => {
    const config = workspaces[workspace];
    if (!config) return [];
    return config.targets.flatMap((selector) => Array.from(document.querySelectorAll(selector)));
  };

  const actionExists = (action) => {
    if (action === 'client-profile') return Boolean(document.querySelector('[data-client-profile-shortcut], [data-client-profile]'));
    return Boolean(document.querySelector('[data-admin-access-shortcut]'));
  };

  const validateSidebarControls = () => {
    const view = currentView();
    document.querySelectorAll('.sidebar-nav-link, .mobile-quick-action').forEach((button) => {
      if (button.dataset.sidebarHref || button.dataset.mobileQuickHref) return;
      const action = button.dataset.sidebarAction || button.dataset.mobileQuickAction || '';
      if (action) {
        const ok = actionExists(action);
        button.hidden = button.hidden || !ok;
        button.setAttribute('aria-disabled', ok ? 'false' : 'true');
        button.title = ok ? '' : 'This action is unavailable until the matching form loads.';
        return;
      }
      const workspace = resolveWorkspace(button.dataset.sidebarWorkspace || button.dataset.mobileQuickWorkspace || '');
      const config = workspaces[workspace];
      if (!config) return;
      const allowed = !config.views?.length || config.views.includes(view);
      const hasTarget = visibleTargetsFor(workspace).length > 0;
      const unavailable = !allowed || !hasTarget;
      button.hidden = unavailable;
      button.setAttribute('aria-disabled', unavailable ? 'true' : 'false');
      button.title = hasTarget ? '' : `Missing module target for ${config.title}.`;
    });
  };

  const setActiveButton = (workspace) => {
    document.querySelectorAll('[data-sidebar-workspace], [data-mobile-quick-workspace]').forEach((button) => {
      const key = button.dataset.sidebarWorkspace || button.dataset.mobileQuickWorkspace || '';
      const active = resolveWorkspace(key) === workspace;
      if (active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
  };

  const scrollWorkspaceTarget = (workspace, preferredTarget = '') => {
    const preferred = preferredTarget ? (() => { try { return document.querySelector(preferredTarget); } catch { return null; } })() : null;
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
    validateSidebarControls();
    window.taSyncSidebarVisibility?.();

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
      missingStatus.textContent = missing ? `Missing module target for ${workspaces[workspace].title}. Check sidebar workspace routing.` : '';
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

    if (options.scroll) scrollWorkspaceTarget(workspace, options.target || '');
  };

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-sidebar-workspace], [data-mobile-quick-workspace]');
    if (!button || button.dataset.sidebarHref || button.dataset.mobileQuickHref) return;
    const selectedWorkspace = button.dataset.sidebarWorkspace || button.dataset.mobileQuickWorkspace || '';
    if (!selectedWorkspace || button.hidden || button.getAttribute('aria-disabled') === 'true') return;

    event.preventDefault();
    event.stopPropagation();

    setWorkspace(selectedWorkspace, { scroll: true, target: button.dataset.sidebarTarget || button.dataset.mobileQuickTarget || '' });

    const sidebar = document.querySelector('.dashboard-sidebar-v2');
    const backdrop = document.querySelector('.dashboard-sidebar-backdrop');
    if (sidebar) sidebar.dataset.open = 'false';
    if (backdrop) backdrop.dataset.open = 'false';
  }, true);

  const initial = resolveWorkspace(document.body.dataset.sidebarWorkspace || 'overview');

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
      validateSidebarControls();
      window.taSyncSidebarVisibility?.();
      setWorkspace(document.body.dataset.sidebarWorkspace || initial);
    }, 200);
  });

  observer.observe(root, { childList: true, subtree: true });
  try {
    new MutationObserver(() => { validateSidebarControls(); window.taSyncSidebarVisibility?.(); }).observe(document.body, { attributes: true, attributeFilter: ['data-current-dashboard-view'] });
    new MutationObserver(() => { validateSidebarControls(); window.taSyncSidebarVisibility?.(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-current-dashboard-view'] });
  } catch {}

  window.taSetSidebarWorkspace = setWorkspace;
})();
