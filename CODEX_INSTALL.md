# T&A Contracting Full Website Rewrite

This is a full static Netlify rewrite, not just the AI files.

## What it includes

- Full homepage replacement
- Shared CSS design system
- Client request form
- AI quote draft generation
- Live material sourcing through SerpApi if configured
- Draft storage through Netlify Blobs if available
- Job request storage through Netlify Blobs if available
- Admin AI quote review page
- Dashboard shell
- Login shell
- Thank-you page
- Netlify redirects
- Build scripts

## Install

Copy everything into the repo root.

Important: Back up your current repo first.

Then run:

```bash
npm install
npm run build
```

Set Netlify env variables:

```env
OPENAI_API_KEY=your_key
OPENAI_QUOTE_MODEL=gpt-5-mini
SERPAPI_API_KEY=your_serpapi_key

AI_LABOR_RATE=95
AI_TRIP_CHARGE=75
AI_MATERIAL_MARKUP_PERCENT=25
AI_MINIMUM_CHARGE=175
AI_CONTINGENCY_PERCENT=10
```

## Pages

```text
/
 /login/
 /dashboard/
 /admin/
 /admin/ai-quotes/
 /thank-you/
```

## API routes

Configured through Netlify redirects:

```text
/api/job-requests -> /.netlify/functions/job-requests
/api/ai-quote-draft -> /.netlify/functions/ai-quote-draft
/api/ai-quote-drafts -> /.netlify/functions/ai-quote-drafts
/api/me -> /.netlify/functions/me
```

## Important

This does not auto-send quotes.

AI drafts are for admin review.

Photo uploads still fall back to Netlify Forms so attachments are not lost. The next advanced upgrade is storing uploaded files in Netlify Blobs and giving AI image URLs.
