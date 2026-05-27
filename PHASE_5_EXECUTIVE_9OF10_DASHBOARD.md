# PHASE 5 EXECUTIVE / 9-OF-10 DASHBOARD UPGRADE

Built on Phase 4.

## What Phase 5 adds

### Owner View
A new executive dashboard layer that pulls together:

- New requests
- Draft estimates
- Active work
- Blocked worker assignments
- Open invoice money
- Paid invoice money
- Low stock risk
- Overdue invoice risk
- Recent activity count
- Conversion health

New endpoint:

```text
/api/admin/executive-overview
```

New function:

```text
netlify/functions/admin-executive-overview.mjs
```

New dashboard assets:

```text
public/assets/dashboard-phase5-executive.css
public/assets/dashboard-phase5-executive.js
```

## Dashboard health score

The owner view calculates a dashboard health score using:

- New requests waiting
- Draft estimates waiting
- Blocked jobs
- Overdue invoices
- Low stock items

This is not a replacement for financial accounting. It is an operational health score.

## Next best actions

The executive layer shows practical actions:

- Review estimate drafts
- Schedule accepted quotes quickly
- Resolve blocked worker assignments
- Create Square checkout links before sending invoices
- Review low-stock parts before dispatching jobs

## Included previous phases

This ZIP includes:

- Phase 1: clean baseline rewrite, Request Estimate backend draft generation, magic-link routing, no light mode
- Phase 2: estimate review queue
- Phase 3: work-order pipeline
- Phase 4: invoices/payment command center
- Phase 5: owner/executive dashboard layer

## Required env variables

```env
RESEND_API_KEY=...
MAGIC_LINK_FROM_EMAIL=portal@ta-contracting.org

OPENAI_API_KEY=...
OPENAI_QUOTE_MODEL=gpt-5-mini
AI_REQUEST_ESTIMATE_TIMEOUT_MS=9000
AI_LABOR_RATE=95
AI_TRIP_CHARGE=75
AI_MATERIAL_MARKUP_PERCENT=25

SQUARE_ACCESS_TOKEN=...
SQUARE_LOCATION_ID=...
SQUARE_ENVIRONMENT=sandbox
```

## Test checklist

1. Build passes.
2. Magic-link login works.
3. Dashboard opens as admin.
4. Owner View loads.
5. Estimate Review loads.
6. Work Order Pipeline loads.
7. Finance Center loads.
8. Client invoice section still loads.
9. Worker jobs section still loads.
10. Request Estimate creates draft estimate.
