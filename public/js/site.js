// public/js/site.js
// Hotfix: light mode removed. Site stays in dark mode only.

(() => {
  document.documentElement.removeAttribute('data-theme');
  try {
    localStorage.removeItem('ta-theme');
  } catch {}

  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    button.remove();
  });

  document.querySelectorAll('[data-dashboard-link]').forEach((link) => {
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      try {
        const response = await fetch('/api/me', { headers: { accept: 'application/json' } });
        const result = await response.json().catch(() => ({}));
        window.location.assign(response.ok && result.authenticated ? '/dashboard/' : '/login/?next=dashboard');
      } catch {
        window.location.assign('/login/?next=dashboard');
      }
    });
  });
})();
