# Auth Implementation Plan

## Goal

Use one login for clients, workers, and admins. Users should not manually choose a dashboard. The system should route or reveal tools based on assigned permissions.

## Netlify Database auth approach

Netlify Database provides Postgres data storage. Authentication should be handled by a dedicated auth provider such as Auth0, Clerk, or another provider selected later.

The database stores app-level user records in `app_users` and links those records to the external auth identity using:

- `auth_provider`
- `auth_subject`
- `email`

## Login flow

1. User opens `/login/`.
2. User submits email and password to the auth provider.
3. Auth provider validates credentials.
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
5. Replace the static login form with provider sign-in.
6. Add Netlify Functions for session/profile/role loading.
7. Add role-aware dashboard rendering.
8. Convert estimate form submissions into `job_requests` records.

## Security notes

- Do not expose database credentials in browser code.
- Use server-side Netlify Functions for privileged database operations.
- Application code must enforce permissions before returning data.
- Log important admin actions to `audit_events`.
