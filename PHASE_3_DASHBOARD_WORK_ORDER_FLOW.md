# PHASE 3 DASHBOARD / WORK ORDER FLOW UPGRADE

Built on Phase 2.

## What Phase 3 improves

### Admin side
- Adds a work-order pipeline board:
  - Accepted
  - Scheduled
  - In Progress
  - Pending Review
- Adds quick actions to advance work order status.
- Adds `/api/admin/work-orders` for active work order review/update.
- Keeps Estimate Review queue from Phase 2.
- Keeps Requests, Quotes, Invoices, Inventory, Roles, Reports, Activity, Alerts.

### Client side
- Adds clearer customer timeline:
  - Request
  - Estimate
  - Approval
  - Schedule
  - Work
  - Invoice / Complete
- Keeps the public/customer language as Request Estimate.
- Does not expose AI Quote wording to customers.

### Worker side
- Adds a worker field-flow panel:
  - Accept job
  - Start work
  - Mark blocked
  - Track materials/inventory
  - Add completion notes/photos
  - Submit for admin completion review
- Keeps the existing worker jobs API and section intact.

### Work-order flow
The intended operational flow is now:

```text
Request Estimate
→ Estimate draft
→ Admin review
→ Quote sent
→ Client accepts
→ Work order accepted
→ Scheduled
→ Worker assigned
→ In progress
→ Pending admin completion review
→ Completed
→ Invoice/payment
```

## New files

```text
netlify/functions/admin-work-orders.mjs
public/assets/dashboard-phase3-workflow.css
public/assets/dashboard-phase3-workflow.js
```

## Existing files changed

```text
public/dashboard/index.html
netlify.toml
```

## New API route

```text
/api/admin/work-orders
```

## Build result

This package should be tested with:

```bash
npm run build
```

## Important

This phase does not delete or replace the existing dashboard. It layers a stronger command-center workflow on top of the existing dashboard system.
