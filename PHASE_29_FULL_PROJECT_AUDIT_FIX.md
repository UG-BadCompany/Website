# PHASE 29 FULL PROJECT AUDIT + BUTTON FIX

Built on Phase 28.

## Fixed

- Added missing dashboard anchor targets.
- Fixed dashboard logout href to use the existing `/api/logout` route.
- Converted debug fallback Roles/Users and Audit Activity links into real modal shortcut buttons.
- Added a dashboard action guard for unavailable role-based sections.
- Added full project audit for anchors, page links, API links, and key dashboard shortcuts.

## Validation

```text
node scripts/audit-phase29-full-project.mjs
npm run build
```
