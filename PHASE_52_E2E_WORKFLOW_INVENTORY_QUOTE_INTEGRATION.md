# Phase 52 — E2E Workflow QA + Inventory / Quote Integration

## What was connected

Phase 52 connects the quote, work-order, worker, inventory, and invoice-readiness paths so the operations flow behaves more like one contracting system instead of separate modules.

Connected areas:

- Estimate Review now receives structured material breakdown data and inventory match candidates.
- Quote editor now renders an **Inventory Match & Reservation** section with matched item, available quantity, reserved quantity, cost/charge values, stock warnings, reserve quantity, Reserve, Release unused, and visible status feedback.
- Admin inventory supports reserve, consume, and release workflows with inventory movement/audit records.
- Worker inventory supports material use and unused-reservation release for assigned jobs.
- Work-order detail now includes **Job Materials** and invoice/payment readiness messaging.
- Phase 51 route warnings are handled with explicit Netlify redirects for `/api/auth/verify` and `/api/admin/square/payment-link`.

## Quote → inventory workflow

1. Estimate Review loads draft quote data and structured `materialBreakdown` entries.
2. The estimate-review API maps materials to inventory items by SKU/hint, supplier part number, item name, category/trade, and `aiQuoteCatalogKey`.
3. Each match includes a confidence value: `exact`, `strong`, `possible`, or `no_match`.
4. Admin can reserve a matched item from the quote editor.
5. Reservation increases reserved quantity and decreases available quantity while leaving on-hand quantity unchanged.
6. The system records a `reserved_for_job` inventory movement.

## Worker usage workflow

1. Worker sees assigned/truck/job inventory through the worker inventory endpoint.
2. Worker marks material used on a job.
3. Usage decreases on-hand quantity and reserved quantity.
4. A `consumed_on_job` movement is recorded.
5. Worker can release unused reserved stock with a `released_from_job` movement.

## Work-order material workflow

The dashboard work-order detail now includes a **Job Materials** section showing reserved, used, unused, and release-ready materials. Admin can release unused reserved materials from that section through the real admin inventory release endpoint.

## Invoice/payment readiness behavior

The work-order detail now surfaces invoice readiness in the same material section. It warns when active reservations remain open, and it confirms when reserved materials have been used or released so invoice/payment closeout can proceed with material context.

## Tests and audits

Phase 52 adds:

- `tests/e2e-business-workflows.spec.mjs`
- `scripts/audit-phase52-workflows.mjs`
- `npm run test:e2e-workflows`
- `npm run audit:phase52`

The workflow tests verify quote editing/rewrite/save/send, quote-to-work-order wiring, inventory reservation invariants, worker consumption invariants, unused material release, completion evidence, admin review, and invoice readiness.

## Remaining for Phase 53

- Run true browser automation with a browser binary in CI for click-by-click DOM execution.
- Add live seeded database fixtures for quote acceptance → work-order creation → inventory reservation → worker use → invoice creation.
- Add invoice line-item material totals once final invoice schema requirements are locked.
- Add scanner hardware integration for barcode/QR workflows.
