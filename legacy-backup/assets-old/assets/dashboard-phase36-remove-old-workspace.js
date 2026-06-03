// CLEANUP CANDIDATE
// Possible legacy overlap: Phase 35 and Phase 36 both remove old top workspace tab UI.
// Keep this guard until cached Phase 33 workspace assets are no longer present in production/client caches.
// Phase 36: remove old dashboard workspace query behavior.
(() => {
  const url = new URL(window.location.href);
  if (url.pathname.replace(/\/+$/, '') === '/dashboard' && url.searchParams.has('workspace')) {
    url.searchParams.delete('workspace');
    window.history.replaceState({}, '', url);
  }

  // If old top workspace tabs or route notes were mounted by cached scripts, remove them.
  const removeOldWorkspaceUi = () => {
    document.querySelectorAll(
      '.workspace-route-tabs, [data-workspace-route-tabs], .workspace-route-note, [data-workspace-route-note], nav[aria-label="Dashboard workspace routes"]'
    ).forEach((el) => el.remove());
  };

  removeOldWorkspaceUi();
  setTimeout(removeOldWorkspaceUi, 100);
  setTimeout(removeOldWorkspaceUi, 750);
})();
