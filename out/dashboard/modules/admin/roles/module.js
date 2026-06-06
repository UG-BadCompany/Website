(() => {
  const escapeHtml = (value = '') => String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[char]));
  const asArray = (value) => Array.isArray(value) ? value : value ? [value] : [];
  const protectedKeys = new Set(['owner', 'admin', 'manager', 'worker', 'client', 'guest']);
  const workspaceDefs = [
    ['owner', '👑 Owner'], ['admin', '🛠 Admin'], ['manager', '📋 Manager'], ['worker', '👷 Worker'], ['client', '🏠 Client'],
  ];
  const workspacePermission = (workspace) => `dashboard.view.${workspace}`;

  window.TAModules.register({
    id: 'admin.roles',
    role: 'admin',
    title: 'Roles / Ranks',
    icon: '🛡️',
    permissions: ['roles.manage', 'admin.roles.manage'],
    async mount(context = {}) { const { api, router } = context; const mountRoot = window.TAModuleRoot.resolve(context); if (!mountRoot?.querySelector) throw new TypeError('Module root element was not found.'); const root = mountRoot;
      const isOwnerConsolidated = router?.state?.currentModule === 'owner.permissions-workspaces';
      let data = { roles: [], permissions: [] };
      let activeTab = 'roles';
      const requireForms = () => {
        if (window.TAForms?.values && window.TAForms?.checkedValues) return true;
        const message = 'Required form utility failed to load. Refresh the page or contact admin.';
        const status = mountRoot.querySelector('#role-status');
        if (status) status.textContent = message;
        window.TAUi?.toast?.(message, 'error');
        return false;
      };
      const groups = ['Dashboard', 'Workspaces', 'Users', 'Roles/Ranks', 'Company', 'Branding', 'Requests', 'Quotes', 'Invoices', 'Customers', 'Workers', 'Scheduling', 'Inventory', 'AI Quoting', 'AI Troubleshooting', 'Reports', 'Settings'];
      const groupFor = (key = '') => key.startsWith('dashboard') ? 'Dashboard' : key.startsWith('workspace') ? 'Workspaces' : key.startsWith('users') ? 'Users' : key.startsWith('roles') || key.startsWith('ranks') || key.startsWith('permissions') ? 'Roles/Ranks' : key.startsWith('company') ? 'Company' : key.startsWith('branding') ? 'Branding' : key.startsWith('requests') ? 'Requests' : key.startsWith('quotes') ? 'Quotes' : key.startsWith('invoices') ? 'Invoices' : key.startsWith('customers') ? 'Customers' : key.startsWith('workers') ? 'Workers' : key.startsWith('scheduling') || key.startsWith('schedule') ? 'Scheduling' : key.startsWith('inventory') ? 'Inventory' : key.startsWith('ai.quote') ? 'AI Quoting' : key.startsWith('ai.troubleshooting') ? 'AI Troubleshooting' : key.startsWith('reports') ? 'Reports' : 'Settings';
      const workspaceAccess = (role) => workspaceDefs.filter(([workspace]) => asArray(role.permissions).includes(workspacePermission(workspace)) || role.key === workspace || role.key === 'owner').map(([workspace]) => workspace);
      const usersAssigned = (role) => Number(role.userCount ?? role.user_count ?? asArray(role.users).length ?? 0);
      const title = isOwnerConsolidated ? 'Permissions & Workspaces' : 'Roles & Permissions';
      const description = isOwnerConsolidated
        ? 'The single owner workspace for roles, permissions, workspace access, role access, and workspace access matrix controls.'
        : 'Create, clone, edit, delete unused custom roles, and manage grouped permissions.';

      const load = async () => {
        mountRoot.innerHTML = '<article class="card module-loading"><h3>Loading permissions</h3><p>Preparing roles, permission keys, and workspace access matrix.</p></article>';
        try {
          data = await api.get('/api/admin/roles');
          data.roles = asArray(data.roles);
          data.permissions = asArray(data.permissions);
          render();
        } catch (error) {
          mountRoot.innerHTML = `<section class="module-page stack"><article class="card module-error"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(error.message || 'Unable to load roles')}</p><button class="btn secondary" type="button" id="retry-roles">Retry</button></article></section>`;
          mountRoot.querySelector('#retry-roles')?.addEventListener('click', load);
        }
      };

      const tabs = () => [
        ['roles', 'Roles'], ['permissions', 'Permissions'], ['workspace-access', 'Workspace Access'], ['role-matrix', 'Role Matrix'],
      ];
      const tabsHtml = () => `<div class="module-tabs">${tabs().map(([key, label]) => `<button class="btn secondary ${activeTab === key ? 'active' : ''}" type="button" data-permission-tab="${key}">${label}</button>`).join('')}</div>`;

      const roleCard = (role) => {
        const permissions = asArray(role.permissions);
        const isProtected = protectedKeys.has(role.key) || role.isSystem;
        const access = workspaceAccess(role);
        return `<article class="role-card module-card ${isProtected ? 'protected' : ''}">
          <div class="role-card-head"><div><h3>${escapeHtml(role.name || role.key || 'Role')}</h3><p>${escapeHtml(role.description || 'Permission group for dashboard workspace access.')}</p></div><span class="status-badge ${role.isSystem ? 'warning' : 'success'}">${role.isSystem ? 'System role' : 'Custom role'}</span></div>
          <div class="role-meta-grid">
            <div class="meta-tile"><small>Key</small><strong>${escapeHtml(role.key || 'custom')}</strong></div>
            <div class="meta-tile"><small>Permissions</small><strong>${permissions.length}</strong></div>
            <div class="meta-tile"><small>Workspace access</small><strong>${access.length ? access.map((workspace) => workspace[0].toUpperCase() + workspace.slice(1)).join(', ') : 'None'}</strong></div>
            <div class="meta-tile"><small>Users assigned</small><strong>${usersAssigned(role)}</strong></div>
          </div>
          <div class="action-row">
            <button class="btn secondary" type="button" data-edit-role="${escapeHtml(role.id)}" ${role.canEdit === false ? 'disabled title="Only Owner can modify this role."' : ''}>Edit Role</button>
            <button class="btn secondary" type="button" data-clone-role="${escapeHtml(role.id)}" ${role.canEdit === false ? 'disabled title="Only Owner can clone this role."' : ''}>Clone Role</button>
            ${role.canDelete ? `<button class="btn danger" type="button" data-delete-role="${escapeHtml(role.id)}">Delete Custom Role</button>` : `<button class="btn secondary" type="button" disabled title="Only lower custom roles can be deleted.">${role.key === 'owner' ? 'Owner Protected' : 'Protected'}</button>`}
          </div>
        </article>`;
      };

      const renderRoles = () => `<section class="stack"><div class="module-actions action-row"><button class="btn" type="button" id="new-role">Create Role</button></div><div class="role-card-grid">${data.roles.map(roleCard).join('') || '<article class="card module-empty"><h3>No roles found</h3><p>Create a custom role or verify the roles endpoint.</p></article>'}</div></section>`;

      const renderPermissions = () => `<section class="stack"><div class="card module-section"><h3>Permissions</h3><p>Permission keys grouped by product area. Open a role to assign or clear permissions.</p></div><div class="module-grid">${groups.map((group) => {
        const count = data.permissions.filter((permission) => groupFor(permission.key) === group).length;
        return `<article class="module-card card"><h3>${escapeHtml(group)}</h3><p>${count} permission key${count === 1 ? '' : 's'} available.</p></article>`;
      }).join('')}</div></section>`;

      const renderWorkspaceAccess = () => `<section class="stack"><div class="card module-section"><h3>Workspace Access</h3><p>Workspace access is controlled by dashboard view permissions and role defaults. Edit a role to assign access.</p></div><div class="module-grid">${workspaceDefs.map(([workspace, label]) => {
        const roles = data.roles.filter((role) => workspaceAccess(role).includes(workspace));
        return `<article class="module-card card"><h3>${label}</h3><p>${roles.length ? roles.map((role) => escapeHtml(role.name || role.key)).join(', ') : 'No roles currently grant this workspace.'}</p></article>`;
      }).join('')}</div></section>`;

      const renderMatrix = () => `<section class="card module-section stack"><h3>Role Access Matrix</h3><div class="table-wrap"><table><thead><tr><th>Role</th>${workspaceDefs.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join('')}<th>Permissions</th><th>Users Assigned</th></tr></thead><tbody>${data.roles.map((role) => {
        const access = workspaceAccess(role);
        return `<tr><td><strong>${escapeHtml(role.name || role.key)}</strong><br><small>${escapeHtml(role.key)}</small></td>${workspaceDefs.map(([workspace]) => `<td>${access.includes(workspace) ? '✅' : '—'}</td>`).join('')}<td>${asArray(role.permissions).length}</td><td>${usersAssigned(role)}</td></tr>`;
      }).join('')}</tbody></table></div></section>`;

      const renderActiveTab = () => activeTab === 'permissions' ? renderPermissions() : activeTab === 'workspace-access' ? renderWorkspaceAccess() : activeTab === 'role-matrix' ? renderMatrix() : renderRoles();

      const render = () => {
        const systemRoles = data.roles.filter((role) => role.isSystem || protectedKeys.has(role.key)).length;
        mountRoot.innerHTML = `<section class="module-page stack permissions-workspaces-page">
          <div class="card module-header"><div><p class="eyebrow">${isOwnerConsolidated ? 'Owner Workspace' : 'Admin Workspace'}</p><h2 class="module-title">🛡️ ${escapeHtml(title)}</h2><p class="module-description">${escapeHtml(description)}</p></div></div>
          <div class="module-stat-grid"><article class="module-stat stat-card"><span>🛡️</span><strong>${data.roles.length}</strong><small>Total Roles</small></article><article class="module-stat stat-card"><span>🔒</span><strong>${systemRoles}</strong><small>Protected/System</small></article><article class="module-stat stat-card"><span>✅</span><strong>${data.permissions.length}</strong><small>Permission Keys</small></article><article class="module-stat stat-card"><span>🧩</span><strong>${workspaceDefs.length}</strong><small>Workspaces</small></article></div>
          <div class="card module-section stack">${tabsHtml()}<div data-permission-panel>${renderActiveTab()}</div></div>
        </section>`;
        bindListActions();
        mountRoot.querySelectorAll('[data-permission-tab]').forEach((button) => button.addEventListener('click', () => { activeTab = button.dataset.permissionTab; render(); }));
      };

      const bindListActions = () => {
        mountRoot.querySelector('#new-role')?.addEventListener('click', () => editor());
        mountRoot.querySelectorAll('[data-edit-role]').forEach((button) => button.addEventListener('click', () => editor(data.roles.find((role) => String(role.id) === button.dataset.editRole))));
        mountRoot.querySelectorAll('[data-clone-role]').forEach((button) => button.addEventListener('click', () => {
          const role = data.roles.find((item) => String(item.id) === button.dataset.cloneRole);
          editor({ ...role, id: null, key: `${role.key}-copy`, name: `${role.name} Copy`, isSystem: false });
        }));
        mountRoot.querySelectorAll('[data-delete-role]').forEach((button) => button.addEventListener('click', async () => {
          if (confirm('Delete unused custom role?')) {
            await api.delete('/api/admin/roles', { roleId: button.dataset.deleteRole });
            window.TAUi?.toast('Role deleted.', 'success');
            await load();
          }
        }));
      };

      const setGroup = (group, checked) => mountRoot.querySelectorAll('[data-group]:not(:disabled)').forEach((input) => { if (input.dataset.group === group) input.checked = checked; });
      const editor = (role = { permissions: [] }) => {
        let unsaved = false;
        const currentPermissions = new Set(asArray(role.permissions));
        const roleOptions = data.roles.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join('');
        const permissionFieldsets = groups.map((group) => {
          const groupPermissions = data.permissions.filter((permission) => groupFor(permission.key) === group);
          if (!groupPermissions.length) return '';
          return `<fieldset class="card module-card stack"><legend>${escapeHtml(group)}</legend><div class="action-row"><button class="btn secondary" type="button" data-select-group="${escapeHtml(group)}">Select Group</button><button class="btn secondary" type="button" data-clear-group="${escapeHtml(group)}">Clear Group</button></div><div class="module-grid">${groupPermissions.map((permission) => { const locked = permission.canGrant === false; return `<label class="pill" title="${locked ? 'You do not currently have this permission.' : 'Permission can be granted.'}"><input type="checkbox" name="permissions" data-group="${escapeHtml(group)}" value="${escapeHtml(permission.key)}" ${currentPermissions.has(permission.key) ? 'checked' : ''} ${locked ? 'disabled' : ''}> ${escapeHtml(permission.key)}${locked ? ' 🔒' : ''}</label>`; }).join('')}</div></fieldset>`;
        }).join('');
        const workspaceControls = workspaceDefs.map(([workspace, label]) => { const key = workspacePermission(workspace); const permission = data.permissions.find((item) => item.key === key); const locked = permission?.canGrant === false; return `<label class="pill" title="${locked ? 'Only Owner can grant this permission or you do not currently have it.' : 'Workspace access permission'}"><input type="checkbox" name="permissions" data-workspace-access="${workspace}" value="${key}" ${currentPermissions.has(key) || role.key === workspace || role.key === 'owner' ? 'checked' : ''} ${locked ? 'disabled' : ''}> ${escapeHtml(label)}${locked ? ' 🔒' : ''}</label>`; }).join('');
        mountRoot.innerHTML = `<section class="module-page stack"><form class="card module-section stack" data-role-editor><div class="module-header"><div><p class="eyebrow">${escapeHtml(title)}</p><h2 class="module-title">${role.id ? 'Edit' : 'Create'} Role</h2><p class="module-description">Assign permissions and workspace access from one consolidated owner workspace.</p></div></div><div class="form-grid"><label class="field"><span>Name</span><input name="name" value="${escapeHtml(role.name || '')}" placeholder="Role name"></label><label class="field"><span>Key</span><input name="key" value="${escapeHtml(role.key || '')}" placeholder="role-key" ${role.id ? 'readonly' : ''}></label><label class="field"><span>Description</span><input name="description" value="${escapeHtml(role.description || '')}" placeholder="Role description"></label><label class="field"><span>Copy Permissions From Existing Role</span><select id="copy-permissions"><option value="">Choose role...</option>${roleOptions}</select></label></div><section class="card module-card stack"><h3>Workspace Access</h3><p>These controls map to dashboard view permissions. Roles cannot be granted permissions above the editor's current access level.</p><div class="module-grid">${workspaceControls}</div></section><div class="action-row"><button class="btn secondary" type="button" id="select-all-permissions">Select All Permissions</button><button class="btn secondary" type="button" id="clear-all-permissions">Clear Permissions</button></div><h3>Permissions</h3>${permissionFieldsets || '<article class="module-empty"><h3>No permissions available</h3><p>The backend did not return permission keys for editing.</p></article>'}<p class="notice" id="role-status">Ready to save grouped permission and workspace changes.</p><div class="action-row"><button class="btn" type="submit" id="save-role">Save Changes</button><button class="btn secondary" type="button" id="cancel-role">Cancel</button></div></form></section>`;
        const markUnsaved = () => { unsaved = true; };
        mountRoot.querySelectorAll('input, select').forEach((element) => element.addEventListener('change', markUnsaved));
        mountRoot.querySelector('#select-all-permissions').addEventListener('click', () => { mountRoot.querySelectorAll('[name="permissions"]:not(:disabled)').forEach((input) => { input.checked = true; }); markUnsaved(); });
        mountRoot.querySelector('#clear-all-permissions').addEventListener('click', () => { mountRoot.querySelectorAll('[name="permissions"]:not(:disabled)').forEach((input) => { input.checked = false; }); markUnsaved(); });
        mountRoot.querySelectorAll('[data-select-group]').forEach((button) => button.addEventListener('click', () => { setGroup(button.dataset.selectGroup, true); markUnsaved(); }));
        mountRoot.querySelectorAll('[data-clear-group]').forEach((button) => button.addEventListener('click', () => { setGroup(button.dataset.clearGroup, false); markUnsaved(); }));
        mountRoot.querySelector('#copy-permissions').addEventListener('change', (event) => { const source = data.roles.find((item) => String(item.id) === event.target.value); if (!source) return; const sourcePermissions = new Set(asArray(source.permissions)); mountRoot.querySelectorAll('[name="permissions"]:not(:disabled)').forEach((input) => { input.checked = sourcePermissions.has(input.value); }); markUnsaved(); });
        mountRoot.querySelector('#cancel-role').addEventListener('click', () => { if (!unsaved || confirm('Discard unsaved changes?')) render(); });
        mountRoot.querySelector('[data-role-editor]').addEventListener('submit', async (event) => { event.preventDefault(); if (!requireForms()) return; const payload = window.TAForms.values(mountRoot.querySelector('[data-role-editor]')); payload.permissions = window.TAForms.checkedValues(root, 'permissions'); payload.workspaceAccess = workspaceDefs.filter(([workspace]) => payload.permissions.includes(workspacePermission(workspace))).map(([workspace]) => workspace); if (role.id) payload.roleId = role.id; const saveButton = mountRoot.querySelector('#save-role'); mountRoot.querySelector('#role-status').textContent = 'Saving role, workspace access, and permission assignments...'; saveButton.disabled = true; saveButton.textContent = 'Saving...'; try { await api[role.id ? 'patch' : 'post']('/api/admin/roles', payload); window.TAUi?.toast('Role permissions and workspace access saved.', 'success'); unsaved = false; await load(); } catch (error) { mountRoot.querySelector('#role-status').textContent = error.message || 'Role save failed.'; window.TAUi?.toast(error.message || 'Role save failed.', 'error'); saveButton.disabled = false; saveButton.textContent = 'Save Changes'; } });
      };
      await load();
    },
    async destroy() {},
    async refresh() {},
  });
})();
