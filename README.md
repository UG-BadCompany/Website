# ContractorOS v1

ContractorOS v1 is a clean, mobile-first contractor business operating system built from the master blueprint in `Doc/ContractorOS_v1_Master_Blueprint.md`. The Foundation is always installed as one complete product package; it is not a set of optional modules.

## What is included

- Public website: homepage, about, services, contact, request estimate, thank-you pages.
- Installer at `/install` with license, hosting, database, environment mapping, Resend email, payment, company, owner, theme, Foundation, expansion-pack, and finish steps.
- Netlify-first deployment support with Netlify Database detection/preference and external PostgreSQL/Supabase fallback.
- Authentication foundation shell with Resend magic-link API endpoints, hashed one-time token helpers, secure cookie helpers, sessions, and login activity schema.
- Database-driven roles and permissions schema with default Owner/Admin/Office/Dispatcher/Technician/Client/Vendor roles.
- Dashboard shell with add, remove, move, resize, and persisted widget layout.
- Client portal shell, CRM, requests, quotes, jobs, work orders, invoices, payments, CMMS assets, and advanced messaging screens.
- Payment provider framework with Square as the default and Stripe, PayPal, Authorize.net, manual payments, and configure-later support structure.
- Media storage abstraction for Netlify Blobs and local development storage.
- PWA manifest, service worker, responsive app shell, and permission-aware mobile navigation.
- Expansion pack and marketplace module registry tables for future add-ons.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

To test the production build:

```bash
npm run build
npm run preview
```

## Database migrations

ContractorOS uses PostgreSQL. The migrations live in `migrations/` and can run against Netlify Database, standard PostgreSQL, or Supabase PostgreSQL.

```bash
DATABASE_URL=postgres://user:pass@host:5432/db npm run db:migrate
```

On Netlify, use Netlify Database where available. The app detects Netlify database variables first and falls back to `DATABASE_URL`/Supabase mappings.

## Netlify deployment

1. Create a Netlify site from this repository.
2. Enable Netlify Database for the site when available.
3. Add required environment variable keys in Netlify site settings.
4. Deploy with the included `netlify.toml` build settings (`npm run build`, publish `dist`, functions `netlify/functions`).
5. Open `/install` and complete the installer.
6. Run migrations through your Netlify Database workflow or a one-off command using the database connection string.

The included Netlify routing maps `/api/*` to the serverless API function and all frontend routes to `index.html`.

## Required environment variable keys

Minimum application keys:

```env
APP_URL=
DATABASE_URL=
RESEND_API_KEY=
EMAIL_FROM=
AUTH_SECRET=
LICENSE_PUBLIC_KEY=
PAYMENT_PROVIDER=square
STORAGE_PROVIDER=
```

Netlify suggested keys (license activation uses the built-in official ContractorOS License Server; set optional `LICENSE_API_URL_OVERRIDE` only for dev, staging, or self-hosted portal testing):

```env
SITE_URL=
URL=
DEPLOY_URL=
CONTEXT=
NETLIFY_DATABASE_URL=
RESEND_API_KEY=
MAGIC_LINK_FROM_EMAIL=
AUTH_SECRET=
LICENSE_API_URL_OVERRIDE=
LICENSE_PUBLIC_KEY=
SQUARE_ACCESS_TOKEN=
SQUARE_APPLICATION_ID=
SQUARE_LOCATION_ID=
SQUARE_ENVIRONMENT=
SQUARE_WEBHOOK_SIGNATURE_KEY=
```

Square default payment keys:

```env
SQUARE_ACCESS_TOKEN=
SQUARE_APPLICATION_ID=
SQUARE_LOCATION_ID=
SQUARE_ENVIRONMENT=sandbox_or_production
SQUARE_WEBHOOK_SIGNATURE_KEY=
```

Other supported payment provider key groups:

```env
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_ENVIRONMENT=sandbox_or_live
AUTHORIZE_API_LOGIN_ID=
AUTHORIZE_TRANSACTION_KEY=
AUTHORIZE_ENVIRONMENT=sandbox_or_production
```

Future AI marketplace modules may use reserved keys, but Foundation v1 does not require them:

```env
OPENAI_API_KEY=
AI_MODULES_ENABLED=false
```

## Deployment targets

- **Netlify:** first-class target via `netlify.toml`, Netlify Functions, Netlify Database preference, and optional Netlify Blobs media storage.
- **Vercel:** build with `npm run build` and provide a PostgreSQL/Supabase connection string; API handlers can be adapted from the shared server services.
- **Docker/VPS:** build the Vite app, serve `dist`, run a Node serverless-compatible adapter or API gateway around `lib/server`, and provide PostgreSQL environment keys.

## Unfinished v1 production-hardening items

This deliverable implements the clean Foundation structure, UI shell, migrations, adapters, and Netlify deployment surface. Production completion still requires wiring every frontend workflow to persisted API mutations, live Resend sending, real Netlify Database auto-provision calls through Netlify's supported workflow, provider webhook handlers, full CSRF/rate-limit middleware enforcement, and end-to-end QA against live Netlify/Supabase/PostgreSQL environments.
