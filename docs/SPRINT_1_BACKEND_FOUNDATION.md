# Sprint 1 Backend Foundation

Sprint 1 starts the real portal architecture while the site still deploys as static output.

## Portal direction

The portal should use one login for every user. Users should not manually choose between client, admin, or worker dashboards.

Expected flow:

1. User signs in once.
2. The backend loads the user profile.
3. The backend loads assigned roles and permissions.
4. The dashboard redirects or reveals tools based on permissions.
5. Multi-role users can see combined tools or a role switcher if needed.

## First production routes

- `/login/` — single login entry point.
- `/dashboard/` — unified role-based dashboard shell.
- `/thank-you/` — estimate form confirmation.

## First data model

Minimum tables for the backend phase:

- `app_users`
- `roles`
- `user_roles`
- `properties`
- `job_requests`
- `files`
- `audit_events`

## Permission groups

### Client

- View own profile.
- View own properties.
- Create job requests.
- View own quotes, invoices, payments, files, and messages.

### Worker

- View assigned jobs.
- View job details and access notes.
- Update task checklists.
- Upload completion photos.
- Add worker notes and material notes.

### Admin

- Manage all clients, workers, requests, jobs, quotes, schedules, invoices, payments, files, and settings.

## Added in Sprint 1B

- `.env.example` for Netlify Database, auth provider, Stripe, Resend, and site URL placeholders.
- `netlify/database/migrations/0001_initial_portal_schema.sql` with the first app users, roles, properties, job requests, files, audit events, and indexes.
- `docs/NETLIFY_DATABASE_SETUP.md` for Netlify Database setup notes.
- `docs/PERMISSIONS_MATRIX.md` for client, worker, and admin access rules.
- `docs/AUTH_IMPLEMENTATION_PLAN.md` for the single-login implementation path.

## Next implementation step

Use Netlify Functions to connect the static portal shell to Netlify Database, beginning with job request creation and role-aware dashboard reads.

## Account access decision

Client onboarding should support magic-link login and client account creation from the same `/login/` page. The first admin email is `thomas.debacker.ii@gmail.com`, seeded as an admin in the Netlify Database migration.
