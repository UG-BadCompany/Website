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
| View reports/settings | No | No | Yes |

## Dashboard behavior

- Clients see only their own properties, requests, quotes, invoices, payments, files, and messages.
- Workers see assigned jobs, status filters, pop-out work orders, job notes, checklists, access details, material/parts notes, and completion photo/attachment evidence tools.
- Admins see every operational tool.
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
| `GET /api/client/quotes` | Yes | `client` or `admin` | Returns non-draft quotes scoped to the signed-in client account. |
| `PATCH /api/client/quotes` | Yes | `client` or `admin` | Accepts or declines an owned sent/viewed quote. |
| `GET /api/client/invoices` | Yes | `client` or `admin` | Returns unpaid invoices scoped to the signed-in client account. |
| `GET /api/worker/jobs` | Yes | `worker.jobs.manage`, `worker`, or `admin` | Returns assigned jobs scoped to the signed-in worker; admins can view all assignments. |
| `PATCH /api/worker/jobs` | Yes | `worker.jobs.manage`, `worker`, or `admin` | Updates status, worker notes, checklist items, material notes, and required completion notes/photo evidence for an assigned job; workers are scoped to their own assignments. |
| `GET /api/admin/job-requests` | Yes | `admin` | Returns recent public job requests and status counts. |
| `PATCH /api/admin/job-requests` | Yes | `admin` | Updates a request status/internal admin notes and can create/update worker assignments from the admin work panel. |
| `POST /api/admin/quotes` | Yes | `admin` | Creates a draft quote or sends a quote for an existing client-linked job request. |
| `GET /api/admin/invoices` | Yes | `admin` | Lists unpaid invoices and amount-due summary for admin payment follow-up. |
| `PATCH /api/admin/invoices` | Yes | `admin` | Confirms payment, records a payment row, completes the linked job request, and writes an audit event. |
| `GET /api/admin/users` | Yes | `admin.users.manage` or `admin` | Lists users and assignable roles for the admin access panel. |
| `POST /api/admin/users` | Yes | `admin.users.manage` or `admin` | Creates a user and assigns one or more roles. |
| `PATCH /api/admin/users` | Yes | `admin.users.manage` or `admin` | Replaces an existing user's assigned roles. |
| `GET /api/admin/roles` | Yes | `admin.roles.manage` or `admin` | Lists roles and permissions for the admin access panel. |
| `POST /api/admin/roles` | Yes | `admin.roles.manage` or `admin` | Creates a custom role with enabled permissions. |
| `PATCH /api/admin/roles` | Yes | `admin.roles.manage` or `admin` | Updates role metadata and enabled permissions; admin keeps all permissions. |

## Dashboard view rules

- A user with only `client` sees only client sections, including the requests and properties attached to their account; worker and admin sections stay hidden in the browser and remain blocked by server-side API checks.
- A user with only `worker` sees worker sections only.
- A user with `admin` defaults into the admin dashboard and can switch between admin, client, and worker views for support/troubleshooting.
- Multi-role non-admin users can see the tools for their assigned roles, but they cannot access admin APIs unless they have the `admin` role.
