(() => {
  const escapeHtml = (value = '') => String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[char]));
  const asArray = (value) => Array.isArray(value) ? value : value ? [value] : [];
  const fmtDate = (value) => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded';

  window.TAModules.register({
    id: 'admin.users',
    role: 'admin',
    title: 'Users',
    icon: '👥',
    permissions: ['users.manage', 'admin.users.manage'],
    async mount({ root, api }) {
      let data = { users: [], roles: [] };
      const roleName = (key) => data.roles.find((role) => role.key === key)?.name || key;

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
          <div class="card module-header">
            <div>
              <p class="eyebrow">Company Management</p>
              <h2 class="module-title">👥 Users</h2>
              <p class="module-description">Create users, assign role/rank access, send secure magic links, and manage account status without low-contrast controls.</p>
            </div>
            <div class="module-actions action-row">
              <button class="btn" type="button" id="new-user">Create User</button>
            </div>
          </div>
          <div class="module-stat-grid">
            <article class="module-stat stat-card"><span>✅</span><strong>${summary.active}</strong><small>Active Users</small></article>
            <article class="module-stat stat-card"><span>⏸️</span><strong>${summary.inactive}</strong><small>Inactive Users</small></article>
            <article class="module-stat stat-card"><span>👑</span><strong>${summary.owners}</strong><small>Owners Protected</small></article>
            <article class="module-stat stat-card"><span>🛡️</span><strong>${data.roles.length}</strong><small>Roles / Ranks</small></article>
          </div>
          <div class="card module-section stack">
            <div class="module-panel-head">
              <div>
                <h3>User Directory</h3>
                <p>Search, filter, edit profiles, reset access, and review status at a glance.</p>
              </div>
              <div class="form-grid">
                <label class="field"><span>Search users</span><input id="user-search" placeholder="Search name, email, phone"></label>
                <label class="field"><span>Filter role/rank</span><select id="role-filter"><option value="">All roles/ranks</option>${data.roles.map((role) => `<option value="${escapeHtml(role.key)}">${escapeHtml(role.name)}</option>`).join('')}</select></label>
              </div>
            </div>
            <div id="user-list" class="user-card-grid"></div>
          </div>
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
          const name = user.fullName || user.full_name || user.email || 'Unnamed user';
          const active = user.isActive !== false;
          return `<article class="user-card module-card">
            <div class="user-card-head">
              <div>
                <h3>${escapeHtml(name)}</h3>
                <p>${escapeHtml(user.email || 'No email on file')}<br>${escapeHtml(user.phone || 'No phone on file')}</p>
              </div>
              <span class="status-badge ${active ? 'success' : 'warning'}">${active ? 'Active' : 'Inactive'}</span>
            </div>
            <div class="user-meta-grid">
              <div class="meta-tile"><small>Role / Rank</small><strong>${roles.map(roleName).map(escapeHtml).join(', ') || 'None assigned'}</strong></div>
              <div class="meta-tile"><small>Company</small><strong>${escapeHtml(user.companyName || user.company_name || 'Default company')}</strong></div>
              <div class="meta-tile"><small>Last login</small><strong>${escapeHtml(fmtDate(user.lastLogin || user.last_login))}</strong></div>
            </div>
            <div class="action-row">
              <button class="btn secondary" type="button" data-edit="${escapeHtml(user.id)}">Edit User</button>
              <button class="btn secondary" type="button" data-magic="${escapeHtml(user.email || '')}" ${user.email ? '' : 'disabled'}>Reset / Send Magic Link</button>
              ${active ? `<button class="btn danger" type="button" data-delete="${escapeHtml(user.id)}" ${roles.includes('owner') && stats().owners < 2 ? 'disabled title="Last owner is protected"' : ''}>Deactivate</button>` : `<button class="btn secondary" type="button" data-reactivate="${escapeHtml(user.id)}">Reactivate</button>`}
            </div>
          </article>`;
        }).join('') || '<article class="card module-empty"><h3>No users found</h3><p>Adjust filters or create a new user to get started.</p></article>';
        root.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => editor(data.users.find((user) => String(user.id) === button.dataset.edit))));
        root.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', () => deactivate(button.dataset.delete, button)));
        root.querySelectorAll('[data-reactivate]').forEach((button) => button.addEventListener('click', () => reactivate(button.dataset.reactivate, button)));
        root.querySelectorAll('[data-magic]').forEach((button) => button.addEventListener('click', async () => {
          button.disabled = true;
          const previous = button.textContent;
          button.textContent = 'Sending...';
          try {
            await api.post('/api/auth/magic-link', { email: button.dataset.magic });
            window.TAUi?.toast('Magic link requested.', 'success');
          } catch (error) {
            window.TAUi?.toast(error.message || 'Magic link failed.', 'error');
          } finally {
            button.textContent = previous;
            button.disabled = false;
          }
        }));
      };

      const editor = (user = { roles: ['client'] }) => {
        const roles = data.roles.map((role) => `<label class="pill"><input type="checkbox" name="roles" value="${escapeHtml(role.key)}" ${asArray(user.roles).includes(role.key) ? 'checked' : ''}> ${escapeHtml(role.name)}</label>`).join('');
        root.innerHTML = `<section class="module-page stack"><form class="card module-section stack" data-user-editor>
          <div class="module-header">
            <div>
              <p class="eyebrow">Company Management</p>
              <h2 class="module-title">${user.id ? 'Edit' : 'Create'} User</h2>
              <p class="module-description">Owner protections stay enforced while keeping every field readable in light and dark themes.</p>
            </div>
          </div>
          <div class="form-grid">
            <label class="field"><span>Name</span><input name="fullName" value="${escapeHtml(user.fullName || user.full_name || '')}" placeholder="Full name"></label>
            <label class="field"><span>Email</span><input name="email" value="${escapeHtml(user.email || '')}" placeholder="name@example.com" ${user.id ? 'readonly' : ''}></label>
            <label class="field"><span>Phone</span><input name="phone" value="${escapeHtml(user.phone || '')}" placeholder="Phone number"></label>
            <label class="field"><span>Company</span><input name="companyName" value="${escapeHtml(user.companyName || user.company_name || '')}" placeholder="Company"></label>
          </div>
          <section class="module-card card stack">
            <h3>Role / Rank</h3>
            <div class="module-grid">${roles}</div>
          </section>
          <p class="notice" id="user-save-status">Ready to save.</p>
          <div class="action-row"><button class="btn" type="submit" id="save-user">Save User</button><button class="btn secondary" type="button" id="cancel-user">Cancel</button></div>
        </form></section>`;
        root.querySelector('#cancel-user').addEventListener('click', render);
        root.querySelector('[data-user-editor]').addEventListener('submit', async (event) => {
          event.preventDefault();
          const payload = window.TAForms.values(root.querySelector('[data-user-editor]'));
          payload.roles = window.TAForms.checkedValues(root, 'roles');
          if (user.id) { payload.userId = user.id; payload.currentRoles = asArray(user.roles); }
          const form = event.currentTarget;
          const saveButton = root.querySelector('#save-user');
          root.querySelector('#user-save-status').textContent = 'Saving user, role/rank, and workspace access...';
          saveButton.disabled = true;
          saveButton.textContent = 'Saving...';
          try {
            await api[user.id ? 'patch' : 'post']('/api/admin/users', payload);
            window.TAUi?.toast('User saved.', 'success');
            await load();
          } catch (error) {
            root.querySelector('#user-save-status').textContent = error.message || 'User save failed.';
            window.TAUi?.toast(error.message || 'User save failed.', 'error');
            saveButton.disabled = false;
            saveButton.textContent = 'Save User';
          }
        });
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
          await api.patch('/api/admin/users', { userId: id, fullName: user?.fullName || '', phone: user?.phone || '', secondaryPhone: user?.secondaryPhone || '', companyName: user?.companyName || '', mailingAddress: user?.mailingAddress || '', internalNotes: user?.internalNotes || '', roles: asArray(user?.roles).length ? asArray(user.roles) : ['client'], isActive: true });
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
