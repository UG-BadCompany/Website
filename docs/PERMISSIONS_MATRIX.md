# Permissions Matrix

The portal uses one login. After sign-in, the backend loads roles and permissions, then renders the correct dashboard tools.

## Role summary

| Area | Client | Worker | Admin |
|---|---:|---:|---:|
| View own profile | Yes | Yes | Yes |
| Update own profile | Yes | Yes | Yes |
| View all users | No | No | Yes |
| Manage roles | No | No | Yes |
| Create job request | Yes | Optional | Yes |
| View own job requests | Yes | No | Yes |
| View assigned jobs | No | Yes | Yes |
| View all jobs | No | No | Yes |
| Update job status | No | Assigned only | Yes |
| Add worker notes | No | Assigned only | Yes |
| Upload job photos | Own request only | Assigned only | Yes |
| View own quotes | Yes | No | Yes |
| Build/send quotes | No | No | Yes |
| Accept/decline quotes | Own quotes only | No | Admin override |
| View own invoices | Yes | No | Yes |
| Manage invoices | No | No | Yes |
| Pay invoices | Own invoices only | No | Admin override |
| View admin activity/audit trail | No | No | Yes |
| View reports/settings | No | No | Yes |

## Dashboard behavior

- Clients see only their own properties, requests, quotes, invoices, payments, files, and messages.
- Workers see assigned jobs, job notes, checklists, access details, materials, and photo upload tools.
- Admins see every operational tool, including work orders, invoices, access management, and recent audit activity.
- Multi-role users can either see combined tools or a role switcher, depending on final UX preference.

## Permission implementation notes

- Store roles in `roles`.
- Connect users to roles through `user_roles`.
- Use Netlify Functions to enforce permissions before reading or writing database records.
- Use application-side guards to hide UI controls the user cannot access.
- Never rely on hidden UI alone for security; server-side functions must enforce access.

## Implemented API gates

| API route | Required session | Required role | Access |
| --- | --- | --- | --- |
| `GET /api/me` | Yes | Any active user role | Returns the signed-in user and assigned roles. |
| `POST /api/auth/logout` | Optional | Any signed-in user | Revokes the current session when present and clears the session cookie. |
| `GET /api/client/job-requests` | Yes | `client` or `admin` | Returns job requests and property summaries scoped to the signed-in client account. |
| `POST /api/client/job-requests` | Yes | `client` or `admin` | Creates a job request for an owned client property or a new property under the signed-in account. |
| `PATCH /api/client/job-requests` | Yes | `client` or `admin` | Updates owned property/request details and lets clients approve work in `pending_review`. |
| `GET /api/client/invoices` | Yes | `client` or `admin` | Returns unpaid invoices scoped to the signed-in client account. |
| `GET /api/client/quotes` | Yes | `client` or `admin` | Returns non-draft quotes scoped to the signed-in client account. |
| `PATCH /api/client/quotes` | Yes | `client` or `admin` | Accepts or declines an owned sent/viewed quote. |
| `GET /api/worker/jobs` | Yes | `worker.jobs.manage`, `worker`, or `admin` | Returns assigned jobs scoped to the signed-in worker; admins can view all assignments. |
| `PATCH /api/worker/jobs` | Yes | `worker.jobs.manage`, `worker`, or `admin` | Updates status and worker notes for an assigned job; workers are scoped to their own assignments, and completed work moves to admin/client pending review. |
| `GET /api/admin/job-requests` | Yes | `admin.requests.manage` or `admin` | Returns scoped public job requests, worker assignments, quote context, and status counts for active/completed/all admin work-order views. |
| `PATCH /api/admin/job-requests` | Yes | `admin.requests.manage` or `admin` | Updates a request status/internal admin notes, can create/update worker assignments, and opens invoices when verified work moves to `waiting_payment`. |
| `POST /api/admin/quotes` | Yes | `admin.quotes.manage` or `admin` | Creates the first draft/sent quote for an existing client-linked job request. |
| `PATCH /api/admin/quotes` | Yes | `admin.quotes.manage` or `admin` | Edits an existing saved quote from the open work request. |
| `GET /api/admin/invoices` | Yes | `admin.invoices.manage` or `admin` | Lists open, paid, or all active invoices with payment summary data. |
| `PATCH /api/admin/invoices` | Yes | `admin.invoices.manage` or `admin` | Confirms payment, writes a payment row, and moves the job request to completed. |
| `GET /api/admin/activity` | Yes | `admin.activity.view` or `admin` | Lists recent audit events for the admin activity feed. |
| `GET /api/admin/users` | Yes | `admin.users.manage` or `admin` | Lists users and assignable roles for the admin access panel. |
| `POST /api/admin/users` | Yes | `admin.users.manage` or `admin` | Creates a user and assigns one or more roles. |
| `PATCH /api/admin/users` | Yes | `admin.users.manage` or `admin` | Replaces an existing user's assigned roles. |
| `GET /api/admin/roles` | Yes | `admin.roles.manage` or `admin` | Lists roles and permissions for the admin access panel. |
| `POST /api/admin/roles` | Yes | `admin.roles.manage` or `admin` | Creates a custom role with enabled permissions. |
| `PATCH /api/admin/roles` | Yes | `admin.roles.manage` or `admin` | Updates role metadata and enabled permissions; admin keeps all permissions. |

## Dashboard view rules

- A user with only `client` sees only client sections, including the requests and properties attached to their account; worker and admin sections stay hidden in the browser and remain blocked by server-side API checks.
- A user with only `worker` sees worker sections only.
- A user with `admin` defaults into the admin dashboard and can switch between admin, client, and worker views for support/troubleshooting. Admin activity is controlled separately by `admin.activity.view` so audit access can be delegated or removed independently.
- Multi-role non-admin users can see the tools for their assigned roles, but they cannot access admin APIs unless they have the `admin` role.
