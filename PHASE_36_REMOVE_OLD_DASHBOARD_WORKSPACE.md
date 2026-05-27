# PHASE 36 REMOVE OLD DASHBOARD WORKSPACE

Built on Phase 35.

## Fixed

- Removed old `/dashboard/?workspace=overview` behavior.
- Dashboard no longer writes `?workspace=...` into the URL.
- Any old `?workspace=` query is cleaned from the URL.
- Old Phase 33 top-tab workspace assets are removed/blocked.
- Sidebar-only dashboard remains the source of workspace navigation.

## Validation

```text
node scripts/audit-phase36-remove-old-workspace.mjs
npm run build
```
