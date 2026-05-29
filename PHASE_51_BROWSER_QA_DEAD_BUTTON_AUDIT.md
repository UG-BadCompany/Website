# Phase 51 — Browser QA & Dead-Button Audit

## Scope

Phase 51 focused on proving the current application wiring instead of adding product features or redesigning the dashboard. The QA pass covers public pages, dashboard workspace navigation, estimate review/quote editor controls, inventory workflow sections, admin access controls, worker/admin/client affordances, script parsing, local links, dead buttons, stale workspace tabs, and API route coverage warnings.

## Browser QA approach

- Added a lightweight browser QA harness using Node's built-in `node:test` runner so it can run in CI without downloading browser binaries.
- The harness parses the real public HTML files, follows script/style references, validates local links and hash targets, compiles inline and referenced scripts, and flags visible buttons that have no handler hook, form semantics, disabled state, or navigation purpose.
- The tests use production files under `public/` and mocked-by-structure assertions for API-backed flows. They do not mutate production auth/session behavior.

## What passed

- Home page loads, key navigation links resolve, scripts parse, and visible buttons have purpose.
- Login page loads the magic-link form, points to `/api/auth/magic-link`, resolves dashboard/request-estimate navigation, and parses scripts.
- Dashboard loads with the sidebar workspace system intact and confirms admin, client, and worker view switches are present.
- Dashboard sidebar/workspace entries for Overview, Estimate Review, Work Orders, Invoices, Worker Jobs, Inventory, and Roles & Users are wired.
- Quote editor fields for title, amount, summary, and missing info remain editable and connected to controller logic.
- AI Rewrite Quote, Save Draft, Cancel Edits, and Save & Send flows have request/status handling in the quote editor controller.
- Inventory page loads with Overview, Items, Low Stock, Locations, Workers/Trucks, Job Reservations, Tools/Equipment, Suppliers, Purchase/Restock, Cycle Count, and Movement History panes.
- Inventory reservation, transfer, cycle count, reorder, scan/search, and label-preview controls are connected to APIs or visible status feedback.
- Admin Roles/Users buttons are detectable as real modal/form launchers rather than silent buttons.
- Dead-button audit passes across `public/**/*.html`, `public/assets/**/*.js`, and `public/dashboard/modules/**/*.js`.

## What failed and was fixed

- The dead-button audit found dashboard hash links for `#worker-profile`, `#estimate-review`, and `#finance-command-center` that did not resolve to IDs in the static dashboard shell. Added hidden anchor aliases so sidebar/shortcut links have valid targets without changing the visual layout.
- The inventory label action used the word “placeholder” even though it already produced a visible status. Renamed it to “Preview label” to avoid looking like a fake/dead control.
- Initial browser QA assertions were too narrow for the existing login and estimate-review implementations. The tests now assert the actual production hooks: `data-auth-form`, `/api/auth/magic-link`, `/api/admin/estimate-review`, and `window.__latestEstimateDrafts`.

## Current audit warnings

The dead-button audit currently reports these warnings only; they do not fail the audit:

- `/api/auth/verify` has no exact redirect/function-name match. This appears to be served through existing auth routing conventions rather than a same-name direct function.
- `/api/admin/square/payment-link` has no exact redirect/function-name match. This should be manually verified against the dynamic/admin payment routing before Phase 52 hardening.

## Intentionally disabled or non-final controls

- No visible enabled button is allowed to be silently fake under the new audit. Buttons that are future-facing must either be disabled with explanatory text or provide visible status feedback.
- The inventory scanner/label areas remain scanner/QR-ready rather than hardware-integrated. Their controls now provide visible lookup/label status feedback instead of silently doing nothing.

## Remaining risks

- This phase uses a lightweight browser QA harness, not a full Playwright browser runtime. It catches broken wiring, missing scripts, missing links, dead buttons, stale tabs, and controller/API hooks, but it does not provide pixel rendering, real layout screenshots, or cross-browser event execution.
- API-backed tests are structural and mock-safe. They verify the UI calls the expected endpoints/status paths but do not require live Netlify services or a production database session.
- The two API route warnings above should be reviewed in a later backend-routing pass if payment/auth route confidence needs to be raised from warning to enforced.

## Commands run

```bash
npm run test:browser
npm run audit:dead-buttons
npm run build
node scripts/check-netlify-functions.mjs
npm run audit:phase51
npm test
```

The full Phase 51 command completed successfully: build passed, Netlify function syntax checks passed, dead-button audit passed with the two warnings listed above, all 9 lightweight browser QA tests passed, and the full `npm test` suite passed with 166 tests.
