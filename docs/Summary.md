Summary

Summary
Fixed the latest Netlify prebuild failure by changing migration repair mode to remove obsolete cached migration names even when the replacement migration file is missing from that cached deploy checkout. This directly addresses the log lines like 0012_quote_payment_completion_controls.sql exists but 0010_invoices_payments.sql is missing; not removing.... 

Updated validateMigrationFiles to accept an injectable migrations directory, so the stale-cache behavior can be tested safely without mutating the real migration folder. 

Added regression coverage using a temporary migrations directory that contains only an obsolete cached migration name, verifies repair mode removes it, and confirms validation no longer fails when the replacement file is absent in that checkout. 

Committed the fix as c6d2913 and created a PR titled “Remove stale migrations without replacements”.

Testing

✅ npm test

✅ npm run build

✅ git diff --check


Summary
Restored the named legacy migration constants that the Netlify build log showed were still referenced during prebuild, specifically preventing LEGACY_ADMIN_ACTIVITY_MIGRATION is not defined failures while keeping the newer table-driven repair logic intact. 

Added regression coverage to ensure those compatibility guard constants remain defined in the migration prebuild script. 

Committed the fix as 6bb2dd9 and created a PR titled “Restore migration guard constants”.

Testing

✅ npm test

✅ npm run build

✅ git diff --check


Summary
Continued the deploy hardening by generalizing migration cleanup into a LEGACY_MIGRATIONS table that now includes every stale cached migration name seen in the Netlify deploy logs, including completion review, quote/payment controls, invoice/payment, and worker completion evidence legacy names. 

Updated the validator repair loop and validation errors to use that shared legacy migration metadata, so repair mode removes stale cached files only when their current migration exists and validation mode reports any remaining legacy files consistently. 

Added regression coverage that recreates the deploy-era stale migration files, verifies repair mode removes each one, and confirms the current 0009 and 0010 migrations remain in place. 

Committed the changes as fef5ac9 and created a PR titled “Repair stale deploy migration names”.

Testing

✅ npm test

✅ npm run build

✅ git diff --check

Summary
Fixed the deploy-blocking PostgreSQL migration error in 0017_normalize_invoice_titles.sql by moving the invoice/title lookup into a CTE and then updating invoices from that CTE. This avoids the invalid direct UPDATE ... FROM ... JOIN ... invoices.client_id target-table reference that caused Netlify’s 42P01 failure. 

Tightened the migration regression test to assert the safe CTE shape and guard against reintroducing the direct UPDATE FROM join pattern. 

Committed the fix as 9481e42 and created a PR titled “Fix invoice title backfill migration”.

Testing

✅ npm test

✅ npm run build

✅ git diff --check

Summary
Added migration 0017_normalize_invoice_titles.sql to backfill existing invoices that accidentally stored the dashboard heading “Invoice & payment desk” as their title. The migration builds a replacement title from the linked work order service and client name/email, then updates updated_at. 

Added migration regression coverage that verifies the reserved-title backfill migration continues to target the stale dashboard heading, falls back to completed-work service copy, and touches updated_at. 

Committed the changes as 46320f0 and created a PR titled “Backfill reserved invoice titles”.

Testing

✅ npm test

✅ npm run build

✅ git diff --check

Summary
Continued the invoice-desk fix at the API layer by normalizing admin invoice titles, so reserved dashboard UI copy like “Invoice & payment desk” is replaced with a job/client-specific invoice title before being returned. 

Added the same reserved-title normalization to client invoice responses, preventing clients from seeing the dashboard section heading as an invoice row title. 

Prevented the stale reserved title from being persisted when an admin moves a job request to waiting_payment, even if the source quote title contains “Invoice & payment desk”. 

Added regression coverage for admin invoice listing, client invoice listing, and waiting-payment invoice creation with stale reserved invoice titles. 

Committed the changes as 9870118 and created a PR titled “Normalize invoice desk titles”.

Testing

✅ npm test

✅ npm run build

✅ git diff --check

Summary
Strengthened the admin invoice desk duplicate cleanup: dashboard singleton detection now catches duplicate invoice panels by singleton marker, data-admin-invoices, #admin-invoices, or the “Invoice & payment desk” heading, and removes duplicates before each dashboard view render. 

Preserved the active user profile before applying permission-gated dashboard visibility, so view switching and gated admin sections resolve consistently. 

Prevented stale invoice records titled “Invoice & payment desk” from showing as repeated invoice row titles by replacing that title with a service/client-specific invoice label. 

Kept the generated out/ dashboard in sync with the source dashboard changes. 

Added regression checks for the single invoice desk heading, singleton marker, stronger singleton detection, stale invoice title replacement, duplicate removal, and active user permission retention. 

Committed the fix as 57263a2 and created a PR titled “Harden admin invoice desk rendering”.

Testing

✅ npm test

✅ npm run build

✅ git diff --check

⚠️ which chromium-browser || which chromium || which google-chrome || which playwright || node -e "try{require('playwright'); console.log('playwright')}catch(e){process.exit(1)}" — screenshot capture was skipped because no browser/screenshot tool is installed in this environment.

Summary
Marked the admin invoice panel as a singleton so the dashboard has one canonical “Invoice & payment desk” section. 

Added a dashboard startup guard that removes duplicate singleton panels before role-view visibility is applied, preventing repeated admin invoice desks from staying in the DOM. 

Cleaned up the admin invoice card metadata so the city is rendered once in each invoice row. 

Rebuilt the generated out/ dashboard so the deploy output matches the source dashboard changes. 

Added regression coverage that asserts the invoice desk heading and singleton marker only appear once, and that duplicate singleton panels are removed by the dashboard script. 

Committed the fix as 1eac82d and created a PR titled “Prevent duplicate admin invoice desk”.

Testing

✅ npm run build

✅ npm test

✅ git diff --check

⚠️ which chromium-browser || which chromium || which google-chrome || which playwright || node -e "try{require('playwright'); console.log('playwright')}catch(e){process.exit(1)}" — screenshot capture was skipped because no browser/screenshot tool is installed in the environment.

Summary

Added a signed-in /api/job-files Netlify function that validates sessions, checks admin/client/assigned-worker access, lists existing job files, creates capped file records, and writes an audit event for uploads. 

Updated the dashboard to display job file lists on request cards and worker job cards, plus file-list styling. 

Added dashboard helpers to collect selected file metadata, load and refresh visible job files, and POST file records to the new API from client request and worker job flows. 

Rebuilt the generated dashboard output so out/ mirrors the public dashboard changes. 

Added endpoint tests for authentication, client-owned listing, and assigned-worker file creation, plus dashboard-script coverage for the new file upload controls/API call. 

Committed the changes with commit 6670983 and created a PR titled “Add dashboard job file records”.

Testing

✅ npm test

✅ npm run build


Summary
Removed the top-nav My Profile button so profile access now lives in the client/worker command-center profile cards instead of the header. 

Added client-side visual polish for client command cards, client panels, and the new attachment area, including light-theme styling. 

Added a Photos / attachments area to “Submit another request” with support for multiple images/PDF/HEIC files and a selected-file summary. 

Wired the attachment picker to summarize selected files, include the summary in the request payload, and reset the selected-file summary after submit. 

Updated client profile shortcut binding so the command-center profile card opens the existing profile modal without relying on the removed top-nav profile button. 

Stored attachment summaries server-side by appending them to the request description and including them in audit metadata for team review. 

Synced generated out/ dashboard output with the public dashboard changes. 

Added regression coverage for removal of the top profile button, attachment UI/payload handling, and server-side attachment summary storage. 

Testing

✅ npm test

✅ npm run build

✅ git diff --check

⚠️ which chromium || which chromium-browser || which google-chrome || which playwright || which firefox || true — no local browser binary was available, so I could not capture a screenshot in this environment.


Summary
Added responsive sizing for the new client and worker command-center card grids so they match the admin command-center pattern. 

Added a dedicated client command center with Requests, Quotes, Invoices, and Profile & properties cards. 

Added a dedicated worker command center with Assigned jobs and My profile cards. 

Removed the old workspace-tab shortcut shell and stale workspace tab styling so the old “button area” no longer appears above command centers. 

Wired the new command-center request/profile cards into the existing request-estimate and profile modal handlers. 

Synced the generated out/ dashboard with the public dashboard changes. 

Updated dashboard regression tests to verify the old shortcut shell is gone and client/worker command centers exist. 

Testing

✅ npm test

✅ npm run build

✅ git diff --check

⚠️ which chromium || which chromium-browser || which google-chrome || which playwright || which firefox || true — no local browser binary was available, so I could not capture a screenshot in this environment.

Summary
Removed the stale workspace-action button styling so the old removed admin shortcut buttons cannot leave behind leftover button hooks/styles. 

Added an explicit hidden rule for the workspace tab shell so the empty rounded “circle/pill” area above the command center fully disappears when inactive. 

Kept the command-center buttons intact while ensuring the old shortcut tab row is client/worker-only, not an admin surface. 

Removed the card row below the command center from admin view by scoping the summary cards to client/worker views only. 

Synced the generated out/ dashboard with the cleaned public dashboard. 

Added regression checks that the old shortcut shell is hidden, stale button hooks are gone, and the below-command-center summary row is not shown to admins. 

Testing

✅ npm test

✅ npm run build

✅ git diff --check

⚠️ which chromium || which chromium-browser || which google-chrome || which playwright || which firefox || true — no local browser binary was available, so I could not capture a screenshot in this environment.



Summary
Removed the duplicate admin shortcut tabs above the command center—Work orders, Invoices, and Inventory—while keeping the command-center cards/buttons intact. 

Scoped the remaining workspace tab row to client/worker views only, so admins use the command center as the single shortcut surface. 

Updated the Roles & users and Audit activity launchers to bind only to the command-center shortcut buttons, not removed external buttons. 

Kept generated dashboard output in sync with the public dashboard changes. 

Updated dashboard script tests to verify the duplicate admin tabs/buttons are absent while the command-center buttons remain. 

Testing

✅ npm test

✅ npm run build

✅ git diff --check

Summary
Connected inventory usage more tightly to work orders by validating that a linked work order exists before recording usage, preventing work-order usage from increasing stock, and adding work-order service/status context to inventory audit metadata. 

Updated the work-order detail UI copy so admins can clearly record “Work order inventory usage” from the selected job while keeping the generated out/ dashboard in sync. 

Removed the duplicate Roles/Activity workspace-tab buttons now that those actions live in the admin command center. 

Fixed the admin roles/users popup structure by moving the role/user edit modals outside the scrollable access panel and adding modal sizing/grid rules to reduce buggy popup behavior. 

Changed the dashboard session label to show a friendly display name, e.g. “Signed in as Thomas DeBacker,” instead of the email/roles string. 

Added regression coverage for work-order-linked inventory validation and the dashboard UI expectations for removed duplicate buttons, friendly session naming, and popup placement. 

Testing

✅ npm test

✅ npm run build

✅ git diff --check

⚠️ which chromium || which chromium-browser || which google-chrome || which playwright || which firefox || true — no local browser binary was available, so I could not capture a screenshot in this environment.



Summary
Added a polished admin command center panel so admin users land on a cleaner operations-focused overview with quick actions for work orders, invoices, inventory, roles/users, and audit activity. 

Added responsive command-center styling with dark theme glass treatment, hover states, and mobile-friendly quick-action card layout. 

Added light-theme styling for the new command center so the admin overview still looks intentional when switching themes. 

Cleaned up admin-facing copy: “Admin request inbox” is now a clearer Work order command center, invoices are now the Invoice & payment desk, and activity is now the Activity audit trail. 

Wired the command-center Roles & users shortcut into the existing admin access modal launcher, alongside the workspace navigation button. 

Wired the command-center Audit activity shortcut into the existing activity modal launcher, alongside the workspace navigation button. 

Rebuilt the generated out/ dashboard artifact so the deployable static output includes the admin command center. 

Expanded dashboard script assertions to lock in the new admin command center, cleaned-up copy, shortcuts, and launcher bindings. 

Testing

✅ npm run build

✅ npm test

⚠️ which wkhtmltoimage || which cutycapt || which firefox || which google-chrome-stable || which chromium || which chromium-browser || true — screenshot capture was not available because no local browser/screenshot binary is installed in this environment.


Summary
Added a Load more activity control to the admin activity audit modal so admins can page through additional audit events instead of being limited to the first loaded batch. 

Added dashboard state for the current admin activity page and whether another audit page exists. 

Added pagination button management so the button appears only when more matching activity is available and updates its label when everything is loaded. 

Updated admin activity loading to request explicit page values, append additional audit events on “Load more,” disable the button while loading, and preserve existing events if an append request fails. 

Wired the new pagination button to fetch the next admin activity page from the existing filtered activity endpoint. 

Rebuilt the generated out/ dashboard artifact so the deployable static output includes the new activity pagination controls.

Expanded dashboard script coverage for the new activity pagination markup, page request parameter, append behavior, next-page tracking, and load-more button binding. 

Testing

✅ npm run build

✅ npm test

Summary
Added server-side admin activity filtering for type and q query params, with sanitized inputs, bounded pagination, category matching for job/quote/payment/user audit types, and response metadata that echoes the active filters. 

Updated the admin dashboard activity modal so type/search changes debounce and reload filtered audit results from /api/admin/activity, rather than relying only on the first client-side activity snapshot. 

Rebuilt the generated out/ dashboard artifact so the deployable static output includes the filtered activity loading behavior. 

Expanded admin activity tests to cover pagination metadata, bounded limits, type filtering, search filtering, metadata search, and generated SQL parameters. 

Expanded dashboard script tests to lock in the debounced server-side activity filter reload and filtered activity fetch URL behavior. 

Testing

✅ npm run build

✅ npm test

Summary
Refreshed the magic-link login page to match the darker portal/dashboard visual system, including the dark gradient background, glass-style nav, shared button styling, and polished portal shell/hero layout. 

Reworked the login content into a cleaner product-style experience with “Secure Client Portal” copy, portal benefit cards, a logo panel, and a more polished “Send Secure Link” form CTA. 

Cleaned up the account-access explainer so it now references requests, saved properties, quotes, invoices, and schedule updates in the same portal language as the rest of the site. 

Preserved the existing authenticated-session redirect behavior on the login page while keeping signed-out users on the magic-link flow. 

Updated the generated out/ publish artifact for the redesigned login page and rebuilt output, including the homepage portal-link routing changes in out/index.html. 

Expanded dashboard script tests to lock in the refreshed login layout, dark visual system, polished copy, portal capabilities text, and existing redirect/session behavior. 

Testing

✅ npm run build

✅ npm test

⚠️ which wkhtmltoimage || which cutycapt || which firefox || which google-chrome-stable || which chromium || which chromium-browser || true — screenshot capture was not available because no local browser/screenshot binary is installed in this environment.

Summary
Updated the homepage Dashboard nav link and portal CTA to fall back to /login/?next=dashboard while marking both links for session-aware routing.

Refined the Client Portal heading and body copy for cleaner messaging around requests, properties, quotes, invoices, and repair progress.

Added homepage routing logic that checks /api/me and sends authenticated users to /dashboard/, while logged-out users remain on the magic-link login path.

Updated the dashboard script test to verify the login fallback links, refreshed portal copy, session-aware link markers, /api/me fetch, and authenticated/dashboard routing behavior.

Committed the changes with commit 8db3f2f and created a pull request titled “Route homepage portal links through session check.”

Testing

✅ npm test

✅ PORT=4173 node scripts/serve-static-site.mjs

⚠️ which chromium-browser || which chromium || which google-chrome || which playwright || true — screenshot capture was not available because no local browser/screenshot tool was installed in the environment.

Summary
Fixed logged-out dashboard behavior: unauthenticated /dashboard/ visits now redirect to /login/?next=dashboard instead of leaving users on the dashboard shell. 

Cleaned up the dashboard hero copy so it reads like a polished signed-in workspace rather than a placeholder/gate page. 

Added test coverage for the logged-out dashboard redirect and cleaner dashboard hero copy. 

Committed changes with commit 20829b6 and created a pull request titled “Redirect logged-out dashboard visits.”

Testing

✅ git diff --check

✅ npm test

✅ npm run build

⚠️ npx -y playwright screenshot http://localhost:3000/dashboard/ /tmp/dashboard-cleanup.png — screenshot capture was blocked because the npm registry returned 403 Forbidden while trying to install Playwright in this environment.

Summary
Replaced the site logo references with your provided real logo URL (logo3.png?raw=true) on the homepage, dashboard, login, inventory, and generated static pages. Representative source updates are in the homepage, login page, inventory page, and dashboard hero/header.

Reworked the dashboard header so the main actions stay together (Home, My Profile, Sign out, Request Estimate), the Light mode button is separated to the right of those actions, and the login/session status now sits underneath the action row.

Added test coverage to confirm the real logo URL is used and that the dashboard nav/status/theme-toggle layout stays in the new order.

Committed changes with commit c2ff94f and created a pull request titled “Use real logo and refine dashboard nav.”

Testing

✅ git diff --check

✅ npm test

✅ npm run build

⚠️ npx -y playwright screenshot http://localhost:3000/dashboard/ /tmp/dashboard-logo-nav.png — screenshot capture was blocked because the npm registry returned 403 Forbidden while trying to install Playwright in this environment.