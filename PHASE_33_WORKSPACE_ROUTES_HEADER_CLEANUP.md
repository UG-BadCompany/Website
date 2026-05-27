# PHASE 33 WORKSPACE ROUTES + HEADER CLEANUP

## Changed

- Removed header quick links:
  - Owner View
  - Estimate Review
  - Finance
  - Requests
  - Worker Jobs

- Added route-style workspace tabs:
  - Overview
  - Requests
  - Quotes
  - Work Orders
  - Invoices
  - Workers
  - Settings

- Only one workspace category is shown at a time.
- Workspace route is stored in the URL as `?workspace=...`.

## Validation

```text
node scripts/audit-phase33-workspace-routes.mjs
npm run build
```
