import { state, saveRoleView } from '../core/state.js';
import { cardGrid } from './html.js';
import { navigate, bindLinks } from '../router.js';

const roleFilters = {
  owner: null,
  admin: ['dashboard', 'customers', 'requests', 'quotes', 'work-orders', 'schedule', 'inventory', 'invoices', 'finance', 'payments', 'users', 'modules', 'system', 'health', 'audit'],
  manager: ['dashboard', 'customers', 'requests', 'quotes', 'work-orders', 'schedule', 'inventory', 'files'],
  worker: ['dashboard', 'work-orders', 'schedule', 'inventory', 'worker'],
  client: ['requests', 'quotes', 'invoices', 'payments', 'client'],
};

export function modulesForRole() {
  const modules = state.bootstrap?.modules || [];
  const filter = roleFilters[state.roleView];
  if (!filter) return modules;
  return modules.filter((module) => filter.some((key) => module.id?.includes(key) || module.route?.includes(key)));
}

function groupedModules() {
  return modulesForRole().reduce((groups, module) => {
    const group = module.group_name || module.group || 'System';
    groups[group] ||= [];
    groups[group].push(module);
    return groups;
  }, {});
}

function roleSwitcher() {
  return `
    <label class="view-switcher">
      Viewing as
      <select id="roleSwitch">
        ${['owner', 'admin', 'manager', 'worker', 'client'].map((role) => `<option value="${role}">${role[0].toUpperCase() + role.slice(1)}</option>`).join('')}
      </select>
    </label>`;
}

function mobileNav(groups) {
  const items = Object.values(groups).flat().slice(0, 4);
  return `
    <nav class="mobile-nav" aria-label="Mobile navigation">
      ${items.map((module) => `<a href="${module.route}" data-link class="${location.pathname === module.route ? 'active' : ''}">${module.icon}<br>${module.label.split(' ')[0]}</a>`).join('')}
      <a href="/dashboard/modules" data-link>•••<br>More</a>
    </nav>`;
}

export function renderShell(app, content, title = 'Dashboard') {
  const company = state.bootstrap?.company;
  const groups = groupedModules();
  app.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="logo">${(company?.company_name || 'CMMS')[0]}</div>
          <div><strong>${company?.company_name || 'Contractor Platform'}</strong><br><small>Workspace: ${state.roleView}</small></div>
        </div>
        ${roleSwitcher()}
        ${state.roleView !== 'owner' ? `<div class="banner">Testing ${state.roleView} view as Owner <button class="secondary" id="exitView">Exit Test View</button></div>` : ''}
        ${Object.entries(groups).map(([group, modules]) => `
          <nav class="navgroup" aria-label="${group}">
            <h3>${group}</h3>
            ${modules.map((module) => `<a class="navitem ${location.pathname === module.route ? 'active' : ''}" href="${module.route}" data-link><span>${module.icon}</span><span>${module.label}</span></a>`).join('')}
          </nav>`).join('')}
      </aside>
      <main class="main">
        <div class="topbar">
          <div><h1>${title}</h1><p>Commercial white-label CMMS + AI quoting platform.</p></div>
          <div class="actions"><a class="btn secondary" href="/" data-link>Public Site</a><a class="btn" href="/dashboard/requests" data-link>New Request</a></div>
        </div>
        ${state.roleView !== 'owner' ? `<div class="banner">Testing ${state.roleView} view as Owner. Permissions are simulated locally and your owner role is unchanged.</div>` : ''}
        ${content}
      </main>
      ${mobileNav(groups)}
    </div>`;
  document.querySelector('#roleSwitch').value = state.roleView;
  document.querySelector('#roleSwitch').addEventListener('change', (event) => {
    saveRoleView(event.target.value);
    navigate(location.pathname);
  });
  document.querySelector('#exitView')?.addEventListener('click', () => {
    saveRoleView('owner');
    navigate(location.pathname);
  });
  bindLinks();
}

export function emptyState(title, body, actionLabel, actionHref) {
  return `<section class="empty"><h2>${title}</h2><p>${body}</p>${actionHref ? `<a class="btn" href="${actionHref}" data-link>${actionLabel}</a>` : ''}</section>`;
}

export function moduleCards(modules) {
  return cardGrid(modules.map((module) => `<h3>${module.icon} ${module.label}</h3><p>${module.group_name || module.group}</p><p>${module.route}</p><span class="pill">${module.enabled === false ? 'Disabled' : 'Enabled'}</span>`));
}
