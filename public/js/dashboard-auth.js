// public/js/dashboard-auth.js
// Keeps dashboard behind magic-link login without replacing your auth system.

(() => {
  const welcome = document.querySelector('[data-dashboard-welcome]');

  const setWelcome = (message) => {
    if (welcome) welcome.textContent = message;
  };

  async function checkSession() {
    try {
      const response = await fetch('/api/me', { headers: { accept: 'application/json' } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.authenticated) {
        window.location.assign('/login/?next=dashboard');
        return;
      }
      setWelcome(`Signed in as ${result.user?.email || 'client'}.`);
    } catch {
      window.location.assign('/login/?next=dashboard');
    }
  }

  document.querySelectorAll('[data-logout]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await fetch('/.netlify/functions/logout', { method: 'POST' });
      } catch {}
      try {
        localStorage.removeItem('taSessionUser');
      } catch {}
      window.location.assign('/login/?next=dashboard');
    });
  });

  checkSession();
})();
