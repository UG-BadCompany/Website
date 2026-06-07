# Contractor CMMS + AI Quoting Platform Master Plan v8

This repository implements a static white-label Contractor CMMS + AI Quoting Platform with Netlify Functions, Netlify Database/Postgres, `/out` publish output, installer-first routing, secure environment setup, drop-in modules, Super Owner testing tools, dashboards, workflow engine, AI quote/troubleshooting/photo estimate foundations, Square payment foundations, theme/homepage editors, platform health, audit logs, and backup/restore foundations.

## Checklist
- Installer-first deployment: `/install/`, `/install/recovery`, install status/health/draft/finish APIs, visible fallback shell, no white page, finish install validation/seeding/bootstrap generation.
- Environment wizard grouped by Required, AI, Payments, Security, Advanced, Future, with required SITE_URL, MAGIC_LINK_FROM_EMAIL, RESEND_API_KEY and no secret exposure.
- Static frontend, Netlify Functions backend, Netlify Database/Postgres schema, `/out`, no Next.js runtime, no Netlify Next.js plugin.
- Drop-in module manifest schema, discovery script, generated registry, runtime, API dispatcher, permissions, Module Manager.
- Super Owner with role/view switching, user impersonation, hidden/beta module visibility, and audit logging.
- Core systems: public site, homepage editor, theme manager, portal, dashboards, AI photo estimate, AI quote, troubleshooting, quote center, work orders, schedule, inventory, invoices, Square payments, finance, file manager, health, cache, audit, backup/restore, workflow engine.
- Required scripts for build, tests, verification, and audits.
