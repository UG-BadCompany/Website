# White-Label Contractor CMMS + AI Quoting Platform

This repository is a clean Netlify static app plus Netlify Functions backend for a white-label contractor CMMS and AI quoting system.

## Active deploy structure

- `public/` is the only source for deployable frontend pages and dashboard modules.
- `public/dashboard/modules/**/module.html|module.css|module.js` are drop-in dashboard modules loaded by the dashboard shell.
- `netlify/functions/` contains server-side APIs, including installer, company settings, auth, AI quoting, AI troubleshooting, users, roles, quotes, requests, invoices, inventory, and worker jobs.
- `out/` is generated during `npm run build` and is intentionally not required as source.

## First-run installer

All normal public/app pages call `/.netlify/functions/install-status`. The app is considered installed only when company settings are complete, an owner exists, default roles exist, default permissions exist, and `platform_install.installed` is true. If not installed, pages redirect to `/install/`.

After a successful install, the installer locks. Reinstall/maintenance setup is only possible with an authenticated owner maintenance flow or an intentional environment unlock.

Optional maintenance variables:

- `ALLOW_REINSTALL=true` allows a controlled reinstall in maintenance contexts.
- `INSTALLER_UNLOCK_TOKEN` can be passed as `installer_unlock_token` only for intentional maintenance setup.

## Existing environment variables preserved

The platform continues to use the existing Netlify environment variable names, including `OPENAI_API_KEY`, `RESEND_API_KEY`, `MAGIC_LINK_FROM_EMAIL`, `QUOTE_FROM_EMAIL`, `SITE_URL`, `SITE_URL_ALIASES`, reCAPTCHA variables, SerpAPI, and Square variables. OpenAI calls stay server-side in Netlify Functions.

## Commands

- `npm run build` builds `public/` into `out/` and checks Netlify Functions.
- `npm test` runs the clean platform audit suite.
