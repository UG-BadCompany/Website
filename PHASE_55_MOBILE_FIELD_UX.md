# Phase 55 — Mobile Field UX Upgrade

## Worker mobile improvements

- Added a dedicated mobile UX layer that turns Worker Mobile cards into one-handed field cards with large tap targets, job metadata, address/city, access notes, priority, material summary, and completion checklist.
- Worker Mobile actions now include Start job, Mark in progress, Add note, Mark material used, Return unused material, Request more material, Upload before photo, Upload after photo, and Mark complete.
- Material actions call existing worker inventory endpoints; note/photo actions open the Photo Docs evidence workflow and clearly explain that file storage uses the existing `/api/job-files` path.

## Client mobile improvements

- The mobile CSS layer is linked across the public site, login, dashboard, inventory, and admin/client/worker portal pages.
- Client request, quote, invoice, profile, and property forms collapse to thumb-friendly single-column cards with 44px+ controls and large file-upload/request actions.
- Quote and invoice list surfaces collapse to mobile card layouts instead of cramped desktop columns.

## Admin mobile improvements

- Admin quote editing keeps title, amount, summary, AI draft, inventory material add, and submit actions readable on phones.
- Admin request/work-order, invoice, access manager, inventory, maintenance, and scheduling forms inherit mobile-safe spacing, large inputs, and sticky critical action behavior.
- Deployment Health and sidebar workspace controls remain available from a mobile drawer and bottom quick action bar.

## Mobile navigation changes

- The existing sidebar remains intact on desktop and becomes a fixed full-height mobile drawer with large rows, a large close button, and a backdrop close target on phones.
- Added a role-aware sticky mobile quick action bar: admin gets Requests/Quotes/Jobs/Invoices/Inventory, worker gets Today/Jobs/Materials/Photos/Complete, and client gets Request/Quotes/Invoices/Profile.
- Inventory remains a real `/inventory/` navigation link and non-admin views continue to hide admin-only inventory controls.

## Mobile form and modal changes

- Added `public/assets/mobile-field-ux.css` with mobile breakpoints for iPhone SE/modern iPhone/Android widths and tablet portrait.
- Forms use single-column layouts below mobile breakpoints, 44px+ tap targets, 16px input text to avoid mobile zoom, clear focus states, and wider textareas.
- Dashboard modals become full-screen mobile sheets with sticky headers, large close buttons, internal scrolling, and safe-area padding.
- Inventory uses mobile card hooks and sticky mobile tabs/search/scan controls.

## Tests and audits run

- `npm run build`
- `node scripts/check-netlify-functions.mjs`
- `node scripts/audit-dead-buttons.mjs`
- `node scripts/audit-sidebar-workspaces.mjs`
- `node scripts/audit-mobile-ux.mjs`
- `npm run test:mobile-ux`
- `npm run audit:phase55`

## Remaining mobile risks

- Real device screenshot/visual QA should be run in a browser/device farm because this container does not provide a Chromium binary.
- Photo upload storage is still handled by the existing `/api/job-files` work-order attachment flow; direct in-card camera capture can be added in a later phase.
- Drag/drop scheduling and richer offline worker mode remain future enhancements.
