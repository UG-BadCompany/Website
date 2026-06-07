# AI Contractor CMMS Platform

Commercial-grade static Netlify + Netlify Functions contractor CMMS scaffold built from `Doc/PLAN_UPDATED.md`.

## Commands

- `npm run build` — verify migrations/env locally, generate the module registry, and build `out/`.
- `npm run start` — serve the static build on port 8888.
- `npm run test` — run Node tests.
- `npm run verify:all` — run environment, module, migration, function, UX, theme, deadlink, test, and build checks.

## Architecture

- Static frontend in `src/` outputs to `out/`.
- Netlify Functions live in `netlify/functions`.
- Secrets are loaded only through `netlify/functions/_shared/config.mjs`.
- Modules are true drop-in folders under `modules/<id>/module.json`.
- `scripts/generate-module-registry.mjs` creates dashboard routes, sidebar, permissions, module manager data, mobile nav, installer steps, and homepage section registration.
- PostgreSQL migrations start at `netlify/migrations/0001_initial_platform.sql`.
