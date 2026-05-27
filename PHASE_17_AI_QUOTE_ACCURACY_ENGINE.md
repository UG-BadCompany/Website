# PHASE 17 AI QUOTING ACCURACY ENGINE

Built on Phase 16.

## What changed

The Request Estimate auto-draft estimator now has an accuracy layer instead of just basic trade buckets.

Added:
- Access difficulty detection
- Urgency detection
- Property type modifier
- Customer-supplied material risk
- Measurement quality scoring
- Permit/licensed-trade review flags
- Height/roof/ladder modifier
- Long material run modifier
- Corrosion / hidden damage risk modifier
- Multi-visit drywall/paint modifier
- Labor/material multipliers
- Improved confidence score
- Quote options: diagnostic, range, recommended estimate
- Accuracy review visible in admin Estimate Review

## Files changed

```text
netlify/functions/create-job-request.mjs
netlify/functions/admin-estimate-review.mjs
public/assets/dashboard-phase2-upgrade.js
public/assets/dashboard-phase17-ai-accuracy.css
public/dashboard/index.html
```

## Validation

```text
node scripts/audit-phase17-ai-accuracy.mjs
npm run build
```
