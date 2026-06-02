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
      description: 'Role-specific dashboard home with one summary surface and clean app actions.',
      views: ['admin', 'client', 'worker'],
      module: 'home',
      targets: ['#executive-overview', '.executive-suite', '[data-overview-workspace]'],
    },
    'estimate-review': {
      title: 'Admin Quotes',
      description: 'AI estimate review, quote editing, inventory matches, draft saving, and customer sending.',
      views: ['admin'],
      module: 'quotes',
      targets: ['#admin-quotes-workspace', '[data-admin-quotes-workspace]', '#estimate-review', '#admin-quotes', '[data-phase2-command-center]'],
    },
    'work-orders': {
      title: 'Admin Requests / Work Orders',
      description: 'Active jobs, blocked work, assignments, status updates, materials, completion review, and invoice readiness.',
      views: ['admin'],
      module: 'requests',
      targets: ['#admin-requests', '[data-admin-inbox]', '[data-phase3-workflow-suite]', '.workflow-suite'],
    },
    'client-requests': {
      title: 'My Requests',
      description: 'Client request intake, status, updates, files, and property-aware service details.',
      views: ['client'],
      module: 'requests',
      targets: ['#client-requests', '[data-client-requests]'],
    },
    'client-quotes': {
      title: 'My Quotes',
      description: 'Client quote review, approval, decline/request-change actions, and quote history.',
      views: ['client'],
      module: 'quotes',
      targets: ['#client-quotes', '[data-client-quotes]'],
    },
    'client-invoices': {
      title: 'My Invoices',
      description: 'Client invoice balances, payment status, invoice details, and payment actions.',
      views: ['client'],
      module: 'invoices',
      targets: ['#client-invoices', '[data-client-invoices]'],
    },
    'project-updates': {
      title: 'Project Updates',
      description: 'Client-safe project status, upcoming visits, quote status, invoice status, and maintenance updates.',
      views: ['client'],
      module: 'project-updates',
      targets: ['#client-project-updates', '.maintenance-suite'],
    },
    scheduling: {
      title: 'Schedule / Route',
      description: 'Role-safe schedule view for dispatch planning or field route review.',
      views: ['admin', 'worker'],
      module: 'schedule',
      targets: ['#smart-schedule-suite', '.smart-schedule-suite', '#worker-route-suite', '.worker-route-suite'],
    },
    finance: {
      title: 'Admin Finance',
      description: 'Open invoices, open amount, paid amount, overdue count, Square checkout readiness, and finance action queue.',
      views: ['admin'],
      module: 'finance',
      targets: ['.finance-suite', '[data-phase4-finance-suite]', '#finance-command-center', '.finance-command-panel'],
    },
    invoices: {
      title: 'Admin Invoices',
      description: 'Modern invoice list, filters, search, payment links, mark-paid actions, and payment status.',
      views: ['admin'],
      module: 'invoices',
      targets: ['#admin-invoices', '[data-admin-invoices]'],
    },
    customers: {
      title: 'Admin Customers',
      description: 'Customer list, customer status, service history, and account follow-up for admins.',
      views: ['admin'],
      module: 'customers',
      targets: ['#customer-experience-center', '.customer-experience-suite'],
    },
    'worker-jobs': {
      title: 'My Jobs',
      description: 'Assigned jobs, status updates, reserved materials, notes, evidence status, and completion actions.',
      views: ['worker'],
      module: 'jobs',
      targets: ['#worker-jobs', '[data-worker-jobs]', '#worker-tools-upgrade'],
    },
    'worker-mobile': {
      title: 'Materials / Job Notes',
      description: 'Phone-first field cards for today’s jobs, start/progress/complete, materials, notes, and evidence.',
      views: ['worker'],
      module: 'materials',
      targets: ['#worker-mobile-field', '.worker-mobile-suite'],
    },
    'ai-troubleshooting': {
      title: 'AI Troubleshooting',
      description: 'OpenAI-powered field troubleshooting for equipment, error codes, symptoms, readings, and repair recommendations.',
      views: ['worker'],
      module: 'troubleshooter',
      targets: ['#worker-ai-troubleshooting', '[data-worker-ai-troubleshooting]', '.ai-troubleshooting-suite'],
    },
    'photo-docs': {
      title: 'Photos / Completion Evidence',
      description: 'Before, progress, after, completion notes, evidence checklist, upload hooks, and closeout status.',
      views: ['worker'],
      module: 'photos',
      targets: ['.photo-doc-suite'],
    },
    maintenance: {
      title: 'Maintenance / Project Updates',
      description: 'Recurring property care, HVAC, plumbing, electrical, frequency, due dates, and plan status.',
      views: ['client'],
      module: 'project-updates',
      targets: ['.maintenance-suite'],
    },
    'ai-knowledge': {
      title: 'AI Knowledge Center',
      description: 'Admin review queue for AI-learned quote, material, labor, and troubleshooting knowledge.',
      views: ['admin'],
      module: 'ai-tools',
      targets: ['#ai-knowledge-center', '[data-ai-knowledge-center]', '.ai-knowledge-suite'],
    },
    'roles-users': {
      title: 'Admin Settings',
      description: 'Access Manager role editor, user editor, permissions, search, create role, and create user.',
      views: ['admin'],
      module: 'settings',
      targets: ['#admin-access', '[data-admin-access-workspace]'],
    },
    deployment: {
      title: 'Admin System Readiness',
      description: 'Deployment and workflow health, API route coverage, environment checklist, audit commands, and Netlify function notes.',
      views: ['admin'],
      module: 'readiness',
      targets: ['#system-readiness', '[data-phase8-readiness-suite]', '.readiness-suite'],
    },
  };


  window.TASidebarWorkspaceRoutes = workspaces;

  const workspaceAliases = {
    quotes: 'estimate-review',
    requests: 'work-orders',
    jobs: 'work-orders',
    workers: 'worker-jobs',
    settings: 'roles-users',
    'customer-status': 'customers',
  };

  const labelWorkspace = new Map([
    ['overview', 'overview'],
    ['estimate review', 'estimate-review'],
    ['work orders', 'work-orders'],
    ['requests', 'client-requests'],
    ['quotes', 'client-quotes'],
    ['client invoices', 'client-invoices'],
    ['scheduling', 'scheduling'],
    ['schedule / route', 'scheduling'],
    ['finance center', 'finance'],
    ['invoices', 'invoices'],
    ['customers', 'customers'],
    ['customer status', 'customers'],
    ['worker jobs', 'worker-jobs'],
    ['worker mobile', 'worker-mobile'],
    ['ai troubleshooting', 'ai-troubleshooting'],
    ['photo docs', 'photo-docs'],
    ['project updates', 'maintenance'],
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
    header.innerHTML = '<h2>Overview</h2><p>Role-specific dashboard home.</p><p class="session-status" data-sidebar-missing-module-status hidden></p>';

    const firstContent = Array.from(root.children).find((child) => !child.matches('.dashboard-mobile-nav-toggle, .dashboard-sidebar-backdrop, .dashboard-sidebar-v2, .mobile-quick-action-bar'));
    if (firstContent) root.insertBefore(header, firstContent);
    else root.appendChild(header);
    return header;
  };

  const resolveWorkspace = (workspace = 'overview') => workspaceAliases[workspace] || workspace;

  const currentView = () => document.body.dataset.currentDashboardView || document.documentElement.dataset.currentDashboardView || 'admin';

  const visibleTargetsFor = (workspace) => {
    const config = workspaces[workspace];
    if (!config) return [];
    const view = currentView();
    if (config.views?.length && !config.views.includes(view)) return [];
    return config.targets.flatMap((selector) => Array.from(document.querySelectorAll(selector)));
  };

  const setActiveDashboardModule = (workspace) => {
    const config = workspaces[workspace] || workspaces.overview;
    const view = currentView();
    const module = config.module || workspace || 'home';
    document.body.dataset.dashboardModule = module;
    document.documentElement.dataset.dashboardModule = module;
    document.body.dataset.currentDashboardModule = module;
    document.documentElement.dataset.currentDashboardModule = module;

    const activeTargets = new Set(visibleTargetsFor(workspace));
    root.querySelectorAll('[data-dashboard-section], [data-main-dashboard-actions]').forEach((section) => {
      const sectionViews = (section.dataset.views || '').split(/\s+/).filter(Boolean);
      const allowedForView = !sectionViews.length || sectionViews.includes(view);
      const active = allowedForView && activeTargets.has(section);
      section.hidden = !active;
      section.dataset.dashboardActiveSection = String(active);
      section.setAttribute('aria-hidden', active ? 'false' : 'true');
    });

    window.dispatchEvent(new CustomEvent('ta-dashboard-module-change', { detail: { view, module, workspace } }));
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

  const ensureModuleTopAnchor = (destination, workspace) => {
    if (!destination) return null;
    const existing = destination.querySelector?.('[data-module-top-anchor]') || null;
    if (existing) return existing;
    const anchor = document.createElement('span');
    anchor.className = 'dashboard-module-top-anchor';
    anchor.dataset.moduleTopAnchor = workspace || 'module';
    anchor.setAttribute('aria-hidden', 'true');
    destination.prepend(anchor);
    return anchor;
  };

  const scrollWorkspaceTarget = (workspace, preferredTarget = '') => {
    const preferred = preferredTarget ? (() => { try { return document.querySelector(preferredTarget); } catch { return null; } })() : null;
    const destination = preferred || visibleTargetsFor(workspace)[0] || null;
    if (!destination) return false;
    const anchor = ensureModuleTopAnchor(destination, workspace) || destination;
    const scrollToAnchor = (behavior = 'auto') => {
      if (!window.scrollTo && anchor.scrollIntoView) {
        anchor.scrollIntoView({ behavior, block: 'start' });
        return;
      }
      const stickyOffset = Math.max(0, Math.round(document.querySelector('.nav')?.getBoundingClientRect?.().height || 0));
      const viewportOffset = Math.max(0, Math.round(window.visualViewport?.offsetTop || 0));
      const top = Math.max(0, Math.round(anchor.getBoundingClientRect().top + window.pageYOffset - stickyOffset - viewportOffset - 8));
      window.scrollTo({ top, left: 0, behavior });
    };
    window.requestAnimationFrame(() => {
      scrollToAnchor('auto');
      window.requestAnimationFrame(() => scrollToAnchor('smooth'));
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
    document.documentElement.dataset.sidebarWorkspace = workspace;
    setActiveButton(workspace);
    setActiveDashboardModule(workspace);

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
  window.taSetDashboardModule = setWorkspace;
  window.taDashboardModuleRoutes = workspaces;
})();