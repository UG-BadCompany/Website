# FINAL MERGED UPDATE

This package is based on the uploaded Website v6 project and includes the previous cleanup work.

## Included changes

- Keeps the public form named **Request Estimate**
- Makes **Request Estimate** create an automatic estimate draft behind `/api/job-requests`
- Keeps AI hidden from the public UI
- Removes visible **AI Quote / AI Quotes / Generate AI Quote** buttons and labels
- Adds a runtime cleanup script to remove leftover AI Quote buttons if any static page still renders them
- Removes/neutralizes light mode and theme toggle behavior
- Keeps the existing magic-link login system
- Adds explicit Netlify redirects for auth, job requests, admin quote draft, and client/admin routes
- Removes dev magic-link exposure; if email is not configured, login returns a real config error
- Keeps customer upload fallback behavior so files are not lost

## Important env variables

Magic link email:

```env
RESEND_API_KEY=...
MAGIC_LINK_FROM_EMAIL=portal@ta-contracting.org
```

OpenAI estimate drafting:

```env
OPENAI_API_KEY=...
OPENAI_QUOTE_MODEL=gpt-5-mini
AI_REQUEST_ESTIMATE_TIMEOUT_MS=9000
AI_LABOR_RATE=95
AI_TRIP_CHARGE=75
AI_MATERIAL_MARKUP_PERCENT=25
```

## Public customer wording

Keep:

```text
Request Estimate
```

Do not rename it to:

```text
AI Request Estimate
AI Quote
Generate AI Quote
```

## Public flow

```text
Request Estimate form
→ POST /api/job-requests
→ save request/client/property
→ create estimate draft in quotes table
→ admin reviews quote
→ final estimate sent later
```
