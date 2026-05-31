# Phase 54 — Functional Sidebar Workspaces

## Sidebar items fixed

- **Scheduling** now opens `#smart-schedule-suite` for dispatch and schedule board workflows.
- **Worker Mobile** now opens `#worker-mobile-field` for field-friendly job actions.
- **Photo Docs** now opens `.photo-doc-suite` for evidence notes and documentation checklists.
- **Maintenance Plans** now opens `.maintenance-suite` for recurring property/service plans.
- **Deployment Health** now opens `#system-readiness` for route, function, build, audit, environment, and migration readiness checks.
- **Inventory** remains a real `/inventory/` navigation link.

## Sections added

- Scheduling/dispatch board with upcoming jobs, unscheduled jobs, dispatch notes, worker assignment, date/time, priority, city, and status.
- Worker Mobile field cards with start, mark in progress, mark complete, and reserved material context from existing worker jobs/inventory data.
- Photo Docs workspace with job selector, evidence stage, before/progress/after checklist, notes, evidence filenames, and clear upload endpoint guidance.
- Maintenance Plans workspace with HVAC, plumbing, electrical, and property-care plan defaults, frequency, next due date, property/client references, status, and notes.
- Deployment Health workspace with API route coverage, function check guidance, build/test/audit commands, environment checklist, migration status, and no secret values.

## APIs reused or added

- Reused `/api/admin/job-requests` for scheduling/dispatch assignment updates.
- Reused `/api/worker/jobs`, `/api/worker/jobs/complete`, `/api/worker/inventory/use`, `/api/worker/inventory/release`, and `/api/job-files` for worker/mobile/photo-doc flows.
- Added `/api/admin/maintenance-plans` for admin maintenance plan create/update/list.
- Added `/api/client/maintenance-plans` for client-scoped maintenance plan viewing.
- Added migration `0030_maintenance_plans.sql` for recurring maintenance plan persistence.

## Audits and tests

- Added `scripts/audit-sidebar-workspaces.mjs` to ensure every sidebar item has a real `href`, action, or matching DOM target.
- Added `tests/sidebar-workspaces.spec.mjs` to verify each sidebar workspace exists and has a real useful workflow.
- Added `npm run test:sidebar-workspaces`.

## Remaining future work

- Add calendar drag/drop scheduling.
- Add direct file-upload widgets in Photo Docs; current evidence notes reference the existing `/api/job-files` attachment flow.
- Add automated deployment-health API pings if a server-side health aggregator is desired.
