# PHASE 13 PUBLIC STYLE MATCH

Built on Phase 12.

## What changed

The homepage, login page, thank-you page, inventory page, and portal landing pages now share the same dark/copper dashboard style.

New shared stylesheet:

```text
public/assets/public-phase13-dashboard-match.css
```

## Why

The dashboard looked more polished than the homepage/login pages. This makes the public site feel connected to the same system without rewriting the whole homepage layout.

## Validation

```text
node scripts/audit-phase13-public-style.mjs
npm run build
```
