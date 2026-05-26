(() => {
  const themeKey = 'ta-theme';
  const root = document.documentElement;
  const stored = localStorage.getItem(themeKey);
  if (stored) root.dataset.theme = stored;

  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    const update = () => {
      button.textContent = root.dataset.theme === 'light' ? 'Dark Mode' : 'Light Mode';
    };
    update();
    button.addEventListener('click', () => {
      root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem(themeKey, root.dataset.theme);
      update();
    });
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
