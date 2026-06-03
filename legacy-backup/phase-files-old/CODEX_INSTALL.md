# Update: Remove AI Quote Buttons + Make Request Estimate the Only Public Quote Flow

This patch keeps the AI engine but removes visible AI Quote buttons/pages.

## Install these files

```text
public/js/site.js
public/js/request-form.js
public/js/admin-ai-quotes.js
netlify/functions/job-requests.mjs
```

## What changes

- Public users only see **Request Estimate**
- Request Estimate submits to `/api/job-requests`
- `/api/job-requests` creates the estimate draft behind the scenes
- No separate visible AI quote system
- Existing `/api/ai-quote-draft` remains as hidden backend engine
- Admin labels become “Estimate Drafts” instead of “AI Quote Drafts”

## Manual cleanup

Use:

```text
snippets/remove-ai-quote-buttons.md
```

Search/remove any leftover visible “AI Quote” buttons or pages.

## Do not delete

Do not delete:

```text
netlify/functions/ai-quote-draft.mjs
```

That file is still needed, but it should not be linked directly from the customer UI.
