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

Client onboarding should start from Request Work, which creates or updates the client profile; `/login/` should stay magic-link only. The first admin email is `thomas.debacker.ii@gmail.com`, seeded as an admin in the Netlify Database migration.

## Added in Sprint 1C

- `GET /api/admin/job-requests` for admin-only access to recent public job requests and status counts.
- Dashboard admin request inbox that appears only after `/api/me` confirms the signed-in user has the `admin` role.
- Tests for admin request access control and job request payload mapping.

## Added in Sprint 1D

- Request Work now requires email, city/area, and property address so a client account and property can be created with every request.
- `POST /api/job-requests` creates or updates the client profile, assigns the `client` role, creates a property row, then stores the job request.
- `POST /api/admin/users` lets admins create users and assign roles; `PATCH /api/admin/users` lets admins replace a user's assigned roles.
- The quote data model now includes quote rows with magic-link token fields so future quote emails can send clients back to their website profile.

## Added in Sprint 1E

- `GET /api/client/job-requests` lets signed-in clients load only the job requests and property summaries tied to their own `app_users.id`.
- The unified dashboard now includes a client request panel that is populated from the client-scoped API after `/api/me` confirms client access.
- Client request and property counts update the dashboard summary without exposing worker, admin, or other-client data.
- Request Work submissions reuse an existing property when the same client submits another request for the same address, while different addresses remain separate properties under the same account.

## Added in Sprint 1F

- Signed-in clients can submit new dashboard job requests through `POST /api/client/job-requests`.
- Portal-created requests must use an existing property owned by the signed-in account or create a new property under that same account.
- The client dashboard includes a request form that refreshes the client-scoped request and property lists after a successful submission.

## Added in Sprint 1G

- `POST /api/admin/quotes` lets admins create draft quotes for existing job requests that are linked to client accounts.
- `GET /api/client/quotes` lets signed-in clients load only non-draft quotes tied to their own `app_users.id`, including safe request/property context.
- The unified dashboard now includes a client quote panel and quote waiting metric fed by the client-scoped quote API.

## Added in Sprint 1H

- `PATCH /api/client/quotes` lets signed-in clients approve or deny quotes that belong to their account and are ready for a decision.
- Accepting a quote updates the related job request to `accepted`; accepting or denying writes an audit event.
- The public homepage portal section now explains real client actions: request quotes, approve/deny quotes, track repair status, manage properties, review quote history, and prepare for payments.


## Added in Sprint 1I

- `POST /api/auth/logout` revokes the current hashed session in `auth_sessions` and clears the HttpOnly session cookie.
- The unified dashboard shows a signed-in-only Sign out button after `/api/me` confirms the session, then returns users to `/login/`.
- Dashboard copy now reflects the connected magic-link session and `/api/me` role-loading flow instead of calling the page only a placeholder.

## Added in Sprint 1J

- Admin request cards open a focused modal workspace from the unified dashboard so quoting/status work does not push the inbox down the page.
- Admins can update request status/internal notes and create a quote from the selected request.
- Quotes can stay as drafts or be sent immediately; sent quotes move the request to `quote_sent` so clients can use the existing accept/decline flow.
- Worker assignment is represented in the admin work panel as the next scheduled build-out area, pending a dedicated assignment table/API.

## Added in Sprint 1K

- Work orders now track planned service dates, completion dates, client-requested reschedule dates, and reschedule notes.
- Admins can close work by setting `completed`, keep `cancelled` as a closed status, or permanently delete a work order when it must be removed from the system.
- Clients can request a reschedule for accepted/scheduled/in-progress work from their dashboard; the request moves back to admin review.
- Sending a quote to the client now updates the related work request to `quote_sent` and attempts a quote-ready email in addition to making the quote visible in the Client Portal.
