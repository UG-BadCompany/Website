# CLEAN BASELINE REWRITE - PHASE 1

This package was rebuilt from the original uploaded `Website v6 with openai.zip`, not from stacked patch zips.

## What was changed

### Public site
- Kept existing design and Request Estimate form.
- Kept the public label **Request Estimate** exactly.
- Removed/hidden light-mode controls.
- Removed visible AI Quote / Generate AI Quote wording and buttons.
- Request Estimate now says it is preparing the estimate after submit.

### Request Estimate flow
The browser still submits to:

```text
/api/job-requests
```

The server now:
1. Creates or updates the client account.
2. Creates or finds the property.
3. Saves the job request.
4. Automatically creates a draft estimate in the `quotes` table.
5. Updates job request status to `quote_in_progress`.
6. Sends/creates the magic-link client portal email.
7. Returns estimate draft metadata.

The customer does not see a separate AI Quote system.

### Magic-link login
- Existing login page and login JS were preserved.
- Existing `request-magic-link.mjs`, `verify-magic-link.mjs`, `me.mjs`, and `logout.mjs` flow remains.
- `/api/auth/magic-link` is now explicitly redirected in `netlify.toml`.
- Dev magic-link exposure was removed. If email is not configured, login returns a config error instead of showing a dev link.

### Dashboard
- Existing dashboard functions/sections/API logic were preserved.
- Dashboard was moved to dark/copper styling with a new override stylesheet:
  - `public/assets/dashboard-dark-final.css`
- Dashboard theme switching was removed.
- Dashboard still keeps admin/client/worker role logic.

### Netlify routing
Explicit API redirects were added in `netlify.toml` for auth, dashboard, admin, client, and job request endpoints.

## Required environment variables

Magic-link email:

```env
RESEND_API_KEY=...
MAGIC_LINK_FROM_EMAIL=portal@ta-contracting.org
```

OpenAI estimate draft improvement:

```env
OPENAI_API_KEY=...
OPENAI_QUOTE_MODEL=gpt-5-mini
AI_REQUEST_ESTIMATE_TIMEOUT_MS=9000
AI_LABOR_RATE=95
AI_TRIP_CHARGE=75
AI_MATERIAL_MARKUP_PERCENT=25
```

## Important
Do not rename Request Estimate to AI Request Estimate.
Do not add a separate customer-facing AI Quote page.
Do not call `/api/ai-quote-draft` from the browser.
