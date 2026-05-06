# Auth Implementation Plan

## Goal

Replace the static login preview with a real single-login portal. Users should not manually choose client, worker, or admin dashboards. The system should route or reveal tools based on assigned permissions.

## Login flow

1. User opens `/login/`.
2. User submits email and password.
3. Supabase Auth validates credentials.
4. App loads the user's `profiles` row.
5. App loads roles through `user_roles` and `roles`.
6. App creates a permissions object for the dashboard.
7. App sends the user to `/dashboard/`.
8. Dashboard shows client, worker, admin, or combined tools based on permissions.

## First protected routes

- `/dashboard/`
- `/dashboard/requests/`
- `/dashboard/jobs/`
- `/dashboard/quotes/`
- `/dashboard/invoices/`
- `/dashboard/settings/`

## First integration steps

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Add environment variables from `.env.example` to local development and Netlify.
4. Replace the static login form action with Supabase Auth sign-in.
5. Add dashboard session checking.
6. Add role loading and permission-aware dashboard rendering.
7. Convert estimate form submissions into `job_requests` records.

## Security notes

- `SUPABASE_SERVICE_ROLE_KEY` must never be exposed in browser code.
- Keep public client code limited to `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
- Use Row Level Security on all business data tables.
- Use admin-only server-side code for privileged operations such as role assignment and global job management.
