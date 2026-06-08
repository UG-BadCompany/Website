import { state } from '../core/state.js';
import { bindLinks } from '../router.js';

export function renderHome(app) {
  const company = state.bootstrap?.company;
  const homepage = state.bootstrap?.homepage?.content || {};
  app.innerHTML = `
    <main class="public-site">
      <header class="public-header"><strong>${company?.company_name || 'Contractor Platform'}</strong><nav><a href="/login/" data-link>Client Login</a><a href="/dashboard/" data-link>Dashboard</a></nav></header>
      <section class="hero card">
        <h1>${homepage.heroTitle || 'Professional Contractor CMMS'}</h1>
        <p>${homepage.heroSubtitle || 'Request estimates, approve quotes, and track work from one portal.'}</p>
        <div class="actions"><a class="btn" href="/dashboard/requests" data-link>Request an Estimate</a><a class="btn secondary" href="/login/" data-link>Open Portal</a></div>
      </section>
      <section class="grid cards">${(homepage.services || ['Roofing', 'HVAC', 'Plumbing', 'Electrical']).map((service) => `<article class="card"><h3>${service}</h3><p>Configured in Services and editable from the dashboard.</p></article>`).join('')}</section>
    </main>`;
  bindLinks();
}
