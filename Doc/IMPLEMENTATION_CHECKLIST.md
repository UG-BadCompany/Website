# PLAN_FINAL_v9 Implementation Checklist

## Installer-first behavior
- [x] Fresh `/` checks `/api/install-status` and redirects to `/install/` before homepage/dashboard rendering.
- [x] Protected business routes stay behind the install lock until `installation_complete` is true.
- [x] `/api/install-status` returns safe JSON when the store is empty, missing, or unavailable.
- [x] `/api/install/finish` validates core setup and sets `installation_complete = true`.
- [x] `/install/recovery` exists and is independent of bootstrap/theme/module state.
- [x] Installer shell and error boundary prevent blank white pages.

## Simplified installer
- [x] Required install flow is Welcome, Company Info, Branding/Logo, Theme, Owner Account, Services, Modules, Homepage Basics, Review, Finish.
- [x] Required completion items are company profile, owner account, theme settings, homepage config, module registry, and services/trades.
- [x] OpenAI, Resend, Square, SMTP, SerpAPI, license, reCAPTCHA, and other integrations are optional warnings only.
- [x] SITE_URL is auto-detected from the current origin when missing.

## System Center
- [x] Environment & Integrations moved to Owner → System Center after installation.
- [x] Integration manager groups Email/Resend, OpenAI, Square, Security, License Server, and Advanced Integrations.
- [x] Status endpoints show configured/missing, source, last checked, help links, and safe last-four only.
- [x] Secret save endpoint validates keys, records audit events, and never returns raw values.
- [x] Platform Health, Cache Manager, Audit Logs, File Manager, and Backup/Restore foundations are represented.

## Drop-in modules
- [x] Module folders contain manifests with id, version, minimum platform, dependencies, nav, permissions, API namespace, health, and entry.
- [x] Build script discovers module folders and generates `out/config/modules.json`.
- [x] Dashboard sidebar, mobile navigation, module manager, permissions, and module API dispatch use the registry.
- [x] Adding a module folder and manifest requires no router/sidebar/mobile nav/permission/dashboard/redirect edits.

## Workspaces and workflows
- [x] Owner dashboard can switch Owner/Admin/Manager/Worker/Client/Public workspaces.
- [x] Owner impersonation banner and controls are present.
- [x] Workflow engine supports Request → Quote → Work Order → Schedule → Worker → Completion → Invoice → Payment → Verification → Archive.
- [x] Paid, verified, and archived records are excluded from active queues.

## Core modules and platform areas
- [x] Public website and request estimate entry.
- [x] Client portal.
- [x] Owner/Admin/Manager/Worker/Client dashboards.
- [x] Homepage Editor and Theme Manager.
- [x] AI Photo Estimate, AI Quote, and AI Troubleshooting with manual fallback when OpenAI is missing.
- [x] Quote Center, Work Orders, Scheduling, Inventory, Invoices, Finance, File Manager, Platform Health, Cache Manager, Audit Logs, Backup/Restore, and Workflow Engine.
- [x] Square support is represented as disabled online payments with manual payment tracking until configured.

## Build, audit, and tests
- [x] Static frontend output is `out`.
- [x] Netlify Functions live in `netlify/functions`.
- [x] Node 20 and `NETLIFY_NEXT_PLUGIN_SKIP=true` are configured.
- [x] No Next.js runtime or `@netlify/plugin-nextjs` dependency.
- [x] Required commands pass: `npm run build`, `npm run test`, `npm run verify:all`, `npm run verify:installer`, `npm run audit:all`.
