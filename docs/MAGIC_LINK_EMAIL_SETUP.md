# Magic-link Email Setup

If the login page says:

```text
Account magic link created, but email delivery is off.
```

then the database token was created successfully, but the site either does not yet have email delivery credentials or Resend rejected the sender settings.

## Required Netlify environment variables

Add these in Netlify, not in the committed repo:

```text
RESEND_API_KEY=re_your_real_resend_key
MAGIC_LINK_FROM_EMAIL=portal@ta-contracting.org
SITE_URL=https://ta-contracting.org
SITE_URL_ALIASES=https://tacontracting.netlify.app
```

Recommended session settings are already shown in `.env.example`:

```text
AUTH_SESSION_COOKIE_NAME=ta_session
CLIENT_SESSION_TTL_MINUTES=30
STAFF_SESSION_TTL_MINUTES=120
MAGIC_LINK_TTL_MINUTES=20
```


## Main-domain DNS troubleshooting

Fully working DNS for `ta-contracting.org` should not break magic links by itself. The auth functions build each magic link from the request origin when that origin is listed in `SITE_URL` or `SITE_URL_ALIASES`; otherwise they fall back to the first configured `SITE_URL` value.

If the main domain just became active and links are not arriving or not opening, check these items first:

1. Keep `SITE_URL=https://ta-contracting.org` in Netlify and redeploy after changing it.
2. Keep `SITE_URL_ALIASES=https://tacontracting.netlify.app` only if you still want the Netlify subdomain to work too. Add `https://www.ta-contracting.org` as another alias if visitors use the `www` host.
3. Confirm the magic-link email was requested from the same host you expect to open. Requests from `https://ta-contracting.org/login/` generate `https://ta-contracting.org/api/auth/verify?...` links.
4. Confirm the Resend sender DNS records for `ta-contracting.org` are still verified. Website DNS working does not automatically mean Resend SPF/DKIM/domain verification is healthy.
5. Confirm `MAGIC_LINK_FROM_EMAIL=portal@ta-contracting.org` is present. Email sending intentionally remains disabled when the sender is missing, even if `RESEND_API_KEY` is set.

## Resend sender requirements

`MAGIC_LINK_FROM_EMAIL` should be `portal@ta-contracting.org` now that `ta-contracting.org` is verified in Resend. If the sender domain is not verified, Resend will reject the email request even when `RESEND_API_KEY` is present.

## Safe testing without email

When `RESEND_API_KEY` or `MAGIC_LINK_FROM_EMAIL` is missing/still a placeholder, or Resend rejects the sender, the API returns a development-only link as `devMagicLink`. The login page shows that as **Open development magic link** so the flow can be tested before production email is ready.

Do not share development magic links with customers. They are intended only for setup/testing.

## Production checklist

1. Enable Netlify Database and apply migrations.
2. Add `RESEND_API_KEY` in Netlify environment variables.
3. Add `MAGIC_LINK_FROM_EMAIL=portal@ta-contracting.org` using the Resend-verified domain. Email sending intentionally stays off until this sender variable is configured.
4. Set `SITE_URL=https://ta-contracting.org`; keep `SITE_URL_ALIASES=https://tacontracting.netlify.app` if the Netlify subdomain should continue to work.
5. Redeploy the site.
6. Test `/login/` with your own email and confirm an email arrives.

## T&A Contracting production values

Because the production domain is now `ta-contracting.org`, use these Netlify values:

```text
SITE_URL=https://ta-contracting.org
SITE_URL_ALIASES=https://tacontracting.netlify.app
MAGIC_LINK_FROM_EMAIL=portal@ta-contracting.org
QUOTE_FROM_EMAIL=quotes@ta-contracting.org
```

`portal@ta-contracting.org` does not need to be a mailbox inside Resend, but the `ta-contracting.org` domain must stay verified in Resend DNS for email sending to succeed.


## Keeping the Netlify subdomain available

Keep `SITE_URL=https://ta-contracting.org` as the canonical production domain. Add this alias in Netlify only if the Netlify subdomain should continue to work:

```text
SITE_URL_ALIASES=https://tacontracting.netlify.app
```

When a magic link is requested from `https://tacontracting.netlify.app`, the API will generate a verification link on that same Netlify subdomain. When the request comes from `https://ta-contracting.org`, the API will generate the link on the main domain. This lets both domains keep working after the main-domain DNS is active.
