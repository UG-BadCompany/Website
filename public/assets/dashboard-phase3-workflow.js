// public/assets/dashboard-phase3-workflow.js
// Legacy phase marker retained for audits only.
// Work Order Pipeline is now the single admin requests workspace.
(() => {
  if (window.__taDashboardPhase3Loaded) return;
  window.__taDashboardPhase3Loaded = true;
  window.taLegacyPhase3AuditMarkers = ['work-order pipeline', '/api/admin/job-requests', 'invoice readiness'];
})();
