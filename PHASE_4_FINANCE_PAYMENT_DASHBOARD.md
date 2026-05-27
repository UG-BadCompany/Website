# PHASE 4 DASHBOARD / INVOICE / PAYMENT UPGRADE

Built on Phase 3.

## Goal

Move the dashboard closer to a 9/10 operating portal by tightening the financial workflow, payment visibility, and admin/client invoice experience.

## New admin finance command center

Added:

```text
public/assets/dashboard-phase4-finance.css
public/assets/dashboard-phase4-finance.js
netlify/functions/admin-finance-overview.mjs
```

New route:

```text
/api/admin/finance-overview
```

## Admin invoice improvements

The dashboard now shows:

- Open invoice count
- Total open amount
- Total paid amount
- Overdue invoice count
- Missing Square checkout link count
- Square configured/not configured status
- Priority invoice action queue

Admin can:

- Create Square payment links from the dashboard
- Open existing payment links
- Mark invoices paid manually
- Jump to Admin Invoices section

## Client payment improvements

The dashboard now shows a clearer customer payment journey:

```text
Quote approved
→ Work complete
→ Invoice open
→ Paid / receipt / closeout
```

Clients still see simple language and do not see backend AI tools.

## Work-order + payment closeout

The operational flow now becomes:

```text
Request Estimate
→ Estimate Draft
→ Admin Review
→ Quote Sent
→ Client Accepts
→ Work Order
→ Scheduled
→ Worker Assigned
→ In Progress
→ Pending Completion Review
→ Invoice
→ Payment
→ Completed
```

## Existing systems preserved

- Existing magic-link login
- Existing admin/client/worker dashboard logic
- Existing invoice API
- Existing Square utility
- Existing worker jobs API
- Existing Request Estimate form

## Required env variables

Square payments:

```env
SQUARE_ACCESS_TOKEN=...
SQUARE_LOCATION_ID=...
SQUARE_ENVIRONMENT=sandbox
```

Magic link:

```env
RESEND_API_KEY=...
MAGIC_LINK_FROM_EMAIL=portal@ta-contracting.org
```

OpenAI estimate drafting:

```env
OPENAI_API_KEY=...
OPENAI_QUOTE_MODEL=gpt-5-mini
AI_REQUEST_ESTIMATE_TIMEOUT_MS=9000
AI_LABOR_RATE=95
AI_TRIP_CHARGE=75
AI_MATERIAL_MARKUP_PERCENT=25
```

## Test checklist

1. Login with magic link
2. Admin dashboard loads
3. Request Estimate creates estimate draft
4. Estimate Review queue shows draft
5. Send quote / approve quote path still works
6. Work Order board updates status
7. Admin invoice list loads
8. Finance center loads
9. Create Square payment link
10. Mark invoice paid
11. Client invoices page shows open/paid status
12. Worker jobs page still loads
