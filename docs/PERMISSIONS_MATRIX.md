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
- Workers see assigned jobs, job notes, checklists, access details, materials, and photo upload tools.
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
| `GET /api/admin/job-requests` | Yes | `admin` | Returns recent public job requests and status counts. |
