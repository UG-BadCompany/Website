# Implementation Checklist

Built from `Doc/PLAN_UPDATED.md` as the master architecture document.

## Completed foundation

- [x] Static Netlify deployment model with `out` publish directory and `netlify/functions` backend.
- [x] Node 20 project scripts for build, start, test, environment verification, UX/theme/module/migration/function/deadlink audits.
- [x] Centralized server-only configuration loader for OpenAI, Resend, Square, SerpAPI, reCAPTCHA, site URL, SMTP, and future licensing.
- [x] `.env.example` with required and optional variables; `.env*` files are ignored.
- [x] Full first-run installer route and `/api/install` plus `/api/install-status` functions.
- [x] Future license placeholder defaults to disabled validation and never blocks setup when disabled.
- [x] True drop-in module manifests under `modules/<id>/module.json`.
- [x] Registry generator for routes, sidebar, mobile nav, permissions, Module Manager data, homepage sections, and installer steps.
- [x] Dashboard shell renders from the generated module registry.
- [x] Homepage, Homepage Editor, Theme Manager, Client Portal, public quote viewer, and public invoice viewer.
- [x] Shared workflow state machine with synchronized active/archive counts.
- [x] Shared AI engine for quote, photo estimate, and troubleshooting calls.
- [x] Square payment function placeholder using server-side environment variables only.
- [x] PostgreSQL migration series starting at `0001` with installer, module, roles, homepage, theme, request, quote, work order, inventory, invoice, payment, and workflow tables.

## Module inventory

The generated registry currently includes 23 modules: module manager, theme manager, homepage editor, AI photo estimate, quote center, work orders, scheduling, inventory, invoices, finance, reporting, workflow engine, installer, client portal, owner dashboard, admin dashboard, manager dashboard, worker dashboard, client dashboard, AI troubleshooting, Square integration, public quote viewer, and public invoice viewer.

## Endpoint inventory

- `/api/install-status`
- `/api/install`
- `/api/ai`
- `/api/workflow`
- `/api/payments`
- `/api/auth-magic-link`
- `/api/modules/*`

## Remaining production hardening

- [ ] Connect storage helpers to Netlify Database in deployed environments.
- [ ] Replace local in-memory function stores with persistent queries.
- [ ] Wire actual OpenAI, Resend, Square, and license-server HTTP calls after final provider contracts are confirmed.
- [ ] Add authenticated role enforcement around dashboard and staff-only endpoints.
- [ ] Add browser-driven end-to-end tests after Netlify preview deployment URL is available.
