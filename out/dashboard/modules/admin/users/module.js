(() => {
  const escapeHtml = (value = '') => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const asArray = (value) => Array.isArray(value) ? value : value ? [value] : [];
  const fmtDate = (value) => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded';
  const workspaceDefs = [['owner','👑 Owner'], ['admin','🛠 Admin'], ['manager','📋 Manager'], ['worker','👷 Worker'], ['client','🏠 Client']];
  const workspacePermission = (workspace) => `dashboard.view.${workspace}`;

  window.TAModules.register({
    id: 'admin.users',
    role: 'admin',
    title: 'Users',
    icon: '👥',
    permissions: ['users.manage', 'admin.users.manage'],
    async mount({ root, api }) { root = root?.querySelector ? root : root?.root || root?.element || document.querySelector('[data-module-root], #module-root'); if (!root?.querySelector) throw new TypeError('Module root element was not found.');
      let data = { users: [], roles: [] };
      const requireForms = () => {
        if (window.TAForms?.values && window.TAForms?.checkedValues) return true;
        const message = 'Required form utility failed to load. Refresh the page or contact admin.';
        const status = root.querySelector('#user-save-status');
        if (status) status.textContent = message;
        window.TAUi?.toast?.(message, 'error');
        return false;
      };
      const roleName = (key) => data.roles.find((role) => role.key === key)?.name || key;
      const roleByKey = (key) => data.roles.find((role) => role.key === key) || {};
      const userWorkspaces = (user) => {
        const permissions = new Set(asArray(user.roles).flatMap((role) => asArray(roleByKey(role).permissions)));
        asArray(user.workspaceAccess || user.workspace_access).forEach((workspace) => permissions.add(workspacePermission(workspace)));
        return workspaceDefs.filter(([workspace]) => asArray(user.roles).includes(workspace) || permissions.has(workspacePermission(workspace))).map(([workspace]) => workspace);
      };

      const load = async () => {
        root.innerHTML = '<article class="card module-loading"><h3>Loading users</h3><p>Pulling company users, roles, ranks, and workspace access.</p></article>';
        try {
          data = await api.get('/api/admin/users');
          data.users = asArray(data.users);
          data.roles = asArray(data.roles);
          render();
        } catch (error) {
          root.innerHTML = `<section class="module-page stack"><article class="card module-error"><h2>Users</h2><p>${escapeHtml(error.message || 'Unable to load users')}</p><button class="btn secondary" type="button" id="retry-users">Retry</button></article></section>`;
          root.querySelector('#retry-users')?.addEventListener('click', load);
        }
      };

      const stats = () => {
        const active = data.users.filter((user) => user.isActive !== false).length;
        const inactive = data.users.length - active;
        const owners = data.users.filter((user) => asArray(user.roles).includes('owner')).length;
        return { active, inactive, owners };
      };

      const render = () => {
        const summary = stats();
        root.innerHTML = `<section class="module-page stack users-page">
          <div class="card module-header"><div><p class="eyebrow">Company Management</p><h2 class="module-title">👥 Users</h2><p class="module-description">Create users, assign role/rank access, send or reset magic links, and manage active status with hierarchy protections enforced by the server.</p></div><div class="module-actions action-row"><button class="btn" type="button" id="new-user">Create User</button></div></div>
          <div class="module-stat-grid"><article class="module-stat stat-card"><span>✅</span><strong>${summary.active}</strong><small>Active Users</small></article><article class="module-stat stat-card"><span>⏸️</span><strong>${summary.inactive}</strong><small>Inactive Users</small></article><article class="module-stat stat-card"><span>👑</span><strong>${summary.owners}</strong><small>Owners Protected</small></article><article class="module-stat stat-card"><span>🛡️</span><strong>${data.roles.length}</strong><small>Roles / Ranks</small></article></div>
          <div class="card module-section stack"><div class="module-panel-head"><div><h3>User Directory</h3><p>Search, filter, edit profiles, reset access, and review role/workspace access.</p></div><div class="form-grid"><label class="field"><span>Search users</span><input id="user-search" placeholder="Search name, email, phone"></label><label class="field"><span>Filter role/rank</span><select id="role-filter"><option value="">All roles/ranks</option>${data.roles.map((role) => `<option value="${escapeHtml(role.key)}">${escapeHtml(role.name)}</option>`).join('')}</select></label></div></div><div id="user-list" class="user-card-grid"></div></div>
        </section>`;
        root.querySelector('#new-user').addEventListener('click', () => editor());
        root.querySelector('#user-search').addEventListener('input', renderList);
        root.querySelector('#role-filter').addEventListener('change', renderList);
        renderList();
      };

      const renderList = () => {
        const q = root.querySelector('#user-search')?.value?.toLowerCase() || '';
        const rf = root.querySelector('#role-filter')?.value || '';
        const users = data.users.filter((user) => {
          const haystack = [user.fullName, user.full_name, user.email, user.phone, user.companyName, asArray(user.roles).join(' ')].join(' ').toLowerCase();
          return (!q || haystack.includes(q)) && (!rf || asArray(user.roles).includes(rf));
        });
        const list = root.querySelector('#user-list');
        list.innerHTML = users.map((user) => {
          const roles = asArray(user.roles);
          const workspaces = userWorkspaces(user);
          const name = user.fullName || user.full_name || user.email || 'Unnamed user';
          const active = user.isActive !== false;
          return `<article class="user-card module-card"><div class="user-card-head"><div><h3>${escapeHtml(name)}</h3><p>${escapeHtml(user.email || 'No email on file')}<br>${escapeHtml(user.phone || 'No phone on file')}</p></div><span class="status-badge ${active ? 'success' : 'warning'}">${active ? 'Active' : 'Inactive'}</span></div><div class="user-meta-grid"><div class="meta-tile"><small>Role / Rank</small><strong>${roles.map(roleName).map(escapeHtml).join(', ') || 'None assigned'}</strong></div><div class="meta-tile"><small>Workspace access</small><strong>${workspaces.length ? workspaces.map((w) => w[0].toUpperCase() + w.slice(1)).join(', ') : 'None'}</strong></div><div class="meta-tile"><small>Classification</small><strong>${roles.includes('worker') ? 'Worker' : roles.includes('client') ? 'Client' : 'Staff'}</strong></div><div class="meta-tile"><small>Last login</small><strong>${escapeHtml(fmtDate(user.lastLoginAt || user.last_login_at))}</strong></div></div><div class="action-row"><button class="btn secondary" type="button" data-edit="${escapeHtml(user.id)}">Edit Profile</button><button class="btn secondary" type="button" data-magic="${escapeHtml(user.email)}">Send Magic Link</button><button class="btn secondary" type="button" data-reset-magic="${escapeHtml(user.email)}">Reset Magic Link</button>${active ? `<button class="btn danger" type="button" data-delete="${escapeHtml(user.id)}">Deactivate</button>` : `<button class="btn" type="button" data-reactivate="${escapeHtml(user.id)}">Reactivate</button>`}</div></article>`;
        }).join('') || '<article class="module-empty"><h3>No users found</h3><p>Try another filter.</p></article>';
        root.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => editor(data.users.find((user) => String(user.id) === button.dataset.edit))));
        root.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', () => deactivate(button.dataset.delete, button)));
        root.querySelectorAll('[data-reactivate]').forEach((button) => button.addEventListener('click', () => reactivate(button.dataset.reactivate, button)));
        root.querySelectorAll('[data-magic],[data-reset-magic]').forEach((button) => button.addEventListener('click', () => sendMagic(button.dataset.magic || button.dataset.resetMagic, button)));
      };

      const roleCheckboxes = (user) => data.roles.map((role) => {
        const locked = role.canAssign === false;
        return `<label class="pill" title="${locked ? 'Your rank cannot assign this role.' : 'Assignable role/rank'}"><input type="checkbox" name="roles" value="${escapeHtml(role.key)}" ${asArray(user.roles).includes(role.key) ? 'checked' : ''} ${locked ? 'disabled' : ''}> ${escapeHtml(role.name)}${locked ? ' 🔒' : ''}</label>`;
      }).join('');

      const workspaceSummary = (user) => workspaceDefs.map(([key, label]) => `<label class="pill"><input type="checkbox" name="workspaceAccess" value="${escapeHtml(key)}" ${userWorkspaces(user).includes(key) ? 'checked' : ''}> ${escapeHtml(label)}</label>`).join('');

      const editor = (user = { roles: ['client'], isActive: true }) => {
        root.innerHTML = `<section class="module-page stack"><form class="card module-section stack" data-user-editor><div class="module-header"><div><p class="eyebrow">Company Management</p><h2 class="module-title">${user.id ? 'Edit' : 'Create'} User</h2><p class="module-description">Profile fields, active status, role/rank, worker/client classification, and workspace access persist after refresh.</p></div></div><div class="form-grid"><label class="field"><span>Name</span><input name="fullName" value="${escapeHtml(user.fullName || user.full_name || '')}" placeholder="Full name"></label><label class="field"><span>Email</span><input name="email" value="${escapeHtml(user.email || '')}" placeholder="name@example.com"></label><label class="field"><span>Phone</span><input name="phone" value="${escapeHtml(user.phone || '')}" placeholder="Phone number"></label><label class="field"><span>Active status</span><select name="isActive"><option value="true" ${user.isActive !== false ? 'selected' : ''}>Active</option><option value="false" ${user.isActive === false ? 'selected' : ''}>Inactive</option></select></label><label class="field"><span>Company</span><input name="companyName" value="${escapeHtml(user.companyName || user.company_name || '')}" placeholder="Company"></label><label class="field"><span>Notes</span><textarea name="internalNotes" placeholder="Internal notes">${escapeHtml(user.internalNotes || user.internal_notes || '')}</textarea></label><label class="field"><span>Worker / Client classification</span><select id="classification"><option value="client" ${asArray(user.roles).includes('client') ? 'selected' : ''}>Client</option><option value="worker" ${asArray(user.roles).includes('worker') ? 'selected' : ''}>Worker</option><option value="staff" ${!asArray(user.roles).some((role) => ['client','worker'].includes(role)) ? 'selected' : ''}>Staff / Admin</option></select></label></div><section class="module-card card stack"><h3>Role / Rank</h3><div class="module-grid">${roleCheckboxes(user)}</div></section><section class="module-card card stack"><h3>Workspace Access</h3><p>Workspace access can be assigned directly here or inherited from selected roles and the role permission matrix.</p><div class="module-grid" id="workspace-summary">${workspaceSummary(user)}</div></section><p class="notice" id="user-save-status">Ready to save.</p><div class="action-row"><button class="btn" type="submit" id="save-user">Save User</button>${user.email ? `<button class="btn secondary" type="button" id="send-user-magic">Send Magic Link</button><button class="btn secondary" type="button" id="reset-user-magic">Reset Magic Link</button>` : ''}<button class="btn secondary" type="button" id="cancel-user">Cancel</button></div></form></section>`;
        const updateClassification = () => {
          const selected = root.querySelector('#classification')?.value;
          if (selected === 'worker') { const input = root.querySelector('input[name="roles"][value="worker"]:not(:disabled)'); if (input) input.checked = true; }
          if (selected === 'client') { const input = root.querySelector('input[name="roles"][value="client"]:not(:disabled)'); if (input) input.checked = true; }
        };
        root.querySelector('#classification')?.addEventListener('change', updateClassification);
        root.querySelector('#cancel-user').addEventListener('click', render);
        root.querySelector('#send-user-magic')?.addEventListener('click', (event) => sendMagic(user.email, event.currentTarget));
        root.querySelector('#reset-user-magic')?.addEventListener('click', (event) => sendMagic(user.email, event.currentTarget));
        root.querySelector('[data-user-editor]').addEventListener('submit', async (event) => {
          event.preventDefault();
          if (!requireForms()) return;
          const payload = window.TAForms.values(event.currentTarget);
          payload.roles = window.TAForms.checkedValues(root, 'roles');
          payload.isActive = payload.isActive === 'true';
          payload.workspaceAccess = window.TAForms.checkedValues(root, 'workspaceAccess');
          if (user.id) { payload.userId = user.id; payload.currentRoles = asArray(user.roles); }
          const saveButton = root.querySelector('#save-user');
          root.querySelector('#user-save-status').textContent = 'Saving user, role/rank, and workspace access...';
          saveButton.disabled = true;
          saveButton.textContent = 'Saving...';
          try {
            await api[user.id ? 'patch' : 'post']('/api/admin/users', payload);
            window.TAUi?.toast('User saved and permissions persisted.', 'success');
            await load();
          } catch (error) {
            root.querySelector('#user-save-status').textContent = error.message || 'User save failed.';
            window.TAUi?.toast(error.message || 'User save failed.', 'error');
            saveButton.disabled = false;
            saveButton.textContent = 'Save User';
          }
        });
      };

      const sendMagic = async (email, button) => {
        if (!email) return window.TAUi?.toast('Email is required before sending a magic link.', 'error');
        button.disabled = true;
        const previous = button.textContent;
        button.textContent = 'Sending...';
        try {
          await api.post('/api/auth/magic-link', { email });
          window.TAUi?.toast(previous?.startsWith('Reset') ? 'Magic link reset sent.' : 'Magic link sent.', 'success');
        } catch (error) {
          window.TAUi?.toast(error.message || 'Magic link failed.', 'error');
        } finally {
          button.textContent = previous;
          button.disabled = false;
        }
      };

      const deactivate = async (id, button) => {
        if (!confirm('Deactivate this user?')) return;
        button.disabled = true;
        button.textContent = 'Deactivating...';
        try {
          await api.delete('/api/admin/users', { userId: id, confirmation: 'DELETE', currentRoles: asArray(data.users.find((user) => String(user.id) === String(id))?.roles) });
          window.TAUi?.toast('User deactivated.', 'success');
          await load();
        } catch (error) {
          window.TAUi?.toast(error.message || 'User deactivation failed.', 'error');
          button.disabled = false;
          button.textContent = 'Deactivate';
        }
      };

      const reactivate = async (id, button) => {
        button.disabled = true;
        button.textContent = 'Reactivating...';
        try {
          const user = data.users.find((item) => String(item.id) === String(id));
          await api.patch('/api/admin/users', { userId: id, email: user?.email || '', fullName: user?.fullName || '', phone: user?.phone || '', companyName: user?.companyName || '', internalNotes: user?.internalNotes || '', roles: asArray(user?.roles).length ? asArray(user.roles) : ['client'], currentRoles: asArray(user?.roles), workspaceAccess: asArray(user?.workspaceAccess || user?.workspace_access), isActive: true });
          window.TAUi?.toast('User reactivated.', 'success');
          await load();
        } catch (error) {
          window.TAUi?.toast(error.message || 'User reactivation failed.', 'error');
          button.disabled = false;
          button.textContent = 'Reactivate';
        }
      };

      await load();
    },
    async destroy() {},
    async refresh() {},
  });
})();
