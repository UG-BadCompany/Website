// Phase 29 action guard and anchor repair
(() => {
  if (window.__phase29ActionGuardLoaded) return;
  window.__phase29ActionGuardLoaded = true;

  const toast = (title, message, type = 'warn') => {
    if (window.TAUX?.toast) window.TAUX.toast({ title, message, type });
    else console.info(title, message);
  };

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href === '#') return;
    setTimeout(() => {
      if (!document.querySelector(href)) {
        toast('Section unavailable', 'That section is not available for your role or has not loaded yet.', 'warn');
      }
    }, 350);
  }, true);

  document.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    const hasKnownAction =
      button.hasAttribute('onclick') ||
      Array.from(button.attributes).some((attr) => attr.name.startsWith('data-')) ||
      button.type === 'submit' ||
      button.closest('form');
    if (!hasKnownAction) {
      toast('Action not connected', 'This button needs a workflow before it can be used.', 'warn');
    }
  }, true);
})();
