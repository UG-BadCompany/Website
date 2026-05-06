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

- `profiles`
- `roles`
- `user_roles`
- `properties`
- `job_requests`
- `files`

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

## Next implementation step

Convert this static shell into a real app with authentication, database-backed profiles, and role-aware dashboard rendering.
