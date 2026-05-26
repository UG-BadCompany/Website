# Remove visible AI Quote buttons/pages

Search the repo for these strings and remove/replace them.

## Remove public buttons/links

Remove buttons/links with text:

```text
AI Quote
AI Quotes
AI Quote Drafts
Generate AI Quote
```

Remove hrefs:

```text
/ai-quote
/ai-quotes
/admin/ai-quotes
```

Public navigation should be:

```text
Home
Services
Request Estimate
Dashboard
Login
```

## Replace labels

Replace:

```text
AI Quote Drafts -> Estimate Drafts
AI Quote Draft -> Estimate Draft
AI Quote Queue -> Estimate Review
Generate AI Quote -> Build Estimate
AI Quotes -> Estimates
AI Quote -> Estimate
```

## Keep backend

Do NOT delete:

```text
netlify/functions/ai-quote-draft.mjs
```

It is the hidden estimate engine now.

## Frontend rule

The Request Estimate form must only call:

```text
/api/job-requests
```

Do NOT call this directly from the browser:

```text
/api/ai-quote-draft
```
