# Request Estimate = AI-powered Estimate Update

This update keeps the existing customer-facing wording and form:

```text
Request Estimate
```

It does **not** rename it to AI Request Estimate.

## What changed

The public Request Estimate form still submits to:

```text
/api/job-requests
```

But now the server does more behind the scenes:

1. Saves/creates client account
2. Saves/creates property
3. Saves job request
4. Automatically creates an estimate draft in `quotes`
5. Sets job request status to `quote_in_progress`
6. Sends/creates the client magic-link portal login
7. Returns estimate draft metadata to the frontend

## Important

There is still only one customer-facing system:

```text
Request Estimate
```

There should be no visible customer buttons/pages named:

```text
AI Quote
AI Quotes
Generate AI Quote
AI Request Estimate
```

The AI/estimate logic is backend only.

## Files changed

```text
public/index.html
netlify/functions/create-job-request.mjs
netlify.toml
```

## Netlify routes

`netlify.toml` now explicitly maps:

```text
/api/job-requests -> /.netlify/functions/create-job-request
/api/auth/magic-link -> /.netlify/functions/request-magic-link
/api/me -> /.netlify/functions/me
/api/logout -> /.netlify/functions/logout
/api/admin/quote-draft -> /.netlify/functions/admin-quote-draft
/api/admin/job-requests -> /.netlify/functions/admin-job-requests
```

## Environment variables

For OpenAI enhancement of estimate drafts:

```env
OPENAI_API_KEY=...
OPENAI_QUOTE_MODEL=gpt-5-mini
AI_REQUEST_ESTIMATE_TIMEOUT_MS=9000
AI_LABOR_RATE=95
AI_TRIP_CHARGE=75
AI_MATERIAL_MARKUP_PERCENT=25
```

For magic link email, this existing project expects:

```env
RESEND_API_KEY=...
MAGIC_LINK_FROM_EMAIL=portal@ta-contracting.org
```

## Behavior

If OpenAI is unavailable or times out, the system still creates a local estimate draft using handyman labor/material rules.
