# PHASE 18 SUPPLIER / MATERIAL PRICING FOUNDATION

Built on Phase 17.

## What changed

The AI quote draft now adds supplier-pricing intelligence for every material line.

Added:
- Supplier category detection
- Preferred supplier
- Fallback suppliers
- Live price/stock verification flag
- Pricing freshness notes
- Customer-supplied material sourcing notes
- Supplier/pricing review in estimate summary
- Supplier/pricing review visible inside Admin Estimate Review

This is not a live API integration yet. It is the foundation for live Home Depot, Lowe’s, Ferguson, Johnstone, Grainger, SupplyHouse, Amazon Business, or local supplier APIs.

## Files changed

```text
netlify/functions/create-job-request.mjs
netlify/functions/admin-estimate-review.mjs
public/assets/dashboard-phase2-upgrade.js
public/assets/dashboard-phase18-supplier-pricing.css
public/dashboard/index.html
```

## Validation

```text
node scripts/audit-phase18-supplier-pricing.mjs
npm run build
```
