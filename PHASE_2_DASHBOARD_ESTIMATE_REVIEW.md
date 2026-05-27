# PHASE 2 DASHBOARD + ESTIMATE REVIEW UPGRADE

This package builds on the clean Phase 1 rewrite.

## Goal

Move the website closer to an 8/10 operational system while preserving the existing T&A Contracting structure.

## Major improvements

### 1. Dashboard command center
The dashboard now includes a new operations command center panel with:
- Estimate Draft count
- Ready Draft count
- Needs Review count
- Direct actions for Request Estimate, Requests, and Quotes

Files added:
```text
public/assets/dashboard-phase2-upgrade.css
public/assets/dashboard-phase2-upgrade.js
```

### 2. Estimate Review Queue
Auto-generated estimate drafts created from the public Request Estimate form now show in the admin dashboard review queue.

Admin can:
- View generated draft details
- See customer/contact/request information
- Copy the estimate summary
- Mark/send a reviewed estimate

New API:
```text
/api/admin/estimate-review
```

New function:
```text
netlify/functions/admin-estimate-review.mjs
```

### 3. Request Estimate still stays the public flow
The customer still sees:
```text
Request Estimate
```

The backend now creates the estimate draft automatically:
```text
Request Estimate -> /api/job-requests -> quote draft -> admin review
```

### 4. No separate customer AI Quote system
The AI/estimate generation stays hidden behind the normal request flow.

### 5. Existing dashboard preserved
The existing admin/client/worker dashboard logic was not replaced.
Phase 2 adds a better command layer and review queue on top.

## Required env variables

Magic login:
```env
RESEND_API_KEY=...
MAGIC_LINK_FROM_EMAIL=portal@ta-contracting.org
```

OpenAI estimate improvement:
```env
OPENAI_API_KEY=...
OPENAI_QUOTE_MODEL=gpt-5-mini
AI_REQUEST_ESTIMATE_TIMEOUT_MS=9000
AI_LABOR_RATE=95
AI_TRIP_CHARGE=75
AI_MATERIAL_MARKUP_PERCENT=25
```

## Important

After deploy, test:
1. Magic link login
2. Request Estimate submit
3. Dashboard admin login
4. Estimate Review queue
5. Existing Requests/Quotes admin sections
