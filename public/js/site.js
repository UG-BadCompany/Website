// public/js/site.js
// Dark-mode-only site helper.
// IMPORTANT: This does NOT replace or remove magic-link auth.
// It only removes theme/light-mode controls if they still exist.

(() => {
  document.documentElement.removeAttribute('data-theme');

  try {
    localStorage.removeItem('ta-theme');
  } catch {}

  document.querySelectorAll('[data-theme-toggle]').forEach((el) => el.remove());
})();
