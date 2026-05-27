# PHASE 21 WORK ORDER AUTOMATION

Built on Phase 20.

## Added

- Dispatch priority scoring
- Schedule window suggestions
- Assignment-needed detection
- Overdue/escalation flags
- Recommended admin actions
- Safety/licensed/urgent warnings
- Automation panel on admin work-order cards

## Existing controls preserved

This does not auto-send, auto-assign, or auto-schedule anything yet. It gives the admin better recommendations while keeping manual control.

## Validation

```text
node scripts/audit-phase21-work-order-automation.mjs
npm run build
```
