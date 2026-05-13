# Auth Implementation Plan

## Goal

Use one login for clients, workers, and admins. Users should not manually choose a dashboard. The system should route or reveal tools based on assigned permissions.

## Account creation and login model

The portal should support two client-friendly flows:

1. **Magic-link login** — a user enters their email and receives a secure sign-in link.
2. **Request-created client account** — a new client submits Request Work with name, phone, email, city/area, and address; the backend creates or updates their client profile.

Admins and workers use the same login entry point. Their extra tools come from assigned permissions, not a separate login page.

## Default admin

The first admin account is seeded in the Netlify Database migration:

```text
thomas.debacker.ii@gmail.com
```

No password is stored in the database or repo. The selected auth provider will own passwordless login, passwords, MFA, and email verification.

## Netlify Database auth approach

Netlify Database provides Postgres data storage. Authentication should be handled by a dedicated auth provider such as Auth0, Clerk, or another provider selected later.

The database stores app-level user records in `app_users` and links those records to the external auth identity using:

- `auth_provider`
- `auth_subject`
- `email`

## Login flow

1. User opens `/login/`.
2. Existing users request a magic link; new clients start by submitting Request Work.
3. Auth provider validates the email link/session.
4. A Netlify Function validates the session/token.
5. The function finds or creates the matching `app_users` row.
6. The function loads roles through `user_roles` and `roles`.
7. The app creates a permissions object for the dashboard.
8. The app sends the user to `/dashboard/`.
9. Dashboard shows client, worker, admin, or combined tools based on permissions.

## First protected routes

- `/dashboard/`
- `/dashboard/requests/`
- `/dashboard/jobs/`
- `/dashboard/quotes/`
- `/dashboard/invoices/`
- `/dashboard/settings/`

## First integration steps

1. Enable Netlify Database.
2. Apply migrations from `netlify/database/migrations/`.
3. Choose the auth provider.
4. Add environment variables from `.env.example` to Netlify.
5. Keep `/login/` magic-link only and create/update client accounts from Request Work submissions.
6. Add Netlify Functions for session/profile/role loading.
7. Add role-aware dashboard rendering.
8. Convert estimate form submissions into `job_requests` records.

## Security notes

- Do not expose database credentials in browser code.
- Use server-side Netlify Functions for privileged database operations.
- Application code must enforce permissions before returning data.
- Log important admin actions to `audit_events`.

## Timing decision: magic links, request-created accounts, and dashboard access

Client account creation now starts from Request Work submissions. A client uses the same secure magic-link flow as returning users to access their profile after the request-created account exists.

The `/login/` page should stop sending users to a dashboard preview before the auth provider is connected. The intended order is:

1. Configure the auth provider environment variables.
2. `POST /api/auth/magic-link` creates a hashed, expiring magic-link token in Netlify Database and sends it by email when `RESEND_API_KEY` is configured.
3. `POST /api/job-requests` creates or updates client accounts from Request Work submissions and assigns the `client` role.
4. `GET /api/auth/verify` consumes magic-link tokens, creates an HttpOnly session cookie, and redirects to `/dashboard/`.
5. `GET /api/me` verifies the session and loads `app_users`, `roles`, and permissions.
6. Admin-only user management APIs create users and update roles.
7. Gate `/dashboard/` behind the verified session and render only role-scoped dashboard data.

Until those steps are complete, login forms may validate input and report readiness, but they must not claim that a user has signed in or that the dashboard is secure.


## Implemented first-party magic-link flow

The current implementation uses first-party passwordless login tables instead of a separate hosted-auth adapter:

- `auth_magic_links` stores only SHA-256 token hashes, purpose, expiration, and consumption time.
- `auth_sessions` stores only SHA-256 session hashes and expiration metadata.
- Raw magic-link tokens and raw session tokens are never stored in the database.
- Email delivery uses Resend when `RESEND_API_KEY` and a from-address are configured. Without Resend, the endpoint returns a development-only magic link so the flow can be tested before production email is ready.
- `/api/me` is the dashboard session check and should become the source of role-scoped dashboard rendering.
- If the login page reports that email delivery is off, follow `docs/MAGIC_LINK_EMAIL_SETUP.md` and add `RESEND_API_KEY`, `MAGIC_LINK_FROM_EMAIL`, and `SITE_URL` in Netlify.
