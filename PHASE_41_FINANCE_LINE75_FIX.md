# PHASE 41 FINANCE LINE 75 FIX

Built on Phase 40.

## Fixed

The finance dashboard was crashing because the static Client Payment Experience panel called:

```js
renderPaymentPlan(invoice.paymentPlan || {})
```

inside `mount()`, where no `invoice` variable exists.

That call has been removed. Payment plan rendering remains available for real invoice cards only.

## Validation

```text
node scripts/audit-phase41-finance-line75-fix.mjs
npm run build
```
