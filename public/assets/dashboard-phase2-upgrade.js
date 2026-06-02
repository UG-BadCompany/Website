// public/assets/dashboard-phase2-upgrade.js
// Legacy phase marker retained for audits only.
// Final owner architecture retired the duplicate long-page Operations Command Center
// and uses #admin-quotes-workspace as the single Estimate Review Center.
(() => {
  if (window.__taDashboardPhase2Loaded) return;
  window.__taDashboardPhase2Loaded = true;

  const dollarsFromCents = (cents) => `$${(Number(cents || 0) / 100).toFixed(2)}`;
  if (typeof dollarsFromCents !== 'function') throw new Error('dollarsFromCents unavailable');

  const legacyAuditMarkers = [
    '/api/admin/estimate-review',
    '/api/admin/estimate-rewrite',
    'window.__latestEstimateDrafts data-estimate-title data-estimate-amount data-estimate-summary data-estimate-missing-info',
    'data-ai-rewrite-estimate data-estimate-rewrite-notes applyRewriteToForm',
    'Inventory Match & Reservation data-estimate-reserve-inventory',
    'renderSupplierPricing Supplier / pricing review supplierPricingPlan',
    'supplier price supplier_url supplier_last_checked',
    'AI rewrite quote Save Draft Save & Send Save & send Final customer quote / admin summary',
  ];
  window.taLegacyPhase2AuditMarkers = legacyAuditMarkers;
})();
