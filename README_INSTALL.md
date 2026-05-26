# Magic Link Fix Based on Your Actual Website Zip

I reviewed your uploaded repo. Your login page is already correct:

```html
<form class="form" data-auth-form data-endpoint="/api/auth/magic-link">
<script src="/assets/login.js" defer></script>
```

Your existing function is also correct:

```js
export const config = {
  path: '/api/auth/magic-link',
};
```

The main problem is your `netlify.toml` has **no API redirects**, so the static deploy can return:

```text
/api/auth/magic-link 404
```

## Install these files

Copy these into your repo root:

```text
netlify.toml
public/assets/login.js
netlify/functions/request-magic-link.mjs
netlify/functions/logout.mjs
```

The patched `netlify.toml` adds:

```toml
[[redirects]]
  from = "/api/auth/magic-link"
  to = "/.netlify/functions/request-magic-link"
  status = 200
```

and related auth/API routes.

## Important env names

Your current auth code does **not** use `MAGIC_LINK_FROM`.

It uses:

```env
RESEND_API_KEY=...
MAGIC_LINK_FROM_EMAIL=portal@ta-contracting.org
```

or fallback:

```env
QUOTE_FROM_EMAIL=portal@ta-contracting.org
```

Set these in Netlify.

## No dev link

I also patched:

```text
public/assets/login.js
netlify/functions/request-magic-link.mjs
```

so it no longer displays `devMagicLink`.

If email is not configured, it now fails clearly and tells you what env vars are missing.

## After deploy test

Test these URLs:

```text
/api/public-config
/api/me?optional=1
```

Then submit the login form.

If `/api/public-config` 404s, `netlify.toml` redirects are still not deployed.

If `/api/auth/magic-link` returns 503, routing works but email env vars are missing.
