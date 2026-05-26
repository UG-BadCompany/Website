# Real Magic Link + Unified AI Request Fix

You were right: the login should use your real magic-link page, not a demo login.

This patch keeps your uploaded login page as the source of truth:

```html
<form class="form" data-auth-form data-endpoint="/api/auth/magic-link">
<script src="/assets/login.js" defer></script>
```

## What this patch fixes

1. Restores your real login page.
2. Keeps `/api/auth/magic-link`.
3. Adds `/assets/login.js`.
4. Adds real Netlify functions for:
   - `auth-magic-link`
   - `verify-magic-link`
   - `me`
   - `logout`
5. Removes dev magic link behavior.
6. Keeps Request Estimate as the single AI quote flow through `/api/job-requests`.

## Required files

Copy these:

```text
public/login/index.html
public/assets/login.js
public/js/request-form.js

netlify/functions/auth-magic-link.mjs
netlify/functions/verify-magic-link.mjs
netlify/functions/me.mjs
netlify/functions/logout.mjs
```

## Keep your existing quote functions

Also keep your current:

```text
netlify/functions/job-requests.mjs
netlify/functions/ai-quote-draft.mjs
netlify/functions/ai-quote-drafts.mjs
```

or use the unified versions from the last patch.

## Required dependency

```json
"@netlify/blobs": "latest"
```

## Required Netlify env variables for real email

```env
RESEND_API_KEY=your_resend_key
MAGIC_LINK_FROM=T&A Contracting <noreply@ta-contracting.org>
```

Optional reCAPTCHA:

```env
RECAPTCHA_SECRET_KEY=your_recaptcha_secret
```

## Required netlify.toml redirects

See:

```text
snippets/netlify-redirects.toml
```

## Important

There is no devMagicLink in this version.

If email is not configured, the login will fail with a real error telling you to configure `RESEND_API_KEY` and `MAGIC_LINK_FROM`.
