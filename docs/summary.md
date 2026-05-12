# Project Change Summary

This document captures the major work completed in the current T&A Contracting website/portal update so future contributors can quickly understand what changed, why it changed, and where to look next.

## Deployment and Build Stability

- Netlify is configured to build with `npm run build` and publish the generated static site from `out/`.
- The static build pipeline validates Netlify Database migrations before generating the site and verifies the publish directory after build.
- `scripts/check-netlify-migrations.mjs` now validates migration naming, duplicate numeric prefixes, and stale legacy migration filenames that previously appeared from cached Netlify deploy checkouts.
- The migration validator can repair stale cached migration names during prebuild, including legacy custom role, admin activity, completion review, invoice/payment, quote/payment, and worker completion evidence filenames.
- Compatibility constants are intentionally kept in the migration validator so older/conflicted deploy diffs cannot crash prebuild with missing identifier errors.
- A deployment health checklist was added to document repeatable deploy checks and troubleshooting steps.

## Database Migrations

Current migration work includes:

- Initial portal schema, authentication, request/account/quote tables, work-order scheduling, custom roles, schedule dates, profile details, worker assignments, completion review, and invoice/payment tables.
- `0015_admin_activity_permission.sql` adds the admin activity permission required by the audit/activity feed.
- `0016_inventory_items.sql` adds inventory items and adjustment tracking for admin inventory workflows.
- `0017_normalize_invoice_titles.sql` backfills invoices that accidentally stored dashboard UI copy (`Invoice & payment desk`) as invoice titles.
- Several obsolete/renamed migration files were removed from the repo and are now also cleaned when they appear from Netlify cache.

## Authentication and Session Handling

- Session TTL handling moved from a single day-based value to role-aware minute values.
- Clients use a shorter default session TTL, while staff roles such as workers/admins use a longer default staff TTL.
- Session cookies now use `Max-Age` semantics for predictable browser behavior.
- Magic-link verification and `/api/me` refresh behavior were updated so the database session expiry and cookie expiry stay aligned with the user's roles.
- Environment documentation was updated to use `CLIENT_SESSION_TTL_MINUTES` and `STAFF_SESSION_TTL_MINUTES` instead of the removed day-based TTL variable.

## Permissions and Roles

- The role/permission matrix was expanded to support admin activity, inventory management, invoice/payment management, request/quote management, client invoice visibility, worker job management, and custom role assignment.
- The dashboard uses permission flags from `/api/me` to show or hide role-specific command centers and navigation cards.
- Admin-only tools such as inventory, user/role management, activity audit trail, work-order management, quote controls, and invoice desk are permission-gated.

## Admin Activity Audit Feed

- Added `netlify/functions/admin-activity.mjs` for admin-only audit event listing.
- Activity can be filtered by type and searched by text.
- Pagination support lets admins load more activity without leaving the dashboard.
- The dashboard includes an activity audit modal launched from the admin command center.
- Tests cover authentication, authorization, filtering, pagination, and response mapping.

## Admin Inventory Management

- Added `netlify/functions/admin-inventory.mjs` for admin inventory operations.
- Admins can list inventory, create items, update item details, archive items, and record stock adjustments.
- Inventory adjustments support work-order usage, including linking used materials to job requests.
- Inventory events write audit records so changes appear in admin activity.
- A dedicated `/inventory/` admin page was added and linked from the admin command center.
- Work-order detail UI can load and render inventory usage tied to a selected job.
- Tests cover listing, CRUD, adjustments, archive behavior, low-stock summary, work-order usage, and invalid adjustment rejection.

## Invoices and Payments

- A Square-first payment integration plan now lives in `docs/PAYMENTS_PLAN.md`, recommending hosted Square Checkout payment links first, then webhooks, then embedded Web Payments SDK.
- Added/expanded admin invoice APIs for listing open invoices, paid history, and all active records.
- Admin invoice summaries show open invoice count, amount due, paid invoice count, and collected totals.
- Admins can confirm payment, which records a payment, marks the invoice paid, and completes the linked job request.
- Job requests moved to `waiting_payment` create or update an open invoice from the linked quote/work order.
- Invoice title normalization prevents dashboard UI copy from appearing as an invoice title in API responses or persisted invoice records.
- A migration backfills existing reserved invoice titles to service/client-specific invoice labels.
- Client invoice APIs list unpaid invoices and normalize stale reserved titles for client-facing display.
- Tests cover admin invoice listing, paid payment history, payment confirmation, invoice title normalization, client invoice listing, and waiting-payment invoice creation.

## Admin Work Orders and Quotes

- Admin job request handling was expanded with active/completed/all scopes, pipeline summaries, request search, status filters, worker assignment, schedule fields, completion dates, admin notes, and invoice creation when work moves to payment.
- Admin quote handling supports quote creation, sending, and editing existing saved quotes instead of always creating duplicates.
- The admin dashboard includes a work-order command center, request detail modal, quote form, assignment form, inventory usage form, pipeline summary, and request filters.
- Tests cover admin request listing, status counts, completed history, request updates, permanent deletes with confirmation, worker assignment, completion verification, invoice opening, quote creation, quote editing, and duplicate-quote blocking.

## Client Portal Workflows

- Clients can submit portal job requests tied to existing properties or create a new property during request submission.
- Client request forms summarize photo/document attachment names and sizes.
- Clients can edit open job requests in a dedicated modal.
- Clients can update property details without creating duplicate requests.
- Clients can view quotes, accept or decline sent/viewed quotes, and approve pending completed work.
- Clients can view unpaid invoices and payment status.
- Client profile and property details are accessible from command-center cards.
- Tests cover request creation, attachment summaries, property ownership checks, property creation/update, open request updates, completion approval, quote decisions, invoice listing, and profile updates.

## Worker Portal Workflows

- Workers have an assigned jobs dashboard section and command center.
- Worker job cards display assignment schedule, job request details, property/access notes, admin notes, and worker notes.
- Workers can update assignment status and notes.
- Marking work completed moves the related job request to `pending_review` for client/admin review.
- Worker forms accept before-work files and after/completion files.
- Tests cover worker authentication, authorization, assigned-job listing, status/note updates, and completed-work transition to pending review.

## Job Files and Attachments

- Added `netlify/functions/job-files.mjs` for listing and creating file metadata records linked to job requests.
- Access checks allow admins, request-owning clients, and assigned workers to access files for a job request.
- File metadata is capped by count and size, normalized, stored in the existing `files` table, and audited when uploaded.
- Client request attachments and worker before/after files are uploaded as metadata records via `/api/job-files`.
- Dashboard request cards and worker job cards can render attached file lists.
- Tests cover signed-in requirements, client-owned file listing, and assigned-worker file creation.

## Dashboard and Static UI Refresh

- The dashboard was redesigned around command centers for admin, client, and worker roles.
- Navigation was simplified to reduce duplicate shortcut buttons and old workspace tab elements.
- The dashboard includes role view switching for admins with multi-role access.
- Dashboard sections are permission-gated and role-view-gated.
- The admin invoice desk is treated as a singleton panel to avoid duplicate rendering.
- Invoice cards avoid repeating stale dashboard heading text as row titles.
- Theme toggle, skip link, focus outlines, improved card styling, and responsive layout refinements were added.
- Client profile/property editing, request editing, admin access management, admin activity, and request detail flows use modal-style interfaces.
- Public and generated `out/` files were rebuilt to keep Netlify publish output in sync with `public/` source files.
- Dashboard script tests parse inline scripts and assert expected hooks, handlers, copy, and removed duplicate UI elements.

## Public Site and Assets

- Public pages and generated `out/` pages were refreshed to align with the portal redesign.
- Login and portal redirect pages were updated so signed-out users go through magic-link sign-in and active sessions return to the dashboard.
- Logo asset output was refreshed and dashboard branding references were updated.
- A standalone inventory page was added under both `public/inventory/` and `out/inventory/`.

## Documentation Updates

- Added `docs/DEPLOYMENT_HEALTH_CHECKLIST.md` for build/deploy verification.
- Added `docs/PAYMENTS_PLAN.md` to document the Square-first payment strategy, phases, environment variables, data model additions, and UI/API next steps.
- Updated deployment docs to reference the health checklist and Netlify `out` publish expectations.
- Updated magic-link email documentation for current environment variables and setup notes.
- Updated permissions matrix and sprint/foundation docs to reflect inventory, audit activity, invoices, worker completion review, and session TTL changes.
- Updated project planning/status docs to include completed portal and backend milestones.

## Test Coverage Added or Updated

Major test areas include:

- Admin activity endpoint behavior.
- Admin inventory endpoint behavior.
- Admin invoices and payment confirmation.
- Admin job request workflows and quote handling.
- Admin roles and users.
- Auth helpers, magic-link request/verify, `/api/me`, logout, and profile updates.
- Client invoices, requests, quotes, properties, and completion approval.
- Dashboard inline script parsing and required UI/handler hooks.
- Homepage and login routing behavior.
- Job files endpoint behavior.
- Migration validation/repair behavior, including stale Netlify cached migration names.
- Worker jobs listing, status updates, and completion transition.

## Deployment Issues Fixed During This Work

- Fixed duplicate/renamed migration prefix problems from stale cached migration files.
- Fixed Netlify prebuild crashes caused by missing legacy migration guard constants.
- Fixed deploy failure from a PostgreSQL `UPDATE ... FROM` migration that referenced the update target table incorrectly.
- Fixed subsequent prebuild failures by ensuring obsolete cached migration names are removed even if the replacement migration file is not present in the cached checkout.
- Kept local `npm run build`, migration validation, and `npm test` passing after each deploy fix.

## Current Operational Notes

- Run `npm test` for the full automated suite.
- Run `npm run build` to execute migration validation, build static pages into `out/`, and verify the publish directory.
- If Netlify logs show stale migration names, the prebuild validator should repair them automatically and continue when possible.
- Keep `public/` and generated `out/` pages in sync when changing static UI.
- Keep this `docs/summary.md` updated whenever major API, migration, dashboard, deployment, payment, or documentation work is added.
