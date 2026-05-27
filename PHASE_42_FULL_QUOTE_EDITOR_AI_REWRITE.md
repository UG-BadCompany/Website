# PHASE 42 FULL QUOTE EDITOR + AI REWRITE

Built on Phase 41.

## Finished

The Estimate Review section now supports a complete final quote editing workflow.

## Added

- Open/edit final quote directly from Estimate Review Queue
- Edit title
- Edit amount
- Edit final customer/admin quote summary
- Add missing items / updated information
- AI rewrite quote button
- AI rewrite endpoint with OpenAI when configured
- Fallback rewrite when AI is unavailable
- Rewrite notes, resolved info, remaining questions, risk flags, and exclusions
- Save draft
- Save & send

## Endpoint

```text
POST /api/admin/estimate-rewrite
```

## Validation

```text
node scripts/audit-phase42-full-quote-editor.mjs
npm run build
```
