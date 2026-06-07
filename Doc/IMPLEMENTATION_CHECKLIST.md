# PLAN_FINAL_v7 Implementation Checklist

Created from `Doc/PLAN_FINAL_v7.md` and used as the build checklist for this implementation.

## Installer-first platform
- [x] Fresh deployment checks `/api/install-status` before showing public or dashboard content.
- [x] Protected public, dashboard, portal, login, quote, invoice, admin, manager, and worker routes redirect to `/install/` until installation is complete.
- [x] Installer state supports resume/current step and `/install/recovery/`.
- [x] Finish Install endpoint validates owner setup, seeds Super Owner access, permissions, module settings, license placeholder, bootstrap data, and sets `installation_complete = true`.

## Environment discovery and integrations
- [x] Environment metadata registry groups Required, AI, Payments, Security, Advanced, and Future variables.
- [x] Required setup includes `SITE_URL`, `MAGIC_LINK_FROM_EMAIL`, and `RESEND_API_KEY`.
- [x] Optional integrations can be skipped and configured later.
- [x] Secret values are masked/fingerprinted server-side and never returned as raw frontend values.
- [x] Dynamic deployment-origin callback/webhook URLs are generated.

## License placeholder
- [x] License schema and state placeholders are included.
- [x] Future license variables are hidden/grouped as future features.
- [x] Finish Install activates placeholder license status without requiring external validation.

## Super Owner and roles
- [x] Owner role has all workspaces: owner, admin, manager, worker, client, public.
- [x] Owner receives platform super-owner/impersonation/workflow/environment permissions.
- [x] Dashboard supports workspace view switching and impersonation banner plumbing.
- [x] Sensitive actions are audit logged.

## Design, homepage, and theme
- [x] Shared design tokens and static design system are included.
- [x] Installer theme step uses a dropdown, color pickers, hex validation, reset buttons, sidebar/mobile toggles, and live preview.
- [x] Public homepage renders from editor-driven section data.
- [x] Homepage Builder step manages section visibility/content foundations.

## Drop-in module system
- [x] Modules live under `modules/<id>/module.json` with frontend/backend/permission contracts.
- [x] Discovery validates manifests, frontend/backend files, duplicate IDs, unique permissions, and dependencies.
- [x] Generated registries are written to `public/config/module-manifest.json` and `netlify/generated/module-registry.json`.
- [x] Dashboard sidebar/mobile nav and module loading are registry-driven.
- [x] `/api/modules/*` dispatches through a single Module API function.

## Core modules
- [x] Estimate & Quote Center.
- [x] AI Photo Estimate.
- [x] AI Troubleshooting.
- [x] Work Orders.
- [x] Schedule.
- [x] Inventory.
- [x] Invoices & Payments/Square placeholder.
- [x] Finance.
- [x] Customers.
- [x] Users & Permissions.
- [x] Theme Manager.
- [x] Homepage Editor.
- [x] Module Manager.
- [x] Reports.
- [x] Maintenance Plans.
- [x] Platform Health.
- [x] Cache Manager.
- [x] File Manager.
- [x] Audit Logs.
- [x] Backup & Restore.

## Workflow, AI, files, finance
- [x] Single workflow engine defines request → quote → work order → schedule → worker → completion → invoice → payment → verification → archive statuses.
- [x] Workflow transitions enforce allowed moves and active/history queue behavior.
- [x] Shared server-side AI service endpoint supports photo estimate, quote, and troubleshooting with run logging and no browser API keys.
- [x] File/photo, inventory, invoices, payments, finance, audit, AI usage, backups, and cache-manager schema/endpoints are present as foundations.

## Build, tests, and audits
- [x] Static Netlify build outputs `/out`.
- [x] Functions live in `netlify/functions`.
- [x] Node 20 and `NETLIFY_NEXT_PLUGIN_SKIP=true` are configured.
- [x] No Next.js runtime/plugin is used.
- [x] Migration validation checks duplicate numbers, locked checksums, missing locked migrations, BOM, and CRLF.
- [x] `npm run build`, `npm run test`, `npm run verify:all`, and `npm run audit:all` pass.
