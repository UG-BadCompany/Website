export default function render() {
  const state = {
    users: [],
    roles: [],
    selectedUser: null,
    view: 'users', // 'users', 'roles', 'permissions'
    editingUser: null,
    editingRole: null
  };

  async function loadUsers() {
    const res = await fetch('/api/users');
    if (res.ok) {
      state.users = await res.json();
      renderUsersList();
    }
  }

  async function loadRoles() {
    const res = await fetch('/api/roles');
    if (res.ok) {
      state.roles = await res.json();
    }
  }

  function renderUsersList() {
    const container = document.getElementById('users-content');
    if (!container) return;

    container.innerHTML = `
      <div class="users-module">
        <div class="module-header">
          <h2>Users Management</h2>
          <button class="btn-primary" onclick="window.usersModule.showCreateUser()">
            <span>➕</span> Create User
          </button>
        </div>

        <div class="users-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Roles</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${state.users.map(user => `
                <tr>
                  <td>${escapeHtml(user.full_name)}</td>
                  <td>${escapeHtml(user.email)}</td>
                  <td>${user.phone || '-'}</td>
                  <td>
                    <div class="role-badges">
                      ${(user.roles || []).map(role => `
                        <span class="role-badge role-${role.slug}">${role.name}</span>
                      `).join('')}
                    </div>
                  </td>
                  <td>
                    <span class="status-badge ${user.active ? 'active' : 'inactive'}">
                      ${user.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>${user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</td>
                  <td>
                    <div class="action-buttons">
                      <button class="btn-icon" onclick="window.usersModule.editUser(${user.id})" title="Edit">
                        ✏️
                      </button>
                      <button class="btn-icon" onclick="window.usersModule.manageRoles(${user.id})" title="Manage Roles">
                        👥
                      </button>
                      <button class="btn-icon" onclick="window.usersModule.toggleUserStatus(${user.id}, ${!user.active})" title="${user.active ? 'Deactivate' : 'Activate'}">
                        ${user.active ? '🔒' : '🔓'}
                      </button>
                      <button class="btn-icon btn-danger" onclick="window.usersModule.resetLogin(${user.id})" title="Reset Login">
                        🔄
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function showCreateUser() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Create New User</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
        <form id="create-user-form" class="modal-body">
          <div class="form-group">
            <label>Full Name *</label>
            <input type="text" name="fullName" required />
          </div>
          <div class="form-group">
            <label>Email *</label>
            <input type="email" name="email" required />
          </div>
          <div class="form-group">
            <label>Phone</label>
            <input type="tel" name="phone" />
          </div>
          <div class="form-group">
            <label>Assign Roles</label>
            <div class="role-checkboxes">
              ${state.roles.map(role => `
                <label class="checkbox-label">
                  <input type="checkbox" name="roles" value="${role.slug}" />
                  <span>${role.name}</span>
                  <small>${role.description || ''}</small>
                </label>
              `).join('')}
            </div>
          </div>
        </form>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="btn-primary" onclick="window.usersModule.submitCreateUser()">Create User</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  async function submitCreateUser() {
    const form = document.getElementById('create-user-form');
    const formData = new FormData(form);
    
    const userData = {
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      phone: formData.get('phone') || null,
      roles: formData.getAll('roles')
    };

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    if (res.ok) {
      document.querySelector('.modal-overlay').remove();
      await loadUsers();
      showNotification('User created successfully', 'success');
    } else {
      const error = await res.json();
      showNotification(error.message || 'Failed to create user', 'error');
    }
  }

  function editUser(userId) {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Edit User</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
        <form id="edit-user-form" class="modal-body">
          <div class="form-group">
            <label>Full Name *</label>
            <input type="text" name="fullName" value="${escapeHtml(user.full_name)}" required />
          </div>
          <div class="form-group">
            <label>Email *</label>
            <input type="email" name="email" value="${escapeHtml(user.email)}" required />
          </div>
          <div class="form-group">
            <label>Phone</label>
            <input type="tel" name="phone" value="${user.phone || ''}" />
          </div>
        </form>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="btn-primary" onclick="window.usersModule.submitEditUser(${userId})">Save Changes</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  async function submitEditUser(userId) {
    const form = document.getElementById('edit-user-form');
    const formData = new FormData(form);
    
    const userData = {
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      phone: formData.get('phone') || null
    };

    const res = await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    if (res.ok) {
      document.querySelector('.modal-overlay').remove();
      await loadUsers();
      showNotification('User updated successfully', 'success');
    } else {
      const error = await res.json();
      showNotification(error.message || 'Failed to update user', 'error');
    }
  }

  function manageRoles(userId) {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;

    const userRoleSlugs = (user.roles || []).map(r => r.slug);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Manage Roles: ${escapeHtml(user.full_name)}</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
        <div class="modal-body">
          <div class="role-checkboxes">
            ${state.roles.map(role => `
              <label class="checkbox-label">
                <input type="checkbox" 
                  name="roles" 
                  value="${role.slug}" 
                  ${userRoleSlugs.includes(role.slug) ? 'checked' : ''}
                  onchange="window.usersModule.toggleRole(${userId}, '${role.slug}', this.checked)"
                />
                <span>${role.name}</span>
                <small>${role.description || ''}</small>
              </label>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-primary" onclick="this.closest('.modal-overlay').remove()">Done</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  async function toggleRole(userId, roleSlug, assign) {
    const endpoint = assign ? 'assign' : 'remove';
    const res = await fetch(`/api/users/${userId}/roles/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleSlug })
    });

    if (res.ok) {
      await loadUsers();
      showNotification(`Role ${assign ? 'assigned' : 'removed'} successfully`, 'success');
    } else {
      const error = await res.json();
      showNotification(error.message || 'Failed to update role', 'error');
    }
  }

  async function toggleUserStatus(userId, active) {
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active })
    });

    if (res.ok) {
      await loadUsers();
      showNotification(`User ${active ? 'activated' : 'deactivated'} successfully`, 'success');
    } else {
      const error = await res.json();
      showNotification(error.message || 'Failed to update user status', 'error');
    }
  }

  async function resetLogin(userId) {
    if (!confirm('Are you sure you want to reset this user\'s login? They will need to use magic link to log in again.')) {
      return;
    }

    const res = await fetch(`/api/users/${userId}/reset-login`, {
      method: 'POST'
    });

    if (res.ok) {
      showNotification('Login reset successfully', 'success');
    } else {
      const error = await res.json();
      showNotification(error.message || 'Failed to reset login', 'error');
    }
  }

  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize
  (async () => {
    await loadRoles();
    await loadUsers();
  })();

  // Expose functions globally for onclick handlers
  window.usersModule = {
    showCreateUser,
    submitCreateUser,
    editUser,
    submitEditUser,
    manageRoles,
    toggleRole,
    toggleUserStatus,
    resetLogin
  };

  return `
    <div id="users-content">
      <div class="loading">Loading users...</div>
    </div>
    <style>
      .users-module { padding: 20px; }
      .module-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
      .module-header h2 { margin: 0; }
      .users-table { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
      .users-table table { width: 100%; border-collapse: collapse; }
      .users-table th { background: #f8f9fa; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #dee2e6; }
      .users-table td { padding: 12px; border-bottom: 1px solid #dee2e6; }
      .role-badges { display: flex; gap: 4px; flex-wrap: wrap; }
      .role-badge { padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; }
      .role-badge.role-owner { background: #dc3545; color: white; }
      .role-badge.role-admin { background: #fd7e14; color: white; }
      .role-badge.role-manager { background: #0dcaf0; color: white; }
      .role-badge.role-dispatcher { background: #6f42c1; color: white; }
      .role-badge.role-worker { background: #198754; color: white; }
      .role-badge.role-client { background: #0d6efd; color: white; }
      .role-badge.role-guest { background: #6c757d; color: white; }
      .status-badge { padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; }
      .status-badge.active { background: #d1e7dd; color: #0f5132; }
      .status-badge.inactive { background: #f8d7da; color: #842029; }
      .action-buttons { display: flex; gap: 4px; }
      .btn-icon { background: none; border: none; cursor: pointer; font-size: 18px; padding: 4px 8px; border-radius: 4px; transition: background 0.2s; }
      .btn-icon:hover { background: #f8f9fa; }
      .btn-icon.btn-danger:hover { background: #f8d7da; }
      .btn-primary { background: #0d6efd; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 6px; }
      .btn-primary:hover { background: #0b5ed7; }
      .btn-secondary { background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; }
      .btn-secondary:hover { background: #5c636a; }
      .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
      .modal-content { background: white; border-radius: 12px; max-width: 600px; width: 90%; max-height: 90vh; overflow: auto; }
      .modal-header { padding: 20px; border-bottom: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center; }
      .modal-header h3 { margin: 0; }
      .modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #6c757d; }
      .modal-body { padding: 20px; }
      .modal-footer { padding: 20px; border-top: 1px solid #dee2e6; display: flex; justify-content: flex-end; gap: 10px; }
      .form-group { margin-bottom: 16px; }
      .form-group label { display: block; margin-bottom: 6px; font-weight: 500; }
      .form-group input { width: 100%; padding: 8px 12px; border: 1px solid #ced4da; border-radius: 6px; font-size: 14px; }
      .role-checkboxes { display: flex; flex-direction: column; gap: 12px; }
      .checkbox-label { display: flex; align-items: flex-start; gap: 8px; padding: 12px; border: 1px solid #dee2e6; border-radius: 6px; cursor: pointer; transition: background 0.2s; }
      .checkbox-label:hover { background: #f8f9fa; }
      .checkbox-label input[type="checkbox"] { margin-top: 2px; }
      .checkbox-label span { font-weight: 500; }
      .checkbox-label small { display: block; color: #6c757d; font-size: 12px; margin-top: 2px; }
      .notification { position: fixed; top: 20px; right: 20px; padding: 12px 20px; border-radius: 6px; font-weight: 500; z-index: 2000; transform: translateX(400px); transition: transform 0.3s; }
      .notification.show { transform: translateX(0); }
      .notification-success { background: #d1e7dd; color: #0f5132; border: 1px solid #badbcc; }
      .notification-error { background: #f8d7da; color: #842029; border: 1px solid #f5c2c7; }
      .notification-info { background: #cff4fc; color: #055160; border: 1px solid #b6effb; }
      .loading { text-align: center; padding: 40px; color: #6c757d; }
    </style>
  `;
}

// Made with Bob
