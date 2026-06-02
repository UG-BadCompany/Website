// Phase 28 cleanup final polish
// Final owner workspace overhaul: do not inject an Operations Modules section into
// every dashboard workspace. Sidebar routing is now the single launcher surface.
(()=> {
 if(window.__phase28CleanupLoaded)return;
 window.__phase28CleanupLoaded=true;
 document.querySelectorAll('.phase-cleanup-note').forEach((node)=>node.remove());
})();