# Magic-link Email Setup

If the login page says:

```text
Account magic link created, but email delivery is off.
```

then the database token was created successfully, but the site does not yet have email delivery credentials.

## Required Netlify environment variables

Add these in Netlify, not in the committed repo:

```text
RESEND_API_KEY=re_your_real_resend_key
MAGIC_LINK_FROM_EMAIL=portal@your-verified-domain.com
SITE_URL=https://your-live-site-domain.com
```

Recommended session settings are already shown in `.env.example`:

```text
AUTH_SESSION_COOKIE_NAME=ta_session
AUTH_SESSION_TTL_DAYS=14
MAGIC_LINK_TTL_MINUTES=20
```

## Resend sender requirements

`MAGIC_LINK_FROM_EMAIL` must use an email/domain that is verified in Resend. If the sender domain is not verified, Resend will reject the email request even when `RESEND_API_KEY` is present.

## Safe testing without email

When `RESEND_API_KEY` is missing or still a placeholder, the API returns a development-only link as `devMagicLink`. The login page shows that as **Open development magic link** so the flow can be tested before production email is ready.

Do not share development magic links with customers. They are intended only for setup/testing.

## Production checklist

1. Enable Netlify Database and apply migrations.
2. Add `RESEND_API_KEY` in Netlify environment variables.
3. Add `MAGIC_LINK_FROM_EMAIL` using a Resend-verified sender.
4. Set `SITE_URL` to the production site URL.
5. Redeploy the site.
6. Test `/login/` with your own email and confirm an email arrives.
