    (async () => {
      window.taSetDashboardView = (view) => { window.taPendingDashboardView = view; };
      const sessionCard = document.querySelector('[data-session-card]');
      const status = document.querySelector('[data-session-status]');
      const accountStatus = document.querySelector('[data-account-status]');
      const logoutButton = document.querySelector('[data-logout-button]');
      const themeToggle = document.querySelector('[data-theme-toggle]');
      const debugDashboardLink = document.querySelector('[data-debug-dashboard-link]');
      const DEBUG_DASHBOARD_EMAIL = 'thomas.debacker.ii@gmail.com';
      const dashboardParams = new URLSearchParams(window.location.search);
      const authDebugEnabled = dashboardParams.has('auth_debug') || dashboardParams.has('debug');
      if (sessionCard) sessionCard.hidden = !authDebugEnabled;
      if (authDebugEnabled && debugDashboardLink) {
        debugDashboardLink.hidden = false;
        debugDashboardLink.href = '/dashboard/';
        debugDashboardLink.textContent = 'Dashboard';
      }

      const ensureAuthDebugPanel = () => {
        let panel = document.querySelector('[data-auth-debug-panel]');
        if (panel) return panel;

        panel = document.createElement('section');
        panel.className = 'card';
        panel.dataset.authDebugPanel = 'true';
        panel.innerHTML = '<strong>Login debug</strong><p class="session-status" data-auth-debug-summary>Loading login debug…</p><div class="admin-command-actions" data-auth-debug-controls hidden><button class="admin-command-card" type="button" data-debug-switch-view="admin"><strong>Switch to admin view</strong><span>Exercise view switching and permission-scoped shortcuts.</span></button><button class="admin-command-card" type="button" data-debug-switch-view="client"><strong>Switch to client view</strong><span>Validate client request, quote, and invoice sections.</span></button><button class="admin-command-card" type="button" data-debug-switch-view="worker"><strong>Switch to worker view</strong><span>Validate worker jobs, checklists, and notes sections.</span></button><button class="admin-command-card" type="button" data-debug-refresh-session><strong>Re-check session endpoints</strong><span>Run /api/me and /api/auth/debug checks and print a quick health report.</span></button></div><pre data-auth-debug-health hidden style="white-space:pre-wrap;overflow:auto;max-height:200px;margin-top:10px;padding:14px;border-radius:16px;background:#0b1220;color:#cbd5e1;font-size:.8rem;line-height:1.45;"></pre><pre data-auth-debug-output style="white-space:pre-wrap;overflow:auto;max-height:420px;margin-top:14px;padding:14px;border-radius:16px;background:#111827;color:#f8fafc;font-size:.85rem;line-height:1.5;"></pre><p><a class="btn btn-soft" href="/api/auth/debug" target="_blank" rel="noopener">Open raw debug JSON</a> <a class="btn btn-primary" href="/login/">Request a new magic link</a></p>';
        status?.closest('main')?.insertBefore(panel, status.closest('section')?.nextSibling || null);
        return panel;
      };

      const buildDebugFallbackPermissions = (roles = [], permissionKeys = []) => {
        const roleSet = new Set(roles.length ? roles : ['client']);
        const permissionSet = new Set(permissionKeys || []);
        const hasPermissionPrefix = (prefix) => [...permissionSet].some((permission) => permission.startsWith(prefix));
        const admin = roleSet.has('admin') || permissionSet.has('admin.tools') || hasPermissionPrefix('admin.');
        const worker = roleSet.has('worker') || admin || permissionSet.has('worker.tools') || hasPermissionPrefix('worker.');
        const client = roleSet.has('client') || admin || permissionSet.has('client.tools') || hasPermissionPrefix('client.');
        const availableViews = [
          ...(admin ? ['admin'] : []),
          ...(client ? ['client'] : []),
          ...(worker ? ['worker'] : []),
        ];

        return {
          canViewClientTools: client,
          canViewWorkerTools: worker,
          canViewAdminTools: admin,
          canSwitchDashboardView: admin || permissionSet.has('dashboard.switch_views'),
          canManageUsers: admin || permissionSet.has('admin.users.manage'),
          canManageRoles: admin || permissionSet.has('admin.roles.manage'),
          canManageRequests: admin || permissionSet.has('admin.requests.manage'),
          canManageQuotes: admin || permissionSet.has('admin.quotes.manage'),
          canViewInvoices: client || permissionSet.has('client.invoices.manage'),
          canManageInvoices: admin || permissionSet.has('admin.invoices.manage'),
          canViewAdminActivity: admin || permissionSet.has('admin.activity.view'),
          canManageInventory: admin || permissionSet.has('admin.inventory.manage'),
          defaultView: admin ? 'admin' : (worker ? 'worker' : 'client'),
          availableViews: availableViews.length ? availableViews : ['client'],
          permissionKeys: [...permissionSet],
        };
      };

      const getDashboardPermissions = (user = {}) => {
        const provided = user.permissions || {};
        const fallback = buildDebugFallbackPermissions(user.roles || [], provided.permissionKeys || []);
        const mergeBool = (key) => Boolean(provided[key] || fallback[key]);
        const availableViews = [...new Set([...(provided.availableViews || []), ...(fallback.availableViews || [])])];

        return {
          ...provided,
          canViewClientTools: mergeBool('canViewClientTools'),
          canViewWorkerTools: mergeBool('canViewWorkerTools'),
          canViewAdminTools: mergeBool('canViewAdminTools'),
          canSwitchDashboardView: mergeBool('canSwitchDashboardView'),
          canManageUsers: mergeBool('canManageUsers'),
          canManageRoles: mergeBool('canManageRoles'),
          canManageRequests: mergeBool('canManageRequests'),
          canManageQuotes: mergeBool('canManageQuotes'),
          canViewInvoices: mergeBool('canViewInvoices'),
          canManageInvoices: mergeBool('canManageInvoices'),
          canViewAdminActivity: mergeBool('canViewAdminActivity'),
          canManageInventory: mergeBool('canManageInventory'),
          defaultView: provided.defaultView || fallback.defaultView,
          availableViews: availableViews.length ? availableViews : fallback.availableViews,
          permissionKeys: [...new Set([...(provided.permissionKeys || []), ...(fallback.permissionKeys || [])])],
        };
      };

      const normalizeDashboardEmail = (email = '') => String(email || '').trim().toLowerCase();
      const canOpenDebugDashboard = (user = {}, debugResult = null) => (
        normalizeDashboardEmail(user.email) === DEBUG_DASHBOARD_EMAIL
        || Boolean(debugResult?.canOpenDebugDashboard)
      );

      const updateDebugDashboardLink = (user = {}, debugResult = null) => {
        if (!debugDashboardLink) return;
        if (authDebugEnabled) {
          debugDashboardLink.hidden = false;
          debugDashboardLink.href = '/dashboard/';
          debugDashboardLink.textContent = 'Dashboard';
          return;
        }
        const allowed = canOpenDebugDashboard(user, debugResult);
        debugDashboardLink.hidden = !allowed;
        debugDashboardLink.href = allowed ? '/dashboard/?auth_debug=1' : '/dashboard/';
        debugDashboardLink.textContent = allowed ? 'Debug dashboard' : 'Dashboard';
      };

      const revealAuthorizedFallbackSections = (user) => {
        const permissions = user.permissions || {};
        const availableViews = new Set(permissions.availableViews || user.roles || []);
        document.querySelectorAll('[data-dashboard-section]').forEach((section) => {
          const views = (section.dataset.views || '').split(' ').map((view) => view.trim()).filter(Boolean);
          const requiredPermission = section.dataset.permission;
          const hasView = views.some((view) => availableViews.has(view));
          const hasRequiredPermission = !requiredPermission || Boolean(permissions[requiredPermission]);
          if (hasView && hasRequiredPermission) section.hidden = false;
        });
      };

      const ensureFallbackActionPanel = (user) => {
        let panel = document.querySelector('[data-debug-fallback-actions]');
        if (!panel) {
          panel = document.createElement('section');
          panel.className = 'card';
          panel.dataset.debugFallbackActions = 'true';
          status?.closest('main')?.insertBefore(panel, document.querySelector('[data-auth-debug-panel]') || status.closest('section')?.nextSibling || null);
        }

        const permissions = user.permissions || {};
        const actions = [];
        if (permissions.canViewAdminTools) actions.push('<button class="admin-command-card" type="button" data-admin-work-orders-shortcut><strong>Work orders</strong><span>Open work-order tools in a quick popup.</span></button>');
        if (permissions.canManageInvoices) actions.push('<button class="admin-command-card" type="button" data-admin-invoices-shortcut><strong>Invoices</strong><span>Open invoice tools in a quick popup.</span></button>');
        if (permissions.canManageUsers || permissions.canManageRoles) actions.push('<button class="admin-command-card" type="button" data-admin-access-shortcut><strong>Roles & users</strong><span>Manage dashboard users and access.</span></button>');
        if (permissions.canViewAdminActivity) actions.push('<button class="admin-command-card" type="button" data-admin-activity-shortcut><strong>Audit activity</strong><span>Search recent dashboard events.</span></button>');
        if (permissions.canManageInventory) actions.push('<button class="admin-command-card" type="button" data-admin-inventory-shortcut><strong>Inventory</strong><span>Open inventory tools in a quick popup.</span></button>');
        if (permissions.canViewClientTools) actions.push('<button class="admin-command-card" type="button" data-client-requests-shortcut><strong>Client requests</strong><span>Submit or review work requests.</span></button>');
        if (permissions.canViewWorkerTools) actions.push('<a class="admin-command-card" href="/portal/worker/"><strong>Worker jobs</strong><span>Open assigned job tools.</span></a>');

        panel.innerHTML = `<strong>Debug session found</strong><p class="session-status">/api/auth/debug confirmed a usable session. Loading the main dashboard with these same permissions now.</p><div class="admin-command-actions">${actions.join('') || '<a class="admin-command-card" href="/login/"><strong>Request a new magic link</strong><span>Refresh your dashboard session.</span></a>'}</div>`;
        const debugPanel = document.querySelector('[data-auth-debug-panel]');
        const debugOutput = debugPanel?.querySelector('[data-auth-debug-output]');
        if (debugPanel) debugPanel.dataset.recovered = 'true';
        if (debugOutput) debugOutput.hidden = true;
        bindDashboardToolPopupLaunchers();
        bindClientWorkspaceLaunchers();
        bindAdminAccessLauncher();
        bindAdminActivityLauncher();
        return panel;
      };

      const buildDebugDashboardUser = (debugResult) => {
        if (!debugResult?.canUseSession || !debugResult.session) return null;
        const roles = debugResult.roles?.length ? debugResult.roles : ['client'];
        return {
          id: debugResult.session.userId,
          email: debugResult.session.email || 'signed-in account',
          fullName: debugResult.session.fullName || '',
          roles,
          permissions: buildDebugFallbackPermissions(roles, debugResult.permissionKeys || []),
        };
      };

      const recoverMainDashboardFromDebug = (debugResult, reason = '/api/me is unavailable, but /api/auth/debug confirmed this session.', { showDebugPanel = false } = {}) => {
        const debugUser = buildDebugDashboardUser(debugResult);
        if (!debugUser) return null;

        status.dataset.state = 'ready';
        status.textContent = `Signed in as ${getUserDisplayName(debugUser)}`;
        if (accountStatus) accountStatus.textContent = `Signed in: ${getUserDisplayName(debugUser)}`;
        if (logoutButton) logoutButton.hidden = false;

        debugUser.permissions = getDashboardPermissions(debugUser);
        updateDebugDashboardLink(debugUser, debugResult);

        configureSignedInDashboard(debugUser);

        try {
          renderClientProfile(debugUser);
          bindClientProfileButton();
          bindClientProfileForm();
          bindRequestEstimateLink();
          revealAuthorizedFallbackSections(debugUser);
        } catch (setupError) {
          console.error('Dashboard setup failed after debug-confirmed session recovery', setupError);
        }

        try {
          loadAuthorizedDashboardTools(debugUser);
        } catch (toolError) {
          console.error('Dashboard tool loading failed after debug-confirmed session recovery', toolError);
        }

        if (showDebugPanel) {
          const panel = ensureFallbackActionPanel(debugUser);
          const panelStatus = panel?.querySelector('.session-status');
          if (panelStatus) panelStatus.textContent = `${reason} The main dashboard has been loaded from the confirmed session and permissions.`;
        }
        return debugUser;
      };

      const recoverMainDashboardSilently = async (reason = '/api/me is unavailable, but /api/auth/debug confirmed this session.') => {
        try {
          const { response, result } = await fetchAuthDebug();
          if (!response.ok || !result?.canUseSession) return null;
          return recoverMainDashboardFromDebug(result, reason, { showDebugPanel: false });
        } catch (error) {
          console.error('Silent dashboard session recovery failed', error);
          return null;
        }
      };

      const enrichDashboardUserFromDebug = async (user = {}) => {
        try {
          const { response, result } = await fetchAuthDebug();
          if (!response.ok || !result?.canUseSession) return user;
          const roles = [...new Set([...(user.roles || []), ...(result.roles || [])])];
          const permissionKeys = [...new Set([...(user.permissions?.permissionKeys || []), ...(result.permissionKeys || [])])];
          const enrichedUser = {
            ...user,
            fullName: user.fullName || result.session?.fullName || '',
            roles: roles.length ? roles : (user.roles || []),
            permissions: {
              ...(user.permissions || {}),
              permissionKeys,
            },
          };
          updateDebugDashboardLink(enrichedUser, result);
          return enrichedUser;
        } catch (error) {
          console.error('Dashboard permission enrichment from auth debug failed', error);
          return user;
        }
      };

      const dedupeDashboardSingletons = () => {
        const singletonSelectors = [
          '[data-main-dashboard-actions]',
          '[data-view-switcher]',
          '[data-admin-command-center]',
          '[data-client-command-center]',
          '[data-worker-command-center]',
          '[data-admin-invoices]',
          '[data-admin-activity]',
        ];

        const singletonKeys = new Set();
        document.querySelectorAll('[data-dashboard-singleton]').forEach((element) => {
          const singletonKey = element.dataset.dashboardSingleton;
          if (singletonKey) singletonKeys.add(singletonKey);
        });

        singletonSelectors.forEach((selector) => {
          const elements = Array.from(document.querySelectorAll(selector));
          elements.slice(1).forEach((element) => element.remove());
        });

        singletonKeys.forEach((singletonKey) => {
          const elements = Array.from(document.querySelectorAll('[data-dashboard-singleton]'))
            .filter((element) => element.dataset.dashboardSingleton === singletonKey);
          elements.slice(1).forEach((element) => element.remove());
        });
      };

      const configureMainDashboardActions = (user, activeView = '') => {
        const permissions = getDashboardPermissions(user);
        user.permissions = permissions;
        const actionBar = document.querySelector('[data-main-dashboard-actions]');
        if (!actionBar) return;
        let visibleCount = 0;
        actionBar.querySelectorAll('[data-main-action-permission]').forEach((action) => {
          const permissionKey = action.dataset.mainActionPermission;
          const actionViews = (action.dataset.mainActionViews || '').split(' ').filter(Boolean);
          const matchesActiveView = !activeView || !actionViews.length || actionViews.includes(activeView);
          const visible = matchesActiveView && Boolean(permissions[permissionKey]);
          action.hidden = !visible;
          if (visible) visibleCount += 1;
        });
        if (!visibleCount && (permissions.canViewAdminTools || permissions.canViewClientTools || permissions.canViewWorkerTools)) {
          actionBar.querySelectorAll('[data-main-action-permission]').forEach((action) => {
            const actionViews = (action.dataset.mainActionViews || '').split(' ').filter(Boolean);
            const visible = !activeView || !actionViews.length || actionViews.includes(activeView);
            action.hidden = !visible;
            if (visible) visibleCount += 1;
          });
        }
        actionBar.hidden = visibleCount === 0;
        bindDashboardToolPopupLaunchers();
        bindClientWorkspaceLaunchers();
        bindAdminAccessLauncher();
        bindAdminActivityLauncher();
        bindClientProfileButton();
        bindRequestEstimateLink();
      };


      const bindAdminWorkspaceViewToggles = () => {
        document.querySelectorAll('[data-admin-workspace-target]').forEach((button) => {
          if (button.dataset.bound) return;
          button.dataset.bound = 'true';
          button.addEventListener('click', () => {
            const target = button.dataset.adminWorkspaceTarget;
            const view = button.dataset.adminWorkspaceView;
            const body = document.querySelector(`[data-admin-workspace-body="${target}"]`);
            if (body) body.hidden = view !== 'details';
            document.querySelectorAll(`[data-admin-workspace-target="${target}"]`).forEach((peer) => {
              peer.dataset.active = String(peer === button);
            });
          });
        });
      };

      const loadAuthorizedDashboardTools = (user) => {
        bindAdminWorkspaceViewToggles();
        if (user.permissions?.canViewClientTools) {
          bindClientRequestForm();
          bindClientRequestEditActions();
          bindClientPropertyActions();
          bindQuoteDecisionActions();
          loadClientRequests();
          loadClientQuotes();
          if (user.permissions?.canViewInvoices) {
            loadClientInvoices();
          }
        }

        if (user.permissions?.canViewWorkerTools) {
          bindWorkerJobActions();
          loadWorkerJobs();
        }

        if (user.permissions?.canManageRequests) {
          loadAdminRequests();
          loadAdminActivity();
        }

        if (user.permissions?.canViewAdminActivity) {
          bindAdminActivityLauncher();
        }

        if (user.permissions?.canManageInvoices) {
          window.taDashboardActions.bindAdminInvoiceActions();
          window.taDashboardActions.loadAdminInvoices();
        }

        if (user.permissions?.canManageInventory) {
          bindAdminInventoryWorkspaceActions();
          loadAdminInventoryWorkspace();
        }

        if (user.permissions?.canManageUsers || user.permissions?.canManageRoles) {
          bindDashboardToolPopupLaunchers();
          bindAdminAccessLauncher();
          loadAdminAccess();
        }

        if (user.permissions?.canViewAdminActivity) {
          bindAdminActivityActions();
          loadAdminActivity();
        }
      };

      const verifyDashboardMagicLinkToken = async () => {
        const url = new URL(window.location.href);
        const tokenFromDashboardUrl = url.searchParams.get('token');
        if (!tokenFromDashboardUrl) return true;

        if (status) {
          status.dataset.state = 'loading';
          status.textContent = 'Completing secure sign-in…';
        }
        if (accountStatus) accountStatus.textContent = 'Completing secure sign-in…';

        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
          credentials: 'same-origin',
          body: new URLSearchParams({ token: tokenFromDashboardUrl }),
        });
        const result = await response.json().catch(() => ({}));

        url.searchParams.delete('token');
        const cleanPath = `${url.pathname || '/dashboard/'}${url.search}${url.hash}`;
        window.history.replaceState(null, document.title, cleanPath || '/dashboard/');

        if (!response.ok || !result.ok) {
          if (['used', 'expired'].includes(result.auth)) {
            if (status) status.textContent = 'Magic link was already used; checking your existing secure session…';
            if (accountStatus) accountStatus.textContent = 'Checking existing secure session…';
            return true;
          }

          throw new Error(result.message || 'This magic link could not be verified. Request a new secure link.');
        }

        return true;
      };


      const runDashboardDebugHealthCheck = async () => {
        const panel = ensureAuthDebugPanel();
        const health = panel.querySelector('[data-auth-debug-health]');
        if (!health) return;
        health.hidden = false;
        health.textContent = 'Running endpoint checks…';
        const stamp = new Date().toISOString();
        try {
          const [me, debug] = await Promise.all([
            fetchJson('/api/me'),
            fetchJson('/api/auth/debug'),
          ]);
          const report = {
            checkedAt: stamp,
            meStatus: me?.authenticated ? 'authenticated' : (me?.error || 'unknown'),
            meRoles: me?.user?.roles || [],
            debugCanUseSession: Boolean(debug?.canUseSession),
            debugRoles: debug?.roles || [],
            hasSessionCookie: Boolean(debug?.cookies?.hasSessionCookie),
            sessionCookieCount: debug?.cookies?.sessionCookieCount || 0,
            currentView: document.documentElement.dataset.dashboardView || null,
            availableViews: availableDashboardViews,
          };
          health.textContent = JSON.stringify(report, null, 2);
        } catch (error) {
          health.textContent = JSON.stringify({ checkedAt: stamp, error: error.message }, null, 2);
        }
      };

      const bindDashboardDebugControls = () => {
        const panel = ensureAuthDebugPanel();
        const controls = panel.querySelector('[data-auth-debug-controls]');
        if (!controls) return;
        controls.hidden = false;
        if (!controls.dataset.boundDebugControls) {
          controls.dataset.boundDebugControls = 'true';
          controls.addEventListener('click', (event) => {
            const viewButton = event.target.closest('[data-debug-switch-view]');
            if (viewButton) {
              const view = viewButton.dataset.debugSwitchView;
              if (typeof window.taSetDashboardView === 'function') {
                window.taSetDashboardView(view);
              }
              return;
            }
            const refreshButton = event.target.closest('[data-debug-refresh-session]');
            if (refreshButton) {
              runDashboardDebugHealthCheck();
            }
          });
        }
      };

      const fetchAuthDebug = () => fetchJson('/api/auth/debug');

      const loadAuthDebug = async (reason = 'Dashboard could not confirm a signed-in session.', { recoverMainDashboard = false } = {}) => {
        const panel = ensureAuthDebugPanel();
        const summary = panel.querySelector('[data-auth-debug-summary]');
        const output = panel.querySelector('[data-auth-debug-output]');
        if (summary) summary.textContent = `${reason} Checking cookie and database session state now…`;

        try {
          const { response, result } = await fetchAuthDebug();
          const hints = [];
          if (!result.cookies?.hasSessionCookie) hints.push('No ta_session cookie reached /api/auth/debug. This usually means the browser did not save/send the login cookie.');
          if (result.cookies?.hasSessionCookie && !result.session) hints.push('A ta_session cookie reached the server, but no matching auth_sessions row was found.');
          if (result.session?.expired) hints.push('The matching auth_sessions row is expired.');
          if (result.session?.revoked) hints.push('The matching auth_sessions row is revoked.');
          if (result.session && result.session.userIsActive === false) hints.push('The matching user exists but is inactive.');
          if (result.session && !result.roles?.length) hints.push('The session user has no roles; the dashboard may fall back to client access.');
          if (result.canUseSession) hints.push('/api/auth/debug found a usable session. /api/me should now load that same session; if it does not, keep this debug output for support.');
          if (!response.ok) hints.push(`Debug endpoint returned HTTP ${response.status}.`);
          if (summary) summary.textContent = hints.length ? hints.join(' ') : 'Debug found a session cookie and active database session. If the dashboard still looks signed out, the issue is in /api/me or dashboard rendering.';
          if (output) output.textContent = JSON.stringify(result, null, 2);
          if (result.canUseSession && result.session) {
            if (recoverMainDashboard) {
              recoverMainDashboardFromDebug(result, reason, { showDebugPanel: true });
            } else {
              const debugUser = buildDebugDashboardUser(result);
              if (debugUser) ensureFallbackActionPanel(debugUser);
            }
          }
          return result;
        } catch (error) {
          if (summary) summary.textContent = `Could not load login debug: ${error.message}`;
          if (output) output.textContent = String(error.stack || error.message || error);
          return null;
        }
      };

      const applyTheme = (theme) => {
        const normalizedTheme = theme === 'light' ? 'light' : 'dark';
        document.documentElement.dataset.theme = normalizedTheme;
        if (themeToggle) {
          themeToggle.textContent = normalizedTheme === 'light' ? 'Dark mode' : 'Light mode';
          themeToggle.setAttribute('aria-label', `Switch to ${normalizedTheme === 'light' ? 'dark' : 'light'} theme`);
        }
      };

      applyTheme(localStorage.getItem('ta-theme') || 'dark');
      themeToggle?.addEventListener('click', () => {
        const nextTheme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('ta-theme', nextTheme);
        applyTheme(nextTheme);
      });

      if (!status) {
        return;
      }

      const fetchJson = async (url, options = {}, timeoutMs = 12000) => {
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            if (controller) controller.abort();
            reject(new DOMException('Request timed out', 'AbortError'));
          }, timeoutMs);
        });
        const requestPromise = fetch(url, {
          cache: 'no-store',
          credentials: 'same-origin',
          ...options,
          headers: {
            accept: 'application/json',
            ...(options.headers || {}),
          },
          ...(controller ? { signal: controller.signal } : {}),
        }).then(async (response) => ({ response, result: await response.json().catch(() => ({})) }));

        try {
          return await Promise.race([requestPromise, timeoutPromise]);
        } finally {
          clearTimeout(timeoutId);
        }
      };

      const escapeHtml = (value = '') => String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
      const currentAdminRequests = new Map();
      const currentAdminRoles = new Map();
      const currentAdminUsers = new Map();
      const currentAdminWorkers = new Map();
      const currentAdminAssignments = new Map();
      const currentAdminQuotes = new Map();
      let currentAdminInvoices = [];
      let currentAdminActivity = [];
      let currentAdminInventoryItems = [];
      let currentAdminInventoryUsage = [];
      let currentProfileUser = null;
      let currentDashboardView = '';
      let availableDashboardViews = [];
      let adminActivityLoaded = false;
      let adminActivityFilterTimer = null;
      let currentAdminActivityPage = 1;
      let adminActivityHasNextPage = false;
      let currentAdminRequestScope = 'active';
      const adminStatusOrder = [
        ['new', 'New'],
        ['needs_review', 'Needs review'],
        ['quote_in_progress', 'Quoting'],
        ['quote_sent', 'Quote sent'],
        ['accepted', 'Accepted'],
        ['scheduled', 'Scheduled'],
        ['in_progress', 'In progress'],
        ['pending_review', 'Pending review'],
        ['waiting_payment', 'Waiting payment'],
        ['completed', 'Completed'],
        ['cancelled', 'Cancelled'],
      ];
      const currentClientProperties = new Map();
      const currentClientRequests = new Map();
      let currentPermissions = [];

      const bindLogout = () => {
        if (!logoutButton || logoutButton.dataset.bound) {
          return;
        }

        logoutButton.dataset.bound = 'true';
        logoutButton.addEventListener('click', () => {
          logoutButton.setAttribute('aria-disabled', 'true');
          status.textContent = 'Signing out…';
        });
      };
      const bindRequestEstimateLink = () => {
        document.querySelectorAll('[data-request-estimate-link]').forEach((link) => {
          if (!link || link.dataset.bound) return;
          link.dataset.bound = 'true';
          link.addEventListener('click', (event) => {
            event.preventDefault();
            setDashboardView('client');
            document.querySelector('#submit-request')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            document.querySelector('[name="service"]')?.focus({ preventScroll: true });
          });
        });
      };
      const closeClientProfileModal = () => {
        setClientProfileEditing(false);
        setModalOpen(document.querySelector('[data-client-profile]'), false);
      };

      const bindClientProfileButton = () => {
        const modal = document.querySelector('[data-client-profile]');
        const openButtons = [...document.querySelectorAll('[data-client-profile-shortcut]')].filter(Boolean);
        if (!modal || !openButtons.length) return;
        openButtons.forEach((openButton) => {
          if (openButton.dataset.bound) return;
          openButton.dataset.bound = 'true';
          openButton.addEventListener('click', () => {
            setModalOpen(modal, true);
            document.querySelector('[data-client-profile-edit]')?.focus({ preventScroll: true });
          });
        });
        modal.addEventListener('click', (event) => {
          if (event.target === modal || event.target.closest('[data-client-profile-modal-close]')) closeClientProfileModal();
        });
      };

      const getUserDisplayName = (user = {}) => {
        const name = String(user.fullName || '').trim();
        if (name) return name;
        const emailName = String(user.email || '').split('@')[0].replace(/[._-]+/g, ' ').trim();
        return emailName ? emailName.replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'your account';
      };

      const formatMoney = (amountCents = 0) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((amountCents || 0) / 100);
      const formatDate = (value) => {
        if (!value) return '';
        const date = new Date(String(value).includes('T') ? value : `${value}T00:00:00`);
        return Number.isNaN(date.valueOf()) ? String(value) : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
      };
      const formatDateTime = (value) => {
        if (!value) return '';
        const date = new Date(value);
        return Number.isNaN(date.valueOf()) ? String(value) : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
      };
      const dashboardViewCopy = {
        admin: {
          eyebrow: 'Admin view',
          title: 'Admin tools for running the business.',
          description: 'Work orders, invoices, inventory, roles, users, and audit activity are visible in this view.',
        },
        client: {
          eyebrow: 'Client view',
          title: 'Client tools for managing a project.',
          description: 'Requests, quotes, client invoices, saved properties, and profile details are visible in this view.',
        },
        worker: {
          eyebrow: 'Worker view',
          title: 'Worker tools for assigned field jobs.',
          description: 'Assigned jobs, notes, task checklist details, and completion upload tools are visible in this view.',
        },
      };

      const updateDashboardViewChrome = (view) => {
        const copy = dashboardViewCopy[view] || dashboardViewCopy.client;
        const eyebrow = document.querySelector('[data-main-command-eyebrow]');
        const title = document.querySelector('[data-main-command-title]');
        const description = document.querySelector('[data-main-command-description]');
        const viewStatus = document.querySelector('[data-dashboard-view-status]');
        if (eyebrow) eyebrow.textContent = copy.eyebrow;
        if (title) title.textContent = copy.title;
        if (description) description.textContent = copy.description;
        if (viewStatus) {
          viewStatus.hidden = false;
          viewStatus.dataset.activeView = view;
          viewStatus.textContent = `Showing ${copy.eyebrow.toLowerCase()} tools.`;
        }
      };

      const setDashboardView = (view) => {
        dedupeDashboardSingletons();
        const fallbackView = availableDashboardViews[0] || 'client';
        const nextView = availableDashboardViews.includes(view) ? view : fallbackView;
        currentDashboardView = nextView;
        document.documentElement.dataset.dashboardView = nextView;
        updateDashboardViewChrome(nextView);

        document.querySelectorAll('[data-dashboard-section]').forEach((section) => {
          const views = (section.dataset.views || '').split(' ').filter(Boolean);
          const requiredPermission = section.dataset.permission;
          const hasRequiredPermission = !requiredPermission || Boolean(currentProfileUser?.permissions?.[requiredPermission]);
          section.hidden = !views.includes(nextView) || !hasRequiredPermission;
        });

        document.querySelectorAll('[data-view-button]').forEach((button) => {
          const isActive = button.dataset.viewButton === nextView;
          button.dataset.active = String(isActive);
          button.setAttribute('aria-pressed', String(isActive));
          button.classList.toggle('active-admin', isActive && nextView === 'admin');
          button.classList.toggle('active-client', isActive && nextView === 'client');
          button.classList.toggle('active-worker', isActive && nextView === 'worker');
        });

        if (currentProfileUser) configureMainDashboardActions(currentProfileUser, nextView);
      };
      window.taSetDashboardView = (view) => {
        window.taPendingDashboardView = view;
        setDashboardView(view);
      };

      const normalizeDashboardViewName = (view = '') => String(view || '').trim().toLowerCase();
      const getAvailableDashboardViews = (user = {}) => {
        const permissions = user.permissions || {};
        const normalizedRoles = (user.roles || []).map(normalizeDashboardViewName);
        const normalizedProvidedViews = (permissions.availableViews || user.roles || []).map(normalizeDashboardViewName);
        const roles = new Set(normalizedRoles);
        const views = new Set(normalizedProvidedViews);
        const canSwitchAllViews = Boolean(permissions.canSwitchDashboardView || permissions.canViewAdminTools || roles.has('admin'));
        if (canSwitchAllViews) {
          ['admin', 'client', 'worker'].forEach((view) => views.add(view));
        }
        if (permissions.canViewAdminTools) views.add('admin');
        if (permissions.canViewClientTools) views.add('client');
        if (permissions.canViewWorkerTools) views.add('worker');
        if (!views.size) views.add('client');
        return ['admin', 'client', 'worker'].filter((view) => views.has(view));
      };

      const configureDashboardForUser = (user) => {
        currentProfileUser = user;
        dedupeDashboardSingletons();
        const permissions = user.permissions || {};
        const availableViews = getAvailableDashboardViews(user);
        availableDashboardViews = availableViews;
        const switcher = document.querySelector('[data-view-switcher]');

        if (switcher) {
          switcher.hidden = availableViews.length <= 1;
          if (!switcher.dataset.boundViewSwitcher) {
            switcher.dataset.boundViewSwitcher = 'true';
            switcher.addEventListener('click', (event) => {
              const button = event.target.closest('[data-view-button]');
              if (!button || button.disabled) return;
              setDashboardView(button.dataset.viewButton);
            });
          }
          switcher.querySelectorAll('[data-view-button]').forEach((button) => {
            const canView = availableViews.includes(button.dataset.viewButton);
            button.hidden = !canView;
            button.disabled = !canView;
          });
        }

        const requestedView = normalizeDashboardViewName(window.taPendingDashboardView || currentDashboardView);
        const defaultView = normalizeDashboardViewName(permissions.defaultView);
        const preferredView = availableViews.includes(requestedView) ? requestedView : (availableViews.includes(defaultView) ? defaultView : availableViews[0]);
        configureMainDashboardActions(user, preferredView || 'client');
        setDashboardView(preferredView || 'client');
      };
      const configureSignedInDashboard = (user) => {
        try {
          configureDashboardForUser(user);
        } catch (configureError) {
          console.error('Dashboard command center setup failed; forcing main dashboard controls visible', configureError);
          const actionBar = document.querySelector('[data-main-dashboard-actions]');
          if (actionBar) {
            actionBar.hidden = false;
            actionBar.querySelectorAll('[data-main-action-permission]').forEach((action) => { action.hidden = false; });
          }
          const switcher = document.querySelector('[data-view-switcher]');
          if (switcher) {
            switcher.hidden = false;
            switcher.querySelectorAll('[data-view-button]').forEach((button) => { button.hidden = false; });
          }
        }
      };
      const renderRequestCard = (request, { admin = false } = {}) => {
        const className = admin ? 'admin-request' : 'client-request';
        const badgeClass = admin ? 'admin-request-badge' : 'client-request-badge';
        const metaClass = admin ? 'admin-request-meta' : 'client-request-meta';
        const title = admin
          ? `${escapeHtml(request.serviceType)} — ${escapeHtml(request.requesterName)}`
          : `${escapeHtml(request.serviceType)} request`;
        const contactMeta = admin
          ? `<span>${escapeHtml(request.requesterPhone || 'No phone')}</span><span>${escapeHtml(request.requesterEmail || 'No email')}</span>`
          : `<span>${escapeHtml(request.streetAddress || 'No street address')}</span>`;
        const scheduleMeta = [
          request.estimatedStartDate ? `Est. start: ${formatDate(request.estimatedStartDate)}` : '',
          request.completionDate ? `Completed: ${formatDate(request.completionDate)}` : '',
        ].filter(Boolean).map((item) => `<span>${escapeHtml(item)}</span>`).join('');

        return `
          <article class="${className}">
            <span class="${badgeClass}">${escapeHtml(request.status.replaceAll('_', ' '))}</span>
            <strong>${title}</strong>
            <div class="${metaClass}">
              <span>${escapeHtml(request.city || 'No city')}</span>
              ${contactMeta}
              <span>${escapeHtml(request.preferredTimeframe || 'Flexible')}</span>
              ${scheduleMeta}
            </div>
            <p>${escapeHtml(request.description)}</p>
            <div class="job-file-list" data-job-files="${escapeHtml(request.id)}" aria-live="polite"></div>
            ${admin ? `<div class="client-quote-actions"><button class="btn btn-primary" type="button" data-admin-open-request="${escapeHtml(request.id)}">Open request</button></div>` : `<div class="client-quote-actions"><button class="btn btn-soft" type="button" data-client-open-request="${escapeHtml(request.id)}">Open / edit request</button>${request.status === 'pending_review' ? `<button class="btn btn-primary" type="button" data-client-approve-completion="${escapeHtml(request.id)}">Approve completed work</button>` : ''}</div>`}
          </article>
        `;
      };

      const renderAdminWorkOrderSummary = (request, assignments = [], quote = null) => {
        const primaryAssignment = assignments[0] || null;
        const timeline = [
          { label: 'Request created', value: request.createdAt ? formatDate(String(request.createdAt).slice(0, 10)) : '' },
          { label: 'Quote status', value: quote ? (quote.status || 'draft').replaceAll('_', ' ') : 'Not quoted' },
          { label: 'Worker assignment', value: primaryAssignment ? `${primaryAssignment.workerName || primaryAssignment.workerEmail || 'Worker'} — ${(primaryAssignment.status || 'assigned').replaceAll('_', ' ')}` : 'Not assigned' },
          { label: 'Schedule', value: primaryAssignment?.scheduledDate ? formatDate(primaryAssignment.scheduledDate) : (request.estimatedStartDate ? `Target ${formatDate(request.estimatedStartDate)}` : 'Not scheduled') },
          { label: 'Completion', value: request.completionDate ? formatDate(request.completionDate) : (request.status === 'pending_review' ? 'Pending admin review' : 'Not complete') },
          { label: 'Billing', value: request.status === 'waiting_payment' ? 'Invoice waiting payment' : (request.status === 'completed' ? 'Completed' : 'Not ready') },
        ];

        const assignmentMeta = assignments.length
          ? `${assignments.length} assignment${assignments.length === 1 ? '' : 's'}${primaryAssignment?.scheduledDate ? ` • Next ${formatDate(primaryAssignment.scheduledDate)}` : ''}`
          : 'No assignments yet';
        const quoteMeta = quote
          ? `${quote.title || 'Saved quote'} • ${formatMoney(quote.amountCents)} • ${(quote.status || 'draft').replaceAll('_', ' ')}`
          : 'No quote saved';

        return `
          <article class="client-quote" data-admin-work-order-summary-card>
            <span class="client-quote-badge">${escapeHtml((request.status || 'new').replaceAll('_', ' '))}</span>
            <strong>Work order command center</strong>
            <div class="client-quote-meta">
              <span>WO ${escapeHtml(String(request.id || '').slice(0, 8) || 'new')}</span>
              <span>${escapeHtml(request.requesterName || 'Client')}</span>
              <span>${escapeHtml(request.requesterPhone || request.requesterEmail || 'No contact')}</span>
              <span>${escapeHtml(request.city || 'No city')}</span>
            </div>
            <p>${escapeHtml(request.description || 'No work description provided.')}</p>
            <div class="client-quote-meta">
              <span>${escapeHtml(quoteMeta)}</span>
              <span>${escapeHtml(assignmentMeta)}</span>
              <span>${escapeHtml(request.adminNotes ? 'Internal notes saved' : 'No internal notes')}</span>
            </div>
            <div class="client-quote-list">
              ${timeline.map((item) => `
                <article class="admin-assignment">
                  <span class="admin-assignment-badge">${escapeHtml(item.label)}</span>
                  <strong>${escapeHtml(item.value || '—')}</strong>
                </article>
              `).join('')}
            </div>
          </article>
        `;
      };

      const renderAdminPipelineSummary = (statusCounts = {}) => {
        const summaryOrder = [
          ['new', 'New'],
          ['in_progress', 'In progress'],
          ['needs_review', 'Needs review'],
          ['scheduled', 'Scheduled'],
          ['pending_review', 'Pending review'],
          ['waiting_payment', 'Waiting payment'],
        ];
        const cards = summaryOrder
          .map(([statusKey, label]) => ({ statusKey, label, count: Number(statusCounts[statusKey] || 0) }))
          .filter((item) => item.count > 0 || summaryOrder.some(([statusKey]) => statusKey === item.statusKey));

        return cards.map((item) => `
          <article class="admin-request" data-admin-filter-status="${escapeHtml(item.statusKey)}">
            <span class="admin-request-badge">${escapeHtml(item.label)}</span>
            <strong>${item.count}</strong>
            <p>${item.count === 1 ? 'work order' : 'work orders'}</p>
          </article>
        `).join('');
      };

      const getFilteredAdminRequests = () => {
        const search = (document.querySelector('[data-admin-request-search]')?.value || '').trim().toLowerCase();
        const statusFilter = document.querySelector('[data-admin-request-status-filter]')?.value || '';

        return [...currentAdminRequests.values()].filter((request) => {
          if (statusFilter && request.status !== statusFilter) return false;
          if (!search) return true;

          return [
            request.serviceType,
            request.requesterName,
            request.requesterEmail,
            request.requesterPhone,
            request.city,
            request.preferredTimeframe,
            request.description,
            request.adminNotes,
          ].some((value) => String(value || '').toLowerCase().includes(search));
        });
      };

      const applyAdminRequestFilters = () => {
        const inboxList = document.querySelector('[data-admin-request-list]');
        const inboxStatus = document.querySelector('[data-admin-requests-status]');
        if (!inboxList) return;

        const filteredRequests = getFilteredAdminRequests();
        inboxList.innerHTML = filteredRequests.length
          ? filteredRequests.map((request) => renderRequestCard(request, { admin: true })).join('')
          : renderDashboardEmptyState('No work orders match those filters.', 'Try broadening the scope, status, or search filters to load matching work orders.');

        if (inboxStatus) {
          const total = currentAdminRequests.size;
          const scopeLabel = currentAdminRequestScope === 'completed' ? 'completed' : currentAdminRequestScope === 'all' ? 'total' : 'active';
          inboxStatus.dataset.state = 'ready';
          inboxStatus.textContent = total
            ? `${filteredRequests.length} of ${total} ${scopeLabel} work order${total === 1 ? '' : 's'} shown.`
            : `No ${scopeLabel} job requests yet.`;
        }

        bindAdminRequestActions();
      };

      const bindAdminRequestFilters = () => {
        const scopeFilter = document.querySelector('[data-admin-request-scope-filter]');
        const search = document.querySelector('[data-admin-request-search]');
        const statusFilter = document.querySelector('[data-admin-request-status-filter]');
        if (scopeFilter && !scopeFilter.dataset.bound) {
          scopeFilter.dataset.bound = 'true';
          scopeFilter.addEventListener('change', () => loadAdminRequests());
        }
        [search, statusFilter].forEach((control) => {
          if (!control || control.dataset.bound) return;
          control.dataset.bound = 'true';
          control.addEventListener('input', applyAdminRequestFilters);
          control.addEventListener('change', applyAdminRequestFilters);
        });
      };

      const renderQuoteCard = (quote) => `
        <article class="client-quote">
          <span class="client-quote-badge">${escapeHtml(quote.status.replaceAll('_', ' '))}</span>
          <strong>${escapeHtml(quote.title)} — ${formatMoney(quote.amountCents)}</strong>
          <div class="client-quote-meta">
            <span>${escapeHtml(quote.jobRequest?.serviceType || 'No linked request')}</span>
            <span>${escapeHtml(quote.property?.street || 'No property')}</span>
            <span>${escapeHtml(quote.property?.city || 'No city')}</span>
          </div>
          ${quote.summary ? `<p>${escapeHtml(quote.summary)}</p>` : ''}
          ${['sent', 'viewed'].includes(quote.status) ? `<div class="client-quote-actions"><button class="btn btn-primary" type="button" data-quote-action="accept" data-quote-id="${escapeHtml(quote.id)}">Approve quote</button><button class="btn btn-danger" type="button" data-quote-action="decline" data-quote-id="${escapeHtml(quote.id)}">Deny quote</button></div>` : ''}
        </article>
      `;

      const getInvoiceDisplayTitle = (invoice = {}) => {
        const rawTitle = String(invoice.title || '').trim();
        if (rawTitle && rawTitle.toLowerCase() !== 'invoice & payment desk') return rawTitle;
        const service = invoice.jobRequest?.serviceType || 'Completed work';
        const client = invoice.client?.fullName || invoice.client?.email || '';
        return `${service}${client ? ` — ${client}` : ''} invoice`;
      };

      const renderClientInvoiceCard = (invoice) => `
        <article class="client-quote">
          <span class="client-quote-badge">${escapeHtml((invoice.status || 'open').replaceAll('_', ' '))}</span>
          <strong>${escapeHtml(getInvoiceDisplayTitle(invoice))} — ${formatMoney(invoice.amountCents)}</strong>
          <div class="client-quote-meta">
            <span>${escapeHtml(invoice.jobRequest?.serviceType || 'Completed work')}</span>
            <span>${escapeHtml(invoice.jobRequest?.streetAddress || 'No address')}</span>
            <span>${escapeHtml(invoice.jobRequest?.city || 'No city')}</span>
          </div>
          <p>Payment is waiting for admin confirmation. Paid invoices stay in your records but leave this dashboard.</p>
        </article>
      `;

      const renderAdminInvoiceSummary = (summary = {}) => {
        const open = Number(summary.open || 0);
        const paid = Number(summary.paid || 0);
        const amountDueCents = Number(summary.amountDueCents || 0);
        const amountCollectedCents = Number(summary.amountCollectedCents || 0);
        return `
          <article class="admin-request">
            <span class="admin-request-badge">Open invoices</span>
            <strong>${open}</strong>
            <p>${open === 1 ? 'invoice awaiting confirmation' : 'invoices awaiting confirmation'}</p>
          </article>
          <article class="admin-request">
            <span class="admin-request-badge">Amount due</span>
            <strong>${formatMoney(amountDueCents)}</strong>
            <p>Expected payment total</p>
          </article>
          <article class="admin-request">
            <span class="admin-request-badge">Paid invoices</span>
            <strong>${paid}</strong>
            <p>${formatMoney(amountCollectedCents)} confirmed in this view</p>
          </article>
        `;
      };

      const renderAdminInvoiceCard = (invoice) => {
        const amountDollars = (Number(invoice.amountCents || 0) / 100).toFixed(2);
        const hasCheckoutUrl = Boolean(invoice.provider?.checkoutUrl);
        const paymentDetails = invoice.payment ? `
          <p><strong>Payment confirmed</strong> ${formatMoney(invoice.payment.amountCents || invoice.amountCents)}${invoice.payment.method ? ` via ${escapeHtml(invoice.payment.method)}` : ''}${invoice.payment.confirmedAt ? ` on ${escapeHtml(formatDate(String(invoice.payment.confirmedAt).slice(0, 10)))}` : ''}</p>
          ${invoice.payment.reference ? `<p><strong>Reference</strong> ${escapeHtml(invoice.payment.reference)}</p>` : ''}
        ` : '';
        const linkActions = invoice.status === 'open' ? `
          <div class="client-quote-actions">
            ${hasCheckoutUrl
              ? `<a class="btn btn-soft" href="${escapeHtml(invoice.provider.checkoutUrl)}" target="_blank" rel="noopener">Open payment link</a>`
              : `<button class="btn btn-soft" type="button" data-admin-create-payment-link="${escapeHtml(invoice.id)}">Create payment link</button>`
            }
          </div>
        ` : '';
        return `
          <article class="client-quote">
            <span class="client-quote-badge">${escapeHtml((invoice.status || 'open').replaceAll('_', ' '))}</span>
            <strong>${escapeHtml(getInvoiceDisplayTitle(invoice))} — ${formatMoney(invoice.amountCents)}</strong>
            <div class="client-quote-meta">
              <span>${escapeHtml(invoice.client?.fullName || invoice.client?.email || 'Client')}</span>
              <span>${escapeHtml(invoice.jobRequest?.serviceType || 'Completed work')}</span>
              <span>${escapeHtml(invoice.jobRequest?.streetAddress || 'No address')}</span>
              <span>${escapeHtml(invoice.jobRequest?.city || 'No city')}</span>
            </div>
            ${paymentDetails}
            ${linkActions}
            ${invoice.status === 'open' ? `
              <form class="client-request-form" data-admin-payment-form data-admin-invoice-id="${escapeHtml(invoice.id)}">
                <div class="client-request-form-grid">
                  <label>Amount received
                    <input name="amountDollars" type="number" min="0" step="0.01" value="${amountDollars}" required>
                  </label>
                  <label>Payment method
                    <select name="method">
                      <option value="manual">Manual confirmation</option>
                      <option value="cash">Cash</option>
                      <option value="check">Check</option>
                      <option value="card">Card</option>
                      <option value="ach">ACH / bank transfer</option>
                    </select>
                  </label>
                  <label class="full">Reference / notes
                    <input name="reference" placeholder="Receipt, check, transaction, or internal note">
                  </label>
                </div>
                <div class="client-request-form-actions"><button class="btn btn-primary" type="submit" data-admin-confirm-payment="${escapeHtml(invoice.id)}">Confirm payment</button></div>
              </form>
            ` : ''}
          </article>
        `;
      };

      const getAdminInvoiceSearchText = (invoice) => [
        invoice.title,
        invoice.status,
        invoice.client?.fullName,
        invoice.client?.email,
        invoice.jobRequest?.serviceType,
        invoice.jobRequest?.streetAddress,
        invoice.jobRequest?.city,
        invoice.payment?.method,
        invoice.payment?.reference,
      ].filter(Boolean).join(' ').toLowerCase();

      const renderAdminInvoiceList = () => {
        const invoiceList = document.querySelector('[data-admin-invoice-list]');
        const search = document.querySelector('[data-admin-invoice-search]');
        if (!invoiceList) return;
        const term = (search?.value || '').trim().toLowerCase();
        const filteredInvoices = term
          ? currentAdminInvoices.filter((invoice) => getAdminInvoiceSearchText(invoice).includes(term))
          : currentAdminInvoices;
        invoiceList.innerHTML = filteredInvoices.length ? filteredInvoices.map(renderAdminInvoiceCard).join('') : '<p class="session-status">No invoices match this view.</p>';
      };

      const formatActivityType = (eventType = '') => eventType.replaceAll('_', ' ').replaceAll('.', ' · ');

      const getAdminActivityType = (event = {}) => {
        const eventType = event.eventType || '';
        const entityType = event.entityType || '';
        if (eventType.includes('quote') || entityType === 'quote') return 'quote';
        if (eventType.includes('payment') || eventType.includes('invoice') || ['invoice', 'payment'].includes(entityType)) return 'payment';
        if (eventType.includes('inventory') || entityType === 'inventory_item') return 'inventory';
        if (eventType.includes('user') || eventType.includes('role') || ['user', 'role'].includes(entityType)) return 'user';
        if (eventType.includes('job') || eventType.includes('request') || eventType.includes('worker_assignment') || ['job_request', 'worker_assignment'].includes(entityType)) return 'job';
        return 'other';
      };

      const getAdminActivitySearchText = (event = {}) => {
        const metadata = event.metadata || {};
        return [
          event.eventType,
          event.entityType,
          event.entityId,
          event.actor?.fullName,
          event.actor?.email,
          metadata.status,
          metadata.name,
          metadata.adjustmentType,
          metadata.quantityDelta,
          metadata.jobRequestId,
          metadata.invoiceId,
          metadata.paymentId,
          metadata.amountCents,
          metadata.email,
          metadata.serviceType,
        ].filter(Boolean).join(' ').toLowerCase();
      };

      const renderAdminActivityCard = (event) => {
        const metadata = event.metadata || {};
        const metadataSummary = [
          metadata.status ? `Status: ${metadata.status}` : '',
          metadata.name ? `Item: ${metadata.name}` : '',
          metadata.adjustmentType ? `Adjustment: ${metadata.adjustmentType}` : '',
          metadata.quantityDelta ? `Qty: ${metadata.quantityDelta}` : '',
          metadata.jobRequestId ? `Request: ${metadata.jobRequestId}` : '',
          metadata.invoiceId ? `Invoice: ${metadata.invoiceId}` : '',
          metadata.paymentId ? `Payment: ${metadata.paymentId}` : '',
          metadata.amountCents ? `Amount: ${formatMoney(metadata.amountCents)}` : '',
        ].filter(Boolean).join(' • ');
        return `
          <article class="admin-request">
            <span class="admin-request-badge">${escapeHtml(formatActivityType(event.eventType || 'activity'))}</span>
            <strong>${escapeHtml(event.actor?.fullName || event.actor?.email || 'System activity')}</strong>
            <div class="admin-request-meta">
              <span>${escapeHtml(event.entityType || 'record')}</span>
              <span>${escapeHtml(event.createdAt ? formatDate(String(event.createdAt).slice(0, 10)) : 'No date')}</span>
            </div>
            ${metadataSummary ? `<p>${escapeHtml(metadataSummary)}</p>` : ''}
          </article>
        `;
      };

      const renderAdminActivityList = () => {
        const activityList = document.querySelector('[data-admin-activity-list]');
        const activitySummary = document.querySelector('[data-admin-activity-summary]');
        const typeFilter = document.querySelector('[data-admin-activity-type-filter]')?.value || '';
        const search = (document.querySelector('[data-admin-activity-search]')?.value || '').trim().toLowerCase();
        if (!activityList) return;
        const filteredEvents = currentAdminActivity.filter((event) => {
          if (typeFilter && getAdminActivityType(event) !== typeFilter) return false;
          return !search || getAdminActivitySearchText(event).includes(search);
        });
        if (activitySummary) {
          activitySummary.innerHTML = renderAdminActivitySummaryCards(filteredEvents);
        }
        activityList.innerHTML = filteredEvents.length ? filteredEvents.map(renderAdminActivityCard).join('') : '<p class="session-status">No audit events match those filters.</p>';
      };

      const updateAdminActivityMoreButton = () => {
        const moreButton = document.querySelector('[data-admin-activity-more]');
        if (!moreButton) return;
        moreButton.hidden = !adminActivityHasNextPage;
        moreButton.textContent = adminActivityHasNextPage ? 'Load more activity' : 'All matching activity loaded';
      };

      const scheduleAdminActivityReload = () => {
        window.clearTimeout(adminActivityFilterTimer);
        adminActivityFilterTimer = window.setTimeout(() => loadAdminActivityFeed({ filtered: true }), 220);
      };

      const bindAdminActivityFilters = () => {
        const typeFilter = document.querySelector('[data-admin-activity-type-filter]');
        const search = document.querySelector('[data-admin-activity-search]');
        [typeFilter, search].forEach((control) => {
          if (!control || control.dataset.bound) return;
          control.dataset.bound = 'true';
          control.addEventListener('input', () => { renderAdminActivityList(); scheduleAdminActivityReload(); });
          control.addEventListener('change', () => { renderAdminActivityList(); scheduleAdminActivityReload(); });
        });
      };

      const renderAdminWorkOrderInventoryUsage = (usage = []) => {
        const usageList = document.querySelector('[data-admin-work-order-inventory-usage]');
        if (!usageList) return;
        usageList.innerHTML = usage.length ? usage.map((entry) => `
          <article class="admin-assignment">
            <span class="admin-assignment-badge">${escapeHtml(entry.adjustmentType || 'used')}</span>
            <strong>${escapeHtml(entry.item?.name || 'Inventory item')}</strong>
            <div class="admin-assignment-meta">
              <span>${escapeHtml(`${Math.abs(Number(entry.quantityDelta || 0))} ${entry.item?.unit || ''}`.trim())}</span>
              <span>${escapeHtml(entry.createdAt ? formatDate(String(entry.createdAt).slice(0, 10)) : 'No date')}</span>
              <span>${escapeHtml(entry.createdBy?.fullName || entry.createdBy?.email || 'Admin')}</span>
            </div>
            ${entry.note ? `<p>${escapeHtml(entry.note)}</p>` : ''}
          </article>
        `).join('') : '<p class="session-status">No inventory usage recorded for this work order yet.</p>';
      };

      const populateAdminWorkOrderInventoryItems = () => {
        const itemSelect = document.querySelector('[data-admin-work-order-inventory-item]');
        if (!itemSelect) return;
        const selectedItem = itemSelect.value;
        itemSelect.innerHTML = '<option value="">Select inventory item</option>' + currentAdminInventoryItems.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)} — ${Number(item.quantityOnHand || 0)} ${escapeHtml(item.unit || '')}${item.stockStatus === 'low' ? ' • low' : ''}</option>`).join('');
        itemSelect.value = currentAdminInventoryItems.some((item) => item.id === selectedItem) ? selectedItem : '';
      };

      const loadAdminWorkOrderInventory = async (jobRequestId) => {
        const panel = document.querySelector('[data-admin-work-order-inventory-panel]');
        const status = document.querySelector('[data-admin-work-order-inventory-status]');
        if (!panel) return;
        panel.hidden = !currentProfileUser?.permissions?.canManageInventory;
        if (panel.hidden) return;
        if (status) status.textContent = 'Loading inventory usage…';
        try {
          const response = await fetch(`/api/admin/inventory?jobRequestId=${encodeURIComponent(jobRequestId)}`, { headers: { accept: 'application/json' } });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || !result.ok) throw new Error(result.message || 'Inventory usage is not available.');
          currentAdminInventoryItems = result.items || [];
          currentAdminInventoryUsage = result.usage || [];
          populateAdminWorkOrderInventoryItems();
          renderAdminWorkOrderInventoryUsage(currentAdminInventoryUsage);
          if (status) status.textContent = currentAdminInventoryUsage.length ? `${currentAdminInventoryUsage.length} usage record${currentAdminInventoryUsage.length === 1 ? '' : 's'} loaded.` : 'No inventory usage recorded yet.';
        } catch (error) {
          currentAdminInventoryItems = [];
          currentAdminInventoryUsage = [];
          populateAdminWorkOrderInventoryItems();
          renderAdminWorkOrderInventoryUsage([]);
          if (status) status.textContent = error.message;
        }
      };

      const renderPropertyCard = (property) => `
        <article class="client-property">
          <span class="client-property-badge">${property.requestCount || 0} request${property.requestCount === 1 ? '' : 's'}</span>
          <strong>${escapeHtml(property.label || property.street || 'Property')}</strong>
          <div class="client-property-meta">
            <span>${escapeHtml(property.street || 'No street address')}</span>
            <span>${escapeHtml([property.city, property.state].filter(Boolean).join(', ') || 'No city')}</span>
            <span>${escapeHtml(property.postalCode || 'No ZIP')}</span>
          </div>
          ${property.accessNotes ? `<p>${escapeHtml(property.accessNotes)}</p>` : ''}
          <div class="client-quote-actions"><button class="btn btn-soft" type="button" data-client-edit-property="${escapeHtml(property.id)}">Edit property</button></div>
        </article>
      `;

      const renderInvoiceCard = (invoice, { admin = false } = {}) => {
        const className = admin ? 'admin-request' : 'client-quote';
        const badgeClass = admin ? 'admin-request-badge' : 'client-quote-badge';
        const metaClass = admin ? 'admin-request-meta' : 'client-quote-meta';
        const clientMeta = admin && invoice.client
          ? `<span>${escapeHtml(invoice.client.fullName || invoice.client.email || 'Client')}</span><span>${escapeHtml(invoice.client.phone || invoice.client.email || 'No contact')}</span>`
          : '';
        const dueMeta = invoice.dueAt ? `<span>Due ${escapeHtml(formatDate(invoice.dueAt))}</span>` : '<span>No due date</span>';
        const job = invoice.jobRequest || {};

        return `
          <article class="${className}">
            <span class="${badgeClass}">${escapeHtml((invoice.status || 'open').replaceAll('_', ' '))}</span>
            <strong>${escapeHtml(invoice.title || 'Invoice')} — ${formatMoney(invoice.amountCents)}</strong>
            <div class="${metaClass}">
              ${clientMeta}
              <span>${escapeHtml(job.serviceType || 'No linked request')}</span>
              <span>${escapeHtml(job.city || 'No city')}</span>
              ${dueMeta}
            </div>
            ${job.streetAddress ? `<p>${escapeHtml(job.streetAddress)}</p>` : ''}
            ${admin && invoice.status === 'open' ? `<div class="client-quote-actions"><button class="btn btn-primary" type="button" data-admin-confirm-payment="${escapeHtml(invoice.id)}" data-admin-payment-amount="${escapeHtml(invoice.amountCents || 0)}">Confirm payment</button></div>` : ''}
            ${!admin && invoice.status === 'open' ? `<div class="client-quote-actions">${invoice.provider?.checkoutUrl ? `<a class="btn btn-primary" href="${escapeHtml(invoice.provider.checkoutUrl)}" target="_self" rel="noopener" data-client-pay-invoice="${escapeHtml(invoice.provider.checkoutUrl)}">Pay invoice</a>` : `<button class="btn btn-soft" type="button" data-client-payment-link-pending data-client-invoice-id="${escapeHtml(invoice.id || '')}">Payment link pending</button>`}</div>` : ''}
          </article>
        `;
      };

      const renderAdminAssignmentCard = (assignment) => `
        <article class="admin-assignment">
          <span class="admin-assignment-badge">${escapeHtml((assignment.status || 'assigned').replaceAll('_', ' '))}</span>
          <strong>${escapeHtml(assignment.workerName || assignment.workerEmail || 'Assigned worker')}</strong>
          <div class="admin-assignment-meta">
            <span>${escapeHtml(assignment.scheduledDate ? formatDate(assignment.scheduledDate) : 'No scheduled date')}</span>
            <span>${escapeHtml([assignment.startTime, assignment.endTime].filter(Boolean).join('–') || 'No time window')}</span>
          </div>
          ${assignment.notes ? `<p>${escapeHtml(assignment.notes)}</p>` : ''}
          ${assignment.workerNotes ? `<p><strong>Worker notes</strong> ${escapeHtml(assignment.workerNotes)}</p>` : ''}
        </article>
      `;

      const renderAdminActivityEvent = (event) => {
        const actor = event.actor?.email || event.actor?.fullName || 'System event';
        const metadata = event.metadata && Object.keys(event.metadata).length
          ? `<p><strong>Details</strong> ${escapeHtml(JSON.stringify(event.metadata))}</p>`
          : '';

        return `
          <article class="admin-request">
            <span class="admin-request-badge">${escapeHtml(event.eventType || 'activity')}</span>
            <strong>${escapeHtml(event.entityType || 'event')}${event.entityId ? ` — ${escapeHtml(event.entityId)}` : ''}</strong>
            <div class="admin-request-meta">
              <span>${escapeHtml(actor)}</span>
              <span>${escapeHtml(formatDateTime(event.createdAt) || 'No timestamp')}</span>
            </div>
            ${metadata}
          </article>
        `;
      };

      const loadAdminActivity = async () => {
        const panel = document.querySelector('[data-admin-activity]');
        const panelStatus = document.querySelector('[data-admin-activity-status]');
        const activityList = document.querySelector('[data-admin-activity-list]');
        const activitySummary = document.querySelector('[data-admin-activity-summary]');
        const form = document.querySelector('[data-admin-activity-filter-form]');

        if (!panel || !panelStatus || !activityList) {
          return;
        }

        const params = new URLSearchParams();
        const eventType = form?.querySelector('[data-admin-activity-event-type]')?.value.trim() || '';
        const search = form?.querySelector('[data-admin-activity-search]')?.value.trim() || '';
        const limit = form?.querySelector('[data-admin-activity-limit]')?.value || '25';
        if (eventType) params.set('eventType', eventType);
        if (search) params.set('search', search);
        if (limit) params.set('limit', limit);

        try {
          panelStatus.dataset.state = 'loading';
          panelStatus.textContent = 'Loading admin activity…';
          const response = await fetch(`/api/admin/activity?${params.toString()}`, { headers: { accept: 'application/json' } });
          const result = await response.json().catch(() => ({}));

          if (!response.ok || !result.ok) {
            throw new Error(result.message || 'Admin activity is not available.');
          }

          const events = result.events || [];
          panelStatus.dataset.state = 'ready';
          panelStatus.textContent = events.length ? `${events.length} audit event${events.length === 1 ? '' : 's'} loaded.` : 'No audit activity matches those filters.';
          if (activitySummary) {
            activitySummary.innerHTML = renderAdminActivitySummaryCards(events);
          }
          activityList.innerHTML = events.length ? events.map(renderAdminActivityEvent).join('') : '<p class="session-status">No audit events found.</p>';
        } catch (error) {
          panelStatus.dataset.state = 'error';
          panelStatus.textContent = error.message;
        }
      };

      const bindAdminActivityActions = () => {
        const panel = document.querySelector('[data-admin-activity]');
        const form = document.querySelector('[data-admin-activity-filter-form]');
        if (!panel || !form || panel.dataset.activityActionsBound) return;
        panel.dataset.activityActionsBound = 'true';
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          loadAdminActivity();
        });
        panel.querySelector('[data-admin-activity-refresh]')?.addEventListener('click', () => loadAdminActivity());
      };

      const renderWorkerJobCard = (assignment) => {
        const completionPhotoNames = assignment.completionPhotoNames || [];
        const checklistItems = assignment.checklistItems || [];
        const activeEvidence = [
          assignment.workerNotes ? 'notes' : '',
          assignment.materialNotes ? 'materials' : '',
          checklistItems.length ? `${checklistItems.length} checklist` : '',
          completionPhotoNames.length ? `${completionPhotoNames.length} attachment${completionPhotoNames.length === 1 ? '' : 's'}` : '',
        ].filter(Boolean).join(' • ') || 'No worker evidence yet';

        return `
        <article class="worker-job">
          <span class="worker-job-badge">${escapeHtml((assignment.status || 'assigned').replaceAll('_', ' '))}</span>
          <strong>${escapeHtml(assignment.jobRequest?.serviceType || 'Assigned job')}</strong>
          <div class="worker-job-meta">
            <span>${escapeHtml(assignment.scheduledDate ? formatDate(assignment.scheduledDate) : 'No scheduled date')}</span>
            <span>${escapeHtml([assignment.startTime, assignment.endTime].filter(Boolean).join('–') || 'No time window')}</span>
            <span>${escapeHtml(assignment.jobRequest?.city || 'No city')}</span>
            <span>${escapeHtml(assignment.jobRequest?.property?.street || assignment.jobRequest?.streetAddress || 'No address')}</span>
          </div>
          <p>${escapeHtml(assignment.jobRequest?.description || 'No job details yet.')}</p>
          ${assignment.jobRequest?.property?.accessNotes ? `<p><strong>Access:</strong> ${escapeHtml(assignment.jobRequest.property.accessNotes)}</p>` : ''}
          ${assignment.notes ? `<p><strong>Admin notes:</strong> ${escapeHtml(assignment.notes)}</p>` : ''}
          <form class="client-request-form" data-worker-job-form data-assignment-id="${escapeHtml(assignment.id)}" data-job-request-id="${escapeHtml(assignment.jobRequest?.id || '')}">
            <div class="client-request-form-grid">
              <label>Status
                <select name="status">
                  <option value="assigned" ${assignment.status === 'assigned' ? 'selected' : ''}>Assigned</option>
                  <option value="accepted" ${assignment.status === 'accepted' ? 'selected' : ''}>Accepted</option>
                  <option value="in_progress" ${assignment.status === 'in_progress' ? 'selected' : ''}>In progress</option>
                  <option value="blocked" ${assignment.status === 'blocked' ? 'selected' : ''}>Blocked</option>
                  <option value="completed" ${assignment.status === 'completed' ? 'selected' : ''}>Completed</option>
                </select>
              </label>
              <label class="full">Worker notes
                <textarea name="workerNotes" placeholder="Progress, materials, blockers, completion notes.">${escapeHtml(assignment.workerNotes || '')}</textarea>
              </label>
              <label class="full client-request-attachments">Before photos / files
                <input name="beforeFiles" type="file" accept="image/*,.pdf,.heic,.heif" multiple data-worker-before-files>
                <small>Attach site condition photos, measurements, or reference documents before work starts.</small>
                <span class="client-request-attachment-list" data-worker-before-file-list>No files selected yet.</span>
              </label>
              <label class="full client-request-attachments">After photos / completion files
                <input name="afterFiles" type="file" accept="image/*,.pdf,.heic,.heif" multiple data-worker-after-files>
                <small>Attach after photos, completion proof, or documents for admin/client review.</small>
                <span class="client-request-attachment-list" data-worker-after-file-list>No files selected yet.</span>
              </label>
            </div>
            <div class="client-request-form-actions"><button class="btn btn-primary" type="submit">Save job update</button><span data-worker-job-form-status aria-live="polite"></span></div>
          </form>
          <div class="job-file-list" data-job-files="${escapeHtml(assignment.jobRequest?.id || '')}" aria-live="polite"></div>
        </article>
      `;
      };

      const setClientProfileEditing = (isEditing) => {
        document.querySelectorAll('[data-client-profile-editable]').forEach((field) => {
          field.disabled = !isEditing;
        });
        const editButton = document.querySelector('[data-client-profile-edit]');
        const saveButton = document.querySelector('[data-client-profile-save]');
        const cancelButton = document.querySelector('[data-client-profile-cancel]');
        if (editButton) editButton.hidden = isEditing;
        if (saveButton) saveButton.hidden = !isEditing;
        if (cancelButton) cancelButton.hidden = !isEditing;
      };

      const renderClientProfile = (user) => {
        if (!user) return;
        currentProfileUser = user;
        const setValue = (selector, value) => {
          const field = document.querySelector(selector);
          if (field) field.value = value || '';
        };
        setValue('[data-client-profile-email]', user.email);
        setValue('[data-client-profile-name]', user.fullName);
        setValue('[data-client-profile-phone]', user.phone);
        setValue('[data-client-profile-secondary-phone]', user.secondaryPhone);
        setValue('[data-client-profile-company]', user.companyName);
        setValue('[data-client-profile-mailing-address]', user.mailingAddress);
        setClientProfileEditing(false);
        const status = document.querySelector('[data-client-profile-status]');
        if (status) {
          status.dataset.state = 'ready';
          status.textContent = 'Profile loaded. Choose Edit profile to make changes.';
        }
      };

      const saveClientProfile = async (form) => {
        const formStatus = document.querySelector('[data-client-profile-form-status]');
        const payload = Object.fromEntries(new FormData(form).entries());
        if (formStatus) formStatus.textContent = 'Saving profile…';
        const response = await fetch('/api/me', {
          method: 'PATCH',
          headers: { accept: 'application/json', 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) throw new Error(result.message || 'Could not save profile.');
        renderClientProfile(result.user);
        document.querySelector('[data-client-profile-edit]')?.focus({ preventScroll: true });
        if (formStatus) formStatus.textContent = 'Profile saved.';
      };

      const bindClientProfileForm = () => {
        const form = document.querySelector('[data-client-profile-form]');
        const editButton = document.querySelector('[data-client-profile-edit]');
        const cancelButton = document.querySelector('[data-client-profile-cancel]');
        if (!form || form.dataset.bound) return;
        form.dataset.bound = 'true';
        editButton?.addEventListener('click', () => {
          setClientProfileEditing(true);
          document.querySelector('[data-client-profile-name]')?.focus({ preventScroll: true });
        });
        cancelButton?.addEventListener('click', () => {
          if (currentProfileUser) renderClientProfile(currentProfileUser);
          document.querySelector('[data-client-profile-edit]')?.focus({ preventScroll: true });
        });
        form.addEventListener('submit', async (event) => {
          event.preventDefault();
          const formStatus = document.querySelector('[data-client-profile-form-status]');
          try {
            await saveClientProfile(form);
          } catch (error) {
            if (formStatus) formStatus.textContent = error.message;
          }
        });
      };

      const renderDashboardEmptyState = (title, message) => `
        <div class="dashboard-empty-state">
          <strong>${escapeHtml(title)}</strong>
          <p>${escapeHtml(message)}</p>
        </div>
      `;

      const renderClientData = (result) => {
        const panelStatus = document.querySelector('[data-client-requests-status]');
        const requestList = document.querySelector('[data-client-request-list]');
        const propertyList = document.querySelector('[data-client-property-list]');
        const propertyStatus = document.querySelector('[data-client-properties-status]');
        const propertySelect = document.querySelector('[data-client-property-select]');
        const openMetric = document.querySelector('[data-open-requests-metric]');
        const propertiesMetric = document.querySelector('[data-properties-metric]');
        const requests = result.requests || [];
        const properties = result.properties || [];
        currentClientProperties.clear();
        currentClientRequests.clear();
        properties.forEach((property) => currentClientProperties.set(property.id, property));
        requests.forEach((request) => currentClientRequests.set(request.id, request));

        panelStatus.dataset.state = 'ready';
        panelStatus.textContent = requests.length ? `${requests.length} request${requests.length === 1 ? '' : 's'} loaded.` : 'No requests are connected to this account yet.';
        if (propertyStatus) {
          propertyStatus.dataset.state = 'ready';
          propertyStatus.textContent = properties.length ? `${properties.length} propert${properties.length === 1 ? 'y' : 'ies'} loaded.` : 'No saved properties yet.';
        }

        if (openMetric && result.summary) {
          openMetric.textContent = String(result.summary.active || 0);
        }

        if (propertiesMetric && result.summary) {
          propertiesMetric.textContent = String(result.summary.properties || 0);
        }

        requestList.innerHTML = requests.length
          ? requests.map((request) => renderRequestCard(request)).join('')
          : renderDashboardEmptyState('No job requests yet.', 'Use the highlighted request form above to send T&A Contracting your first estimate request.');
        propertyList.innerHTML = properties.map((property) => renderPropertyCard(property)).join('');

        if (propertySelect) {
          const selectedValue = propertySelect.value;
          propertySelect.innerHTML = '<option value="">New property / enter address below</option>' + properties.map((property) => `<option value="${escapeHtml(property.id)}">${escapeHtml(property.label || property.street || 'Property')} — ${escapeHtml(property.city || 'No city')}</option>`).join('');
          propertySelect.value = properties.some((property) => property.id === selectedValue) ? selectedValue : '';
          fillClientPropertyFields(propertySelect.value, { overwrite: false });
        }
      };

      const renderClientQuoteData = (result) => {
        const panelStatus = document.querySelector('[data-client-quotes-status]');
        const quoteList = document.querySelector('[data-client-quote-list]');
        const quotesMetric = document.querySelector('[data-quotes-metric]');
        const quotes = result.quotes || [];

        if (!panelStatus || !quoteList) {
          return;
        }

        panelStatus.dataset.state = 'ready';
        panelStatus.textContent = quotes.length ? `${quotes.length} quote${quotes.length === 1 ? '' : 's'} loaded.` : 'No quotes are connected to this account yet.';

        if (quotesMetric && result.summary) {
          quotesMetric.textContent = String(result.summary.waiting || 0);
        }

        quoteList.innerHTML = quotes.length
          ? quotes.map((quote) => renderQuoteCard(quote)).join('')
          : renderDashboardEmptyState('No quotes ready yet.', 'Quotes connected to your account will appear here with review and approval controls.');
      };

      const decideQuote = async (quoteId, action) => {
        const panelStatus = document.querySelector('[data-client-quotes-status]');

        if (panelStatus) {
          panelStatus.textContent = action === 'accept' ? 'Approving quote…' : 'Denying quote…';
        }

        const response = await fetch('/api/client/quotes', {
          method: 'PATCH',
          headers: { accept: 'application/json', 'content-type': 'application/json' },
          body: JSON.stringify({ quoteId, action }),
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.ok) {
          throw new Error(result.message || 'We could not update that quote.');
        }

        await loadClientQuotes();
      };

      const bindQuoteDecisionActions = () => {
        const quotePanel = document.querySelector('[data-client-quotes]');

        if (!quotePanel || quotePanel.dataset.bound) {
          return;
        }

        quotePanel.dataset.bound = 'true';
        quotePanel.addEventListener('click', async (event) => {
          const button = event.target.closest('[data-quote-action]');

          if (!button) {
            return;
          }

          button.disabled = true;

          try {
            await decideQuote(button.dataset.quoteId, button.dataset.quoteAction);
          } catch (error) {
            const panelStatus = document.querySelector('[data-client-quotes-status]');

            if (panelStatus) {
              panelStatus.dataset.state = 'error';
              panelStatus.textContent = error.message;
            }
          } finally {
            button.disabled = false;
          }
        });
      };

      const loadClientQuotes = async () => {
        const panel = document.querySelector('[data-client-quotes]');
        const panelStatus = document.querySelector('[data-client-quotes-status]');
        const quoteList = document.querySelector('[data-client-quote-list]');

        if (!panel || !panelStatus || !quoteList) {
          return;
        }

        try {
          const response = await fetch('/api/client/quotes', { headers: { accept: 'application/json' } });
          const result = await response.json().catch(() => ({}));

          if (!response.ok || !result.ok) {
            throw new Error(result.message || 'Your quote list is not available.');
          }

          renderClientQuoteData(result);
        } catch (error) {
          panelStatus.dataset.state = 'error';
          panelStatus.textContent = error.message;
        }
      };

      const renderClientInvoiceData = (result) => {
        const panelStatus = document.querySelector('[data-client-invoices-status]');
        const invoiceList = document.querySelector('[data-client-invoice-list]');
        const invoices = result.invoices || [];
        const amountDue = result.summary?.amountDueCents || 0;

        if (panelStatus) {
          panelStatus.dataset.state = 'ready';
          panelStatus.textContent = invoices.length ? `${invoices.length} invoice${invoices.length === 1 ? '' : 's'} loaded. Balance due: ${formatMoney(amountDue)}.` : 'No open invoices right now.';
        }
        if (invoiceList) {
          invoiceList.innerHTML = invoices.length
            ? invoices.map((invoice) => renderInvoiceCard(invoice)).join('')
            : renderDashboardEmptyState('No open invoices yet.', 'When an invoice is ready for one of your jobs, the balance and payment status will appear here.');
          window.taInvoiceActions?.attachClientInvoiceActions(invoiceList, { renderClientInvoiceData });
        }
      };

      const loadClientInvoices = async () => {
        const panel = document.querySelector('[data-client-invoices]');
        const panelStatus = document.querySelector('[data-client-invoices-status]');
        const invoiceList = document.querySelector('[data-client-invoice-list]');

        if (!panel || !panelStatus || !invoiceList) {
          return;
        }

        try {
          const response = await fetch('/api/client/invoices', { headers: { accept: 'application/json' } });
          const result = await response.json().catch(() => ({}));

          if (!response.ok || !result.ok) {
            throw new Error(result.message || 'Your invoices are not available.');
          }

          renderClientInvoiceData(result);
        } catch (error) {
          panelStatus.dataset.state = 'error';
          panelStatus.textContent = error.message;
        }
      };

      const loadClientRequests = async () => {
        const panel = document.querySelector('[data-client-requests]');
        const panelStatus = document.querySelector('[data-client-requests-status]');
        const requestList = document.querySelector('[data-client-request-list]');
        const propertyPanel = document.querySelector('[data-client-properties]');
        const propertyList = document.querySelector('[data-client-property-list]');

        if (!panel || !panelStatus || !requestList || !propertyPanel || !propertyList) {
          return;
        }

        try {
          const response = await fetch('/api/client/job-requests', { headers: { accept: 'application/json' } });
          const result = await response.json().catch(() => ({}));

          if (!response.ok || !result.ok) {
            throw new Error(result.message || 'Your request list is not available.');
          }

          renderClientData(result);
        } catch (error) {
          panelStatus.dataset.state = 'error';
          panelStatus.textContent = error.message;
        }
      };

      const fillClientPropertyFields = (propertyId, { overwrite = true } = {}) => {
        const property = currentClientProperties.get(propertyId);
        const fields = {
          streetAddress: document.querySelector('[data-client-property-street]'),
          city: document.querySelector('[data-client-property-city]'),
          label: document.querySelector('[data-client-property-label]'),
          accessNotes: document.querySelector('[data-client-property-access-notes]'),
        };

        if (!property) {
          if (overwrite) Object.values(fields).forEach((field) => { if (field) field.value = ''; });
          return;
        }

        const values = {
          streetAddress: property.street || '',
          city: property.city || '',
          label: property.label || '',
          accessNotes: property.accessNotes || '',
        };

        Object.entries(fields).forEach(([key, field]) => {
          if (field && (overwrite || !field.value)) field.value = values[key];
        });
      };

      const closeClientPropertyModal = () => setModalOpen(document.querySelector('[data-client-property-modal]'), false);

      const openClientPropertyModal = (propertyId) => {
        const property = currentClientProperties.get(propertyId);
        if (!property) return;
        document.querySelector('[data-client-property-edit-id]').value = property.id;
        document.querySelector('[data-client-property-edit-label]').value = property.label || '';
        document.querySelector('[data-client-property-edit-street]').value = property.street || '';
        document.querySelector('[data-client-property-edit-city]').value = property.city || '';
        document.querySelector('[data-client-property-edit-access-notes]').value = property.accessNotes || '';
        document.querySelector('[data-client-property-modal-title]').textContent = `Edit property: ${property.label || property.street || 'Property'}`;
        const formStatus = document.querySelector('[data-client-property-form-status]');
        if (formStatus) formStatus.textContent = '';
        setModalOpen(document.querySelector('[data-client-property-modal]'), true);
        document.querySelector('[data-client-property-edit-street]')?.focus();
      };

      const saveClientProperty = async () => {
        const formStatus = document.querySelector('[data-client-property-form-status]');
        const payload = {
          propertyId: document.querySelector('[data-client-property-edit-id]')?.value || '',
          streetAddress: document.querySelector('[data-client-property-edit-street]')?.value || '',
          city: document.querySelector('[data-client-property-edit-city]')?.value || '',
          label: document.querySelector('[data-client-property-edit-label]')?.value || '',
          accessNotes: document.querySelector('[data-client-property-edit-access-notes]')?.value || '',
        };

        if (formStatus) formStatus.textContent = 'Saving property details…';

        const response = await fetch('/api/client/job-requests', {
          method: 'PATCH',
          headers: { accept: 'application/json', 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.ok) {
          throw new Error(result.message || 'We could not update that property.');
        }

        closeClientPropertyModal();
        const propertyStatus = document.querySelector('[data-client-properties-status]');
        if (propertyStatus) propertyStatus.textContent = 'Property updated.';
        await loadClientRequests();
      };

      const bindClientPropertyActions = () => {
        const panel = document.querySelector('[data-client-properties]');
        const form = document.querySelector('[data-client-property-form]');
        const modal = document.querySelector('[data-client-property-modal]');

        if (!panel || panel.dataset.bound) return;
        panel.dataset.bound = 'true';
        panel.addEventListener('click', (event) => {
          const button = event.target.closest('[data-client-edit-property]');
          if (!button) return;
          openClientPropertyModal(button.dataset.clientEditProperty);
        });
        modal?.addEventListener('click', (event) => {
          if (event.target === modal || event.target.closest('[data-client-property-modal-close]')) closeClientPropertyModal();
        });
        form?.addEventListener('submit', async (event) => {
          event.preventDefault();
          const formStatus = document.querySelector('[data-client-property-form-status]');
          try {
            await saveClientProperty();
          } catch (error) {
            if (formStatus) formStatus.textContent = error.message;
          }
        });
      };

      const closeClientRequestModal = () => setModalOpen(document.querySelector('[data-client-request-modal]'), false);

      const openClientRequestModal = (requestId) => {
        const request = currentClientRequests.get(requestId);
        if (!request) return;
        document.querySelector('[data-client-request-edit-id]').value = request.id;
        document.querySelector('[data-client-request-edit-service]').value = request.serviceType || '';
        document.querySelector('[data-client-request-edit-date]').value = request.preferredTimeframe || '';
        document.querySelector('[data-client-request-edit-description]').value = request.description || '';
        document.querySelector('[data-client-request-edit-additional]').value = '';
        document.querySelector('[data-client-request-modal-title]').textContent = `Edit request: ${request.serviceType || 'Job request'}`;
        const editStatus = document.querySelector('[data-client-request-edit-status]');
        if (editStatus) editStatus.textContent = '';
        setModalOpen(document.querySelector('[data-client-request-modal]'), true);
        document.querySelector('[data-client-request-edit-service]')?.focus();
      };

      const deleteClientRequest = async (requestId) => {
        const editStatus = document.querySelector('[data-client-request-edit-status]');
        const panelStatus = document.querySelector('[data-client-requests-status]');
        const confirmation = window.prompt('This permanently deletes your open request. Type DELETE to continue.');
        if (confirmation !== 'DELETE') {
          if (editStatus) editStatus.textContent = 'Delete cancelled.';
          return;
        }
        if (editStatus) editStatus.textContent = 'Deleting request…';
        const response = await fetch('/api/client/job-requests', {
          method: 'DELETE',
          headers: { accept: 'application/json', 'content-type': 'application/json' },
          body: JSON.stringify({ jobRequestId: requestId, confirmation }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) throw new Error(result.message || 'We could not delete that request.');
        closeClientRequestModal();
        if (panelStatus) panelStatus.textContent = 'Request permanently deleted.';
        await loadClientRequests();
        await loadClientQuotes();
      };

      const saveClientRequestUpdate = async (form) => {
        const editStatus = document.querySelector('[data-client-request-edit-status]');
        const payload = Object.fromEntries(new FormData(form).entries());
        payload.updateType = payload.requestedDate ? 'date_change_or_details' : 'client_edit';
        const baseDescription = payload.description || '';
        const extraInfo = payload.additionalInfo ? `

Additional info from client: ${payload.additionalInfo}` : '';
        payload.description = `${baseDescription}${extraInfo}`.trim();
        if (editStatus) editStatus.textContent = 'Saving request update…';
        const response = await fetch('/api/client/job-requests', {
          method: 'PATCH',
          headers: { accept: 'application/json', 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) throw new Error(result.message || 'We could not update that request.');
        closeClientRequestModal();
        const panelStatus = document.querySelector('[data-client-requests-status]');
        if (panelStatus) panelStatus.textContent = 'Request updated.';
        await loadClientRequests();
      };

      const bindClientRequestEditActions = () => {
        const panel = document.querySelector('[data-client-requests]');
        const modal = document.querySelector('[data-client-request-modal]');
        const form = document.querySelector('[data-client-request-edit-form]');
        if (!panel || panel.dataset.editActionsBound) return;
        panel.dataset.editActionsBound = 'true';
        panel.addEventListener('click', (event) => {
          const approveButton = event.target.closest('[data-client-approve-completion]');
          if (approveButton) {
            approveButton.disabled = true;
            approveClientCompletion(approveButton.dataset.clientApproveCompletion).catch((error) => {
              const panelStatus = document.querySelector('[data-client-requests-status]');
              if (panelStatus) panelStatus.textContent = error.message;
            }).finally(() => { approveButton.disabled = false; });
            return;
          }
          const button = event.target.closest('[data-client-open-request]');
          if (!button) return;
          openClientRequestModal(button.dataset.clientOpenRequest);
        });
        modal?.addEventListener('click', (event) => {
          if (event.target === modal || event.target.closest('[data-client-request-modal-close]')) closeClientRequestModal();
        });
        form?.addEventListener('submit', async (event) => {
          event.preventDefault();
          const editStatus = document.querySelector('[data-client-request-edit-status]');
          try {
            await saveClientRequestUpdate(form);
          } catch (error) {
            if (editStatus) editStatus.textContent = error.message;
          }
        });
        modal?.querySelector('[data-client-request-delete]')?.addEventListener('click', async () => {
          const editStatus = document.querySelector('[data-client-request-edit-status]');
          try {
            await deleteClientRequest(document.querySelector('[data-client-request-edit-id]').value);
          } catch (error) {
            if (editStatus) editStatus.textContent = error.message;
          }
        });
      };

      const approveClientCompletion = async (requestId) => {
        const panelStatus = document.querySelector('[data-client-requests-status]');
        if (panelStatus) panelStatus.textContent = 'Approving completed work…';
        const response = await fetch('/api/client/job-requests', {
          method: 'PATCH',
          headers: { accept: 'application/json', 'content-type': 'application/json' },
          body: JSON.stringify({ jobRequestId: requestId, completionAction: 'approve_completed' }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) throw new Error(result.message || 'We could not approve the completed work.');
        await loadClientRequests();
      };


      const fileMetadataFromInput = (input, category) => [...(input?.files || [])].map((file) => ({
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        category,
      }));

      const renderJobFiles = (jobRequestId, files = []) => {
        document.querySelectorAll(`[data-job-files="${CSS.escape(jobRequestId)}"]`).forEach((list) => {
          list.innerHTML = files.length ? files.map((file) => `
            <article>
              <strong>${escapeHtml(file.fileName || 'Attached file')}</strong>
              <div class="client-request-meta"><span>${escapeHtml(file.mimeType || 'file')}</span><span>${escapeHtml(`${Math.ceil((Number(file.sizeBytes) || 0) / 1024)} KB`)}</span></div>
            </article>
          `).join('') : '<p class="session-status">No files attached yet.</p>';
        });
      };

      const loadJobFiles = async (jobRequestId) => {
        if (!jobRequestId) return [];
        const response = await fetch(`/api/job-files?jobRequestId=${encodeURIComponent(jobRequestId)}`, { headers: { accept: 'application/json' } });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) throw new Error(result.message || 'Files are not available.');
        renderJobFiles(jobRequestId, result.files || []);
        return result.files || [];
      };

      const refreshVisibleJobFiles = () => {
        const jobIds = [...new Set([...document.querySelectorAll('[data-job-files]')].map((list) => list.dataset.jobFiles).filter(Boolean))];
        jobIds.forEach((jobId) => loadJobFiles(jobId).catch(() => renderJobFiles(jobId, [])));
      };

      const uploadJobFiles = async ({ jobRequestId, files }) => {
        if (!jobRequestId || !files?.length) return [];
        const response = await fetch('/api/job-files', {
          method: 'POST',
          headers: { accept: 'application/json', 'content-type': 'application/json' },
          body: JSON.stringify({ jobRequestId, files }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) throw new Error(result.message || 'Files could not be attached.');
        await loadJobFiles(jobRequestId);
        return result.files || [];
      };

      const summarizeClientRequestAttachments = (formData) => {
        const files = formData.getAll('attachments').filter((file) => file && file.name);
        return files.map((file) => `${file.name} (${Math.ceil((file.size || 0) / 1024)} KB)`).join('\n');
      };

      const updateClientRequestAttachmentList = (input) => {
        const list = document.querySelector('[data-client-request-attachment-list]');
        const files = [...(input?.files || [])];
        if (!list) return;
        list.textContent = files.length ? files.map((file) => file.name).join(', ') : 'No files selected yet.';
      };

      const bindClientRequestForm = () => {
        const form = document.querySelector('[data-client-request-form]');
        const formStatus = document.querySelector('[data-client-request-form-status]');

        if (!form || form.dataset.bound) {
          return;
        }

        form.dataset.bound = 'true';
        form.querySelector('[data-client-property-select]')?.addEventListener('change', (event) => fillClientPropertyFields(event.target.value));
        form.querySelector('[data-client-request-attachments]')?.addEventListener('change', (event) => updateClientRequestAttachmentList(event.target));
        form.addEventListener('submit', async (event) => {
          event.preventDefault();
          const formData = new FormData(form);
          const attachmentFiles = fileMetadataFromInput(form.querySelector('[data-client-request-attachments]'), 'client_request');
          const payload = Object.fromEntries([...formData.entries()].filter(([, value]) => !(value && typeof value === 'object' && 'name' in value)));
          payload.attachmentNames = summarizeClientRequestAttachments(formData);
          formStatus.textContent = 'Saving…';

          try {
            const response = await fetch('/api/client/job-requests', {
              method: 'POST',
              headers: { accept: 'application/json', 'content-type': 'application/json' },
              body: JSON.stringify(payload),
            });
            const result = await response.json().catch(() => ({}));

            if (!response.ok || !result.ok) {
              throw new Error(result.message || 'We could not save that request.');
            }

            if (attachmentFiles.length) {
              formStatus.textContent = 'Request saved. Attaching files…';
              await uploadJobFiles({ jobRequestId: result.id, files: attachmentFiles });
            }
            form.reset();
            updateClientRequestAttachmentList(form.querySelector('[data-client-request-attachments]'));
            formStatus.textContent = attachmentFiles.length ? `Request saved with ${attachmentFiles.length} file${attachmentFiles.length === 1 ? '' : 's'}.` : 'Request saved.';
            await loadClientRequests();
            await loadClientQuotes();
          } catch (error) {
            formStatus.textContent = error.message;
          }
        });
      };

      const selectAdminRequest = (requestId) => {
        const request = currentAdminRequests.get(requestId);
        const detail = document.querySelector('[data-admin-request-detail]');
        const detailTitle = document.querySelector('[data-admin-detail-title]');
        const detailSummary = document.querySelector('[data-admin-detail-summary]');
        const statusRequestId = document.querySelector('[data-admin-status-request-id]');
        const quoteRequestId = document.querySelector('[data-admin-quote-request-id]');
        const assignmentRequestId = document.querySelector('[data-admin-assignment-request-id]');
        const statusSelect = document.querySelector('[data-admin-status-select]');
        const adminNotes = document.querySelector('[data-admin-notes]');
        const estimatedStartDate = document.querySelector('[data-admin-estimated-start-date]');
        const completionDate = document.querySelector('[data-admin-completion-date]');
        const quoteTitle = document.querySelector('[data-admin-quote-title]');
        const quoteId = document.querySelector('[data-admin-quote-id]');
        const quoteAmount = document.querySelector('[data-admin-quote-form] [name="amount"]');
        const quoteSummary = document.querySelector('[data-admin-quote-form] [name="summary"]');
        const quoteSourcingNotes = document.querySelector('[data-admin-quote-sourcing-notes]');
        const quoteSourcingLinks = document.querySelector('[data-admin-quote-sourcing-links]');
        const quoteSend = document.querySelector('[data-admin-quote-form] [name="sendToClient"]');
        const quoteFormTitle = document.querySelector('[data-admin-quote-form-title]');
        const quoteSubmit = document.querySelector('[data-admin-quote-submit]');
        const assignmentDate = document.querySelector('[data-admin-assignment-date]');
        const assignmentList = document.querySelector('[data-admin-assignment-list]');
        const inventoryRequestId = document.querySelector('[data-admin-inventory-request-id]');
        const inventoryForm = document.querySelector('[data-admin-work-order-inventory-form]');
        const workOrderSummary = document.querySelector('[data-admin-work-order-summary]');
        const closeButton = document.querySelector('[data-admin-detail-close]');

        if (!request || !detail) {
          return;
        }

        detail.hidden = false;
        document.body.style.overflow = 'hidden';
        detailTitle.textContent = `${request.serviceType || 'Request'} — ${request.requesterName || 'Client'}`;
        detailSummary.textContent = `${request.city || 'No city'} • ${request.requesterPhone || 'No phone'} • ${request.requesterEmail || 'No email'} • ${request.preferredTimeframe || 'Flexible'}`;

        if (statusRequestId) statusRequestId.value = request.id;
        if (quoteRequestId) quoteRequestId.value = request.id;
        if (assignmentRequestId) assignmentRequestId.value = request.id;
        if (inventoryRequestId) inventoryRequestId.value = request.id;
        if (inventoryForm) inventoryForm.reset();
        if (statusSelect) statusSelect.value = request.status;
        if (estimatedStartDate) estimatedStartDate.value = request.estimatedStartDate || '';
        if (completionDate) completionDate.value = request.completionDate || '';
        if (adminNotes) adminNotes.value = request.adminNotes || '';
        const savedQuote = [...currentAdminQuotes.values()].find((quote) => quote.jobRequestId === request.id);
        if (quoteId) quoteId.value = savedQuote?.id || '';
        if (quoteTitle) quoteTitle.value = savedQuote?.title || `${request.serviceType || 'Service'} quote`;
        if (quoteAmount) quoteAmount.value = savedQuote ? String((savedQuote.amountCents || 0) / 100) : '';
        if (quoteSummary) quoteSummary.value = savedQuote?.summary || '';
        if (quoteSourcingNotes) quoteSourcingNotes.value = '';
        if (quoteSourcingLinks) quoteSourcingLinks.innerHTML = '';
        if (quoteSend) quoteSend.checked = ['sent', 'viewed', 'accepted'].includes(savedQuote?.status || '');
        if (quoteFormTitle) quoteFormTitle.textContent = savedQuote ? 'Edit saved quote' : 'Create quote';
        if (quoteSubmit) quoteSubmit.textContent = savedQuote ? 'Save quote' : 'Create quote';
        if (assignmentDate) assignmentDate.value = request.estimatedStartDate || '';
        const requestAssignments = [...currentAdminAssignments.values()].filter((assignment) => assignment.jobRequestId === request.id);
        if (workOrderSummary) {
          workOrderSummary.innerHTML = renderAdminWorkOrderSummary(request, requestAssignments, savedQuote);
        }
        if (assignmentList) {
          assignmentList.innerHTML = requestAssignments.length ? requestAssignments.map(renderAdminAssignmentCard).join('') : '<p class="session-status">No workers assigned yet.</p>';
        }
        loadAdminWorkOrderInventory(request.id);
        if (closeButton) closeButton.focus();
      };

      const closeAdminRequest = () => {
        const detail = document.querySelector('[data-admin-request-detail]');

        if (detail) {
          detail.hidden = true;
        }

        document.body.style.overflow = '';
      };

      const bindAdminRequestActions = () => {
        const inbox = document.querySelector('[data-admin-inbox]');
        const statusForm = document.querySelector('[data-admin-status-form]');
        const quoteForm = document.querySelector('[data-admin-quote-form]');
        const assignmentForm = document.querySelector('[data-admin-assignment-form]');
        const inventoryForm = document.querySelector('[data-admin-work-order-inventory-form]');
        const detail = document.querySelector('[data-admin-request-detail]');

        if (detail && !detail.dataset.closeActionsBound) {
          detail.dataset.closeActionsBound = 'true';
          detail.addEventListener('click', (event) => {
            if (event.target === detail || event.target.closest('[data-admin-detail-close]')) {
              closeAdminRequest();
            }
          });
          document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !detail.hidden) {
              closeAdminRequest();
            }
          });
        }

        if (inbox && !inbox.dataset.requestActionsBound) {
          inbox.dataset.requestActionsBound = 'true';
          inbox.addEventListener('click', (event) => {
            const button = event.target.closest('[data-admin-open-request]');

            if (button) {
              selectAdminRequest(button.dataset.adminOpenRequest);
            }
          });
        }

        if (statusForm && !statusForm.dataset.bound) {
          statusForm.dataset.bound = 'true';
          statusForm.querySelector('[data-admin-mark-complete]')?.addEventListener('click', () => {
            const statusSelect = statusForm.querySelector('[data-admin-status-select]');
            const completionDate = statusForm.querySelector('[data-admin-completion-date]');
            if (statusSelect) statusSelect.value = 'waiting_payment';
            if (completionDate && !completionDate.value) completionDate.value = new Date().toISOString().slice(0, 10);
          });
          statusForm.querySelector('[data-admin-delete-request]')?.addEventListener('click', async () => {
            const formStatus = document.querySelector('[data-admin-status-form-status]');
            const jobRequestId = statusForm.querySelector('[data-admin-status-request-id]')?.value || '';
            if (!jobRequestId) return;
            const confirmation = window.prompt('This permanently deletes the request and any attached files. Type DELETE to continue.');
            if (confirmation !== 'DELETE') {
              if (formStatus) formStatus.textContent = 'Permanent delete cancelled.';
              return;
            }
            if (formStatus) formStatus.textContent = 'Permanently deleting request…';
            try {
              const response = await fetch('/api/admin/job-requests', {
                method: 'DELETE',
                headers: { accept: 'application/json', 'content-type': 'application/json' },
                body: JSON.stringify({ jobRequestId, confirmation }),
              });
              const result = await response.json().catch(() => ({}));
              if (!response.ok || !result.ok) throw new Error(result.message || 'We could not delete that request.');
              closeAdminRequest();
              await loadAdminRequests();
              await loadAdminActivity();
            } catch (error) {
              if (formStatus) formStatus.textContent = error.message;
            }
          });
          statusForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formStatus = document.querySelector('[data-admin-status-form-status]');
            const payload = Object.fromEntries(new FormData(statusForm).entries());

            if (formStatus) formStatus.textContent = 'Updating request…';

            try {
              const response = await fetch('/api/admin/job-requests', {
                method: 'PATCH',
                headers: { accept: 'application/json', 'content-type': 'application/json' },
                body: JSON.stringify(payload),
              });
              const result = await response.json().catch(() => ({}));

              if (!response.ok || !result.ok) {
                throw new Error(result.message || 'We could not update that request.');
              }

              if (formStatus) formStatus.textContent = 'Request updated.';
              await loadAdminRequests(result.request?.id);
              await loadAdminActivity();
            } catch (error) {
              if (formStatus) formStatus.textContent = error.message;
            }
          });
        }

        if (assignmentForm && !assignmentForm.dataset.bound) {
          assignmentForm.dataset.bound = 'true';
          assignmentForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formStatus = document.querySelector('[data-admin-assignment-form-status]');
            const payload = Object.fromEntries(new FormData(assignmentForm).entries());
            if (!payload.workerId) {
              if (formStatus) formStatus.textContent = 'Choose a worker to assign.';
              return;
            }
            if (formStatus) formStatus.textContent = 'Assigning worker…';
            try {
              const response = await fetch('/api/admin/job-requests', {
                method: 'PATCH',
                headers: { accept: 'application/json', 'content-type': 'application/json' },
                body: JSON.stringify(payload),
              });
              const result = await response.json().catch(() => ({}));
              if (!response.ok || !result.ok) throw new Error(result.message || 'We could not assign that worker.');
              assignmentForm.reset();
              if (formStatus) formStatus.textContent = 'Worker assigned.';
              await loadAdminRequests(payload.jobRequestId);
              await loadAdminActivity();
            } catch (error) {
              if (formStatus) formStatus.textContent = error.message;
            }
          });
        }



        if (inventoryForm && !inventoryForm.dataset.bound) {
          inventoryForm.dataset.bound = 'true';
          inventoryForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formStatus = document.querySelector('[data-admin-work-order-inventory-status]');
            const formData = new FormData(inventoryForm);
            const quantityUsed = Number(formData.get('quantityUsed') || 0);
            const jobRequestId = formData.get('jobRequestId');
            const payload = {
              itemId: formData.get('itemId'),
              jobRequestId,
              adjustmentType: 'used',
              quantityDelta: -Math.abs(quantityUsed),
              adjustmentNote: formData.get('adjustmentNote'),
            };
            if (!payload.itemId) {
              if (formStatus) formStatus.textContent = 'Choose an inventory item.';
              return;
            }
            if (!quantityUsed || quantityUsed <= 0) {
              if (formStatus) formStatus.textContent = 'Enter a quantity used greater than zero.';
              return;
            }
            if (formStatus) formStatus.textContent = 'Recording inventory usage…';
            try {
              const response = await fetch('/api/admin/inventory', {
                method: 'PATCH',
                headers: { accept: 'application/json', 'content-type': 'application/json' },
                body: JSON.stringify(payload),
              });
              const result = await response.json().catch(() => ({}));
              if (!response.ok || !result.ok) throw new Error(result.message || 'Could not record inventory usage.');
              inventoryForm.reset();
              if (formStatus) formStatus.textContent = 'Inventory usage recorded.';
              await loadAdminWorkOrderInventory(jobRequestId);
              await loadAdminActivity();
            } catch (error) {
              if (formStatus) formStatus.textContent = error.message;
            }
          });
        }

        if (quoteForm && !quoteForm.dataset.bound) {
          quoteForm.dataset.bound = 'true';
          const quoteSourcingLinks = quoteForm.querySelector('[data-admin-quote-sourcing-links]');
          quoteForm.querySelector('[data-admin-quote-ai-draft]')?.addEventListener('click', async () => {
            const formStatus = document.querySelector('[data-admin-quote-form-status]');
            const aiStatus = document.querySelector('[data-admin-quote-ai-status]');
            const requestId = quoteForm.querySelector('[data-admin-quote-request-id]')?.value || '';
            if (!requestId) {
              if (aiStatus) aiStatus.textContent = 'Open a request first, then generate the AI draft.';
              if (formStatus) formStatus.textContent = 'Open a request first.';
              return;
            }
            if (aiStatus) aiStatus.textContent = 'Generating AI draft from project details, stock, and pricing…';
            if (formStatus) formStatus.textContent = 'Generating AI draft quote…';
            try {
              const draftUrls = ['/api/admin/quote-draft'];
              if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                draftUrls.push('/.netlify/functions/admin-quote-draft');
              }
              let result = null;
              let finalError = '';
              for (const url of draftUrls) {
                try {
                  const response = await fetch(url, {
                    method: 'POST',
                    headers: { accept: 'application/json', 'content-type': 'application/json' },
                    body: JSON.stringify({
                      jobRequestId: requestId,
                      requestContext: (() => {
                        const req = currentAdminRequests.get(requestId);
                        return req ? {
                          serviceType: req.serviceType,
                          description: req.description,
                          city: req.city,
                          createdAt: req.createdAt,
                        } : null;
                      })(),
                    }),
                  });
                  const payload = await response.json().catch(() => ({}));
                  if (response.ok && payload.ok && payload.draft) {
                    result = payload;
                    break;
                  }
                  finalError = payload.message || `Draft endpoint failed (${response.status}) at ${url}`;
                } catch (error) {
                  finalError = error?.message || `Network error calling ${url}`;
                }
              }
              if (!result?.draft) throw new Error(finalError || 'Could not generate draft.');
              const titleField = quoteForm.querySelector('[name="title"]');
              const summaryField = quoteForm.querySelector('[name="summary"]');
              const sourcingField = quoteForm.querySelector('[data-admin-quote-sourcing-notes]');
              const amountField = quoteForm.querySelector('[name="amount"]');
              if (titleField) titleField.value = result.draft.title || '';
              if (summaryField) summaryField.value = result.draft.summary || '';
              if (sourcingField) sourcingField.value = result.draft.adminSourcingNotes || '';
              if (quoteSourcingLinks) {
                const links = Array.isArray(result.draft.adminSourcingLinks) ? result.draft.adminSourcingLinks : [];
                quoteSourcingLinks.innerHTML = links.length
                  ? links.slice(0, 10).map((item) => `<a class=\"btn btn-soft\" href=\"${escapeHtml(item.url || '#')}\" target=\"_blank\" rel=\"noopener noreferrer\">${escapeHtml(item.label || item.part || item.url || 'Open product')}</a>`).join('')
                  : '<span class="session-status">No quick links available.</span>';
              }
              if (amountField) {
                let amountCents = Number(result.draft.amountCents || 0);
                const totalMatch = summaryField?.value?.match(/Estimated total:\s*\$([0-9,]+(?:\.[0-9]{1,2})?)/i);
                if (totalMatch) {
                  amountCents = Math.round(Number(String(totalMatch[1]).replace(/,/g, '')) * 100);
                }
                amountField.value = ((Number(amountCents || 0)) / 100).toFixed(2);
              }
              if (aiStatus) aiStatus.textContent = 'AI draft generated. Review title, materials, labor, and amount before sending.';
              if (formStatus) formStatus.textContent = 'AI draft ready. Review and edit before sending.';
            } catch (error) {
              const fallbackSummary = quoteForm.querySelector('[name="summary"]');
              if (fallbackSummary && !fallbackSummary.value.trim()) {
                fallbackSummary.value = 'AI draft endpoint was unavailable. Please review this manual draft:\n- Scope: Review project details and confirm full parts list.\n- Materials: Check inventory on hand first; buy missing parts.\n- Labor: Use current Phoenix lower-end rate.\n- Finalize amount before sending.';
              }
              if (aiStatus) aiStatus.textContent = `AI draft failed: ${error.message}`;
              if (formStatus) formStatus.textContent = error.message;
            }
          });
          quoteForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formStatus = document.querySelector('[data-admin-quote-form-status]');
            const formData = new FormData(quoteForm);
            const amount = Number(formData.get('amount') || 0);
            const payload = {
              quoteId: formData.get('quoteId'),
              jobRequestId: formData.get('jobRequestId'),
              title: formData.get('title'),
              summary: formData.get('summary'),
              amountCents: Math.round(amount * 100),
              sendToClient: formData.get('sendToClient') === 'true',
            };

            const quoteMethod = payload.quoteId ? 'PATCH' : 'POST';
            if (formStatus) formStatus.textContent = payload.quoteId ? 'Saving quote…' : (payload.sendToClient ? 'Creating and sending quote…' : 'Creating draft quote…');

            try {
              const response = await fetch('/api/admin/quotes', {
                method: quoteMethod,
                headers: { accept: 'application/json', 'content-type': 'application/json' },
                body: JSON.stringify(payload),
              });
              const result = await response.json().catch(() => ({}));

              if (!response.ok || !result.ok) {
                throw new Error(result.message || 'We could not create that quote.');
              }

              if (!payload.quoteId) quoteForm.reset();
              if (formStatus) formStatus.textContent = payload.quoteId ? 'Quote saved.' : (payload.sendToClient ? 'Quote sent for client accept/decline.' : 'Draft quote created.');
              await loadAdminRequests(payload.jobRequestId);
              await loadAdminActivity();
            } catch (error) {
              if (formStatus) formStatus.textContent = error.message;
            }
          });
        }
      };

      const setModalOpen = (modal, open) => {
        if (!modal) return;
        modal.hidden = !open;
        const hasOpenModal = Boolean(document.querySelector('.admin-request-modal:not([hidden])'));
        document.body.style.overflow = hasOpenModal ? 'hidden' : '';
      };

      const closeAdminRoleModal = () => setModalOpen(document.querySelector('[data-admin-role-modal]'), false);
      const closeAdminUserModal = () => setModalOpen(document.querySelector('[data-admin-user-modal]'), false);

      const renderCheckboxList = (items, selected, name) => items.map((item) => `
        <label><input type="checkbox" name="${name}" value="${escapeHtml(item.key)}" ${selected.includes(item.key) ? 'checked' : ''}> ${escapeHtml(item.name || item.label || item.key)}</label>
      `).join('');

      const renderPermissionInputs = (selected = []) => {
        const list = document.querySelector('[data-admin-permission-list]');
        if (!list) return;
        list.innerHTML = `<strong>Permissions</strong>${renderCheckboxList(currentPermissions, selected, 'permissions')}`;
      };

      const renderUserRoleInputs = (selected = []) => {
        const list = document.querySelector('[data-admin-user-role-list]');
        if (!list) return;
        list.innerHTML = `<strong>Roles</strong>${renderCheckboxList([...currentAdminRoles.values()], selected, 'roles')}`;
      };

      const resetRoleForm = () => {
        const form = document.querySelector('[data-admin-role-form]');
        if (form) form.reset();
        const roleId = document.querySelector('[data-admin-role-id]');
        const key = document.querySelector('[data-admin-role-key]');
        const title = document.querySelector('[data-admin-role-modal-title]');
        const status = document.querySelector('[data-admin-role-form-status]');
        if (roleId) roleId.value = '';
        if (key) key.disabled = false;
        if (title) title.textContent = 'Create Role';
        if (status) status.textContent = '';
        renderPermissionInputs([]);
      };

      const resetUserForm = () => {
        const form = document.querySelector('[data-admin-user-form]');
        if (form) form.reset();
        const userId = document.querySelector('[data-admin-user-id]');
        const email = document.querySelector('[data-admin-user-email]');
        const deleteButton = document.querySelector('[data-admin-delete-user]');
        const propertyList = document.querySelector('[data-admin-user-property-list]');
        const title = document.querySelector('[data-admin-user-modal-title]');
        const summary = document.querySelector('[data-admin-user-modal-summary]');
        const status = document.querySelector('[data-admin-user-form-status]');
        if (userId) userId.value = '';
        if (email) email.disabled = false;
        if (deleteButton) deleteButton.hidden = true;
        if (propertyList) propertyList.innerHTML = '';
        if (title) title.textContent = 'Create user';
        if (summary) summary.textContent = 'Create a user and assign roles.';
        if (status) status.textContent = '';
        renderUserRoleInputs(['client']);
      };

      const openAdminRoleModal = () => {
        const modal = document.querySelector('[data-admin-role-modal]');
        setModalOpen(modal, true);
        document.querySelector('[data-admin-role-name]')?.focus();
      };

      const openAdminUserModal = () => {
        const modal = document.querySelector('[data-admin-user-modal]');
        setModalOpen(modal, true);
        document.querySelector('[data-admin-user-form] button[type="submit"]')?.focus();
      };

      const selectAdminRole = (roleKey) => {
        const role = currentAdminRoles.get(roleKey);
        if (!role) return;
        resetRoleForm();
        document.querySelector('[data-admin-role-id]').value = role.id;
        document.querySelector('[data-admin-role-key]').value = role.key;
        document.querySelector('[data-admin-role-key]').disabled = true;
        document.querySelector('[data-admin-role-name]').value = role.name || '';
        document.querySelector('[data-admin-role-description]').value = role.description || '';
        document.querySelector('[data-admin-role-modal-title]').textContent = `Edit role: ${role.name || role.key}`;
        renderPermissionInputs(role.permissions || []);
        openAdminRoleModal();
      };

      const renderUserProperties = (properties = []) => {
        const list = document.querySelector('[data-admin-user-property-list]');
        if (!list) return;
        list.innerHTML = `<strong>Addresses / properties</strong>${properties.length ? properties.map((property) => `
          <article class="admin-request">
            <span class="admin-request-badge">${escapeHtml(property.label || 'property')}</span>
            <strong>${escapeHtml(property.street || 'No street address')}</strong>
            <div class="admin-request-meta"><span>${escapeHtml([property.city, property.state].filter(Boolean).join(', ') || 'No city')}</span><span>${escapeHtml(property.postalCode || 'No ZIP')}</span></div>
            ${property.accessNotes ? `<p>${escapeHtml(property.accessNotes)}</p>` : ''}
          </article>
        `).join('') : '<p class="session-status">No saved addresses yet. Client-submitted properties will appear here.</p>'}`;
      };

      const selectAdminUser = (userId) => {
        const user = currentAdminUsers.get(userId);
        if (!user) return;
        resetUserForm();
        document.querySelector('[data-admin-user-id]').value = user.id;
        document.querySelector('[data-admin-user-email]').value = user.email || '';
        document.querySelector('[data-admin-user-email]').disabled = true;
        document.querySelector('[data-admin-user-name]').value = user.fullName || '';
        document.querySelector('[data-admin-user-phone]').value = user.phone || '';
        document.querySelector('[data-admin-user-secondary-phone]').value = user.secondaryPhone || '';
        document.querySelector('[data-admin-user-company]').value = user.companyName || '';
        document.querySelector('[data-admin-user-mailing-address]').value = user.mailingAddress || '';
        document.querySelector('[data-admin-user-internal-notes]').value = user.internalNotes || '';
        document.querySelector('[data-admin-delete-user]').hidden = false;
        document.querySelector('[data-admin-user-modal-title]').textContent = `Edit user: ${user.fullName || user.email}`;
        document.querySelector('[data-admin-user-modal-summary]').textContent = `Editing ${user.fullName || user.email || 'user account'} • ${user.email || 'No email'}${user.phone ? ` • ${user.phone}` : ''}${user.secondaryPhone ? ` • ${user.secondaryPhone}` : ''}`;
        renderUserProperties(user.properties || []);
        renderUserRoleInputs(user.roles || []);
        openAdminUserModal();
      };

      const renderUserSearchResults = (query = '') => {
        const results = document.querySelector('[data-admin-user-search-results]');
        if (!results) return;
        const cleaned = query.trim().toLowerCase();

        if (!cleaned) {
          results.innerHTML = '<p class="session-status">Search for a user to edit profile details, roles, and contact information. User results appear here after typing.</p>';
          return;
        }

        const matches = [...currentAdminUsers.values()]
          .filter((user) => [user.fullName, user.email, user.phone, user.secondaryPhone, user.companyName, user.mailingAddress, ...(user.roles || []), ...((user.properties || []).flatMap((property) => [property.label, property.street, property.city, property.postalCode]))]
            .some((value) => String(value || '').toLowerCase().includes(cleaned)))
          .slice(0, 8);

        results.innerHTML = matches.length ? matches.map((user) => `
          <article class="admin-request" data-admin-user-result-card>
            <span class="admin-request-badge">${escapeHtml(user.isActive === false ? 'inactive' : ((user.roles || []).join(', ') || 'no role'))}</span>
            <strong>${escapeHtml(user.fullName || user.email)}</strong>
            <div class="admin-request-meta"><span>${escapeHtml(user.email)}</span><span>${escapeHtml(user.phone || 'No phone')}</span><span>${(user.properties || []).length} address${(user.properties || []).length === 1 ? '' : 'es'}</span></div>
            <div class="client-quote-actions"><button class="btn btn-soft" type="button" data-admin-edit-user="${escapeHtml(user.id)}">Edit user</button></div>
          </article>
        `).join('') : '<p class="session-status">No users matched that search.</p>';
      };

      const renderAdminAccess = ({ roles = [], users = [], permissions = [] }) => {
        const roleSelect = document.querySelector('[data-admin-role-select]');
        currentPermissions = permissions;
        currentAdminRoles.clear();
        currentAdminUsers.clear();
        roles.forEach((role) => currentAdminRoles.set(role.key, role));
        users.forEach((user) => currentAdminUsers.set(user.id, user));
        renderPermissionInputs([]);
        renderUserRoleInputs(['client']);
        renderUserSearchResults(document.querySelector('[data-admin-user-search]')?.value || '');

        if (roleSelect) {
          const selectedValue = roleSelect.value;
          roleSelect.innerHTML = '<option value="">Select a role to edit</option>' + roles.map((role) => `<option value="${escapeHtml(role.key)}">${escapeHtml(role.name)} (${escapeHtml(role.key)}) — ${(role.permissions || []).length} permission${(role.permissions || []).length === 1 ? '' : 's'}${role.isSystem ? ' • system' : ''}</option>`).join('');
          roleSelect.value = roles.some((role) => role.key === selectedValue) ? selectedValue : '';
        }
      };

      const bindAdminAccessForms = () => {
        const panel = document.querySelector('[data-admin-access]');
        const roleForm = document.querySelector('[data-admin-role-form]');
        const userForm = document.querySelector('[data-admin-user-form]');
        const search = document.querySelector('[data-admin-user-search]');
        if (!panel || panel.dataset.bound) return;
        panel.dataset.bound = 'true';

        panel.addEventListener('click', (event) => {
          const roleButton = event.target.closest('[data-admin-edit-role]');
          const userButton = event.target.closest('[data-admin-edit-user]');
          const selectedRoleButton = event.target.closest('[data-admin-open-selected-role]');
          if (roleButton) selectAdminRole(roleButton.dataset.adminEditRole);
          if (selectedRoleButton) {
            const selectedRole = document.querySelector('[data-admin-role-select]')?.value || '';
            if (selectedRole) selectAdminRole(selectedRole);
          }
          if (userButton) selectAdminUser(userButton.dataset.adminEditUser);
          if (event.target.closest('[data-admin-new-role]')) {
            resetRoleForm();
            openAdminRoleModal();
          }
          if (event.target.closest('[data-admin-role-modal-close]')) closeAdminRoleModal();
          if (event.target.closest('[data-admin-user-modal-close]')) closeAdminUserModal();
        });

        document.querySelector('[data-admin-role-modal]')?.addEventListener('click', (event) => {
          if (event.target === event.currentTarget) closeAdminRoleModal();
        });
        document.querySelector('[data-admin-user-modal]')?.addEventListener('click', (event) => {
          if (event.target === event.currentTarget) closeAdminUserModal();
        });
        document.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') {
            closeAdminRoleModal();
            closeAdminUserModal();
          }
        });
        search?.addEventListener('input', () => renderUserSearchResults(search.value));

        roleForm?.addEventListener('submit', async (event) => {
          event.preventDefault();
          const status = document.querySelector('[data-admin-role-form-status]');
          const formData = new FormData(roleForm);
          const payload = Object.fromEntries(formData.entries());
          payload.permissions = formData.getAll('permissions');
          if (status) status.textContent = 'Saving role…';
          try {
            const response = await fetch('/api/admin/roles', {
              method: payload.roleId ? 'PATCH' : 'POST',
              headers: { accept: 'application/json', 'content-type': 'application/json' },
              body: JSON.stringify(payload),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.ok) throw new Error(result.message || 'Could not save role.');
            if (status) status.textContent = 'Role saved.';
            closeAdminRoleModal();
            await loadAdminAccess();
          } catch (error) {
            if (status) status.textContent = error.message;
          }
        });

        document.querySelector('[data-admin-delete-user]')?.addEventListener('click', async () => {
          const status = document.querySelector('[data-admin-user-form-status]');
          const userId = document.querySelector('[data-admin-user-id]')?.value || '';
          if (!userId) return;
          const confirmation = window.prompt('This deactivates the user and revokes active sessions. Type DELETE to continue.');
          if (confirmation !== 'DELETE') {
            if (status) status.textContent = 'User delete cancelled.';
            return;
          }
          if (status) status.textContent = 'Deleting user…';
          try {
            const response = await fetch('/api/admin/users', {
              method: 'DELETE',
              headers: { accept: 'application/json', 'content-type': 'application/json' },
              body: JSON.stringify({ userId, confirmation }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.ok) throw new Error(result.message || 'Could not delete user.');
            closeAdminUserModal();
            await loadAdminAccess();
          } catch (error) {
            if (status) status.textContent = error.message;
          }
        });

        userForm?.addEventListener('submit', async (event) => {
          event.preventDefault();
          const status = document.querySelector('[data-admin-user-form-status]');
          const formData = new FormData(userForm);
          const payload = Object.fromEntries(formData.entries());
          payload.roles = formData.getAll('roles');
          if (status) status.textContent = 'Saving user roles…';
          try {
            const response = await fetch('/api/admin/users', {
              method: payload.userId ? 'PATCH' : 'POST',
              headers: { accept: 'application/json', 'content-type': 'application/json' },
              body: JSON.stringify(payload),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.ok) throw new Error(result.message || 'Could not save user.');
            if (status) status.textContent = 'User roles saved.';
            closeAdminUserModal();
            await loadAdminAccess();
          } catch (error) {
            if (status) status.textContent = error.message;
          }
        });
      };

      
      const bindDashboardToolPopupLaunchers = () => {
        const panel = document.querySelector('[data-dashboard-tool-modal]');
        if (!panel) return;
        const title = panel.querySelector('[data-dashboard-tool-title]');
        const description = panel.querySelector('[data-dashboard-tool-description]');
        const openPage = panel.querySelector('[data-dashboard-tool-open-page]');
        let activeToolConfig = null;

        const openWorkspaceInDashboard = (config, selectedItem = null) => {
          if (!config) return;
          const root = document.querySelector('[data-dashboard-root]');
          if (root) root.removeAttribute('data-dashboard-root');
          if (typeof window.taSetDashboardView === 'function') window.taSetDashboardView('admin');
          const revealOne = (selector) => {
            document.querySelectorAll('[data-dashboard-section]').forEach((section) => { section.hidden = true; });
            const target = document.querySelector(selector);
            if (target) { target.hidden = false; target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
          };
          if (config.key === 'workOrders') revealOne('#admin-work-orders');
          if (config.key === 'inventory') revealOne('[data-admin-inventory]');
          if (config.key === 'invoices') revealOne('[data-admin-invoices]');
          if (config.key === 'activity') {
            revealOne('[data-admin-activity]');
            document.querySelector('[data-admin-activity-refresh]')?.click();
          }
          if (selectedItem?.status && config.key === 'workOrders') {
            const statusFilter = document.querySelector('[data-admin-scope-select]');
            if (statusFilter) {
              statusFilter.value = selectedItem.status;
              statusFilter.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
          if (selectedItem?.id) {
            const match = document.querySelector(`[data-request-id="${selectedItem.id}"],[data-invoice-id="${selectedItem.id}"],[data-activity-id="${selectedItem.id}"]`);
            match?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          setModalOpen(panel, false);
        };
        const status = panel.querySelector('[data-dashboard-tool-status]');
        const list = panel.querySelector('[data-dashboard-tool-list]');

        const renderRecentItems = (items = []) => {
          if (!list) return;
          list.innerHTML = items.length
            ? items.map((item) => `<article class="admin-request" data-tool-item-id="${item.id || ''}" data-tool-item-status="${item.status || ''}"><strong>${item.title}</strong><div class="admin-request-meta">${item.meta || ''}</div><p>${item.detail || ''}</p></article>`).join('')
            : '<p class="session-status">No recent items yet.</p>';
        };

        const loadRecentItems = async (config) => {
          if (!status) return;
          status.textContent = 'Loading latest 5 items…';
          try {
            const response = await fetch(config.endpoint, { headers: { accept: 'application/json' } });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || result.ok === false) throw new Error(result.message || 'Could not load recent items.');
            const raw = result.requests || result.invoices || result.items || result.events || [];
            const rows = raw.slice(0,5).map((row) => ({
              id: row.id || row.requestId || row.invoiceId || '',
              status: row.status || '',
              title: row.title || row.requestTitle || row.name || row.type || row.clientName || `Item #${row.id || ''}`,
              meta: [row.status, row.priority, row.propertyName, row.eventType].filter(Boolean).join(' • '),
              detail: row.description || row.notes || row.summary || row.email || ''
            }));
            status.textContent = `Showing latest ${rows.length} ${config.label.toLowerCase()} item${rows.length===1?'':'s'}.`;
            renderRecentItems(rows);
          } catch (error) {
            status.textContent = error.message;
            renderRecentItems([]);
          }
        };

        const launchers = [
          { selector: '[data-admin-work-orders-shortcut]', key: 'workOrders', label: 'Work orders', description: 'Review incoming requests, build quotes, assign workers, and close jobs.', href: '/portal/admin/work-orders/', endpoint: '/api/admin/job-requests' },
          { selector: '[data-admin-invoices-shortcut]', key: 'invoices', label: 'Invoices', description: 'Track approvals, payment follow-up, and invoice status updates.', href: '/portal/admin/invoices/', endpoint: '/api/admin/invoices' },
          { selector: '[data-admin-inventory-shortcut]', key: 'inventory', label: 'Inventory', description: 'Monitor stock, materials, and usage controls.', href: '/portal/admin/inventory/', endpoint: '/api/admin/inventory' },
          { selector: '[data-admin-activity-shortcut]', key: 'activity', label: 'Audit activity', description: 'Search recent account, payment, and status events quickly.', href: '/portal/admin/audit-activity/', endpoint: '/api/admin/activity?limit=5' },
        ];

        launchers.forEach((config) => {
          document.querySelectorAll(config.selector).forEach((button) => {
            if (button.dataset.boundToolPopup) return;
            button.dataset.boundToolPopup = 'true';
            button.addEventListener('click', () => {
              if (title) title.textContent = config.label;
              if (description) description.textContent = config.description;
              activeToolConfig = config;
              if (status) status.textContent = `${config.label} is available now in a dedicated workspace.`;
              setModalOpen(panel, true);
              loadRecentItems(config);
            });
          });
        });

        
        list?.addEventListener('click', (event) => {
          const item = event.target.closest('[data-tool-item-id]');
          if (!item || !activeToolConfig) return;
          openWorkspaceInDashboard(activeToolConfig, { id: item.dataset.toolItemId, status: item.dataset.toolItemStatus });
        });

        openPage?.addEventListener('click', () => {
          openWorkspaceInDashboard(activeToolConfig);
        });

        panel.querySelectorAll('[data-dashboard-tool-close], [data-dashboard-tool-close-secondary]').forEach((closeButton) => {
          closeButton.addEventListener('click', () => setModalOpen(panel, false));
        });
        panel.addEventListener('click', (event) => {
          if (event.target === panel) setModalOpen(panel, false);
        });
      };

      
      const bindClientWorkspaceLaunchers = () => {
        const openClientSection = (selector) => {
          const root = document.querySelector('[data-dashboard-root]');
          if (root) root.removeAttribute('data-dashboard-root');
          if (typeof window.taSetDashboardView === 'function') window.taSetDashboardView('client');
          document.querySelectorAll('[data-dashboard-section]').forEach((section) => { section.hidden = true; });
          const target = document.querySelector(selector);
          if (target) {
            target.hidden = false;
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        };

        document.querySelectorAll('[data-client-requests-shortcut]').forEach((button) => {
          if (button.dataset.boundClientLauncher) return;
          button.dataset.boundClientLauncher = 'true';
          button.addEventListener('click', () => openClientSection('[data-client-requests]'));
        });
        document.querySelectorAll('[data-client-quotes-shortcut]').forEach((button) => {
          if (button.dataset.boundClientLauncher) return;
          button.dataset.boundClientLauncher = 'true';
          button.addEventListener('click', () => openClientSection('[data-client-quotes]'));
        });
        document.querySelectorAll('[data-client-invoices-shortcut]').forEach((button) => {
          if (button.dataset.boundClientLauncher) return;
          button.dataset.boundClientLauncher = 'true';
          button.addEventListener('click', () => openClientSection('[data-client-invoices]'));
        });
      };

      const bindAdminAccessLauncher = () => {
        const panel = document.querySelector('[data-admin-access]');
        const openButtons = document.querySelectorAll('[data-admin-access-shortcut]');
        if (!panel || !openButtons.length) return;
        openButtons.forEach((openButton) => {
          if (openButton.dataset.bound) return;
          openButton.dataset.bound = 'true';
          openButton.addEventListener('click', () => {
            setModalOpen(panel, true);
            document.querySelector('[data-admin-user-search]')?.focus({ preventScroll: true });
          });
        });
        panel.querySelector('[data-admin-access-close]')?.addEventListener('click', () => setModalOpen(panel, false));
        panel.addEventListener('click', (event) => {
          if (event.target === panel) setModalOpen(panel, false);
        });
      };

      const loadAdminAccess = async () => {
        const status = document.querySelector('[data-admin-access-status]');
        try {
          const [rolesResponse, usersResponse] = await Promise.all([
            fetch('/api/admin/roles', { headers: { accept: 'application/json' } }),
            fetch('/api/admin/users', { headers: { accept: 'application/json' } }),
          ]);
          const rolesResult = await rolesResponse.json().catch(() => ({}));
          const usersResult = await usersResponse.json().catch(() => ({}));
          if (!rolesResponse.ok || !rolesResult.ok) throw new Error(rolesResult.message || 'Roles are not available.');
          if (!usersResponse.ok || !usersResult.ok) throw new Error(usersResult.message || 'Users are not available.');
          renderAdminAccess({ roles: rolesResult.roles, users: usersResult.users, permissions: rolesResult.permissions });
          bindAdminAccessForms();
          if (status) {
            status.dataset.state = 'ready';
            status.textContent = `${rolesResult.roles.length} role${rolesResult.roles.length === 1 ? "" : "s"} loaded. Search below to edit a user.`;
          }
        } catch (error) {
          if (status) {
            status.dataset.state = 'error';
            status.textContent = error.message;
          }
        }
      };


      const loadAdminActivityFeed = async ({ filtered = false, append = false } = {}) => {
        const panel = document.querySelector('[data-admin-activity]');
        const status = document.querySelector('[data-admin-activity-status]');
        const activityList = document.querySelector('[data-admin-activity-list]');
        const activitySummary = document.querySelector('[data-admin-activity-summary]');
        const moreButton = document.querySelector('[data-admin-activity-more]');
        if (!panel || !status || !activityList) return;
        const typeFilter = document.querySelector('[data-admin-activity-type-filter]')?.value || '';
        const search = (document.querySelector('[data-admin-activity-search]')?.value || '').trim();
        const nextPage = append ? currentAdminActivityPage + 1 : 1;
        const url = new URL('/api/admin/activity', window.location.origin);
        url.searchParams.set('limit', '75');
        url.searchParams.set('page', String(nextPage));
        if (typeFilter) url.searchParams.set('type', typeFilter);
        if (search) url.searchParams.set('q', search);
        try {
          status.dataset.state = 'loading';
          if (moreButton) moreButton.disabled = true;
          if (filtered) status.textContent = 'Refreshing filtered activity…';
          if (append) status.textContent = 'Loading more audit activity…';
          const response = await fetch(url, { headers: { accept: 'application/json' } });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || !result.ok) throw new Error(result.message || 'Admin activity is not available.');
          const events = result.events || [];
          currentAdminActivity = append ? [...currentAdminActivity, ...events] : events;
          currentAdminActivityPage = result.pagination?.page || nextPage;
          adminActivityHasNextPage = Boolean(result.pagination?.hasNextPage);
          adminActivityLoaded = true;
          status.dataset.state = 'ready';
          const filterLabel = typeFilter || search ? ' matching audit' : ' recent audit';
          status.textContent = currentAdminActivity.length ? `${currentAdminActivity.length}${filterLabel} event${currentAdminActivity.length === 1 ? '' : 's'} loaded.` : (typeFilter || search ? 'No audit events match those filters.' : 'No recent admin activity yet.');
          bindAdminActivityFilters();
          renderAdminActivityList();
          updateAdminActivityMoreButton();
        } catch (error) {
          if (!append) currentAdminActivity = [];
          if (!append) adminActivityLoaded = false;
          if (!append) adminActivityHasNextPage = false;
          status.dataset.state = 'error';
          status.textContent = error.message;
          updateAdminActivityMoreButton();
        } finally {
          if (moreButton) moreButton.disabled = false;
        }
      };

      const bindAdminActivityLauncher = () => {
        const panel = document.querySelector('[data-admin-activity]');
        const openButtons = document.querySelectorAll('[data-admin-activity-panel-shortcut]');
        if (!panel || !openButtons.length) return;
        openButtons.forEach((openButton) => {
          if (openButton.dataset.bound) return;
          openButton.dataset.bound = 'true';
          openButton.addEventListener('click', async () => {
            setDashboardView('admin');
            panel.hidden = false;
            panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            document.querySelector('[data-admin-activity-type-filter]')?.focus({ preventScroll: true });
          });
        });
        panel.querySelector('[data-admin-activity-more]')?.addEventListener('click', () => loadAdminActivityFeed({ append: true }));
      };

      const bindWorkerJobActions = () => {
        const panel = document.querySelector('[data-worker-jobs]');
        if (!panel || panel.dataset.bound) return;
        panel.dataset.bound = 'true';
        panel.addEventListener('change', (event) => {
          if (event.target.matches('[data-worker-before-files]')) {
            const list = event.target.closest('form')?.querySelector('[data-worker-before-file-list]');
            if (list) list.textContent = [...event.target.files].map((file) => file.name).join(', ') || 'No files selected yet.';
          }
          if (event.target.matches('[data-worker-after-files]')) {
            const list = event.target.closest('form')?.querySelector('[data-worker-after-file-list]');
            if (list) list.textContent = [...event.target.files].map((file) => file.name).join(', ') || 'No files selected yet.';
          }
        });
        panel.addEventListener('submit', async (event) => {
          const form = event.target.closest('[data-worker-job-form]');
          if (!form) return;
          event.preventDefault();
          const formStatus = form.querySelector('[data-worker-job-form-status]');
          const formData = new FormData(form);
          const beforeFiles = fileMetadataFromInput(form.querySelector('[data-worker-before-files]'), 'worker_before');
          const afterFiles = fileMetadataFromInput(form.querySelector('[data-worker-after-files]'), 'worker_after');
          const payload = Object.fromEntries([...formData.entries()].filter(([, value]) => !(value && typeof value === 'object' && 'name' in value)));
          payload.assignmentId = form.dataset.assignmentId;
          if (formStatus) formStatus.textContent = 'Saving job update…';
          try {
            const response = await fetch('/api/worker/jobs', {
              method: 'PATCH',
              headers: { accept: 'application/json', 'content-type': 'application/json' },
              body: JSON.stringify(payload),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.ok) throw new Error(result.message || 'We could not update that assigned job.');
            const filesToUpload = [...beforeFiles, ...afterFiles];
            if (filesToUpload.length) {
              if (formStatus) formStatus.textContent = 'Job updated. Attaching files…';
              await uploadJobFiles({ jobRequestId: form.dataset.jobRequestId, files: filesToUpload });
            }
            if (formStatus) formStatus.textContent = filesToUpload.length ? `Job updated with ${filesToUpload.length} file${filesToUpload.length === 1 ? '' : 's'}.` : 'Job updated.';
            form.querySelectorAll('[data-worker-before-files], [data-worker-after-files]').forEach((input) => { input.value = ''; });
            form.querySelector('[data-worker-before-file-list]') && (form.querySelector('[data-worker-before-file-list]').textContent = 'No files selected yet.');
            form.querySelector('[data-worker-after-file-list]') && (form.querySelector('[data-worker-after-file-list]').textContent = 'No files selected yet.');
            await loadWorkerJobs();
          } catch (error) {
            if (formStatus) formStatus.textContent = error.message;
          }
        });
      };

      const loadWorkerJobs = async () => {
        const panel = document.querySelector('[data-worker-jobs]');
        const panelStatus = document.querySelector('[data-worker-jobs-status]');
        const jobList = document.querySelector('[data-worker-job-list]');
        if (!panel || !panelStatus || !jobList) return;
        try {
          const response = await fetch('/api/worker/jobs', { headers: { accept: 'application/json' } });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || !result.ok) throw new Error(result.message || 'Assigned jobs are not available.');
          const assignments = result.assignments || [];
          panelStatus.dataset.state = 'ready';
          panelStatus.textContent = assignments.length ? `${assignments.length} assigned job${assignments.length === 1 ? '' : 's'} loaded.` : 'No assigned jobs yet.';
          jobList.innerHTML = assignments.length
            ? assignments.map(renderWorkerJobCard).join('')
            : renderDashboardEmptyState('No assigned jobs yet.', 'Assigned jobs, schedule notes, access details, and before/after upload controls will appear here.');
          refreshVisibleJobFiles();
          const openMetric = document.querySelector('[data-open-requests-metric]');
          if (openMetric && result.summary) openMetric.textContent = String(result.summary.assigned || 0);
          bindWorkerJobActions();
        } catch (error) {
          panelStatus.dataset.state = 'error';
          panelStatus.textContent = error.message;
        }
      };



      const renderAdminInvoiceData = (result) => {
        const status = document.querySelector('[data-admin-invoices-status]');
        const list = document.querySelector('[data-admin-invoice-list]');
        const summaryCards = document.querySelector('[data-admin-invoice-kpi-summary]');
        const invoices = result.invoices || [];
        const amountDue = result.summary?.amountDueCents || 0;

        if (status) {
          status.dataset.state = 'ready';
          status.textContent = invoices.length ? `${invoices.length} invoice${invoices.length === 1 ? '' : 's'} need follow-up. Open balance: ${formatMoney(amountDue)}.` : 'No open invoices need payment follow-up.';
        }
        if (summaryCards) {
          summaryCards.innerHTML = renderAdminInvoiceSummaryCards(invoices);
        }
        if (list) {
          list.innerHTML = invoices.length ? invoices.map((invoice) => renderInvoiceCard(invoice, { admin: true })).join('') : '<p class="session-status">No unpaid invoices found.</p>';
        }
      };

      window.taDashboardActions = window.taDashboardActions || {};
      window.taDashboardActions.bindAdminInvoiceActions = () => {
        const panel = document.querySelector('[data-admin-invoices]');
        if (!panel || panel.dataset.invoiceActionsBound) return;
        panel.dataset.invoiceActionsBound = 'true';
        window.taInvoiceActions?.attachAdminInvoiceActions(panel, {
          loadAdminInvoices: window.taDashboardActions.loadAdminInvoices,
        });
        window.taAdminInvoicePayments?.bindAdminConfirmPaymentActions(panel, {
          formatMoney,
          loadAdminInvoices: window.taDashboardActions.loadAdminInvoices,
        });
      };


      const renderAdminInvoiceSummaryCards = (invoices = []) => {
        const openCount = invoices.filter((invoice) => String(invoice.status || '').toLowerCase() !== 'paid').length;
        const paidCount = invoices.length - openCount;
        const openBalanceCents = invoices
          .filter((invoice) => String(invoice.status || '').toLowerCase() !== 'paid')
          .reduce((sum, invoice) => sum + Number(invoice.balanceDueCents ?? invoice.amountDueCents ?? invoice.amountCents ?? 0), 0);
        return `
          <article class="admin-request"><span class="admin-request-badge">Open invoices</span><strong>${openCount}</strong><p>awaiting payment</p></article>
          <article class="admin-request"><span class="admin-request-badge">Paid invoices</span><strong>${paidCount}</strong><p>closed billing records</p></article>
          <article class="admin-request"><span class="admin-request-badge">Open balance</span><strong>${escapeHtml(formatMoney(openBalanceCents))}</strong><p>outstanding amount</p></article>
        `;
      };

      const renderAdminActivitySummaryCards = (events = []) => {
        const typeCounts = events.reduce((acc, event) => {
          const key = String(event.eventType || event.type || 'other').toLowerCase();
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        const inventoryEvents = Number(typeCounts.inventory || 0);
        const paymentEvents = Number(typeCounts.payment || 0);
        return `
          <article class="admin-request"><span class="admin-request-badge">Loaded events</span><strong>${events.length}</strong><p>currently visible</p></article>
          <article class="admin-request"><span class="admin-request-badge">Inventory events</span><strong>${inventoryEvents}</strong><p>stock and usage updates</p></article>
          <article class="admin-request"><span class="admin-request-badge">Payment events</span><strong>${paymentEvents}</strong><p>billing confirmations</p></article>
        `;
      };

      const renderAdminInventoryWorkspace = () => {
        const list = document.querySelector('[data-admin-inventory-list]');
        const select = document.querySelector('[data-admin-inventory-item-select]');
        const summary = document.querySelector('[data-admin-inventory-summary]');
        if (select) {
          select.innerHTML = '<option value="">Select item</option>' + currentAdminInventoryItems.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)} — ${Number(item.quantityOnHand || 0)} ${escapeHtml(item.unit || '')}</option>`).join('');
        }
        const lowStockCount = currentAdminInventoryItems.filter((item) => String(item.stockStatus || '').toLowerCase() === 'low' || Number(item.quantityOnHand || 0) <= Number(item.reorderPoint || 0)).length;
        const totalUnits = currentAdminInventoryItems.reduce((sum, item) => sum + Number(item.quantityOnHand || 0), 0);
        const categories = new Set(currentAdminInventoryItems.map((item) => String(item.category || 'General').trim()).filter(Boolean)).size;
        if (summary) {
          summary.innerHTML = `
            <article class="admin-request"><span class="admin-request-badge">Active inventory</span><strong>${currentAdminInventoryItems.length}</strong><p>tracked items</p></article>
            <article class="admin-request"><span class="admin-request-badge">Low stock</span><strong>${lowStockCount}</strong><p>items at/under reorder point</p></article>
            <article class="admin-request"><span class="admin-request-badge">Total units</span><strong>${totalUnits}</strong><p>units currently on hand</p></article>
            <article class="admin-request"><span class="admin-request-badge">Categories</span><strong>${categories}</strong><p>organized groups</p></article>
          `;
        }
        if (!list) return;
        list.innerHTML = currentAdminInventoryItems.length ? currentAdminInventoryItems.map((item) => `<article class="admin-request"><strong>${escapeHtml(item.name)}</strong><div class="admin-request-meta"><span class="admin-request-badge">${escapeHtml(item.stockStatus || 'ok')}</span><span>${Number(item.quantityOnHand || 0)} ${escapeHtml(item.unit || '')}</span><span>Reorder: ${Number(item.reorderPoint || 0)}</span></div><p>${escapeHtml(item.category || 'General')}</p></article>`).join('') : '<p class="session-status">No inventory items yet.</p>';
      };

      const loadAdminInventoryWorkspace = async () => {
        const status = document.querySelector('[data-admin-inventory-status]');
        try {
          if (status) status.textContent = 'Loading inventory…';
          const response = await fetch('/api/admin/inventory', { headers: { accept: 'application/json' } });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || !result.ok) throw new Error(result.message || 'Inventory is not available.');
          currentAdminInventoryItems = result.items || [];
          renderAdminInventoryWorkspace();
          if (status) status.textContent = `${currentAdminInventoryItems.length} inventory item${currentAdminInventoryItems.length===1?'':'s'} loaded.`;
        } catch (error) {
          if (status) status.textContent = error.message;
        }
      };

      const bindAdminInventoryWorkspaceActions = () => {
        const createForm = document.querySelector('[data-admin-inventory-create-form]');
        const adjustForm = document.querySelector('[data-admin-inventory-adjust-form]');
        const createModeButton = document.querySelector('[data-admin-inventory-mode="create"]');
        const adjustModeButton = document.querySelector('[data-admin-inventory-mode="adjust"]');
        if (createModeButton && adjustModeButton && createForm && adjustForm) {
          const setMode = (mode) => {
            const isCreate = mode === 'create';
            createForm.hidden = !isCreate;
            adjustForm.hidden = isCreate;
            createModeButton.classList.toggle('btn-primary', isCreate);
            createModeButton.classList.toggle('btn-soft', !isCreate);
            adjustModeButton.classList.toggle('btn-primary', !isCreate);
            adjustModeButton.classList.toggle('btn-soft', isCreate);
          };
          if (!createModeButton.dataset.bound) {
            createModeButton.dataset.bound = 'true';
            createModeButton.addEventListener('click', () => setMode('create'));
          }
          if (!adjustModeButton.dataset.bound) {
            adjustModeButton.dataset.bound = 'true';
            adjustModeButton.addEventListener('click', () => setMode('adjust'));
          }
          setMode('create');
        }
        if (createForm && !createForm.dataset.bound) {
          createForm.dataset.bound = 'true';
          createForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const status = document.querySelector('[data-admin-inventory-form-status]');
            const payload = Object.fromEntries(new FormData(createForm).entries());
            try {
              if (status) status.textContent = 'Saving item…';
              const response = await fetch('/api/admin/inventory', { method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' }, body: JSON.stringify(payload) });
              const result = await response.json().catch(() => ({}));
              if (!response.ok || !result.ok) throw new Error(result.message || 'Could not add item.');
              createForm.reset();
              if (status) status.textContent = 'Item added.';
              await loadAdminInventoryWorkspace();
            } catch (error) { if (status) status.textContent = error.message; }
          });
        }
        if (adjustForm && !adjustForm.dataset.bound) {
          adjustForm.dataset.bound = 'true';
          adjustForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const status = document.querySelector('[data-admin-inventory-adjust-status]');
            const payload = Object.fromEntries(new FormData(adjustForm).entries());
            payload.quantityDelta = Number(payload.quantityDelta || 0);
            try {
              if (status) status.textContent = 'Applying adjustment…';
              const response = await fetch('/api/admin/inventory', { method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' }, body: JSON.stringify(payload) });
              const result = await response.json().catch(() => ({}));
              if (!response.ok || !result.ok) throw new Error(result.message || 'Could not apply adjustment.');
              adjustForm.reset();
              if (status) status.textContent = 'Adjustment recorded.';
              await loadAdminInventoryWorkspace();
            } catch (error) { if (status) status.textContent = error.message; }
          });
        }
      };



      window.taDashboardActions.loadAdminInvoices = async () => {
        const panel = document.querySelector('[data-admin-invoices]');
        const status = document.querySelector('[data-admin-invoices-status]');
        const list = document.querySelector('[data-admin-invoice-list]');
        if (!panel || !status || !list) return;

        try {
          const response = await fetch('/api/admin/invoices', { headers: { accept: 'application/json' } });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || !result.ok) throw new Error(result.message || 'Admin invoices are not available.');
          renderAdminInvoiceData(result);
          window.taDashboardActions.bindAdminInvoiceActions();
        } catch (error) {
          status.dataset.state = 'error';
          status.textContent = error.message;
        }
      };

      const loadAdminRequests = async (selectedRequestId = '') => {
        const inbox = document.querySelector('[data-admin-inbox]');
        const inboxStatus = document.querySelector('[data-admin-requests-status]');
        const inboxList = document.querySelector('[data-admin-request-list]');
        const pipelineSummary = document.querySelector('[data-admin-pipeline-summary]');
        const openMetric = document.querySelector('[data-open-requests-metric]');
        const scopeFilter = document.querySelector('[data-admin-request-scope-filter]');

        if (!inbox || !inboxStatus || !inboxList) {
          return;
        }

        try {
          const scope = scopeFilter?.value || 'active';
          const response = await fetch(`/api/admin/job-requests?scope=${encodeURIComponent(scope)}`, { headers: { accept: 'application/json' } });
          const result = await response.json().catch(() => ({}));

          if (!response.ok || !result.ok) {
            throw new Error(result.message || 'Admin request inbox is not available.');
          }

          const requests = result.requests || [];
          currentAdminRequestScope = result.scope || scope;
          const openCount = requests.filter((request) => request.status !== 'completed' && request.status !== 'cancelled').length;
          const scopeLabel = currentAdminRequestScope === 'completed' ? 'completed history' : currentAdminRequestScope === 'all' ? 'total history' : 'active';
          inboxStatus.dataset.state = 'ready';
          inboxStatus.textContent = requests.length ? `${requests.length} ${scopeLabel} request${requests.length === 1 ? '' : 's'} loaded.` : `No ${scopeLabel} job requests yet.`;
          if (pipelineSummary) {
            pipelineSummary.innerHTML = renderAdminPipelineSummary(result.statusCounts || {});
          }
          bindAdminRequestFilters();

          if (openMetric) {
            openMetric.textContent = String(openCount);
          }

          currentAdminRequests.clear();
          currentAdminWorkers.clear();
          currentAdminAssignments.clear();
          currentAdminQuotes.clear();
          requests.forEach((request) => currentAdminRequests.set(request.id, request));
          (result.workers || []).forEach((worker) => currentAdminWorkers.set(worker.id, worker));
          (result.assignments || []).forEach((assignment) => currentAdminAssignments.set(assignment.id, assignment));
          (result.quotes || []).forEach((quote) => currentAdminQuotes.set(quote.id, quote));
          const workerSelect = document.querySelector('[data-admin-assignment-worker]');
          if (workerSelect) {
            const selectedWorker = workerSelect.value;
            workerSelect.innerHTML = '<option value="">Select a worker</option>' + [...currentAdminWorkers.values()].map((worker) => `<option value="${escapeHtml(worker.id)}">${escapeHtml(worker.fullName || worker.email || 'Worker')}</option>`).join('');
            workerSelect.value = currentAdminWorkers.has(selectedWorker) ? selectedWorker : '';
          }
          applyAdminRequestFilters();

          if (selectedRequestId && currentAdminRequests.has(selectedRequestId)) {
            selectAdminRequest(selectedRequestId);
          }
        } catch (error) {
          inboxStatus.dataset.state = 'error';
          inboxStatus.textContent = error.message;
        }
      };

      bindLogout();

      try {
        await verifyDashboardMagicLinkToken();
      } catch (error) {
        status.dataset.state = 'error';
        status.innerHTML = `${escapeHtml(error.message)} <a href="/login/">Request a new magic link</a>.`;
        if (accountStatus) accountStatus.textContent = 'Magic-link sign-in failed.';
        return;
      }

      status.dataset.state = 'loading';
      status.textContent = 'Checking secure session…';
      if (accountStatus) accountStatus.textContent = 'Checking secure session…';

      fetchJson('/api/me')
        .then(async ({ response, result }) => {
          if (!response.ok || !result.authenticated) {
            status.dataset.state = 'error';
            status.textContent = authDebugEnabled ? 'Not signed in. Login debug is shown below.' : 'Redirecting to secure magic-link sign in…';
            if (accountStatus) accountStatus.textContent = authDebugEnabled ? 'Not signed in — review login debug below.' : 'Not signed in — opening secure login…';
            if (authDebugEnabled) {
              const debugResult = await loadAuthDebug(result.message || 'The dashboard /api/me check says you are not authenticated.', { recoverMainDashboard: true });
              if (debugResult?.canUseSession) return;
            } else {
              const recoveredUser = await recoverMainDashboardSilently(result.message || 'The dashboard /api/me check says you are not authenticated.');
              if (recoveredUser) return;
              window.location.replace('/login/?next=dashboard');
            }
            return;
          }

          let dashboardUser = result.user;
          if (!authDebugEnabled) {
            dashboardUser = await enrichDashboardUserFromDebug(dashboardUser);
          }
          dashboardUser.permissions = getDashboardPermissions(dashboardUser);
          updateDebugDashboardLink(dashboardUser);

          status.dataset.state = 'ready';
          status.textContent = `Signed in as ${getUserDisplayName(result.user)}`;
          if (accountStatus) accountStatus.textContent = `Signed in: ${getUserDisplayName(dashboardUser)}`;
          if (authDebugEnabled) {
            loadAuthDebug('/api/me says this browser is authenticated. Showing the cookie/database details for confirmation.');
          }

          if (logoutButton) {
            logoutButton.hidden = false;
          }

          configureSignedInDashboard(dashboardUser);

          try {
            renderClientProfile(dashboardUser);
            bindClientProfileButton();
            bindClientProfileForm();
            bindRequestEstimateLink();
          } catch (setupError) {
            console.error('Dashboard setup failed after successful session check', setupError);
          }

          try {
            loadAuthorizedDashboardTools(dashboardUser);
          } catch (toolError) {
            console.error('Dashboard tool loading failed after successful session check', toolError);
          }
        })
        .catch(async (error) => {
          status.dataset.state = 'error';
          status.textContent = authDebugEnabled ? 'Session check failed. Login debug is shown below.' : 'Session check is unavailable. Refresh the page or request a new magic link.';
          if (accountStatus) accountStatus.textContent = authDebugEnabled ? 'Session check failed — review login debug below.' : 'Session check unavailable.';
          if (authDebugEnabled) {
            const debugResult = await loadAuthDebug(error.message || 'The dashboard /api/me request failed.', { recoverMainDashboard: true });
            if (debugResult?.canUseSession) return;
          } else {
            const recoveredUser = await recoverMainDashboardSilently(error.message || 'The dashboard /api/me request failed.');
            if (recoveredUser) return;
          }
          status.innerHTML = 'Session check is unavailable. Refresh the page or <a href="/login/">request a new magic link</a>.';
        });
    })();
  

    

    window.taWorkspaceRoute?.applyWorkspaceRoute();
