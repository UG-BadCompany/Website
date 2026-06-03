(() => {
  const escapeHtml = (value = '') => String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[char]));
  const asArray = (value) => Array.isArray(value) ? value : value ? [value] : [];
  const protectedKeys = new Set(['owner', 'admin', 'manager', 'worker', 'client', 'guest']);

  window.TAModules.register({
    id: 'admin.roles',
    role: 'admin',
    title: 'Roles / Ranks',
    icon: '🛡️',
    permissions: ['roles.manage', 'admin.roles.manage'],
    async mount({ root, api }) {
      let data = { roles: [], permissions: [] };
      const groups = ['Dashboard', 'Workspaces', 'Users', 'Roles/Ranks', 'Company', 'Branding', 'Requests', 'Quotes', 'Invoices', 'Customers', 'Workers', 'Scheduling', 'Inventory', 'AI Quoting', 'AI Troubleshooting', 'Reports', 'Settings'];
      const groupFor = (key = '') => key.startsWith('dashboard') ? 'Dashboard' : key.startsWith('workspace') ? 'Workspaces' : key.startsWith('users') ? 'Users' : key.startsWith('roles') || key.startsWith('ranks') || key.startsWith('permissions') ? 'Roles/Ranks' : key.startsWith('company') ? 'Company' : key.startsWith('branding') ? 'Branding' : key.startsWith('requests') ? 'Requests' : key.startsWith('quotes') ? 'Quotes' : key.startsWith('invoices') ? 'Invoices' : key.startsWith('customers') ? 'Customers' : key.startsWith('workers') ? 'Workers' : key.startsWith('scheduling') || key.startsWith('schedule') ? 'Scheduling' : key.startsWith('inventory') ? 'Inventory' : key.startsWith('ai.quote') ? 'AI Quoting' : key.startsWith('ai.troubleshooting') ? 'AI Troubleshooting' : key.startsWith('reports') ? 'Reports' : 'Settings';
      const workspaceCount = (role) => new Set(asArray(role.workspaceAccess || role.workspaces).concat(asArray(role.permissions).filter((permission) => permission.includes('workspace') || permission.includes('dashboard.view')))).size;
      const usersAssigned = (role) => Number(role.userCount ?? role.user_count ?? asArray(role.users).length ?? 0);

      const load = async () => {
        root.innerHTML = '<article class="card module-loading"><h3>Loading roles</h3><p>Preparing permission matrix and role/rank cards.</p></article>';
        try {
          data = await api.get('/api/admin/roles');
          data.roles = asArray(data.roles);
          data.permissions = asArray(data.permissions);
          render();
        } catch (error) {
          root.innerHTML = `<section class="module-page stack"><article class="card module-error"><h2>Roles / Ranks</h2><p>${escapeHtml(error.message || 'Unable to load roles')}</p><button class="btn secondary" type="button" id="retry-roles">Retry</button></article></section>`;
          root.querySelector('#retry-roles')?.addEventListener('click', load);
        }
      };

      const roleCard = (role) => {
        const permissions = asArray(role.permissions);
        const isProtected = protectedKeys.has(role.key) || role.isSystem;
        return `<article class="role-card module-card ${isProtected ? 'protected' : ''}">
          <div class="role-card-head">
            <div>
              <h3>${escapeHtml(role.name || role.key || 'Role')}</h3>
              <p>${escapeHtml(role.description || 'Permission group for dashboard workspace access.')}</p>
            </div>
            <span class="status-badge ${role.isSystem ? 'warning' : 'success'}">${role.isSystem ? 'System role' : 'Custom role'}</span>
          </div>
          <div class="role-meta-grid">
            <div class="meta-tile"><small>Key</small><strong>${escapeHtml(role.key || 'custom')}</strong></div>
            <div class="meta-tile"><small>Permissions</small><strong>${permissions.length}</strong></div>
            <div class="meta-tile"><small>Workspace access</small><strong>${workspaceCount(role)}</strong></div>
            <div class="meta-tile"><small>Users assigned</small><strong>${usersAssigned(role)}</strong></div>
          </div>
          <div class="action-row">
            <button class="btn secondary" type="button" data-edit-role="${escapeHtml(role.id)}">Edit Permissions</button>
            <button class="btn secondary" type="button" data-clone-role="${escapeHtml(role.id)}">Clone Existing Role</button>
            ${!role.isSystem && role.key !== 'owner' ? `<button class="btn danger" type="button" data-delete-role="${escapeHtml(role.id)}">Delete</button>` : `<button class="btn secondary" type="button" disabled>${role.key === 'owner' ? 'Owner Protected' : 'Protected'}</button>`}
          </div>
        </article>`;
      };

      const render = () => {
        const systemRoles = data.roles.filter((role) => role.isSystem || protectedKeys.has(role.key)).length;
        root.innerHTML = `<section class="module-page stack permission-matrix-page">
          <div class="card module-header">
            <div>
              <p class="eyebrow">Permission Matrix</p>
              <h2 class="module-title">🛡️ Roles / Ranks</h2>
              <p class="module-description">Create, clone, edit, delete unused custom roles, and manage grouped permissions with readable, protected role cards.</p>
            </div>
            <div class="module-actions action-row"><button class="btn" type="button" id="new-role">Create Role/Rank</button></div>
          </div>
          <div class="module-stat-grid">
            <article class="module-stat stat-card"><span>🛡️</span><strong>${data.roles.length}</strong><small>Total Roles</small></article>
            <article class="module-stat stat-card"><span>🔒</span><strong>${systemRoles}</strong><small>Protected/System</small></article>
            <article class="module-stat stat-card"><span>✅</span><strong>${data.permissions.length}</strong><small>Permission Keys</small></article>
            <article class="module-stat stat-card"><span>👥</span><strong>${data.roles.reduce((total, role) => total + usersAssigned(role), 0)}</strong><small>Assigned Users</small></article>
          </div>
          <div class="role-card-grid">${data.roles.map(roleCard).join('') || '<article class="card module-empty"><h3>No roles found</h3><p>Create a custom role or verify the roles endpoint.</p></article>'}</div>
        </section>`;
        root.querySelector('#new-role').addEventListener('click', () => editor());
        root.querySelectorAll('[data-edit-role]').forEach((button) => button.addEventListener('click', () => editor(data.roles.find((role) => String(role.id) === button.dataset.editRole))));
        root.querySelectorAll('[data-clone-role]').forEach((button) => button.addEventListener('click', () => {
          const role = data.roles.find((item) => String(item.id) === button.dataset.cloneRole);
          editor({ ...role, id: null, key: `${role.key}-copy`, name: `${role.name} Copy`, isSystem: false });
        }));
        root.querySelectorAll('[data-delete-role]').forEach((button) => button.addEventListener('click', async () => {
          if (confirm('Delete unused custom role?')) {
            await api.delete('/api/admin/roles', { roleId: button.dataset.deleteRole });
            window.TAUi?.toast('Role deleted.', 'success');
            await load();
          }
        }));
      };

      const setGroup = (group, checked) => root.querySelectorAll('[data-group]').forEach((input) => { if (input.dataset.group === group) input.checked = checked; });

      const editor = (role = { permissions: [] }) => {
        let unsaved = false;
        const roleOptions = data.roles.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join('');
        const permissionFieldsets = groups.map((group) => {
          const groupPermissions = data.permissions.filter((permission) => groupFor(permission.key) === group);
          if (!groupPermissions.length) return '';
          return `<fieldset class="card module-card stack"><legend>${escapeHtml(group)}</legend>
            <div class="action-row"><button class="btn secondary" type="button" data-select-group="${escapeHtml(group)}">Select Group</button><button class="btn secondary" type="button" data-clear-group="${escapeHtml(group)}">Clear Group</button></div>
            <div class="module-grid">${groupPermissions.map((permission) => `<label class="pill"><input type="checkbox" name="permissions" data-group="${escapeHtml(group)}" value="${escapeHtml(permission.key)}" ${asArray(role.permissions).includes(permission.key) ? 'checked' : ''}> ${escapeHtml(permission.key)}</label>`).join('')}</div>
          </fieldset>`;
        }).join('');
        root.innerHTML = `<section class="module-page stack"><form class="card module-section stack" data-role-editor>
          <div class="module-header">
            <div>
              <p class="eyebrow">Permission Matrix</p>
              <h2 class="module-title">${role.id ? 'Edit' : 'Create'} Role / Rank</h2>
              <p class="module-description">Bulk controls and grouped permissions stay visually clear in dark and light themes.</p>
            </div>
          </div>
          <div class="form-grid">
            <label class="field"><span>Name</span><input name="name" value="${escapeHtml(role.name || '')}" placeholder="Role name"></label>
            <label class="field"><span>Key</span><input name="key" value="${escapeHtml(role.key || '')}" placeholder="role-key" ${role.id ? 'readonly' : ''}></label>
            <label class="field"><span>Description</span><input name="description" value="${escapeHtml(role.description || '')}" placeholder="Role description"></label>
            <label class="field"><span>Copy From Existing Role</span><select id="copy-permissions"><option value="">Choose role...</option>${roleOptions}</select></label>
          </div>
          <div class="action-row"><button class="btn secondary" type="button" id="select-all-permissions">Select All Permissions</button><button class="btn secondary" type="button" id="clear-all-permissions">Clear All Permissions</button></div>
          <h3>Grouped Permissions</h3>
          ${permissionFieldsets || '<article class="module-empty"><h3>No permissions available</h3><p>The backend did not return permission keys for editing.</p></article>'}
          <p class="notice" id="role-status">Ready to save grouped permission changes.</p>
          <div class="action-row"><button class="btn" type="submit" id="save-role">Save Changes</button><button class="btn secondary" type="button" id="cancel-role">Cancel</button></div>
        </form></section>`;
        const markUnsaved = () => { unsaved = true; };
        root.querySelectorAll('input, select').forEach((element) => element.addEventListener('change', markUnsaved));
        root.querySelector('#select-all-permissions').addEventListener('click', () => { root.querySelectorAll('[name="permissions"]').forEach((input) => { input.checked = true; }); markUnsaved(); });
        root.querySelector('#clear-all-permissions').addEventListener('click', () => { root.querySelectorAll('[name="permissions"]').forEach((input) => { input.checked = false; }); markUnsaved(); });
        root.querySelectorAll('[data-select-group]').forEach((button) => button.addEventListener('click', () => { setGroup(button.dataset.selectGroup, true); markUnsaved(); }));
        root.querySelectorAll('[data-clear-group]').forEach((button) => button.addEventListener('click', () => { setGroup(button.dataset.clearGroup, false); markUnsaved(); }));
        root.querySelector('#copy-permissions').addEventListener('change', (event) => {
          const source = data.roles.find((item) => String(item.id) === event.target.value);
          if (!source) return;
          const sourcePermissions = new Set(asArray(source.permissions));
          root.querySelectorAll('[name="permissions"]').forEach((input) => { input.checked = sourcePermissions.has(input.value); });
          markUnsaved();
        });
        root.querySelector('#cancel-role').addEventListener('click', () => { if (!unsaved || confirm('Discard unsaved changes?')) render(); });
        root.querySelector('[data-role-editor]').addEventListener('submit', async (event) => {
          event.preventDefault();
          const payload = window.TAForms.values(root.querySelector('[data-role-editor]'));
          payload.permissions = window.TAForms.checkedValues(root, 'permissions');
          if (role.id) payload.roleId = role.id;
          root.querySelector('#role-status').textContent = 'Saving permission changes...';
          await api[role.id ? 'patch' : 'post']('/api/admin/roles', payload);
          window.TAUi?.toast('Role permissions saved.', 'success');
          await load();
        });
      };

      await load();
    },
    async destroy() {},
    async refresh() {},
  });
})();
