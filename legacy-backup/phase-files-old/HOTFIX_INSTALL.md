# Fix /api/auth/magic-link 404

The 404 means your login form is correct, but Netlify is missing the route.

Your login page posts to:

```text
/api/auth/magic-link
```

So Netlify must redirect that path to the function:

```text
/.netlify/functions/auth-magic-link
```

## Install

1. Copy:

```text
netlify/functions/auth-magic-link.mjs
```

2. Add the redirect from:

```text
snippets/netlify-auth-redirects.toml
```

to your real `netlify.toml`.

3. Make sure package.json has:

```json
"@netlify/blobs": "latest"
```

4. Set Netlify env vars:

```env
RESEND_API_KEY=your_resend_key
MAGIC_LINK_FROM=T&A Contracting <noreply@ta-contracting.org>
```

5. Redeploy.

## Test direct function first

Open DevTools and test:

```text
/.netlify/functions/auth-magic-link
```

Then test:

```text
/api/auth/magic-link
```

If direct function works but `/api/auth/magic-link` still 404s, the redirect is missing or not deployed.
