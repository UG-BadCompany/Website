# Auth Implementation Plan

## Goal

Use one login for clients, workers, and admins. Users should not manually choose a dashboard. The system should route or reveal tools based on assigned permissions.

## Account creation and login model

The portal should support two client-friendly flows:

1. **Magic-link login** — a user enters their email and receives a secure sign-in link.
2. **Create client account** — a new client enters name, email, and phone, then receives a verification or magic-link email.

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
2. User requests a magic link or creates a client account.
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
5. Replace the static magic-link and account creation previews with provider-backed flows.
6. Add Netlify Functions for session/profile/role loading.
7. Add role-aware dashboard rendering.
8. Convert estimate form submissions into `job_requests` records.

## Security notes

- Do not expose database credentials in browser code.
- Use server-side Netlify Functions for privileged database operations.
- Application code must enforce permissions before returning data.
- Log important admin actions to `audit_events`.

## Timing decision: magic links, account creation, and dashboard access

Account creation should go live in the same milestone as magic-link login. A client account is not considered created until the email is verified by the same secure magic-link flow used for returning users.

The `/login/` page should stop sending users to a dashboard preview before the auth provider is connected. The intended order is:

1. Configure the auth provider environment variables.
2. Connect `POST /api/auth/magic-link` to the provider's passwordless email flow.
3. Connect `POST /api/auth/client-account` to create or stage the client profile, then send the same verification/magic link.
4. Add `GET /api/me` to verify the session and load `app_users`, `roles`, and permissions.
5. Gate `/dashboard/` behind the verified session and render only role-scoped dashboard data.

Until those steps are complete, login forms may validate input and report readiness, but they must not claim that a user has signed in or that the dashboard is secure.
