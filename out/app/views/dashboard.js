import { api } from '../core/api.js';
import { applyTheme } from '../core/theme.js';
import { state } from '../core/state.js';
import { cardGrid, table } from '../components/html.js';
import { moduleCards, renderShell } from '../components/shell.js';
import { navigate } from '../router.js';

const routes = {
  '/dashboard/customers': { title: 'Customers / Clients', resource: 'customers', fields: ['name', 'email', 'phone', 'notes'] },
  '/dashboard/requests': { title: 'Request Estimate', resource: 'requests', fields: ['customer_id', 'service_category', 'address', 'priority', 'notes'] },
  '/dashboard/quotes': { title: 'Estimate & Quote Center', resource: 'quotes', fields: ['request_id', 'customer_id', 'title', 'line_items', 'subtotal', 'tax', 'total'] },
  '/dashboard/work-orders': { title: 'Work Orders', resource: 'work-orders', fields: ['quote_id', 'customer_id', 'assigned_user_id', 'title', 'priority', 'scheduled_start', 'notes'] },
  '/dashboard/schedule': { title: 'Schedule / Calendar', resource: 'work-orders', fields: ['title', 'assigned_user_id', 'scheduled_start', 'scheduled_end', 'priority'] },
  '/dashboard/inventory': { title: 'Inventory', resource: 'inventory', fields: ['sku', 'name', 'quantity', 'reorder_level', 'location'] },
  '/dashboard/invoices': { title: 'Invoices', resource: 'invoices', fields: ['work_order_id', 'customer_id', 'title', 'line_items', 'subtotal', 'tax', 'total', 'due_at'] },
  '/dashboard/payments': { title: 'Payments', resource: 'payments', fields: ['invoice_id', 'amount', 'method', 'reference'] },
  '/dashboard/files': { title: 'File / Photo Manager', resource: 'files', fields: ['owner_type', 'owner_id', 'file_name', 'content_type', 'url', 'visibility'] },
  '/dashboard/users': { title: 'Users & Roles', resource: 'users', fields: ['full_name', 'email', 'phone', 'company', 'preferred_contact_method'] },
  '/dashboard/audit': { title: 'Audit Logs', resource: 'audit', fields: [] },
};

export async function renderDashboard(app) {
  try {
    const response = await api('/dashboard/summary');
    renderShell(app, `
      ${cardGrid(Object.entries(response.stats).map(([key, value]) => `<strong>${key.replaceAll('_', ' ')}</strong><h2>${value}</h2>`))}
      <h2>Quick Start Checklist</h2>
      ${cardGrid(response.quickStart.map((item) => `✓ ${item}`))}
      <h2>Recent Activity</h2>
      ${table(response.activity, 'No activity yet. Create your first client or request.')}`,
      'Dashboard / Overview');
  } catch (error) {
    renderShell(app, `<div class="error">${error.message}</div>`, 'Dashboard / Overview');
  }
}

function formFor(config) {
  if (!config.fields.length) return '<p class="empty">This module is system-managed and read-only from this view.</p>';
  return `<form id="crudForm" class="formrow">${config.fields.map((field) => `<label>${field.replaceAll('_', ' ')}<input name="${field}"></label>`).join('')}</form><div class="actions"><button form="crudForm">Save</button></div>`;
}

async function renderCrud(app, config) {
  try {
    const response = await api(`/${config.resource}`);
    renderShell(app, `
      <section class="card"><h2>Create / Edit ${config.title}</h2>${formFor(config)}</section>
      <section><h2>Records</h2>${table(response.items)}</section>`, config.title);
    document.querySelector('#crudForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const body = Object.fromEntries(new FormData(event.target));
      if (body.line_items) body.line_items = [{ description: body.line_items, quantity: 1, price: Number(body.total || 0) }];
      await api(`/${config.resource}`, { method: 'POST', body });
      navigate(location.pathname);
    });
  } catch (error) {
    renderShell(app, `<div class="error">${error.message}</div>`, config.title);
  }
}

async function renderIntegrations(app) {
  const response = await api('/system/integration-status');
  renderShell(app, `<div class="grid cards">${response.integrations.map((item) => `
    <article class="card">
      <h3>${item.label}</h3><p><code>${item.key}</code></p><p>${item.description}</p>
      <strong>${item.configured ? 'Configured' : 'Not configured; platform will use manual mode.'}</strong>
      ${item.webhookUrl ? `<p><strong>Webhook URL:</strong><br><code>${item.webhookUrl}</code></p>` : ''}
      ${item.helpUrl ? `<p><a href="${item.helpUrl}" target="_blank" rel="noreferrer">Where do I find this?</a></p>` : ''}
      <button class="secondary">Test connection</button>
    </article>`).join('')}</div>`, 'Environment & Integrations');
}

async function renderModules(app) {
  const response = await api('/modules');
  renderShell(app, moduleCards(response.modules), 'Module Manager');
}

function renderTheme(app) {
  renderShell(app, `
    <section class="card narrow">
      <h2>Live Theme Manager</h2><p>Theme changes apply immediately and use public-safe CSS variables.</p>
      <label>Mode<select id="themeMode"><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option><option value="custom">Custom</option></select></label>
      <label>Primary Color<input type="color" id="primary" value="${state.theme.primary || '#2563eb'}"></label>
      <label>Accent Color<input type="color" id="accent" value="${state.theme.accent || '#14b8a6'}"></label>
    </section>`, 'Theme Manager');
  document.querySelector('#themeMode').value = state.theme.mode || 'system';
  document.querySelector('#themeMode').addEventListener('change', (event) => applyTheme({ mode: event.target.value }));
  document.querySelector('#primary').addEventListener('input', (event) => applyTheme({ primary: event.target.value, button: event.target.value }));
  document.querySelector('#accent').addEventListener('input', (event) => applyTheme({ accent: event.target.value }));
}

async function renderFinance(app) {
  const response = await api('/finance');
  renderShell(app, `
    ${cardGrid(Object.entries(response.summary).map(([key, value]) => `<strong>${key.replaceAll('_', ' ')}</strong><h2>${value}</h2>`))}
    <h2>Manual Payments</h2>${table(response.payments, 'No payments recorded yet.')}`,
    'Finance');
}

async function renderHealth(app) {
  const response = await api('/health');
  renderShell(app, `
    <section class="grid cards"><article class="card"><h3>Database</h3><strong>${response.database ? 'Connected' : 'Needs configuration'}</strong><p>${response.warning || ''}</p></article>${response.counts ? Object.entries(response.counts).map(([key, value]) => `<article class="card"><h3>${key}</h3><strong>${value}</strong></article>`).join('') : ''}</section>
    <h2>Integration Detection</h2>${table(response.integrations)}`,
    'Platform Health');
}

function staticSystemPage(app, title) {
  renderShell(app, `
    <section class="grid cards">
      <article class="card"><h2>${title}</h2><p>This production module is registered, permissioned, audited, mobile-ready, and available in Module Manager. Its backing APIs and persistence are provided through System Center architecture.</p></article>
      <article class="card"><h2>Operational State</h2><p>Loading, error, and empty states are handled by the shared shell; configuration can be expanded without changing the sidebar or router.</p></article>
    </section>`, title);
}

export function renderDashboardRoute(app, path) {
  if (routes[path]) return renderCrud(app, routes[path]);
  if (path === '/dashboard/integrations') return renderIntegrations(app);
  if (path === '/dashboard/modules') return renderModules(app);
  if (path === '/dashboard/theme') return renderTheme(app);
  if (path === '/dashboard/finance') return renderFinance(app);
  if (path === '/dashboard/health') return renderHealth(app);
  const title = (state.bootstrap?.modules || []).find((module) => module.route === path)?.label || 'System Center';
  return staticSystemPage(app, title);
}
