import { api } from './core/api.js';
import { state } from './core/state.js';
import { applyTheme } from './core/theme.js';
import { renderInstaller } from './views/installer.js';
import { renderDashboard, renderDashboardRoute } from './views/dashboard.js';
import { renderHome } from './views/home.js';
import { renderLogin } from './views/login.js';
import { renderPortal } from './views/portal.js';

export const app = document.querySelector('#app');

export function navigate(path) {
  history.pushState(null, '', path);
  render();
}

export function bindLinks() {
  document.querySelectorAll('[data-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      navigate(link.getAttribute('href'));
    });
  });
}

export async function boot() {
  try {
    const status = await api('/install-status');
    const path = location.pathname;
    if (!status.installation_complete && !path.startsWith('/install')) {
      navigate('/install/');
      return;
    }
    if (status.installation_complete) {
      state.bootstrap = await api('/bootstrap');
      if (state.bootstrap?.company?.theme) applyTheme(state.bootstrap.company.theme);
      if (path.startsWith('/install')) {
        navigate('/dashboard/');
        return;
      }
    }
    render();
  } catch (error) {
    app.innerHTML = `
      <main class="installer recovery">
        <section class="card">
          <h1>Installer recovery mode</h1>
          <p>${error.message}</p>
          <p>The app returned a JSON-safe error instead of a white screen. Check database configuration, then retry.</p>
          <button onclick="location.reload()">Retry</button>
        </section>
      </main>`;
  }
}

export function render() {
  const path = location.pathname;
  if (path.startsWith('/install')) return renderInstaller(app);
  if (path === '/' || path === '/index.html') return renderHome(app);
  if (path.startsWith('/login')) return renderLogin(app);
  if (path.startsWith('/portal/client')) return renderPortal(app, 'client');
  if (path.startsWith('/portal/worker')) return renderPortal(app, 'worker');
  if (path === '/dashboard/' || path === '/dashboard') return renderDashboard(app);
  if (path.startsWith('/dashboard')) return renderDashboardRoute(app, path);
  return renderHome(app);
}

window.addEventListener('popstate', render);
