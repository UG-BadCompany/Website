// Phase 35: remove leftover top workspace tab bar if it was already mounted.
(() => {
  const removeTabs = () => {
    document.querySelectorAll('.workspace-route-tabs, [data-workspace-route-tabs], nav[aria-label="Dashboard workspace routes"], .workspace-route-note, [data-workspace-route-note]').forEach((el) => el.remove());
  };

  removeTabs();
  setTimeout(removeTabs, 250);
  setTimeout(removeTabs, 1000);

  const observer = new MutationObserver(removeTabs);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
