import { requireInstalled } from '../core/install-lock.js';
import { api } from '../core/api-client.js';
import { renderModules } from '../core/module-runtime.js';
import { wireThemeSelect } from '../core/theme-client.js';

const navItems = ['Overview', 'Homepage Editor', 'Theme Manager', 'Client Portal', 'AI Quote', 'Quote Center', 'Work Orders', 'Scheduling', 'Inventory', 'Invoices', 'Finance', 'Files', 'Platform Health', 'Cache Manager', 'Audit Logs', 'Backup Restore', 'Module Manager'];
const metricItems = ['Requests', 'Quotes', 'Work Orders', 'Invoices', 'Payments', 'Active Modules'];

async function init() {
  if (!(await requireInstalled())) return;
  wireThemeSelect();
  document.querySelector('#sidebar').innerHTML = navItems.map(item => `<a class="navlink" href="#${item.toLowerCase().replaceAll(' ', '-')}">${item}</a>`).join('');
  document.querySelector('#metrics').innerHTML = metricItems.map((item, index) => `<article class="card"><h3>${index + 1}</h3><p>${item}</p></article>`).join('');
  const switcher = document.querySelector('#view-switcher');
  switcher.onchange = () => renderView(switcher.value);
  renderView('Owner');
  await renderModules(document.querySelector('#module-list'), { superOwner: true });
  document.querySelector('#workflow-test').onclick = runWorkflow;
}

function renderView(view) {
  document.querySelector('#workspace').innerHTML = `<h3>${view} view</h3><p class="muted">Super Owner can switch Owner/Admin/Manager/Worker/Client/Public views, see hidden/beta modules, impersonate test users, and audit workflow checks.</p><button id="impersonate">Audit impersonation test</button>`;
  document.querySelector('#impersonate').onclick = () => api('/api/system/audit', { method: 'POST', body: JSON.stringify({ action: 'impersonation.test', target: view }) });
}

async function runWorkflow() {
  const result = await api('/api/system/workflow-demo', { method: 'POST', body: JSON.stringify({ request: 'Photo estimate request', amount: 1250 }) });
  document.querySelector('#workflow-output').textContent = JSON.stringify(result.data, null, 2);
}

init();
