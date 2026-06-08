import { api } from '../core/api.js';
import { applyTheme, defaultTheme } from '../core/theme.js';
import { saveInstallDraft, saveInstallStep, state } from '../core/state.js';

const steps = ['Welcome', 'Company', 'Branding', 'Theme', 'Owner Account', 'Services', 'Modules', 'Homepage', 'Review', 'Finish'];

async function persistDraft() {
  saveInstallDraft(state.installDraft);
  try { await api('/install/draft', { method: 'POST', body: state.installDraft }); } catch {}
}

function collectStepFields() {
  const company = { ...(state.installDraft.company || {}) };
  const owner = { ...(state.installDraft.owner || {}) };
  const homepage = { ...(state.installDraft.homepage || {}) };
  const field = (id) => document.querySelector(`#${id}`)?.value;
  if (field('companyName') !== undefined) company.name = field('companyName');
  if (field('companyEmail') !== undefined) company.email = field('companyEmail');
  if (field('companyPhone') !== undefined) company.phone = field('companyPhone');
  if (field('companyAddress') !== undefined) company.address = field('companyAddress');
  if (field('logoUrl') !== undefined) company.logoUrl = field('logoUrl');
  if (field('ownerName') !== undefined) owner.fullName = field('ownerName');
  if (field('ownerEmail') !== undefined) owner.email = field('ownerEmail');
  if (field('ownerPhone') !== undefined) owner.phone = field('ownerPhone');
  if (field('heroTitle') !== undefined) homepage.heroTitle = field('heroTitle');
  if (field('heroSubtitle') !== undefined) homepage.heroSubtitle = field('heroSubtitle');
  state.installDraft = { ...state.installDraft, company, owner, homepage };
}

function preview() {
  const company = state.installDraft.company || {};
  const theme = { ...defaultTheme, ...(state.installDraft.theme || {}) };
  return `
    <aside class="preview card">
      <h3>Live Preview</h3>
      <div class="brand"><div class="logo">${(company.name || 'C')[0]}</div><div><strong>${company.name || 'Contractor Platform'}</strong><br><small>${theme.mode} theme</small></div></div>
      <div class="card"><h4>Sample dashboard card</h4><p>Theme changes update immediately across cards, inputs, sidebar, buttons, and mobile nav.</p><button>Primary action</button></div>
      <div class="sample-mobile-nav">Mobile nav preview</div>
      <hr>
      <div id="integrationStatus" class="grid"><div class="loading">Detecting integrations…</div></div>
    </aside>`;
}

function stepContent() {
  const company = state.installDraft.company || {};
  const owner = state.installDraft.owner || {};
  const homepage = state.installDraft.homepage || {};
  const theme = { ...defaultTheme, ...(state.installDraft.theme || {}) };
  switch (state.installStep) {
    case 0:
      return '<h1>Welcome to Your New Business Platform</h1><p>This installer creates the real database records, owner account, roles, permissions, services, module registry, homepage, and theme settings required for a production CMMS.</p><div class="banner">Optional integrations never block installation. Manual mode works immediately.</div>';
    case 1:
      return `<h1>Company</h1><div class="formrow"><label>Company Name<input id="companyName" value="${company.name || ''}"></label><label>Email<input id="companyEmail" value="${company.email || ''}"></label><label>Phone<input id="companyPhone" value="${company.phone || ''}"></label><label>Address<input id="companyAddress" value="${company.address || ''}"></label></div>`;
    case 2:
      return `<h1>Branding</h1><label>Logo URL<input id="logoUrl" value="${company.logoUrl || ''}" placeholder="https://your-domain.com/logo.png"></label><p class="empty">Logo can also be managed later in File / Photo Manager and Theme Manager.</p>`;
    case 3:
      return `<h1>Theme</h1><label>Mode<select id="themeMode"><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option><option value="custom">Custom</option></select></label><div class="grid cards">${Object.keys(defaultTheme).filter((key) => key !== 'mode').map((key) => `<label>${key}<span class="colorrow"><input type="color" data-color="${key}" value="${theme[key] || '#2563eb'}"><input data-hex="${key}" value="${theme[key] || ''}" pattern="#[0-9a-fA-F]{6}"></span></label>`).join('')}</div>`;
    case 4:
      return `<h1>Owner Account</h1><div class="formrow"><label>Full Name<input id="ownerName" value="${owner.fullName || ''}"></label><label>Email<input id="ownerEmail" type="email" value="${owner.email || company.email || ''}"></label><label>Phone<input id="ownerPhone" value="${owner.phone || ''}"></label></div>`;
    case 5:
      return '<h1>Services</h1><p>Default contractor services will be seeded and can be edited after install.</p><div class="grid cards">Roofing, HVAC, Plumbing, Electrical, Remodeling, Painting, Landscaping, General Maintenance, Emergency Repair, Preventive Maintenance'.split(', ').map((service) => `<article class="card">${service}</article>`).join('') + '</div>';
    case 6:
      return '<h1>Modules</h1><p>All required core modules will be registered with manifests, permissions, routes, APIs, and Module Manager visibility.</p><div class="grid cards">Dashboard, Customers, Requests, Quotes, Work Orders, Schedule, Inventory, Invoices, Finance, Client Portal, Worker Portal, Homepage Editor, Theme Manager, Module Manager, System Center, AI Tools'.split(', ').map((module) => `<article class="card">${module}</article>`).join('') + '</div>';
    case 7:
      return `<h1>Homepage</h1><label>Hero Title<input id="heroTitle" value="${homepage.heroTitle || ''}" placeholder="Welcome to ${company.name || 'our company'}"></label><label>Hero Subtitle<textarea id="heroSubtitle">${homepage.heroSubtitle || ''}</textarea></label>`;
    case 8:
      return '<h1>Review</h1><p>Finish Install will create or update real production records: platform installation, company/theme/homepage, owner user, roles, permissions, role permissions, workspace access, module registry/settings, services, and audit logs.</p><div id="reviewIntegrations" class="grid"></div>';
    default:
      return '<h1>Finish</h1><p>Click Finish Install to validate and create the complete starting platform.</p><div id="finishStatus"></div>';
  }
}

function bindThemeControls() {
  const mode = document.querySelector('#themeMode');
  if (!mode) return;
  const theme = { ...defaultTheme, ...(state.installDraft.theme || {}) };
  mode.value = theme.mode || 'system';
  mode.addEventListener('change', async (event) => {
    theme.mode = event.target.value;
    state.installDraft.theme = theme;
    applyTheme(theme);
    await persistDraft();
  });
  document.querySelectorAll('[data-color], [data-hex]').forEach((input) => {
    input.addEventListener('input', async (event) => {
      const key = event.target.dataset.color || event.target.dataset.hex;
      const value = event.target.value;
      if (!/^#[0-9a-fA-F]{6}$/.test(value)) return;
      theme[key] = value;
      state.installDraft.theme = theme;
      const pair = document.querySelector(event.target.dataset.color ? `[data-hex="${key}"]` : `[data-color="${key}"]`);
      if (pair) pair.value = value;
      applyTheme(theme);
      await persistDraft();
    });
  });
  applyTheme(theme);
}

async function loadIntegrationStatus() {
  try {
    const response = await api('/install/integration-status');
    const markup = response.integrations.map((item) => `<div class="pill">${item.key}: ${item.configured ? 'Configured' : 'Not configured; platform will use manual mode.'}</div>`).join('');
    document.querySelector('#integrationStatus').innerHTML = markup;
    if (document.querySelector('#reviewIntegrations')) document.querySelector('#reviewIntegrations').innerHTML = markup;
  } catch (error) {
    document.querySelector('#integrationStatus').innerHTML = `<div class="error">${error.message}</div>`;
  }
}

export function renderInstaller(app) {
  const percent = Math.round(((state.installStep + 1) / steps.length) * 100);
  app.innerHTML = `
    <main class="installer">
      <aside class="steps"><h2>Setup</h2><p>Step ${state.installStep + 1} of ${steps.length}</p><progress max="100" value="${percent}"></progress>${steps.map((label, index) => `<div class="step ${index === state.installStep ? 'active' : ''}">${index + 1}. ${label}</div>`).join('')}</aside>
      <section class="card"><div id="installMain">${stepContent()}</div><div class="actions"><button class="secondary" id="back" ${state.installStep === 0 ? 'disabled' : ''}>Back</button><button id="next">${state.installStep === steps.length - 1 ? 'Finish Install' : 'Save & Continue'}</button></div></section>
      ${preview()}
    </main>`;
  bindThemeControls();
  loadIntegrationStatus();
  document.querySelector('#back').addEventListener('click', () => {
    collectStepFields();
    saveInstallStep(Math.max(0, state.installStep - 1));
    renderInstaller(app);
  });
  document.querySelector('#next').addEventListener('click', async () => {
    collectStepFields();
    await persistDraft();
    if (state.installStep < steps.length - 1) {
      saveInstallStep(state.installStep + 1);
      renderInstaller(app);
      return;
    }
    const status = document.querySelector('#finishStatus');
    try {
      status.innerHTML = '<div class="loading">Creating database records and validating platform…</div>';
      const response = await api('/install/finish', { method: 'POST', body: state.installDraft });
      localStorage.removeItem('installStep');
      location.href = response.redirect || '/dashboard/';
    } catch (error) {
      status.innerHTML = `<div class="error">${error.message}</div>`;
    }
  });
}
