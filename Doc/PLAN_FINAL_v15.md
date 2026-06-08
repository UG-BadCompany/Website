# PLAN_FINAL.md — Master Build Specification

This is the final combined master plan for the White-Label Contractor CMMS + AI Quoting Platform.

This document merges:
- the original rebuild plan,
- installer-first requirements,
- environment-variable setup during install,
- secure secret handling,
- Super Owner / testing architecture,
- true drop-in module architecture,
- future license system,
- workflow engine,
- shared AI service,
- public homepage/editor requirements,
- performance/bootstrap requirements,
- and complete acceptance tests.

Codex must treat this document as the single source of truth.

---


---

# FINAL v13 UPDATE — Installer Theme Live Preview, Integration Detection, DB Seeding, Sidebar UX, Core Modules, and Role View Testing

This section is a required update to the plan.

The platform remains a full White-Label Contractor CMMS + AI Quoting System.

The installer should be simple, but it must still create a real working platform.

Current issues this section fixes:

- Theme selector during install does not update live.
- Integration Warnings use wrong variable name `SERPAPI_KEY`; it must be `SERPAPI_API_KEY`.
- Integration Warnings do not auto-detect all existing host environment variables.
- Dashboard/sidebar needs a more organized professional layout.
- Installer appears to finish without saving/creating real database records.
- Basic accounts, roles, permissions, services, and modules must be created.
- Basic non-AI modules must exist immediately.
- Owner needs a role/view switcher to test all default roles.

---

## v13.1 Installer Theme Selector Must Update Live

During install, the Theme step must update the actual installer preview immediately when the owner changes theme mode or colors.

### Required Behavior

When owner changes:

- Light
- Dark
- System
- Custom

the installer must immediately update:

- background
- text color
- cards
- buttons
- inputs
- sidebar preview
- mobile nav preview
- header preview
- sample dashboard card
- sample public homepage card

No page refresh.

No waiting until Save.

No broken preview.

### Technical Requirements

On every change, update the document theme and CSS variables immediately:

```js
document.documentElement.dataset.theme = resolvedTheme;
document.documentElement.style.setProperty('--primary', value);
document.documentElement.style.setProperty('--accent', value);
document.documentElement.style.setProperty('--color-background', value);
document.documentElement.style.setProperty('--color-surface', value);
document.documentElement.style.setProperty('--color-text', value);
```

System mode must resolve using:

```js
window.matchMedia('(prefers-color-scheme: dark)')
```

If OS theme changes while installer is open and mode is `system`, preview must update.

### Save Requirements

Save & Continue must persist theme values to the installer draft and final company/theme settings.

After refresh, saved theme values must reload.

After Finish Install, dashboard/public site/client portal must use the saved theme.

### Acceptance Tests

- Theme mode changes preview live.
- Color changes preview live.
- System mode follows OS.
- Refresh keeps saved theme.
- Dashboard uses saved theme.
- Public site uses saved theme.
- No hardcoded white background appears after theme change.

---

## v13.2 Correct Integration Warning Variable Names

The installer and System Center must use the exact Netlify Environment Variable names.

Current wrong value:

```txt
SERPAPI_KEY
```

Correct value:

```txt
SERPAPI_API_KEY
```

The platform must never invent alternate names.

### Required Integration Warning List

The installer Review step and System Center detection must check these exact variables:

```txt
MAGIC_LINK_FROM_EMAIL
OPENAI_API_KEY
QUOTE_FROM_EMAIL
RECAPTCHA_SECRET_KEY
RECAPTCHA_SITE_KEY
RESEND_API_KEY
SERPAPI_API_KEY
SITE_URL
SITE_URL_ALIASES
SQUARE_ACCESS_TOKEN
SQUARE_API_VERSION
SQUARE_ENVIRONMENT
SQUARE_LOCATION_ID
SQUARE_WEBHOOK_SIGNATURE_KEY
```

### Detection Display Rules

Show each variable status as:

```txt
VARIABLE_NAME: Configured
```

or:

```txt
VARIABLE_NAME: Not configured; platform will use manual mode.
```

Never show secret values.

For configured secrets, optional display:

```txt
Configured ending in abcd
```

Only if safe last-four metadata is available.

### Required vs Optional During Install

These are optional warnings during install.

Missing values must not block Finish Install.

The installer should say:

```txt
These integrations can be configured later in System Center.
```

### Acceptance Tests

- `SERPAPI_API_KEY` is used everywhere.
- `SERPAPI_KEY` appears nowhere in source code or UI.
- All listed environment variables are checked.
- Missing optional integrations show warnings only.
- Configured variables are detected without exposing secrets.
- Finish Install works even if all integrations are missing.

---

## v13.3 Auto-Detect Existing Host Environment Variables

The installer must auto-detect existing host environment variables when possible.

### Detection Source

Server-side functions should read:

```js
process.env
```

and return only safe status.

Create or update:

```txt
GET /api/install/integration-status
GET /api/system/integration-status
```

Response example:

```json
{
  "ok": true,
  "integrations": [
    {
      "key": "OPENAI_API_KEY",
      "configured": true,
      "requiredForInstall": false,
      "category": "AI"
    },
    {
      "key": "SERPAPI_API_KEY",
      "configured": false,
      "requiredForInstall": false,
      "category": "Search"
    }
  ]
}
```

Never return actual values.

### Categories

Group integration warnings:

```txt
Email
AI
Search
Security
Site URL
Payments
```

### Exact Mapping

Email:

```txt
MAGIC_LINK_FROM_EMAIL
QUOTE_FROM_EMAIL
RESEND_API_KEY
```

AI:

```txt
OPENAI_API_KEY
```

Search:

```txt
SERPAPI_API_KEY
```

Security:

```txt
RECAPTCHA_SECRET_KEY
RECAPTCHA_SITE_KEY
```

Site:

```txt
SITE_URL
SITE_URL_ALIASES
```

Payments:

```txt
SQUARE_ACCESS_TOKEN
SQUARE_API_VERSION
SQUARE_ENVIRONMENT
SQUARE_LOCATION_ID
SQUARE_WEBHOOK_SIGNATURE_KEY
```

### Acceptance Tests

- Existing Netlify env vars show Configured.
- Missing vars show Not Configured.
- No env values are exposed.
- Review screen shows complete detection list.
- System Center uses same detection code.

---

## v13.4 Installer Must Actually Create Database Records

Finish Install must not just change UI.

It must create/upsert the minimum required database records so the platform works immediately.

### Required Database Creation

`POST /api/install/finish` must create or upsert:

```txt
platform_installation
company_settings
theme_settings or company theme fields
homepage_settings
app_users
roles
permissions
role_permissions
user_roles
workspace_access
module_registry
module_settings
service_categories
audit_logs
```

If the schema is not created yet, migrations must create it.

The install function should not assume records already exist.

### Owner Account Creation

Installer must create the owner user.

Required owner fields:

```txt
full_name
email
phone optional
role = owner
active = true
created_at
updated_at
```

If owner already exists by normalized email, update it and ensure owner role exists.

### Default Roles

Seed roles:

```txt
owner
admin
manager
worker
client
```

### Default Role Capabilities

Owner:

```txt
all permissions
all workspaces
can impersonate
can view all role views
can manage modules
can manage system center
```

Admin:

```txt
dashboard
customers
requests
quotes
work orders
schedule
inventory
invoices
finance
users limited
```

Manager:

```txt
dashboard
customers
requests
quotes
work orders
schedule
inventory
worker assignment
```

Worker:

```txt
worker portal
assigned jobs
schedule
job photos
materials used
completion submission
```

Client:

```txt
client portal
requests
quotes
invoices
project photos
approvals
payments
```

### Required Permissions

At minimum create permissions for:

```txt
dashboard.view
customers.view
customers.manage
requests.view
requests.manage
quotes.view
quotes.manage
workorders.view
workorders.manage
workorders.assign
schedule.view
schedule.manage
inventory.view
inventory.manage
invoices.view
invoices.manage
finance.view
finance.manage
users.view
users.manage
roles.manage
modules.view
modules.manage
theme.manage
homepage.manage
system.view
system.manage
audit.view
impersonation.use
```

### Install Finish Validation

After Finish Install, verify records exist:

```txt
owner user exists
owner role exists
owner has owner role
roles exist
permissions exist
role_permissions exist
module_registry contains required core modules
company settings exist
theme settings exist
homepage settings exist
installation_complete = true
```

If any required creation fails, return clear JSON error.

### Acceptance Tests

- Finish Install creates owner account.
- Finish Install creates roles.
- Finish Install creates permissions.
- Finish Install creates role permissions.
- Finish Install creates workspace access.
- Finish Install creates company settings.
- Finish Install creates homepage settings.
- Finish Install creates module registry.
- Finish Install creates services.
- Dashboard can load immediately after install.
- Database is not empty after install.

---

## v13.5 Required Basic Modules Must Exist Immediately

The following basic non-AI modules are required at minimum and must be created/registered during install.

These must exist even if AI integrations are not configured:

```txt
Dashboard / Overview
Customers / Clients
Request Estimate
Estimate & Quote Center
Work Orders
Schedule / Calendar
Inventory
Invoices
Finance
```

### Module IDs

Use stable module IDs:

```txt
dashboard-overview
customers
request-estimate
estimate-quote-center
work-orders
schedule-calendar
inventory
invoices
finance
```

### Required Module Behavior

Dashboard / Overview:

```txt
shows quick stats, recent activity, quick actions, setup checklist
```

Customers / Clients:

```txt
create/view/edit customers and properties
```

Request Estimate:

```txt
manual request form with photo upload support, not AI-only
```

Estimate & Quote Center:

```txt
create/view/edit/send quotes manually; AI optional
```

Work Orders:

```txt
create/manage/assign/schedule/complete work orders
```

Schedule / Calendar:

```txt
calendar and list view for scheduled work
```

Inventory:

```txt
items, stock, transactions, materials used
```

Invoices:

```txt
create/view/download/send invoices; payment optional
```

Finance:

```txt
revenue, invoices, payments, manual payment tracking
```

### AI Modules Are Additional

AI modules must still exist, but they are not required for manual operation:

```txt
AI Photo Estimate
AI Quote Builder
AI Troubleshooting
```

If OpenAI is not configured, AI modules show:

```txt
AI is not configured yet.
Configure OpenAI in System Center → Environment & Integrations.
```

No fake results.

No crash.

### Acceptance Tests

- Basic modules appear after install.
- Basic modules work without OpenAI.
- Basic modules work without Square.
- Basic modules are visible in sidebar.
- Basic modules are visible in Module Manager.
- Request Estimate is not AI-only.
- Quotes can be created manually.
- Invoices can be created manually.
- Finance supports manual payment tracking.

---

## v13.6 Dashboard Sidebar Must Be Organized and Professional

The dashboard sidebar must be redesigned to be organized, clear, and scalable.

### Sidebar Goals

The sidebar should feel like a polished SaaS CMMS dashboard.

It must not be a random flat list.

It must be grouped by workflow.

### Required Sidebar Groups

Use these groups:

```txt
Main
Operations
Financial
People
AI Tools
System
```

Main:

```txt
Dashboard / Overview
```

Operations:

```txt
Customers / Clients
Request Estimate
Estimate & Quote Center
Work Orders
Schedule / Calendar
Inventory
```

Financial:

```txt
Invoices
Finance
Payments
```

People:

```txt
Users & Roles
Workspace & Permissions
```

AI Tools:

```txt
AI Photo Estimate
AI Quote Builder
AI Troubleshooting
```

System:

```txt
Homepage Editor
Theme Manager
Module Manager
System Center
Platform Health
Audit Logs
Cache Manager
Backup / Restore
Environment & Integrations
Licensing
```

### Sidebar UX Requirements

Sidebar must include:

- company logo
- company name
- current workspace
- role/view switcher for Owner
- grouped nav sections
- icons
- active state
- collapsed mode
- mobile-friendly bottom nav
- clear module labels
- no duplicate modules
- no developer/internal route names visible

### Owner Role/View Switcher

Owner must have a visible control:

```txt
Viewing as: Owner
[Switch View]
```

Available views:

```txt
Owner
Admin
Manager
Worker
Client
```

Switching view should simulate default role view for testing.

It should not require logout.

It should not permanently change the owner role.

### Acceptance Tests

- Sidebar is grouped.
- Sidebar is not a flat random list.
- Owner can switch role views.
- Admin/Manager/Worker/Client views show appropriate nav.
- Active module is highlighted.
- Sidebar works on mobile.
- No duplicate nav entries.
- No internal IDs shown to normal users.

---

## v13.7 Owner Default Role View Testing

Owner needs a way to test all default role experiences.

### Required Feature

Add:

```txt
Owner View Tester
```

or integrate into workspace switcher.

Owner can preview:

```txt
Owner View
Admin View
Manager View
Worker View
Client View
```

### Behavior

When Owner selects a view:

- sidebar updates to that role's default modules
- dashboard content updates to that role's perspective
- permissions are simulated for UI testing
- a banner appears:

```txt
Testing Admin View as Owner
[Exit Test View]
```

Owner still retains emergency ability to exit back to Owner.

### Audit

Changing test view does not need a heavy audit log, but impersonating a real user does.

Testing a role view should be local/session-level.

### Acceptance Tests

- Owner can test Admin view.
- Owner can test Manager view.
- Owner can test Worker view.
- Owner can test Client view.
- Owner can return to Owner view.
- Test view does not permanently change permissions.
- Sidebar changes to match selected role view.

---

## v13.8 Final Override for Current Issues

If any earlier section conflicts with this v13 section, this v13 section wins.

Specifically:

- `SERPAPI_API_KEY` is the correct variable name.
- Integration warnings must check the full provided env var list.
- Theme selector must update live during install.
- Finish Install must create real DB records.
- Basic modules must exist after install.
- Dashboard sidebar must be organized.
- Owner must be able to view/test all default role views.

---


---

# 0. FINAL v12 CLARIFICATION — Simplified Installer, Full Platform Still Required

This document must NOT be interpreted as removing core platform features.

The installer should be simpler, but the platform itself must still include the full Contractor CMMS + AI Quoting system.

The simplified installer philosophy is:

1. Auto Detect First.
2. Manual Entry Second.
3. Optional Integrations Never Block Installation.
4. Business Ready in 5 Minutes.
5. True Drop-In Modules.
6. Everything Database Driven.
7. Owner Can Test Everything.
8. No Empty Screens.
9. No White Screens.
10. One Workflow Engine Powers Everything.

The installer must not overwhelm the owner, but the final system must still include all core modules, magic login, dashboards, workflows, AI tools, payment support, and white-label controls.

---

## 0.1 Required Core Modules

The finished platform must include these modules.

Each module must be implemented as a true drop-in module with a module manifest, module runtime registration, permissions, routes, and Module Manager visibility.

Core required modules:

1. Dashboard / Overview
2. Customers / Clients
3. Request Estimate
4. Estimate & Quote Center
5. AI Photo Estimate
6. AI Quote Builder
7. AI Troubleshooting
8. Work Orders
9. Schedule / Calendar
10. Worker Jobs
11. Inventory
12. Invoices
13. Payments / Square Support
14. Finance
15. File / Photo Manager
16. Users & Roles
17. Workspace & Permissions
18. Theme Manager
19. Homepage Editor
20. Module Manager
21. Reports
22. Platform Health
23. Cache Manager
24. Audit Logs
25. Backup / Restore Foundation
26. System Center
27. Environment & Integrations
28. Licensing
29. Maintenance Plans
30. Client Portal
31. Worker Portal

No core module should be removed just because the installer is simplified.

---

## 0.2 Magic Login / Passwordless Authentication

Magic login is required.

The platform must support passwordless email login using secure magic links.

Required auth behavior:

- Client enters email.
- System sends secure one-time login link when email sending is configured.
- Link signs user in and creates/updates session.
- Existing users go directly to their dashboard/portal.
- New users go to account setup.
- New client accounts can be created even if they never submitted a previous request.
- Account setup links user records by normalized email.
- Sessions are secure and expire.
- Tokens are hashed server-side.
- Tokens are single-use.
- Expired or invalid tokens show a friendly error.

If Resend or email sending is not configured:

- installation still completes.
- owner dashboard still works.
- auth system shows "Email not configured yet."
- owner can use setup/session mode created during install.
- System Center guides owner to configure email later.

Magic login must work after email is configured.

---

## 0.3 Account Setup Flow

First-time user flow:

```txt
User enters email
→ Magic link sent
→ Link clicked
→ If existing user: login
→ If new user: account setup
→ Create profile
→ Assign client role by default
→ Open client portal
```

Required account setup fields:

- full name
- email locked
- phone
- contact permission

Optional fields:

- company
- property address
- preferred contact method
- notes

The account setup flow must link existing records by normalized email:

- customers
- job requests
- quotes
- invoices
- work orders
- uploaded files
- photo estimates

No duplicate users for the same email.

---

## 0.4 Required Workspaces

The platform must include these workspace views:

- Owner
- Admin
- Manager
- Worker
- Client

Owner is Super User and can switch between all views for testing.

Admin and Manager can manage operations based on permissions.

Worker sees assigned work, schedule, job details, photos, materials, and completion actions.

Client sees requests, quotes, work progress, invoices, payments, photos, and approvals.

---

## 0.5 Full Workflow Must Remain

The platform must support the complete business workflow:

```txt
Client Request
→ AI/manual estimate
→ Admin quote review
→ Quote sent to client
→ Client accepts quote
→ Work order created
→ Worker assigned
→ Work scheduled
→ Work in progress
→ Worker completes work
→ Admin review
→ Client approval if required
→ Invoice created
→ Payment link/manual payment
→ Payment verified
→ Work archived/closed
```

All status changes must flow through the shared workflow engine.

Completed, paid, closed, and archived items must leave active lists.

---

## 0.6 Simplified Installer Does Not Remove System Center

The installer should not ask for advanced API keys.

However, System Center must still include:

- Environment & Integrations
- Licensing
- Platform Health
- Cache Manager
- Backup / Restore
- Audit Logs
- Module Manager
- Theme Manager
- Homepage Editor
- User / Role Management

The installer should get the owner operational quickly.

System Center is where advanced configuration happens later.

---

## 0.7 Required Installer Steps

The installer should use this simplified flow:

```txt
1. Welcome
2. Company
3. Branding
4. Theme
5. Owner Account
6. Services
7. Modules
8. Homepage
9. Review
10. Finish
```

Do NOT include a required Environment Variables step.

Do NOT include required API key entry.

Do NOT block install for missing OpenAI, Resend, Square, SMTP, SerpAPI, reCAPTCHA, or license server values.

---

## 0.8 Auto-Detection Must Stay

The simplified installer must still auto-detect:

- current SITE_URL / deployment URL
- existing company name
- existing logo
- existing theme
- existing homepage config
- existing module manifests
- existing install draft/progress
- existing host environment variable status, without showing secrets
- existing owner email if authenticated/available

Auto-detected values should be presented as:

```txt
We found:
✓ Domain
✓ Company Name
✓ Logo
✓ Theme
✓ Modules

[Keep Existing]
[Change]
```

---

## 0.9 Post-Install Business Ready Mode

Immediately after installation, redirect to:

```txt
/dashboard/
```

Show:

```txt
Welcome to Your New Business Platform
```

Include:

- Quick Start Checklist
- Business Health
- Recommended Actions
- Create First Client
- Create First Request
- Create First Quote
- Create First Work Order
- View Homepage
- Open System Center

The system must work in manual mode even when external integrations are missing.

---

## 0.10 v12 Acceptance Rules

The platform is not complete unless:

- Magic login exists.
- Account setup exists.
- All required core modules exist.
- True drop-in module system exists.
- Owner can access all workspace views.
- Client portal exists.
- Worker portal exists.
- Request / Quote / Work Order / Invoice / Payment workflow works.
- Homepage Editor exists.
- Theme Manager exists.
- Module Manager exists.
- System Center exists.
- Environment & Integrations exists after install.
- Platform works without OpenAI, Resend, Square, or license server configured.
- Installer remains simple and does not block on optional integrations.
- No page is blank or useless when empty.

---



Repository: `UG-BadCompany/Website`  
Target: rebuild the current project with the same Netlify static-site + Netlify Functions + Netlify Database environment, while preserving the current feature set and making the module system truly drop-in.

---

## 1. Purpose

This plan is for remaking the current website/platform cleanly without losing what already works. The new system should keep the current product idea but rebuild the architecture so it is easier to maintain, faster, more stable, and truly modular.

The finished platform should be a premium white-label Contractor CMMS + AI Quoting Platform with:

- public editable contractor homepage
- request estimate workflow
- real photo upload
- AI Photo Estimate
- AI Quote generation
- AI Troubleshooting
- client portal
- owner/admin/manager/worker/client workspaces
- work order workflow
- scheduling
- inventory
- invoices
- Square payment links
- finance
- users, roles, permissions
- homepage editor
- theme manager
- module manager
- drop-in modules
- shared workflow engine
- shared AI engine
- shared design system
- fast branding/theme load
- migration identity protection

The most important goal: adding a new module should not require editing the dashboard router, sidebar, permissions UI, mobile nav, Netlify routes, or core files by hand. A developer should drop in a module folder with a manifest and the system should discover and register it.

---

## 2. Current Environment to Keep

Keep the current deployment model:

```txt
Netlify
Netlify Functions
Netlify Database
Static frontend output to /out
Node 20
No required Next.js runtime
```

Keep the current build model:

```json
{
  "prebuild": "node scripts/prebuild-netlify-migrations.cjs",
  "build": "node scripts/build-static-site.mjs",
  "postbuild": "node scripts/check-netlify-functions.mjs && node scripts/ensure-netlify-out.mjs"
}
```

Keep `netlify.toml` base settings:

```toml
[build]
  command = "npm run build"
  publish = "out"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "20"
  NETLIFY_NEXT_PLUGIN_SKIP = "true"
```

Do not convert the project to Next.js unless that becomes a separate future migration. This platform is currently a static frontend plus Netlify Functions.

---


---

## 2.0 Installation Lock — Installer First, Homepage Second

This platform is intended to be sold and deployed as a white-label Contractor CMMS + AI Quoting Platform.

A brand new deployment MUST NEVER expose the public homepage, dashboard, login page, client portal, quotes, invoices, or any business content before installation has completed successfully.

The installer is the first application.

### Required First-Run Behavior

On a fresh deployment or empty database:

```txt
User visits /
↓
System checks /api/install-status
↓
installation_complete = false
↓
Redirect to /install/
```

The homepage must not flash, render, or briefly show before redirecting.

### Protected Routes Before Installation

Before installation is complete, these routes must redirect to `/install/`:

```txt
/
 /dashboard/*
 /portal/*
 /client/*
 /login/*
 /request-estimate/*
 /quote/*
 /invoice/*
 /admin/*
 /manager/*
 /worker/*
 /api/modules/*
 /api/dashboard/*
 /api/work-orders/*
 /api/invoices/*
```

Allowed before installation:

```txt
/install/*
/api/install/*
/api/install-status
/assets/*
/favicon.ico
/config/*
```

### Install Status Endpoint

Create:

```txt
GET /api/install-status
```

Response when not installed:

```json
{
  "ok": true,
  "installed": false,
  "installationComplete": false,
  "needsInstall": true,
  "currentStep": "welcome"
}
```

Response when installed:

```json
{
  "ok": true,
  "installed": true,
  "installationComplete": true,
  "needsInstall": false,
  "installedAt": "ISO_DATE",
  "installedVersion": "1.0.0"
}
```

If the database is empty, missing tables, unavailable, or partially installed, return `needsInstall: true` safely.

Do not crash.

### Installer State Table

Create one source-of-truth install state table:

```sql
platform_installation (
  id text primary key default 'default',
  installation_complete boolean not null default false,
  installed_version text,
  installed_at timestamptz,
  installed_by_user_id uuid,
  current_step text not null default 'welcome',
  license_status text not null default 'not_checked',
  bootstrap_generated boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Only one row should exist.

### Installer Resume

If installation stops halfway:

- keep installer draft state,
- resume from the last successful step,
- do not expose homepage,
- do not expose dashboard,
- do not partially enable modules publicly.

### Installation Completion

At final install step:

1. Save company settings.
2. Save branding/theme/sidebar/mobile nav settings.
3. Create owner account.
4. Seed roles.
5. Seed permissions.
6. Seed module registry.
7. Save homepage editor configuration.
8. Save services/trades.
9. Save license placeholder.
10. Save environment/integration statuses.
11. Generate `/config/bootstrap.json`.
12. Set `installation_complete = true`.
13. Redirect to `/dashboard/`.

Only after this may the homepage be public.

---


---

## 2.0A Installer Environment Variables and Secure Integration Setup

Environment Variables must not be hardcoded in source code or installer defaults.

During first-run setup, the installer must provide an Environment Variables / Integrations step where the owner can enter or confirm required integration values.

### Environment Variable Modes

The platform must support:

1. Netlify Environment Variables already configured before deploy.
2. Owner enters missing values during install.
3. Owner updates integrations after install from System Center.

### Secret Rule

Secrets entered during install must NEVER be saved into:

- frontend JavaScript,
- public HTML,
- public config,
- `/config/bootstrap.json`,
- localStorage,
- sessionStorage,
- browser-visible JSON,
- logs,
- source maps.

Secrets may only be stored in:

- Netlify Environment Variables, if secure Netlify environment update is available,
- encrypted server-side database table,
- external secret manager in the future.

Frontend installer may collect values, but must send them only to secure server-side functions.

### Environment Variables Step

Add installer step:

```txt
Environment Variables / Integrations
```

For each variable, show:

- variable name,
- description,
- required or optional,
- configured/missing/invalid status,
- secure input field if missing,
- test button where possible,
- save button,
- clear/remove button where safe,
- last checked date,
- safe last-four display only.

### Required Variables

Strongly required for production:

```txt
SITE_URL
RESEND_API_KEY
MAGIC_LINK_FROM_EMAIL
QUOTE_FROM_EMAIL
OPENAI_API_KEY
```

The installer should explain what will not work if any required value is missing.

### Optional Variables

Optional variables should not block install:

```txt
RECAPTCHA_SITE_KEY
RECAPTCHA_SECRET_KEY
SERPAPI_API_KEY
SQUARE_ACCESS_TOKEN
SQUARE_API_VERSION
SQUARE_ENVIRONMENT
SQUARE_LOCATION_ID
SQUARE_WEBHOOK_SIGNATURE_KEY
OPENAI_MODEL
OPENAI_RESPONSES_MODEL
OPENAI_PHOTO_ESTIMATE_MODEL
OPENAI_QUOTE_MODEL
OPENAI_TROUBLESHOOTING_MODEL
LICENSE_VERIFY_URL
LICENSE_VERIFY_TOKEN
LICENSE_PRODUCT_ID
LICENSE_GRACE_DAYS
LICENSE_VALIDATION_ENABLED
SMTP_HOST
SMTP_USER
SMTP_PASSWORD
GOOGLE_MAPS_API_KEY
SUPPLIER_API_KEY
CDN_URL
FILE_STORAGE_PROVIDER
IMAGE_MAX_UPLOAD_MB
MODULE_AUTO_DISCOVERY
PUBLIC_BOOTSTRAP_CACHE_TTL
DASHBOARD_BOOTSTRAP_CACHE_TTL
INSTALLATION_LOCK_ENABLED
INSTALLATION_ROUTE
```

### Environment Status Endpoint

Create:

```txt
GET /api/install/env-status
```

Response must return only safe status:

```json
{
  "ok": true,
  "variables": [
    {
      "key": "OPENAI_API_KEY",
      "required": true,
      "configured": true,
      "source": "netlify_env",
      "lastFour": "abcd",
      "valid": true,
      "lastCheckedAt": "ISO_DATE"
    }
  ]
}
```

Never return secret values.

### Environment Save Endpoint

Create:

```txt
POST /api/install/env
```

Requirements:

1. require installer setup token or owner session,
2. validate variable names against allowlist,
3. save/update securely,
4. never return secret value,
5. audit log action without logging secret,
6. return configured/missing/test status only.

### Encrypted Fallback Table

If Netlify env update is not available, create:

```sql
platform_secret_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  encrypted_value text not null,
  provider text not null default 'encrypted_db',
  last_four text,
  status text not null default 'configured',
  last_tested_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Rules:

- never expose encrypted_value,
- never log secrets,
- only server functions can decrypt,
- display only configured/missing/last-four status.

### Public-Safe Values

Frontend may receive only safe public values:

```txt
SITE_URL
RECAPTCHA_SITE_KEY
public company settings
public theme settings
homepage settings
public module visibility
```

### Secret Values

Frontend must never receive:

```txt
OPENAI_API_KEY
RESEND_API_KEY
SQUARE_ACCESS_TOKEN
SQUARE_WEBHOOK_SIGNATURE_KEY
SERPAPI_API_KEY
LICENSE_VERIFY_TOKEN
RECAPTCHA_SECRET_KEY
SMTP_PASSWORD
```

### Integration Test Buttons

Installer and System Center should allow testing:

- OpenAI connection,
- Resend email sending,
- Square credentials,
- Square webhook status,
- reCAPTCHA verify path,
- license server if enabled,
- SITE_URL current deployment match,
- SerpAPI if enabled.

### Post-Install Environment Manager

After install, add:

```txt
Owner/Admin → System Center → Environment & Integrations
```

Owner can:

- view configured/missing status,
- add/update integration values,
- test integrations,
- enable/disable optional integrations,
- see last checked date,
- see safe last-four display only.

Only Owner should edit secrets by default.

Admin access requires explicit owner-granted permission.

---


---

## 2.0B Environment Variable Help Links and Value Guidance

During the First-Run Installer, the Environment Variables / Integrations step must not only ask for values.

It must also explain where each value comes from and provide a link or instructions for getting it.

Important:

Environment Variable values are unique per customer, per deployment, and per external account.

Do NOT hardcode example values as real defaults.

Do NOT assume every customer uses the same URL, account, location ID, API key, sender email, license key, or webhook URL.

The installer should help the owner find or create the correct value for their own account.

### Variable Help Metadata

Create a metadata registry for environment variables.

Example:

```js
{
  key: "OPENAI_API_KEY",
  label: "OpenAI API Key",
  required: true,
  secret: true,
  category: "AI",
  description: "Used for AI Quote, AI Photo Estimate, and AI Troubleshooting.",
  helpUrl: "https://platform.openai.com/api-keys",
  helpText: "Create or copy an API key from your OpenAI platform account.",
  valueInstructions: [
    "Open the OpenAI API Keys page.",
    "Sign in to the account that will pay for AI usage.",
    "Create a new secret key.",
    "Copy the value and paste it here.",
    "The value will be stored server-side only."
  ],
  placeholder: "sk-...",
  canTest: true
}
```

The installer should render this help metadata for every integration.

### Required UX

For each variable card, show:

- variable name
- plain English purpose
- required/optional badge
- configured/missing status
- secure input field
- "Where do I find this?" help link
- step-by-step instructions
- test connection button if supported
- last checked date
- safe last-four display only

### External Account Links

Provide safe links to external dashboards where the owner can obtain values.

Examples:

OpenAI:
- API key page
- usage/billing page if useful

Resend:
- API keys page
- domains page
- sender/domain verification instructions

Square:
- developer dashboard
- applications page
- locations page
- webhook configuration page

Google reCAPTCHA:
- admin console
- site key / secret key instructions

SerpAPI:
- dashboard/API key page

License Server:
- future licensing portal URL from `LICENSE_VERIFY_URL` or configured reseller system

Google Maps:
- Google Cloud API credentials page

SMTP:
- generic provider instructions, because values differ by mail provider

### Dynamic URL Guidance

Some URLs depend on this specific deployment.

The installer must generate and display deployment-specific callback/webhook URLs.

Examples:

Magic link / site URL:

```txt
SITE_URL = current deployment URL or custom domain
```

Square webhook URL:

```txt
https://YOUR_DOMAIN/api/payments/square/webhook
```

Public site:

```txt
https://YOUR_DOMAIN/
```

Client portal:

```txt
https://YOUR_DOMAIN/login/
```

The installer should calculate these based on:

- current browser origin
- `SITE_URL`
- `SITE_URL_ALIASES`
- configured custom domain

Do not hardcode `ta-contracting.org`, `tacontracting.netlify.app`, or any customer-specific domain.

### Customer-Specific Values

The installer must clearly explain that values are not shared between customers.

Examples:

- Square Location ID is different for each Square account.
- OpenAI API key is different for each OpenAI account.
- Resend API key is different for each Resend account.
- SITE_URL is different for each deployment/custom domain.
- License key is different for each sold website/customer.
- Webhook URL depends on the deployed website domain.

### Copy Buttons

For generated callback/webhook URLs, add:

- Copy URL button
- Open setup guide button
- Mark as configured button
- Test webhook button where possible

### Safe Defaults

The installer may use safe placeholders only:

```txt
Paste your OpenAI API key
Paste your Square access token
Paste your Resend API key
https://your-domain.com
```

Never use fake working-looking values.

Never use another customer’s values.

### Environment Help Registry

Create a reusable environment help registry used by:

- First-Run Installer
- System Center → Environment & Integrations
- setup validation
- docs generator

Suggested file:

```txt
netlify/functions/shared/env-metadata.mjs
```

or:

```txt
shared/env-metadata.json
```

It should define:

- key
- label
- category
- required
- secret
- publicSafe
- description
- helpUrl
- setupSteps
- placeholder
- testAction
- dependsOn
- generatedValueHint

### Acceptance Tests

- Installer shows help links for external integrations.
- Installer explains where to get each value.
- Installer generates deployment-specific callback/webhook URLs.
- Installer does not hardcode customer-specific domains.
- Installer never uses real example secrets.
- Square webhook URL uses the current deployment domain.
- SITE_URL can be detected from current deployment.
- Owner can copy generated URLs.
- Owner can open external dashboard links.
- System Center uses the same help metadata after install.

---


---

## 2.0C Environment Variable Categories and Installer UX

The First-Run Installer must NOT overwhelm the owner with dozens of integration cards.

Environment Variables must be grouped into categories.

### Category 1 — Required Setup

These are the minimum values required to complete installation.

```txt
SITE_URL
MAGIC_LINK_FROM_EMAIL
RESEND_API_KEY
```

If one of these is missing, installation should warn the owner.

### Category 2 — Recommended (AI)

These should be configured during install but should NOT block installation.

```txt
OPENAI_API_KEY
OPENAI_MODEL
OPENAI_RESPONSES_MODEL
OPENAI_PHOTO_ESTIMATE_MODEL
OPENAI_QUOTE_MODEL
OPENAI_TROUBLESHOOTING_MODEL
QUOTE_FROM_EMAIL
```

Display:

"Recommended for full AI functionality."

### Category 3 — Payments

Only required if the owner enables Square payments.

```txt
SQUARE_ACCESS_TOKEN
SQUARE_API_VERSION
SQUARE_ENVIRONMENT
SQUARE_LOCATION_ID
SQUARE_WEBHOOK_SIGNATURE_KEY
```

Display:

"Optional. Can be configured later."

### Category 4 — Security

```txt
RECAPTCHA_SITE_KEY
RECAPTCHA_SECRET_KEY
```

Optional.

### Category 5 — Licensing (Future)

```txt
LICENSE_VERIFY_URL
LICENSE_VERIFY_TOKEN
LICENSE_PRODUCT_ID
LICENSE_GRACE_DAYS
LICENSE_VALIDATION_ENABLED
```

Hidden behind:

Future Features

Disabled by default.

### Category 6 — Advanced Integrations

```txt
SERPAPI_API_KEY
GOOGLE_MAPS_API_KEY
SUPPLIER_API_KEY
SMTP_HOST
SMTP_USER
SMTP_PASSWORD
CDN_URL
FILE_STORAGE_PROVIDER
IMAGE_MAX_UPLOAD_MB
MODULE_AUTO_DISCOVERY
PUBLIC_BOOTSTRAP_CACHE_TTL
DASHBOARD_BOOTSTRAP_CACHE_TTL
INSTALLATION_LOCK_ENABLED
INSTALLATION_ROUTE
```

These should be collapsed by default.

---

### Installer Layout

The installer should use tabs:

```txt
[ Required ]
[ AI ]
[ Payments ]
[ Security ]
[ Advanced ]
[ Future ]
```

Only the Required tab is opened initially.

All other tabs are collapsed until selected.

Display counts:

```txt
Required (3)
AI (7)
Payments (5)
Security (2)
Advanced (13)
Future (5)
```

---

### Optional Variables

Optional variables must never block installation.

They should show:

- Optional
- Configure Later
- Skip For Now

The installer should explain that these can be managed later from:

Owner
→ System Center
→ Environment & Integrations

---

### Post-Install Management

The same categorized layout should be reused after installation.

The owner should never have to hunt through dozens of uncategorized cards.

---

### Acceptance Tests

- Environment Variables are grouped into categories.
- Only Required Setup is expanded by default.
- Optional integrations do not block installation.
- Square only becomes required when payments are enabled.
- Future license variables are hidden by default.
- Advanced variables are collapsed.
- System Center uses the same grouped layout.
- Installer feels simple and approachable for first-time users.

---


---

## 2.0D Installer Theme and Sidebar Colors UX Requirements

The First-Run Installer Theme and Sidebar Colors step must be fully functional and polished.

The installer must not show broken plain text fields or unusable color inputs.

### Current Problem to Avoid

During install, the Theme and Sidebar Colors screen can appear with:

- Mode displayed as a plain text input instead of a dropdown.
- Color fields appearing as broken blank bars.
- Primary Color, Accent Color, Background, Surface, and Text fields not opening proper color pickers.
- No preview of how the selected theme will look.
- Custom colors not saving or applying correctly.
- System mode not following the user's OS theme.
- Sidebar colors not matching the selected theme.

This must be fixed in the build.

### Theme Mode Field

The Mode field must be a proper dropdown/select.

Allowed values:

```txt
Light
Dark
System
Custom
```

Internal values:

```txt
light
dark
system
custom
```

Default:

```txt
system
```

System mode must detect:

```js
window.matchMedia('(prefers-color-scheme: dark)')
```

If OS is dark, the installer preview and final site should be dark.
If OS is light, the installer preview and final site should be light.

### Color Fields

Color fields must use real color picker controls.

Use:

```html
<input type="color">
```

or a custom color picker component.

Each color setting should include:

- visible color swatch
- hex input
- reset-to-default button
- accessible label
- live preview update
- validation for valid hex color

Required fields:

```txt
Primary Color
Accent Color
Background Color
Surface Color
Text Color
Border Color
Button Color
Button Text Color
Sidebar Background
Sidebar Text
Sidebar Active Background
Sidebar Active Text
Sidebar Hover Background
Mobile Nav Background
Mobile Nav Active
Mobile Nav Text
```

### Custom Color Behavior

When Mode is:

Light:
- use light theme defaults
- allow optional overrides only if custom override toggle is enabled

Dark:
- use dark theme defaults
- allow optional overrides only if custom override toggle is enabled

System:
- resolve to light or dark based on OS
- allow sidebar to follow resolved theme unless custom sidebar colors are enabled

Custom:
- use all custom color values
- require live preview
- validate colors before saving

### Sidebar Color Behavior

Sidebar colors must not be disconnected from the main theme.

Default behavior:

```txt
Sidebar follows selected theme.
```

Only use custom sidebar colors when:

```txt
custom_sidebar_colors_enabled = true
```

Installer must include a toggle:

```txt
Use custom sidebar colors
```

If disabled:

- hide or disable sidebar custom fields
- sidebar uses theme surface/background colors

If enabled:

- show sidebar color pickers
- save sidebar custom color values
- preview sidebar colors live

### Mobile Navigation Colors

Installer must include:

```txt
Use custom mobile nav colors
```

If disabled:

- mobile nav follows main theme

If enabled:

- show mobile nav color pickers
- preview mobile nav colors live

### Theme Preview

The Theme and Sidebar Colors step must include a live preview card.

Preview should show:

- public header
- sample homepage card
- sample dashboard sidebar
- sample button
- sample input
- sample mobile nav
- light/dark/system/custom mode result

The preview should update immediately when values change.

### Save Requirements

Clicking Save & Continue must persist:

- theme mode
- resolved theme preference
- all color values
- custom sidebar enabled flag
- sidebar colors
- custom mobile nav enabled flag
- mobile nav colors
- updated timestamp

After refresh, the installer should show the saved values.

After install completion, the public homepage, portal, dashboard, modules, quotes, invoices, and installer should all use the saved theme.

### Validation

Before saving:

- Mode must be one of: light, dark, system, custom.
- Color fields must be valid hex colors if provided.
- If Custom mode is selected, required custom colors must be valid.
- Invalid color values should show inline errors.
- Do not silently save broken color values.

### Theme Storage

Store theme settings in the main company/theme settings table, not hardcoded files.

Suggested fields:

```txt
theme_mode
theme_primary_color
theme_accent_color
theme_background_color
theme_surface_color
theme_text_color
theme_border_color
theme_button_color
theme_button_text_color
custom_sidebar_colors_enabled
sidebar_background_color
sidebar_text_color
sidebar_active_background_color
sidebar_active_text_color
sidebar_hover_background_color
custom_mobile_nav_colors_enabled
mobile_nav_background_color
mobile_nav_active_color
mobile_nav_text_color
updated_at
```

### Theme Bootstrap

Theme must apply before first paint.

The installer and generated `/config/bootstrap.json` must include safe public theme values only.

No page should flash white in dark/system mode.

### Installer Acceptance Tests

- Mode is a dropdown, not a text input.
- Light/Dark/System/Custom options work.
- Color fields open real color pickers.
- Hex inputs validate correctly.
- Theme preview updates live.
- Sidebar follows theme by default.
- Custom sidebar colors work only when enabled.
- Mobile nav follows theme by default.
- Custom mobile nav colors work only when enabled.
- Save & Continue persists settings.
- Refresh keeps saved values.
- System mode follows OS.
- Dashboard and public site use saved theme after install.
- No broken blank color bars appear.

---


---

## 2.0E Simple Guided Installer UX and Finish Install Reliability

The First-Run Installer must be simple enough for a non-technical business owner to complete.

The installer must not feel like a developer tool, database form, or raw configuration screen.

The installer should guide the user step-by-step and explain what is needed in plain English.

### Installer UX Goal

A user with no technical background should understand:

- what this step is for,
- why the information is needed,
- where to get the value,
- whether the step is required,
- whether the step can be skipped,
- what happens after clicking Save & Continue,
- what is left before installation is complete.

### Simple Installer Layout

Use a clean wizard layout:

```txt
Left side:
Step list / progress

Main area:
Current step only

Right side:
Help panel / explanation / preview
```

Do not show too many fields at once.

Do not show raw environment variable names as the main user-facing label unless needed.

Use friendly labels first and technical names second.

Example:

```txt
Email Sending Key
RESEND_API_KEY
```

Not just:

```txt
RESEND_API_KEY
```

### Progress Bar

Show:

```txt
Step 4 of 14
```

and:

```txt
Setup is 35% complete
```

Each step should show one of:

- Not Started
- Needs Attention
- Optional
- Complete
- Skipped
- Error

### Plain-English Step Help

Every installer step must include:

- What this step does
- Why it matters
- What happens if skipped
- What values are needed
- Where to get those values
- Whether it can be configured later

Example:

```txt
Email Setup

This lets the system send secure login links, quotes, invoices, and client notifications.

Required:
Resend API Key
Magic Link Sender Email

You can find these in your Resend dashboard.
```

### Guided Environment Variables

The Environment Variables / Integrations step should not appear as a huge grid of technical cards.

Use grouped friendly setup cards:

```txt
Required Setup
Email Sending
AI Features
Payments
Security
Future Licensing
Advanced
```

Default view should show only:

```txt
Required Setup
```

The installer should say:

```txt
You only need the required setup to finish installation.
AI, payments, and advanced integrations can be configured later.
```

### Required Setup Should Be Minimal

The minimum required setup to finish install should be:

```txt
SITE_URL
MAGIC_LINK_FROM_EMAIL
RESEND_API_KEY
```

If OpenAI is missing:

- AI modules remain installed but disabled or manual-review-only.
- Installer shows "AI can be configured later."

If Square is missing:

- payment links disabled.
- manual invoice/payment tracking remains available.

If license validation is disabled:

- license step can be skipped.

### Setup Guides

Each integration should include:

- Open dashboard button
- Copy generated callback/webhook URL
- Short step-by-step instructions
- Test connection button when supported

Example buttons:

```txt
Open Resend Dashboard
Copy Sender Email Instructions
Test Email
```

### Skip / Configure Later

Optional steps must have:

```txt
Skip for now
```

or:

```txt
Configure later
```

Skipping optional steps should save a clear status:

```txt
ai_status = skipped
square_status = skipped
license_status = verification_disabled
```

### Save Draft on Every Step

Every step must save automatically or when clicking Save & Continue.

If the browser refreshes, closes, or the user returns later:

- installer resumes at last incomplete step,
- saved values remain,
- completed steps stay complete,
- skipped optional steps stay skipped.

### Finish Install Must Actually Complete

Clicking Finish Install must perform a real finalization transaction.

It must not only change the UI.

Finish Install must:

1. validate all required steps,
2. validate owner account exists,
3. validate company profile exists,
4. validate theme exists,
5. validate homepage config exists,
6. validate module registry generated,
7. validate required environment variables are configured or accepted with safe fallback,
8. save all pending installer data,
9. seed default roles and permissions,
10. enable selected modules,
11. generate `/config/bootstrap.json`,
12. create/update `platform_installation`,
13. set `installation_complete = true`,
14. set `installed_at`,
15. set `installed_by_user_id`,
16. record installed version,
17. clear installer draft errors,
18. redirect to `/dashboard/`.

If any part fails, show a clear error and do not mark installation complete.

### Finish Install Endpoint

Create or fix:

```txt
POST /api/install/finish
```

Request:

```json
{
  "confirm": true
}
```

Response success:

```json
{
  "ok": true,
  "installationComplete": true,
  "redirectTo": "/dashboard/"
}
```

Response failure:

```json
{
  "ok": false,
  "code": "INSTALL_VALIDATION_FAILED",
  "message": "Company profile is missing.",
  "missing": ["company_profile"]
}
```

### Install Finalization Should Be Atomic

If possible, final install should use a database transaction.

Do not partially mark installation complete if:

- bootstrap generation fails,
- owner creation fails,
- role seeding fails,
- module registry fails,
- required settings fail.

### After Finish Install

After successful finish:

- `/api/install-status` returns installed true.
- `/` shows homepage.
- `/dashboard/` loads owner dashboard.
- `/install/` shows "Installation already complete."
- installer no longer appears for public visitors.

### Already Installed Screen

If installation is already complete and user visits `/install/`, show:

```txt
Installation is already complete.
```

Buttons:

```txt
Go to Dashboard
Go to Homepage
System Center
```

Only Owner can reopen installer settings.

### Installer Error Handling

Use helpful messages, not raw errors.

Bad:

```txt
500
```

Good:

```txt
We could not save your company profile. Please check the required fields and try again.
```

Bad:

```txt
Install failed.
```

Good:

```txt
Installation could not finish because the owner account was not created yet.
Go back to Owner Account and complete that step.
```

### Installer Completion Checklist

Before showing Finish Install, show a review checklist:

```txt
Required:
✓ Company profile
✓ Owner account
✓ Email sending
✓ Theme
✓ Modules selected

Optional:
○ AI not configured — can configure later
○ Square not configured — payments disabled for now
○ License validation disabled
```

The Finish Install button should be disabled until required items are complete.

### Installer Acceptance Tests

- Installer is simple and step-by-step.
- Only one main step is shown at a time.
- Every step explains what is needed.
- Every required value explains where to get it.
- Optional steps can be skipped.
- Installer resumes after refresh.
- Finish Install calls `/api/install/finish`.
- Finish Install validates required setup.
- Finish Install writes `installation_complete = true`.
- Finish Install generates bootstrap config.
- Finish Install redirects to dashboard.
- Install status changes from incomplete to complete.
- Homepage is blocked before finish and visible after finish.
- Clear errors are shown if finish fails.
- The Finish Install button never silently fails.

---



---

# 2.0F Automatic Environment Discovery and Import

The First-Run Installer should intelligently discover existing configuration before asking the owner to manually enter values.

The installer should always prefer:

Auto Detect
→ Suggest
→ Verify
→ Save

instead of forcing the owner to manually type everything.

## Discovery Order

1. Check platform_installation
2. Check existing Environment Variables
3. Check encrypted settings storage
4. Check bootstrap cache
5. Check branding assets
6. Check homepage configuration
7. Check theme configuration
8. Check module registry
9. Build installer state

## Hosting Environment Detection

Before displaying the Environment Variables step, the installer should attempt to detect variables already configured by the hosting provider.

Supported now:

- Netlify Environment Variables

Future-ready architecture:

- Vercel
- Docker .env
- Self-hosted .env
- External secret managers

If values already exist, automatically populate installer state.

Example:

✓ SITE_URL detected
✓ RESEND_API_KEY detected
✓ OPENAI_API_KEY detected
○ SQUARE_ACCESS_TOKEN missing

The owner should only enter values that cannot be discovered.

## Secret Display Rules

Detected secrets must never be shown in full.

Display only:

Configured
Last Four: abcd

Buttons:

- Replace
- Test
- Leave Existing

Never expose full values.

## Automatic SITE_URL Detection

If SITE_URL is missing, attempt detection using the current deployment origin.

Suggest:

https://current-domain.com

The owner may override before saving.

## Automatic Callback URL Generation

Generate deployment-specific URLs automatically.

Examples:

Square Webhook:

https://CURRENT_DOMAIN/api/payments/square/webhook

Magic Link Base:

https://CURRENT_DOMAIN/

Client Portal:

https://CURRENT_DOMAIN/login/

Provide Copy URL buttons.

Do not require manual typing.

## Branding Discovery

If existing branding is found:

- Company Name
- Logo
- Theme
- Homepage Layout

Display:

Existing configuration found.

[Keep Existing]
[Replace]

## Module Discovery

Scan installed module folders.

Automatically discover:

- enabled modules
- disabled modules
- hidden modules
- beta modules
- experimental modules

Build module registry automatically.

## Resume Previous Installation

If installation was interrupted:

Show completed and remaining steps.

Allow:

[Resume Installation]

## Acceptance Tests

- Existing Netlify Environment Variables are discovered.
- Existing SITE_URL is suggested automatically.
- Existing branding is detected.
- Existing homepage configuration is detected.
- Existing theme configuration is detected.
- Existing modules are detected.
- Existing installer progress is detected.
- Secrets are never shown in full.
- Installer minimizes manual setup whenever possible.



---

## 2.0G Installer White Page Prevention, Crash Recovery, and No-Blank-Screen Rule

The First-Run Installer must never fail into a blank white page.

A white page during install is a critical production failure.

The installer must have a defensive boot process, error boundary, fallback UI, and recovery mode so a user can always see what went wrong and continue setup.

### No Blank Screen Rule

The install page must never render as an empty white page.

If JavaScript fails, API calls fail, database is missing, migrations are not ready, bootstrap config is missing, or module discovery fails, the page must still show a readable recovery UI.

Minimum fallback page:

```txt
Setup could not start

We found a problem while loading the installer.

[Retry]
[Open Recovery Mode]
[Run System Check]
[View Error Details]
```

### Installer Boot Order

The installer must boot in this safe order:

```txt
1. Load minimal static installer shell.
2. Show loading/progress state immediately.
3. Load installer JS.
4. Attach global error handlers.
5. Call /api/install-status.
6. Call /api/install/health.
7. Load saved installer draft.
8. Load environment status.
9. Load module registry.
10. Render current installer step.
```

The static shell must appear before any API request finishes.

Do not wait for database/API responses before rendering the basic installer UI.

### Static Installer Fallback

The `/install/` page must include a static HTML fallback.

Even if the main app bundle fails, the user should see:

- title
- explanation
- retry button
- recovery link
- support details if configured
- basic diagnostic status area

This fallback should be replaced by the full installer only after the installer JS successfully mounts.

### Global Installer Error Boundary

Add global error handling for the installer:

```js
window.addEventListener('error', ...)
window.addEventListener('unhandledrejection', ...)
```

Any installer crash should render an error panel instead of a white page.

The panel should show:

- friendly message
- failing step
- retry button
- recovery mode button
- safe technical details toggle
- copy diagnostics button

Do not expose secrets in diagnostics.

### Installer Health Endpoint

Create:

```txt
GET /api/install/health
```

It should return safe diagnostic status:

```json
{
  "ok": true,
  "checks": {
    "database": "ok",
    "migrations": "ok",
    "installTable": "ok",
    "functions": "ok",
    "moduleRegistry": "ok",
    "bootstrapWritable": "ok"
  }
}
```

If any check fails, return useful JSON with nextAction.

Do not throw raw 500 responses without a useful message.

### Install Status Must Be Safe

`/api/install-status` must tolerate:

- missing database
- missing migration tables
- missing platform_installation table
- empty database
- partially applied migrations
- missing bootstrap file
- missing module registry
- function errors

In all uncertain cases, return:

```json
{
  "ok": true,
  "installed": false,
  "needsInstall": true,
  "safeMode": true
}
```

Do not crash.

### Recovery Route

Create:

```txt
/install/recovery
```

Recovery mode should work even if normal installer state fails.

Show:

- install status
- database status
- migration status
- environment status
- module registry status
- bootstrap status
- last installer error
- resume installation button
- rebuild installer state button
- retry health check button

### Retry and Safe Mode

If the installer cannot fully load:

- enter safe mode
- disable optional steps
- allow required setup to continue where possible
- clearly show which systems are unavailable

Safe mode must still allow the owner to:

- review health checks
- retry
- resume setup
- open recovery
- copy diagnostic report

### Finish Install Must Not White Page

When clicking Finish Install:

- disable button
- show progress steps
- show success or exact failure
- never leave the user on a blank page

Progress example:

```txt
Finalizing installation...

✓ Company settings saved
✓ Owner account verified
✓ Roles seeded
✓ Modules enabled
✓ Bootstrap generated
✓ Installation marked complete

Redirecting to dashboard...
```

If failure:

```txt
Installation could not finish.

Missing:
- Owner account

[Go to Owner Account Step]
[Retry Finish Install]
[Open Recovery]
```

### API Error Format

All install APIs must return standard JSON.

Success:

```json
{
  "ok": true,
  "data": {}
}
```

Failure:

```json
{
  "ok": false,
  "code": "INSTALL_HEALTH_FAILED",
  "message": "The install table could not be created.",
  "nextAction": "Open recovery mode"
}
```

Do not return HTML error pages to installer JS.

Do not return empty response bodies.

### Asset and Routing Checks

The build must verify:

- `/install/index.html` exists
- installer JS bundle exists
- installer CSS exists
- `/api/install-status` route exists
- `/api/install/health` route exists
- `/install/recovery` exists
- Netlify redirects do not redirect `/install/` back to `/`
- install guard does not block installer assets

### Common Causes to Guard Against

The plan must prevent:

- install guard redirect loop
- missing installer JS
- wrong asset path
- `/api/install-status` 500 error
- missing database table crash
- module registry missing crash
- bootstrap JSON missing crash
- theme script crash
- environment status crash
- finish install silent failure
- CORS or redirect issue on Netlify functions
- public shell trying to render before installer shell exists

### Diagnostics Copy Button

Every installer error screen should include:

```txt
Copy Diagnostic Report
```

The report should include:

- current URL
- browser user agent
- install step
- install status response
- health response
- last safe error message
- missing routes/assets
- timestamp

Never include secrets.

### Installer White Page Acceptance Tests

- Visiting `/install/` always shows visible UI.
- Missing database does not cause white page.
- Missing `platform_installation` table does not cause white page.
- `/api/install-status` failure shows recovery UI.
- Missing module registry shows recovery UI.
- Missing bootstrap config shows recovery UI.
- JavaScript runtime error shows error boundary.
- Unhandled promise rejection shows error boundary.
- Finish Install failure shows clear error.
- Finish Install success marks install complete.
- Recovery route loads independently.
- No install route redirects into a loop.
- Build fails if installer assets are missing.

---


---

## 2.0H Installer Must Be Usable on First Visit — No White Page / No Blocked Setup

A fresh deployment must let the owner start installation immediately.

If first install currently shows a white page, that means the installer boot path is broken. This must be treated as a blocking launch issue.

### First Visit Requirement

When a user visits a new deployment for the first time:

```txt
/
```

the user must be redirected to:

```txt
/install/
```

and must see a visible installer screen within one second.

The installer must not depend on completed database setup, completed module registry, completed bootstrap config, completed theme config, or completed environment variable setup before it can render its first screen.

### Minimal Installer Shell

The `/install/` page must include a minimal static shell directly in HTML.

This shell must render without:

- database
- JavaScript bundle success
- module registry
- bootstrap JSON
- company settings
- theme settings
- API success

The shell should show:

```txt
Welcome to Setup

We’ll help you configure your company, owner account, theme, modules, and integrations.

[Start Setup]
[Run System Check]
[Recovery Mode]
```

Then JavaScript can enhance it into the full installer.

### Installer Assets Cannot Be Blocked

The install guard must never block:

- `/install/`
- `/install/index.html`
- `/install/recovery`
- installer CSS
- installer JS
- shared CSS required by installer
- shared JS required by installer
- `/api/install-status`
- `/api/install/health`
- `/api/install/*`

The build must test that installer assets load correctly.

### No Dependency on Bootstrap Before Install

Before install is complete, these files may be missing:

- `/config/bootstrap.json`
- module registry JSON
- homepage config
- theme config

The installer must still render.

If bootstrap is missing, use safe installer defaults.

### No Dependency on Module Registry Before Install

If the module registry has not been generated yet, the installer must still render earlier steps.

The Modules step can show:

```txt
Module registry is not ready yet.

[Rebuild Module Registry]
[Retry]
[Continue with Core Modules]
```

Do not crash.

### No Dependency on Theme Settings Before Install

If theme settings are missing, use built-in installer defaults:

```txt
mode = system
primary = #2563eb
accent = #f59e0b
background = system default
surface = system default
text = system default
```

Do not crash.

### Install API Must Always Return JSON

All install endpoints must return JSON, never blank bodies or HTML error pages.

Required endpoints:

```txt
GET /api/install-status
GET /api/install/health
GET /api/install/draft
POST /api/install/draft
POST /api/install/finish
```

If a database table is missing, return:

```json
{
  "ok": false,
  "needsInstall": true,
  "safeMode": true,
  "code": "INSTALL_TABLE_MISSING",
  "message": "The installation table is not ready yet. Setup can continue in recovery mode.",
  "nextAction": "Open recovery mode"
}
```

Do not throw an uncaught 500.

### White Page Recovery UI

If any installer JavaScript error happens, show:

```txt
Setup could not load completely.

This usually means one setup file, database table, or function route is missing.

[Retry Setup]
[Open Recovery Mode]
[Run System Check]
[Copy Diagnostic Report]
```

Never leave the user on a blank page.

### Recovery Mode Must Be Independent

`/install/recovery` must use its own minimal shell.

It should not depend on the full installer app.

Recovery mode should check:

- static installer files
- install-status endpoint
- install health endpoint
- database connection
- migrations
- platform_installation table
- module registry
- bootstrap config
- environment variable status

Then show exactly what is broken.

### Finish Install Must Complete or Explain Failure

Clicking Finish Install must call:

```txt
POST /api/install/finish
```

The UI must show progress and final result.

It must never silently fail.

If successful, it must:

- set `installation_complete = true`
- set `installed_at`
- set `installed_by_user_id`
- generate bootstrap config
- redirect to `/dashboard/`

If it fails, it must show the missing requirement and a button to go fix it.

### Build-Time Installer Verification

Add a build verification script:

```txt
npm run verify:installer
```

It must check:

- `/install/index.html` exists
- `/install/recovery/index.html` exists
- installer JS exists
- installer CSS exists
- install API functions exist
- install guard excludes installer routes
- netlify redirects do not create install loops
- fallback HTML exists
- installer can render without bootstrap config

Include this in:

```txt
npm run verify:all
```

### Acceptance Tests

- Fresh deployment does not show white page.
- `/install/` shows visible static shell even if APIs fail.
- `/install/recovery` loads independently.
- Missing database does not blank the installer.
- Missing bootstrap JSON does not blank the installer.
- Missing module registry does not blank the installer.
- Missing theme settings do not blank the installer.
- Install APIs return JSON errors.
- Install guard does not block installer assets.
- Finish Install either completes or shows exact failure.
- Build fails if installer fallback or install routes are missing.

---


---

## 2.0I Simplified Installer — Remove Environment Variables from Required Install Flow

The First-Run Installer must be simple and must not block installation because environment variables or optional integrations are missing.

The Environment Variables / Integrations step should NOT be part of the required first-run installer flow.

Environment variables should be moved to post-install System Center.

### Core Change

Remove Environment Variables / Integrations from the required installer wizard.

The installer should focus only on what a normal owner understands:

```txt
1. Welcome
2. Company Info
3. Branding / Logo
4. Theme
5. Owner Account
6. Services
7. Modules
8. Homepage Basics
9. Review
10. Finish
```

Do not ask the owner for OpenAI, Resend, Square, license server, SMTP, SerpAPI, or other advanced variables during first setup.

### Installer Must Not Require Environment Variables

Finish Install must not fail because these are missing:

```txt
OPENAI_API_KEY
RESEND_API_KEY
MAGIC_LINK_FROM_EMAIL
QUOTE_FROM_EMAIL
SERPAPI_API_KEY
SQUARE_ACCESS_TOKEN
SQUARE_LOCATION_ID
SQUARE_WEBHOOK_SIGNATURE_KEY
RECAPTCHA_SITE_KEY
RECAPTCHA_SECRET_KEY
LICENSE_VERIFY_URL
LICENSE_VERIFY_TOKEN
SMTP_HOST
SMTP_USER
SMTP_PASSWORD
GOOGLE_MAPS_API_KEY
SUPPLIER_API_KEY
```

Missing integrations should create warnings only.

They should not block setup.

### Required Setup for Finish Install

The only required items to finish installation are:

```txt
Company profile
Owner account
Theme settings
Basic homepage config
Module registry
Services/trades
```

SITE_URL may be auto-detected from the current domain.

If SITE_URL is missing, use:

```js
window.location.origin
```

or the request origin server-side.

Do not force the user to manually enter SITE_URL during first install.

### Email Without Resend

If RESEND_API_KEY or MAGIC_LINK_FROM_EMAIL is missing:

- installation should still finish
- dashboard should still work
- owner account should be created with setup session
- magic link email sending should be marked "Not configured"
- quote/invoice emailing should be disabled until configured
- UI should show "Email not configured yet"

Do not block installation.

### AI Without OpenAI

If OPENAI_API_KEY is missing:

- installation should still finish
- AI modules should install but show "AI not configured"
- AI Quote, AI Photo Estimate, and AI Troubleshooting should save requests for manual review
- no fake AI output
- no crash

### Payments Without Square

If Square variables are missing:

- installation should still finish
- invoices can still be created
- payments use manual payment tracking
- "Pay Online" remains disabled until Square is configured

### License Without License Server

If license variables are missing:

- installation should still finish
- license status defaults to `verification_disabled`
- future license validation remains inactive

### Post-Install Integrations Manager

Move all Environment Variable / Integration management to:

```txt
Owner → System Center → Environment & Integrations
```

This page should allow Owner to configure later:

```txt
Email / Resend
OpenAI
Square
reCAPTCHA
License Server
SerpAPI
SMTP
Google Maps
Supplier APIs
Storage/CDN
```

This page should still include:

- grouped tabs
- "Where do I find this?" links
- step-by-step help
- secure inputs
- test connection buttons
- configured/missing statuses
- safe last-four display only
- no secret exposure

### Installer Review Screen

The installer review screen should show integration warnings as optional:

```txt
Required:
✓ Company profile
✓ Owner account
✓ Theme
✓ Services
✓ Modules
✓ Homepage

Optional:
○ Email not configured — configure later in System Center
○ AI not configured — configure later in System Center
○ Square not configured — manual payment tracking enabled
○ License validation disabled
```

The Finish Install button must be enabled when required items are complete, even if all optional integrations are missing.

### Finish Install Endpoint

`POST /api/install/finish` must not validate optional integrations as required.

It should return success if required core setup is valid.

Success response:

```json
{
  "ok": true,
  "installationComplete": true,
  "warnings": [
    "Email is not configured yet.",
    "OpenAI is not configured yet.",
    "Square payments are not configured yet."
  ],
  "redirectTo": "/dashboard/"
}
```

Warnings should display on the final success screen, not block completion.

### Recovery Mode

Do not tell users "Setup can continue in recovery mode" unless there is an actual system failure.

Missing optional integrations are not recovery mode.

Bad:

```txt
Installation could not finish.
Missing:
Setup can continue in recovery mode.
```

Good:

```txt
Installation complete.

Optional integrations still need setup:
- Email
- AI
- Payments

You can configure these later in System Center.
```

### Acceptance Tests

- Installer no longer requires Environment Variables to finish.
- Finish Install succeeds with no OpenAI key.
- Finish Install succeeds with no Resend key.
- Finish Install succeeds with no Square keys.
- Finish Install succeeds with no license server.
- Missing integrations create warnings only.
- Finish Install sets `installation_complete = true`.
- Dashboard loads after install.
- System Center includes Environment & Integrations manager.
- AI modules show "AI not configured" instead of crashing.
- Email actions show "Email not configured" instead of crashing.
- Square payment actions show "Payments not configured" instead of crashing.
- Installer no longer shows confusing "Missing:" blank messages.
- Installer no longer sends user to recovery mode for optional missing integrations.

---
\n

---

## 2.0J Installer API Routes, Draft Saving, Better Simple UX, and Post-Install Business Ready Mode

This section is required because a simple installer is good, but it must still be complete, reliable, and useful.

The installer must not call missing API routes.

The installer must not repeatedly spam failed API requests.

The installer must not finish with unclear messages like:

```txt
Installation could not finish.
Missing:
Setup can continue in recovery mode.
```

That message is not acceptable because it does not tell the owner what is actually wrong.

### Required Install API Routes

These routes are mandatory and must exist before the installer is considered complete:

```txt
GET  /api/install-status
GET  /api/install/health
GET  /api/install/draft
POST /api/install/draft
POST /api/install/finish
```

None of these may return 404.

All must return JSON.

Do not return blank bodies.

Do not return HTML error pages.

Do not silently fail.

### Netlify Redirect Requirements

`netlify.toml` must map these browser routes to Netlify Functions.

Either use separate functions:

```txt
/api/install-status  -> /.netlify/functions/install-status
/api/install/health  -> /.netlify/functions/install-health
/api/install/draft   -> /.netlify/functions/install-draft
/api/install/finish  -> /.netlify/functions/install-finish
```

or use one dispatcher:

```txt
/api/install/*       -> /.netlify/functions/install-api
/api/install-status  -> /.netlify/functions/install-status
```

The browser-facing routes must work exactly as written.

### Install Draft Endpoint

`/api/install/draft` must support both GET and POST.

GET should return the current installer draft.

If no draft exists, return a safe default draft:

```json
{
  "ok": true,
  "draft": {
    "currentStep": "welcome",
    "company": {},
    "branding": {},
    "theme": {
      "mode": "system"
    },
    "owner": {},
    "services": [],
    "modules": [],
    "homepage": {},
    "completedSteps": [],
    "skippedOptionalSteps": []
  }
}
```

POST should save:

- current step
- company info
- branding
- logo metadata
- theme settings
- owner account info
- services/trades
- selected modules
- homepage basics
- skipped optional steps
- completed steps
- timestamps

If the database or draft table is missing, return a useful JSON error and enter safe mode.

Do not crash.

### Autosave Rules

The installer may autosave, but it must not spam the API.

Autosave must be debounced.

Minimum debounce:

```txt
800ms to 1500ms after user stops typing
```

Failed autosave should not retry in a tight loop.

After a failure:

- show one visible warning
- stop automatic retries
- provide manual Retry Save button
- continue allowing the user to work locally if possible

### Finish Install Endpoint

`POST /api/install/finish` must validate only required core setup.

Required:

```txt
Company profile
Owner account
Theme settings
Basic homepage config
Module registry
Services/trades
```

Not required:

```txt
OpenAI
Resend
Square
License server
SMTP
SerpAPI
reCAPTCHA
Google Maps
Supplier APIs
External storage/CDN
```

Missing optional integrations produce warnings only.

They never block Finish Install.

### Finish Install Success Response

```json
{
  "ok": true,
  "installationComplete": true,
  "warnings": [
    "Email is not configured yet.",
    "AI is not configured yet.",
    "Square payments are not configured yet."
  ],
  "redirectTo": "/dashboard/"
}
```

### Finish Install Failure Response

```json
{
  "ok": false,
  "code": "INSTALL_VALIDATION_FAILED",
  "message": "Owner account is missing.",
  "missing": ["owner_account"],
  "goToStep": "owner"
}
```

The frontend must display the actual missing item and provide a button to return to the correct step.

Never show a blank `Missing:` list.

Never send the user to recovery mode for optional missing integrations.

Recovery mode is only for real system failures such as missing routes, database problems, or broken installer assets.

### Better Simple Installer UX

The installer should remain simple, but it should not be too empty or vague.

Use this installer flow:

```txt
1. Welcome
2. Company
3. Branding
4. Theme
5. Owner Account
6. Services
7. Modules
8. Homepage
9. Review
10. Finish
```

Each step must include:

- step title
- plain-English explanation
- why this matters
- required fields
- optional fields
- Save & Continue
- Back
- progress indicator
- help panel or example preview

Example:

```txt
Step 3 of 10 — Branding

Upload your logo and choose how your company appears across the website,
dashboard, quotes, invoices, and client portal.
```

### Review Step

The Review step must clearly separate required and optional setup.

Required checklist:

```txt
✓ Company profile
✓ Branding
✓ Theme
✓ Owner account
✓ Services
✓ Modules
✓ Homepage basics
```

Optional checklist:

```txt
○ Email not configured — configure later in System Center
○ AI not configured — configure later in System Center
○ Square not configured — manual payment tracking enabled
○ License validation disabled
```

The Finish Install button must be enabled when required setup is complete even if every optional integration is missing.

### Post-Install Business Ready Mode

After Finish Install, the owner should not land in an empty or confusing dashboard.

Immediately after installation:

```txt
Redirect to /dashboard/
Show: Welcome to Your New Business Platform
```

The first dashboard screen should include:

- Quick Start Checklist
- Business Health Status
- Setup Progress
- Recommended Next Actions
- Button to open System Center
- Button to view homepage
- Button to create first quote/request/work order

### Quick Start Checklist

Show:

```txt
□ Upload company logo
□ Confirm services
□ Configure email sending
□ Configure AI tools
□ Configure online payments
□ Add first employee
□ Add first client
□ Create first request
□ Create first quote
□ Create first work order
□ Publish homepage
```

Checklist updates automatically as items are completed.

### Sample Data Mode

Installer should offer optional sample data.

Options:

```txt
No sample data
Demo clients
Demo work orders
Demo quotes
Demo invoices
Full demo environment
```

Sample data must be clearly marked as demo.

Owner must be able to remove sample data later.

### Empty State UX Rules

No module should ever show only:

```txt
No data
```

Every empty state must include:

- friendly explanation
- primary action button
- secondary help/action link

Examples:

```txt
No work orders yet.
Create your first work order or convert an accepted quote.

[Create Work Order]
[Learn how work orders work]
```

```txt
No quotes yet.
Create your first quote or generate one from a customer request.

[Create Quote]
[Create Customer Request]
```

### Dashboard Bootstrap After Install

Immediately after install, create:

- default dashboard layout
- default widgets
- default navigation
- default homepage sections
- default module cards
- default empty state actions

The product should feel usable immediately.

### First Workflow Wizard

Add an optional first workflow wizard:

```txt
Create Client
→ Create Request
→ Create Quote
→ Approve Quote
→ Create Work Order
→ Complete Work Order
→ Create Invoice
→ Mark Paid
```

This helps the owner test that the platform works end-to-end.

### Installer API Verification

Add:

```txt
npm run verify:installer
```

This must check:

- `/install/index.html` exists
- `/install/recovery/index.html` exists
- installer JS exists
- installer CSS exists
- install API functions exist
- install redirects exist
- `/api/install-status` does not 404
- `/api/install/health` does not 404
- `/api/install/draft` does not 404
- `/api/install/finish` does not 404
- install guard does not block installer assets
- installer fallback HTML exists

Also include this in:

```txt
npm run verify:all
```

### Platform Health Integration

Missing required install API routes must appear in:

```txt
Owner → System Center → Platform Health
```

Example:

```txt
Installer API
/api/install/draft — Missing
/api/install/finish — Missing
```

### Acceptance Tests

- `/api/install/draft` exists.
- `/api/install/finish` exists.
- No install API route returns 404.
- Installer autosave is debounced.
- Installer does not spam failed API calls.
- Finish Install works with optional integrations missing.
- Finish Install sets `installation_complete = true`.
- Finish Install generates bootstrap config.
- Finish Install redirects to dashboard.
- Installer never shows blank `Missing:` messages.
- Installer only uses recovery mode for real system failures.
- Dashboard is usable immediately after install.
- No module opens to a blank screen.
- Empty states contain action buttons.
- Quick Start Checklist appears after install.
- Sample data can be created and removed.
- First Workflow Wizard works.
- Missing installer APIs fail `npm run verify:installer`.
- Missing installer APIs fail `npm run verify:all`.

---

## 2A. Full First-Run Installer and Setup Process

The rebuilt platform must include a complete first-run installer. The installer is not optional. A new deployment should not require manual DB edits, hardcoded company branding, hardcoded owner accounts, or hidden setup steps.

The installer must work with the same environment:

```txt
Static frontend
Netlify Functions
Netlify Database
Netlify Identity not required
Magic link auth
Square optional
OpenAI optional but supported
SERPAPI optional
Resend optional
```

### 2A.1 Installer Goals

The installer should guide an owner through every required configuration step for selling or deploying the website/platform to a new business.

The installer must create:

- company profile
- branding
- public homepage settings
- owner account
- default roles
- default permissions
- enabled modules
- service categories
- estimate defaults
- AI settings
- Square payment settings placeholder
- email settings placeholder
- license key placeholder
- module registry seed
- homepage editor config
- theme config
- public bootstrap cache

No deployment should launch with public placeholder text like:

- Replace before production
- Loading job photos
- Demo only
- Fallback path
- Placeholder contact details

If data is missing, public pages should either hide that field or show a polished neutral fallback.

### 2A.2 Installer Route

Keep or rebuild:

```txt
/install/
/api/install
/api/install-status
```

Installer must check whether installation is complete.

If incomplete:

- public homepage may show a setup-safe landing page
- dashboard should redirect to installer
- login should allow owner setup only

If complete:

- /install/ should show installed status and require owner authentication to modify setup

### 2A.3 Installer Steps

The installer should be a polished multi-step wizard:

```txt
Step 1: Welcome / System Check
Step 2: Environment Variables / Integrations
Step 3: License Key / Future Activation
Step 4: Company Profile
Step 5: Branding and Logo
Step 6: Theme and Sidebar Colors
Step 7: Owner Account
Step 8: Roles and Permissions
Step 9: Modules
Step 10: Services and Trades
Step 11: Homepage Content
Step 12: AI Settings
Step 13: Email Settings
Step 14: Payments / Square Settings
Step 15: Public Portal Settings
Step 16: Review and Finish
```

Each step must save safely as a draft so refreshing the page does not lose progress.

### 2A.4 Step 1 — System Check

Show:

- Netlify Database connected yes/no
- required tables exist yes/no
- migrations valid yes/no
- functions reachable yes/no
- publish/output path valid yes/no
- OpenAI key configured yes/no
- Resend key configured yes/no
- Square credentials configured yes/no
- SERPAPI configured yes/no
- file/photo storage configured yes/no

Do not block setup for optional services.

Block only if database or required core functions are unavailable.

### 2A.5 Step 2 — License Key / Future Activation

Add a license key area now even if license verification is inactive. This matters because the system may be sold as a white-label website/platform later.

Fields:

```txt
License Key
License Status
License Holder
License Plan
License Expires At
License Validation Enabled
License Verification URL
License Last Checked At
License Error
```

Default behavior:

```txt
license_validation_enabled = false
license_status = 'verification_disabled'
```

The installer must NOT block setup while license validation is disabled.

Future behavior when enabled:

- server-side function verifies license key
- POST to external license server
- never expose verification token to browser
- cache license result
- allow grace period if license server is down
- owner/admin sees license status
- expired/revoked license can disable updates or non-core modules later

Suggested environment variables:

```txt
LICENSE_VERIFY_URL
LICENSE_VERIFY_TOKEN
LICENSE_PRODUCT_ID
LICENSE_GRACE_DAYS
```

Suggested DB table:

```sql
platform_license_settings (
  id text primary key default 'default',
  license_key text,
  license_status text not null default 'verification_disabled',
  license_plan text,
  license_holder text,
  license_expires_at timestamptz,
  validation_enabled boolean not null default false,
  verification_provider text,
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Also mirror basic status into company/platform settings for fast UI display.

### 2A.6 Step 3 — Company Profile

Fields:

- company name
- display name
- legal name
- phone
- support email
- quote email
- website URL
- address
- city
- state
- zip
- service area
- timezone
- license number
- business hours
- emergency service enabled yes/no

### 2A.7 Step 4 — Branding and Logo

Fields:

- logo upload
- favicon upload
- fallback initials
- show company name in header
- hero logo size
- public logo placement
- dashboard logo placement

Must reserve logo dimensions to avoid layout shift.

### 2A.8 Step 5 — Theme and Sidebar Colors

Fields:

- Light / Dark / System
- primary color
- accent color
- button color
- background color
- surface color
- text color
- custom sidebar colors enabled
- sidebar background
- sidebar text
- sidebar active
- sidebar hover
- custom mobile nav colors enabled
- mobile nav background
- mobile nav active

System mode must follow OS. Branding save must not force light mode.

### 2A.9 Step 6 — Owner Account

Create first owner account.

Fields:

- full name
- email
- phone
- role owner

Use magic link or secure setup token.

Do not create duplicate owner users.

### 2A.10 Step 7 — Roles and Permissions

Seed default roles:

```txt
owner
admin
manager
worker
client
```

Owner has all permissions.

Admin/manager cannot grant permissions they do not have.

Role hierarchy must be enforced server-side and UI-side.

### 2A.11 Step 8 — Modules

Installer must show the discovered module registry.

Owner can enable/disable modules during install.

The module list must come from discovered module manifests, not hardcoded arrays.

Show:

- module name
- module version
- workspace support
- required permissions
- dependencies
- install status
- migration status
- enabled yes/no

### 2A.12 Step 9 — Services and Trades

Seed editable services but do not hardcode them permanently.

Default services:

- HVAC
- Water Heaters
- Plumbing
- Electrical
- Drywall
- Painting
- Doors
- Windows
- Appliances
- Handyman
- Facilities Maintenance
- Property Maintenance
- Commercial Maintenance
- General Contracting
- Tenant Improvements
- Other / Not Sure

Do not include Roofing or Flooring unless owner adds them.

### 2A.13 Step 10 — Homepage Content

Create homepage editor configuration:

- hero
- AI estimate preview card
- services
- projects
- how it works
- about
- contact
- footer
- section visibility
- section order

All public content must remain editor-driven.

### 2A.14 Step 11 — AI Settings

Fields:

- OpenAI enabled
- quote model
- photo estimate model
- troubleshooting model
- web search enabled
- fallback mode
- max timeout
- usage logging enabled
- staff debug enabled

Defaults:

```txt
OPENAI_PHOTO_ESTIMATE_MODEL = gpt-5.5 or latest configured vision model
OPENAI_QUOTE_MODEL = gpt-5.5 or latest configured model
OPENAI_TROUBLESHOOTING_MODEL = gpt-5.5 or latest configured model
```

If OpenAI is not configured, modules should save requests for manual review and clearly show AI unavailable.

### 2A.15 Step 12 — Email Settings

Fields:

- magic link from email
- quote from email
- support email
- Resend configured yes/no
- test email button

### 2A.16 Step 13 — Payments / Square Settings

Fields/status:

- Square enabled
- environment sandbox/production
- location ID configured yes/no
- webhook configured yes/no
- payment links enabled
- manual payment verification fallback

Never expose Square access token in browser.

### 2A.17 Step 14 — Public Portal Settings

Configure:

- client portal headline
- portal subheadline
- portal feature list
- first-time account setup behavior
- public quote view enabled
- public invoice view enabled
- client upload enabled

### 2A.18 Step 15 — Review and Finish

Before finishing, validate:

- owner account exists
- company settings saved
- theme saved
- module registry seeded
- homepage config saved
- service categories saved
- install status complete
- public bootstrap generated

Then set:

```txt
installation_complete = true
installed_at = now()
installed_by_user_id = owner id
```

Generate `/config/bootstrap.json`.

---

## 2B. Installer Acceptance Criteria

The full installer is complete when:

- Fresh deployment redirects to installer.
- Fresh deployment redirects to installer before showing homepage.
- Homepage cannot be viewed before install completion.
- Dashboard/login/portal/quote/invoice routes redirect to installer before install completion.
- Installer has Environment Variables / Integrations step.
- Owner can enter missing required/optional environment variables during install.
- Secrets are stored only in Netlify env, encrypted server-side storage, or future secret manager.
- Secrets are never exposed to frontend, bootstrap config, localStorage, sessionStorage, or logs.
- Installer shows system check.
- License key area exists and is inactive by default.
- Company profile saves.
- Branding saves.
- Theme saves.
- Sidebar color settings save.
- Owner account is created.
- Default roles are created.
- Default permissions are created.
- Module registry is seeded from manifests.
- Services are editable.
- Homepage config is created.
- AI settings are saved.
- Email/payment placeholders are saved.
- Install can complete without optional API keys.
- Public site no longer shows setup placeholders.
- Dashboard loads with owner workspace.
- Bootstrap cache makes logo/theme/company load fast.

---

## 3. Non-Negotiable Rules

### 3.1 Migration Rules

Applied migrations are immutable. Once a migration has been deployed, never:

- rename it
- edit it
- move its SQL body to another number
- reuse its number
- change formatting, comments, whitespace, or line endings

Future schema changes must go into the next available migration number.

The project already had a migration identity problem where migration number `0048` was reused. The new system must prevent this forever.

Add or improve migration validation so it detects:

- duplicate migration numbers
- changed applied migration checksums
- migration bodies moved to different numbers
- missing applied migrations
- CRLF/BOM/line-ending problems
- reused numbers from Git history where possible

### 3.2 Drop-In Module Rules

A module must be installable by adding a folder like:

```txt
modules/ai-photo-estimate/
  module.json
  frontend/module.html
  frontend/module.css
  frontend/module.js
  backend/functions/*.mjs
  migrations/*.sql
  permissions.json
  workflows.json
  README.md
```

After the folder is added, the build system should discover it and make it available in Module Manager. No manual edits should be required in:

- dashboard-router.js
- sidebar code
- mobile nav code
- module manager default list
- permissions UI
- homepage editor core
- workflow state list
- Netlify redirects for every route

### 3.3 Design System Rules

All pages and modules must use the shared design system. No module should ship its own unrelated design language.

Never use hardcoded values like:

```css
background: white;
background: #fff;
color: #000;
```

Use variables:

```css
var(--color-background)
var(--color-surface)
var(--color-text)
var(--color-border)
var(--primary)
var(--accent)
```

### 3.4 Workflow Rules

All status changes must go through a shared workflow engine. No endpoint should directly mutate a status without using the workflow service.

### 3.5 AI Rules

All AI features must use one shared server-side AI service. No OpenAI API keys in the browser. No fake AI analysis. Debug should be staff-only.

---

## 4. Current Project Observations

The current router still contains hardcoded dashboard definitions by workspace. This should be replaced by module manifests and a generated registry.

The current module loader is a good start. It loads `module.html`, `module.css`, and `module.js`, then expects the JS to register a mount function. Keep this idea but turn it into a strict module runtime.

The current `admin-modules.mjs` has a hardcoded `DEFAULT_MODULES` list. This should be generated from module manifests instead.

The theme system already supports light/dark/system, CSS variables, sidebar colors, mobile nav colors, and public config caching. Keep it and make it stricter.

The public config cache already exists through `ta_public_config_v1`, `/config/bootstrap.json`, and `/api/public-config`. Keep and expand this.

The workflow state helper already defines active/history status groups. Move that source of truth server-side and generate frontend constants from it.

The current homepage is already moving toward editor-driven sections. Finish this and make all public sections editable through Homepage Editor.

---

## 5. Target Folder Structure

Recommended structure:

```txt
/
  public/
    index.html
    login/
    account-setup/
    thank-you/
    quote/
    invoice/
    dashboard/
    assets/
      css/
        base.css
        design-system.css
        public.css
        dashboard.css
      js/
        core/
          api-client.js
          config-client.js
          theme-client.js
          auth-client.js
          event-bus.js
          module-runtime.js
          workflow-client.js
        public/
          public-shell.js
          homepage-renderer.js
          request-estimate.js
        dashboard/
          dashboard-app.js
          dashboard-router.js
          dashboard-nav.js
          module-host.js
        ui/
          components.js
          form-utils.js
          file-upload.js
          money.js
          dates.js
          toast.js
          modal.js
  modules/
    estimate-quote-center/
    ai-photo-estimate/
    ai-troubleshooting/
    work-orders/
    schedule/
    inventory/
    invoices/
    finance/
    customers/
    users-permissions/
    theme-manager/
    homepage-editor/
    module-manager/
    reports/
    maintenance-plans/
  netlify/
    functions/
      core/
      modules/
      shared/
    database/
      migrations/
  scripts/
    discover-modules.mjs
    generate-module-registry.mjs
    generate-bootstrap-config.mjs
    create-migration.mjs
    prebuild-netlify-migrations.cjs
    build-static-site.mjs
    check-netlify-functions.mjs
    ensure-netlify-out.mjs
    verify-all.mjs
  tests/
  PLAN.md
```

---

## 6. True Drop-In Module System

### 6.1 Module Manifest

Every module must include `module.json`.

Example:

```json
{
  "schemaVersion": 1,
  "id": "ai-photo-estimate",
  "title": "AI Photo Estimate",
  "description": "Photo-based AI intake and estimating workflow.",
  "version": "1.0.0",
  "category": "Operations",
  "icon": "📸",
  "enabledByDefault": true,
  "workspaces": ["owner", "admin", "manager", "worker", "client"],
  "nav": {
    "showInSidebar": true,
    "showInMobileNav": true,
    "label": "AI Photo Estimate",
    "mobileLabel": "Photo AI",
    "sortOrder": 20
  },
  "frontend": {
    "basePath": "/modules/ai-photo-estimate/frontend",
    "entry": "module.js",
    "html": "module.html",
    "css": "module.css",
    "registerId": "ai-photo-estimate"
  },
  "backend": {
    "functions": [
      {
        "name": "ai-photo-estimate",
        "method": ["POST"],
        "route": "/api/modules/ai-photo-estimate/analyze",
        "file": "backend/functions/ai-photo-estimate.mjs"
      }
    ]
  },
  "permissions": [
    {
      "key": "ai.photo-estimate.use",
      "label": "Use AI Photo Estimate",
      "defaultRoles": ["owner", "admin", "manager", "worker", "client"]
    },
    {
      "key": "ai.photo-estimate.manage",
      "label": "Manage AI Photo Estimates",
      "defaultRoles": ["owner", "admin", "manager"]
    }
  ],
  "dependencies": ["customers", "estimate-quote-center"],
  "workflowEvents": ["photo:uploaded", "photo:analyzed", "quote:draft-created"],
  "settings": {
    "allowClientUse": true,
    "allowWorkerUse": true,
    "requiresOpenAI": true
  }
}
```

### 6.2 Module Discovery Script

Create `scripts/discover-modules.mjs`.

It must:

1. scan `modules/*/module.json`
2. validate schema
3. verify declared frontend files exist
4. verify declared backend files exist
5. verify migrations use unused numbers
6. verify permissions are unique
7. verify dependencies reference known modules
8. generate `public/config/module-manifest.json`
9. generate `netlify/generated/module-registry.json`
10. fail build on invalid module definitions

### 6.3 Generated Registry

Generated registry should contain:

```json
{
  "generatedAt": "ISO_DATE",
  "modules": []
}
```

This generated registry becomes the source for:

- Module Manager
- Dashboard Router
- sidebar nav
- mobile nav
- permissions UI
- module health checks
- API dispatcher

### 6.4 Dashboard Runtime

Dashboard boot should do:

```txt
load /api/dashboard-bootstrap
get user/company/theme/modules/permissions
filter modules by role/workspace/permissions/enabled
render sidebar/mobile nav
load selected module
```

No hardcoded workspace/module definitions in router.

### 6.5 Frontend Module Contract

Every module registers:

```js
window.TAModules.register({
  id: "ai-photo-estimate",
  version: "1.0.0",
  async mount(context) {},
  async unmount(context) {},
  async refresh(context) {},
  getActions(context) {}
});
```

Context includes:

```js
{
  root,
  api,
  auth,
  user,
  company,
  permissions,
  workspace,
  module,
  router,
  workflow,
  eventBus,
  ui,
  config,
  signal
}
```

All modules must use `context.root`. No more `root.querySelector is not a function` issues.

### 6.6 Module Manager

Module Manager should display only real drop-in modules.

Show:

- module title
- icon
- version
- category
- description
- workspaces
- enabled/disabled
- required permissions
- dependencies
- frontend status
- backend status
- last loaded status
- migration status
- enable/disable toggle
- workspace visibility

Do not show API endpoints, internal actions, detail panels, or helper routes.

---

## 7. Modular Backend API

### 7.1 Problem

The current `netlify.toml` manually maps many API routes. This does not scale for drop-in modules.

### 7.2 Solution: Module API Dispatcher

Create:

```txt
netlify/functions/module-api.mjs
```

Add one redirect:

```toml
[[redirects]]
  from = "/api/modules/*"
  to = "/.netlify/functions/module-api"
  status = 200
```

The dispatcher should:

1. parse module id and action
2. load generated module API registry
3. validate method
4. authenticate user
5. enforce permissions
6. load database
7. call the module handler
8. return standard JSON

Keep old routes as compatibility shims until all modules are migrated.

### 7.3 API Handler Contract

Each module handler exports:

```js
export const route = {
  method: ["GET", "POST", "PATCH"],
  path: "/records",
  permission: "module.permission.key"
};

export default async function handler(request, context) {
  return context.json(200, { ok: true });
}
```

### 7.4 Standard API Responses

Success:

```json
{
  "ok": true,
  "data": {},
  "message": "Saved."
}
```

Error:

```json
{
  "ok": false,
  "code": "VALIDATION_ERROR",
  "message": "Missing required field: workOrderId",
  "field": "workOrderId",
  "missing": ["workOrderId"]
}
```

No more silent 422/405/500 errors.

---

## 8. Database Plan

### 8.1 Core Tables

Target core tables:

```txt
app_users
roles
permissions
role_permissions
user_roles
workspace_access
customers
customer_properties
job_requests
quotes
quote_line_items
work_orders
work_order_assignments
work_order_updates
work_order_materials
inventory_items
inventory_transactions
invoices
payments
uploaded_files
photo_estimates
ai_runs
module_registry
module_settings
homepage_settings
homepage_projects
company_settings
audit_logs
```

### 8.2 Migration Helper

Add:

```txt
scripts/create-migration.mjs
```

Usage:

```bash
node scripts/create-migration.mjs homepage_project_cards
```

It should create the next available migration file and prevent number reuse.

### 8.3 Migration Lock

Add:

```txt
netlify/database/migration-lock.json
```

This stores known checksums for applied migrations.

Validation should fail if any locked migration changes.

---

## 9. Auth and Account Setup

### 9.1 Magic Link Flow

Support new users.

Flow:

```txt
email entered
magic link sent
link clicked
existing user => login
new user => pending user/session
account setup page
client role assigned
client workspace assigned
portal opens
```

### 9.2 Account Setup Fields

Required:

- full name
- email locked
- phone
- contact permission

Optional:

- company
- property address
- preferred contact method
- notes

### 9.3 Link Old Requests

When account is created, link records by normalized email:

- customers
- job requests
- quotes
- invoices
- work orders
- uploaded files
- photo estimates

No duplicate users for same email.

---

## 10. Users, Roles, Permissions

### 10.1 Role Hierarchy

Roles:

```txt
owner
admin
manager
worker
client
```

Rules:

- Owner can do everything.
- Last owner cannot be removed.
- Admin cannot grant permissions they do not have.
- Admin cannot make themselves owner.
- Manager can only manage worker/client if permitted.
- Worker/client cannot access user/role management.

### 10.2 Permission Registration

Modules register permissions in their manifests.

Permission example:

```json
{
  "key": "work-orders.assign",
  "label": "Assign work orders",
  "group": "Work Orders",
  "defaultRoles": ["owner", "admin", "manager"]
}
```

### 10.3 User Editor Must Save

Save:

- full name
- email
- phone
- roles
- workspace access
- active/inactive
- worker/client classification
- notes

### 10.4 Role Editor Must Save

Save:

- role name
- description
- permissions
- workspace access
- default view
- custom roles

---


---

## 10A. Owner Super User / Testing Architecture

The Owner role is a special platform role and acts as the platform Super User.

The Owner is intended for:

- platform administration,
- company administration,
- white-label setup,
- module testing,
- workflow testing,
- theme testing,
- homepage testing,
- installer testing,
- support and troubleshooting.

### Owner Workspace Access

The Owner must automatically have access to ALL workspace views without requiring multiple accounts.

Available workspace previews:

```txt
Owner
Admin
Manager
Worker
Client
Public Homepage
Public Portal
Public Quote View
Public Invoice View
```

The Owner should switch between views from a workspace selector.

Switching views should simulate the UI and permission context without requiring logout.

### Impersonation Mode

The Owner may impersonate any user account.

When impersonating:

- display a visible banner,
- show impersonated user name and role,
- provide Exit Impersonation,
- audit log the action,
- never allow accidental hidden impersonation.

Example banner:

```txt
Viewing as Sarah Jones (Client)
[Exit Impersonation]
```

Example audit log:

```txt
Owner Thomas impersonated Client Sarah Jones.
```

### Owner Permission Rules

The Owner bypasses all module permission restrictions.

Owner automatically has access to:

- Installer,
- Homepage Editor,
- Theme Manager,
- Module Manager,
- System Center,
- Environment & Integrations,
- License Manager,
- AI Settings,
- AI Photo Estimate,
- AI Quote,
- AI Troubleshooting,
- Dashboard,
- Inventory,
- Work Orders,
- Schedule,
- Finance,
- Invoices,
- Client Portal,
- Worker Portal,
- Reports,
- Analytics,
- Audit Logs.

No module may hide itself from Owner.

### Drop-In Module Testing

Every newly discovered drop-in module must automatically be visible to Owner, including:

- disabled modules,
- hidden modules,
- experimental modules,
- beta modules.

Owner should have testing toggles:

```txt
Show Beta Modules
Show Hidden Modules
Show Disabled Modules
Show Experimental Modules
```

### Workflow Simulation

Owner must be able to simulate:

```txt
Request
→ Quote
→ Accept
→ Work Order
→ Assign Worker
→ Schedule
→ Complete
→ Invoice
→ Payment
→ Verify
→ Archive
```

without requiring multiple real accounts.

### Owner Acceptance Criteria

- Owner can view every workspace.
- Owner can impersonate any user.
- Owner automatically sees all dropped-in modules.
- Owner bypasses permission restrictions.
- Owner can test complete workflows.
- Impersonation actions are audit logged.
- Owner can exit impersonation safely.

---

## 11. Workflow Engine

### 11.1 Canonical Statuses

```txt
request_new
request_info_needed
quote_draft
quote_sent
quote_changes_requested
quote_declined
quote_accepted
quote_converted
work_order_created
waiting_assignment
assigned
scheduled
in_progress
worker_completed
admin_review
client_review
invoice_ready
invoice_sent
invoiced
payment_pending
paid
payment_verified
closed
archived
cancelled
completed
```

### 11.2 Backend Workflow Engine

Create:

```txt
netlify/functions/shared/workflow-engine.mjs
```

API:

```js
transition({ entityType, entityId, event, userId, metadata })
```

### 11.3 Workflow Events

```txt
request.created
quote.drafted
quote.sent
quote.accepted
quote.declined
quote.converted
workorder.created
workorder.assigned
workorder.scheduled
workorder.started
workorder.worker_completed
workorder.admin_approved
workorder.client_approved
invoice.created
invoice.sent
invoice.paid
payment.verified
workorder.closed
```

### 11.4 Side Effects

When quote accepted:

- quote status = quote_accepted
- quote converted = true
- work order created
- work order status = waiting_assignment
- quote leaves active quote queue

When worker completes:

- worker job leaves active list
- work order moves to admin_review
- completion photos are saved

When invoice paid/payment verified:

- invoice updated
- work order closed
- finance updates
- active lists refresh

### 11.5 Active/History Filters

Every list endpoint supports:

```txt
?view=active
?view=history
?view=all
```

Default is active.

Completed/paid/closed work orders must not appear active.

---

## 12. Public Website and Homepage Editor

### 12.1 Goal

The public website should feel like a premium contractor brand with a modern AI portal behind it.

It should not feel like a software demo or placeholder site.

### 12.2 Editor-Driven Homepage

Static code controls layout and rendering.

Homepage Editor controls content:

- hero
- trust cards
- AI estimate preview card
- services
- projects
- before/after images
- how it works
- about
- request estimate
- contact
- footer
- section order
- section visibility

### 12.3 Section Registry

Create homepage section registry:

```js
registerHomepageSection({
  key: "projects",
  title: "Projects",
  render(settings, context) {},
  editorPanel(settings, context) {},
  validate(settings) {}
});
```

Modules can register new homepage sections.

### 12.4 Services

Use grouped compact service tabs:

```txt
Home Systems
Interior Repairs
Property Support
```

Only show selected group by default.

Clicking service preselects the request form.

### 12.5 Projects

Use Projects, not Gallery.

If no public project images exist, hide the section publicly.

No fake placeholders. No loading text.

### 12.6 Request Estimate Wizard

Steps:

1. Need
2. Details
3. Photos
4. Contact
5. Review

Photo upload:

- drag/drop
- browse
- thumbnails
- remove
- up to 10 photos
- save metadata
- attach to request
- trigger AI photo analysis if enabled

### 12.7 Public Shell

Shared for:

- homepage
- login
- account setup
- thank-you
- public quote
- public invoice

All use same:

- header
- background
- theme
- glow effects
- cards
- buttons
- footer

---

## 13. Dashboard and Portal UX

### 13.1 Dashboard Shell

Use one premium dashboard shell:

- sidebar
- topbar
- workspace switcher
- module host
- mobile bottom nav
- modal root
- toast root

### 13.2 Client Portal

Client portal should feel like “My Project,” not an admin panel.

Show:

- current project cards
- timeline
- quote cards
- invoice cards
- photos
- simple actions

No admin-only debug data.

### 13.3 Worker Portal

Worker sees:

- active assigned jobs
- schedule
- job details
- before/after photos
- materials
- AI troubleshooting
- completion submit

Completed jobs leave active list.

---

## 14. AI System

### 14.1 Shared AI Service

Create:

```txt
netlify/functions/shared/ai-service.mjs
```

Handles:

- model selection
- OpenAI Responses API
- JSON schema
- image inputs
- web search config
- timeouts
- retries
- usage logging
- error normalization

### 14.2 Models

Environment variables:

```txt
OPENAI_API_KEY
OPENAI_MODEL
OPENAI_RESPONSES_MODEL
OPENAI_QUOTE_MODEL
OPENAI_PHOTO_ESTIMATE_MODEL
OPENAI_TROUBLESHOOTING_MODEL
```

Default to `gpt-5.5` or newest configured model.

### 14.3 AI Run Logging

Add table:

```txt
ai_runs
```

Fields:

- mode
- model
- user_id
- entity type/id
- input summary
- output json
- usage json
- status
- error
- timestamps

### 14.4 AI Quote

Must return structured labor/material/other pricing lines.

Must not show zero line items if pricing exists.

### 14.5 AI Troubleshooting

Inputs:

- make
- model
- error code
- symptoms
- photos optional

Output:

- likely cause
- tests
- parts
- safety notes
- confidence
- sources if web search used

### 14.6 AI Photo Estimate

Must:

- use uploaded photos
- call OpenAI vision server-side
- save analysis
- display results
- convert to quote

---

## 15. File and Photo Storage

### 15.1 Unified File Table

Use one table:

```txt
uploaded_files
```

Fields:

- id
- uploaded_by_user_id
- customer_id
- request_id
- quote_id
- work_order_id
- invoice_id
- photo_estimate_id
- file_url
- file_path
- file_name
- file_type
- file_size
- category
- visibility
- metadata
- ai_analysis
- created_at
- updated_at

### 15.2 Categories

```txt
request_photo
photo_estimate
before_photo
after_photo
completion_evidence
model_tag
material_receipt
invoice_attachment
homepage_project
logo
favicon
```

### 15.3 Visibility

```txt
admin_only
worker_visible
client_visible
public
```

---

## 16. Core Modules to Preserve

Convert these into drop-in modules:

1. Estimate & Quote Center
2. AI Photo Estimate
3. AI Troubleshooting
4. Work Orders
5. Schedule
6. Inventory
7. Invoices
8. Finance
9. Customers
10. Users / Company Management
11. Workspace & Permissions
12. Theme Manager
13. Homepage Editor
14. Module Manager
15. Reports
16. Maintenance Plans

---

## 17. Square Payments

Keep Square integration.

Flow:

```txt
client opens invoice
clicks Pay Invoice
server creates Square payment link
client pays on Square
webhook updates payment
invoice status updates
work order status updates
finance updates
admin verifies if needed
```

No Square secrets client-side.

---

## 18. Performance

### 18.1 Public Bootstrap

Keep and expand:

```txt
/config/bootstrap.json
/api/public-config
localStorage ta_public_config_v1
```

First paint should have:

- logo
- company name
- theme
- colors
- nav
- homepage summary

### 18.2 Dashboard Bootstrap

Add:

```txt
/api/dashboard-bootstrap
```

Returns:

- user
- company
- permissions
- modules
- theme
- workspace access
- quick counts

Avoid repeated settings calls.

### 18.3 Lazy Loading

Lazy load:

- modules
- gallery images
- AI panels
- heavy dashboard data

Use skeletons, not raw loading text.

---

## 19. Build Pipeline

New build order:

```txt
1. validate migrations
2. discover modules
3. generate module registry
4. generate public bootstrap
5. generate module API registry
6. build static site
7. verify functions
8. verify module assets
9. verify out directory
```

---

## 19A. Drop-In Module Build and Runtime Pipeline — Detailed Requirements

The current project still contains hardcoded module definitions in the dashboard router and default module arrays in backend module management. The rebuild must replace those with generated registries.

### 19A.1 Required Generated Files

The build system should generate these files from module manifests:

```txt
public/generated/module-registry.json
public/generated/module-routes.js
public/generated/module-permissions.json
public/generated/module-mobile-nav.json
public/generated/homepage-section-registry.json
netlify/generated/module-api-registry.mjs
netlify/generated/module-install-plan.json
netlify/generated/module-migrations.json
```

These generated files may be committed or produced during build, but core source files should not be hand-edited for new modules.

### 19A.2 Module Discovery Order

Build should discover modules from:

```txt
/modules/*/module.json
/public/dashboard/modules/*/*/module.json
/public/dashboard/modules/*/module.json
```

Preferred future structure:

```txt
/modules/{module-id}/
  module.json
  frontend/
    module.html
    module.css
    module.js
  backend/
    api.mjs
    handlers/*.mjs
  migrations/
    0001_init.sql
  permissions.json
  workflows.json
  homepage-sections.json
  tests/
  README.md
```

Legacy modules can be wrapped with a manifest until fully moved.

### 19A.3 Module Manifest Full Schema

Every module must define:

```json
{
  "id": "ai-photo-estimate",
  "version": "1.0.0",
  "name": "AI Photo Estimate",
  "description": "Photo-based estimating workflow.",
  "category": "Operations",
  "icon": "📸",
  "enabledByDefault": true,
  "workspaces": ["owner", "admin", "manager", "worker", "client"],
  "nav": {
    "showInSidebar": true,
    "showInMobile": true,
    "mobilePriority": 20,
    "label": "Photo AI"
  },
  "frontend": {
    "basePath": "/dashboard/modules/admin/photo-estimate",
    "html": "module.html",
    "css": "module.css",
    "js": "module.js",
    "registerId": "admin.photo-estimate",
    "mountContract": "context-v2"
  },
  "api": {
    "baseRoute": "/api/modules/ai-photo-estimate",
    "handler": "backend/api.mjs",
    "methods": ["GET", "POST", "PATCH", "DELETE"]
  },
  "permissions": [
    { "key": "ai.photo-estimate.use", "label": "Use AI Photo Estimate" },
    { "key": "ai.photo-estimate.manage", "label": "Manage AI Photo Estimate" }
  ],
  "dependencies": [],
  "events": {
    "emits": ["photo:uploaded", "photo:analyzed", "quote:draft-created"],
    "subscribes": ["request:created"]
  },
  "migrations": {
    "path": "migrations",
    "strategy": "prefix-with-global-next-number"
  },
  "settings": {
    "schema": {},
    "defaults": {}
  },
  "homepageSections": [],
  "install": {
    "required": false,
    "setupPanel": true
  }
}
```

### 19A.4 Module Lifecycle

Modules must support lifecycle hooks:

```js
export default {
  id: 'module-id',
  async install(context) {},
  async enable(context) {},
  async disable(context) {},
  async mount(context) {},
  async unmount(context) {},
  async healthCheck(context) {}
}
```

### 19A.5 Module Context

The dashboard must pass the same context to every module:

```js
{
  root,
  html,
  module,
  user,
  company,
  workspace,
  permissions,
  api,
  events,
  workflow,
  files,
  theme,
  router,
  toast,
  modal,
  refresh
}
```

`root` must always be a DOM element. This prevents `root.querySelector is not a function`.

### 19A.6 Module API Dispatcher

Avoid adding a new Netlify redirect for every module.

Use a single dispatcher route:

```txt
/api/modules/:moduleId/*
```

Netlify redirect:

```toml
[[redirects]]
  from = "/api/modules/*"
  to = "/.netlify/functions/module-dispatcher"
  status = 200
```

The dispatcher reads generated registry and calls the module handler.

### 19A.7 Module Permissions Auto-Registration

Module permissions should automatically appear in:

- Role Editor
- Workspace & Permissions Center
- User Editor
- Module Manager

No hardcoded permission list.

### 19A.8 Module Manager V2

Module Manager should display only true modules, not every setting page or internal feature.

For each module show:

- name
- version
- description
- status
- enabled/disabled
- installed/not installed
- health status
- required permissions
- dependencies
- workspaces
- API routes
- migrations applied
- latest error

### 19A.9 Module Install Safety

When module is dropped in:

- validate manifest schema
- validate frontend files exist
- validate backend handler exists if API declared
- validate permission keys are unique
- validate migrations do not reuse numbers
- validate dependencies exist
- validate no duplicate module ID
- validate no unsafe public secrets

If validation fails, build should fail with clear error.

---

## 20. Testing

Keep current tests and add:

```txt
test:module-discovery
test:module-drop-in
test:module-api-dispatcher
test:migration-identity
test:workflow-engine
test:homepage-editor-rendering
test:theme-no-hardcoded-white
test:public-bootstrap-cache
test:ai-service-contract
```

Create a fake test module and verify it is discovered, registered, routed, and disabled/enabled without core edits.

---

## 21. Security

### 21.1 Auth

- magic link tokens hashed
- session expiration
- session revocation
- HttpOnly cookies preferred
- no role escalation

### 21.2 APIs

- server-side permission checks
- validation for every mutation
- no secrets in browser
- clear error messages
- audit logs

### 21.3 Files

- file type validation
- file size limits
- visibility checks
- client only sees own/client-visible files
- worker only sees assigned work files

### 21.4 AI

- API key server-side only
- no chain-of-thought exposure
- usage logging
- timeout limits
- staff-only debug

---

## 22. Implementation Phases

### Phase 0 — Full Installer and Licensing Foundation

- document current install flow
- enforce installer-first installation lock
- build /api/install-status as single source of truth
- block homepage/dashboard/login/portal before install completion
- add Environment Variables / Integrations installer step
- add secure env status/save endpoints
- add encrypted server-side secret fallback
- create installer state model
- add license key setup area
- add license settings table/migration
- add license verification placeholder function
- add system check step
- add company setup step
- add owner account setup step
- add module discovery setup step
- add service setup step
- add homepage setup step
- generate public bootstrap at finish

### Phase 1 — Stabilize Current System

- stable deploy
- migration locks
- no Next plugin issue
- document current modules/endpoints
- verify current homepage/dashboard

### Phase 2 — Module Runtime V2

- module manifest schema
- discovery script
- generated registry
- module runtime
- module API dispatcher
- fake test module

### Phase 3 — Convert Existing Modules

Convert modules one at a time to manifests.

Start with:

1. Module Manager
2. Theme Manager
3. Homepage Editor
4. AI Photo Estimate
5. Estimate & Quote Center

Then convert the rest.

### Phase 4 — Workflow Engine

- backend workflow engine
- transition rules
- active/history filtering
- event bus refresh

### Phase 5 — Public Site / Homepage Editor V2

- shared public shell
- section registry
- request wizard
- projects/gallery
- portal page matching homepage

### Phase 6 — Shared AI Layer

- AI service
- AI run logging
- AI quote migration
- AI troubleshooting migration
- AI photo estimate migration

### Phase 7 — Performance

- public bootstrap
- dashboard bootstrap
- cache invalidation
- lazy loading
- skeletons

### Phase 8 — Final UX Audit

- full dark/light/system audit
- mobile audit
- dashboard polish
- client portal polish
- worker portal polish
- quote/invoice polish

---

## 23. Acceptance Criteria

The rebuild is complete when:

### Full Installer and Licensing

- Fresh deployment opens installer.
- Installer has complete setup wizard.
- License key area exists for future selling.
- License verification is inactive by default.
- License can later verify against external server.
- Owner account creation works.
- Company profile setup works.
- Branding/theme/sidebar setup works.
- Modules can be enabled during install.
- Services are seeded and editable.
- Homepage config is created.
- Public bootstrap is generated.
- Installation complete state is saved.

### Drop-In Modules

- Add module folder.
- Build discovers it.
- It appears in Module Manager.
- Enable/disable works.
- Permissions appear in role editor.
- Sidebar/mobile nav updates.
- API route works.
- No router edit required.

### Workflow

- Accepted quote creates work order.
- Accepted quote leaves active quote list.
- Worker completed job leaves worker active jobs.
- Paid/verified/closed work order leaves active work orders.
- Finance updates.
- Overview counts update.

### Public Site

- Homepage editor controls content.
- Login matches homepage.
- Request Estimate supports uploads.
- Projects hide when empty.
- No public placeholders.

### AI

- AI Quote works.
- AI Troubleshooting works.
- AI Photo Estimate works with photos.
- AI runs are logged.
- Debug is staff-only.

### Performance

- Logo/theme/company load instantly or from cache.
- No white flash in dark mode.
- Dashboard avoids duplicate config fetches.

### UX

- One design system.
- No hardcoded white cards.
- Mobile works.
- Desktop works.
- Empty/error/loading states are premium.

---

## 24. First Codex Prompt

Use this first:

```txt
Read PLAN.md completely.

Do not rebuild the entire app in one commit.

Start Phase 0 and Phase 1 only:

- document the full installer
- add license key placeholder architecture
- verify installer status behavior
- stabilize deploy
- lock migrations
- verify static Netlify build
- document current modules/endpoints
- create migration identity guard if missing
- confirm no Next plugin conflict

Return:
1. files changed
2. tests run
3. current module inventory
4. current endpoint inventory
5. Phase 2 readiness
```

---

## 25. Final Recommendation

Do not throw away the current project. It already has valuable logic and features.

Rebuild the architecture around:

```txt
module manifests
generated registry
module runtime
module API dispatcher
shared workflow engine
shared AI service
shared design system
editor-driven public pages
migration identity locking
public/dashboard bootstrap caching
```

That is the path to turning the current system into a real white-label Contractor CMMS + AI Quoting platform instead of a patch-heavy dashboard with hardcoded modules.


---

## 26. Codex Prompt for Full Rebuild Planning

Use this when asking Codex to start the rebuild branch:

```txt
Read PLAN.md completely before changing code.

The rebuild must preserve the current product but replace the fragile architecture with:

1. Full installer wizard.
2. Future license key system for selling deployments.
3. True drop-in module system.
4. Manifest-driven routing/sidebar/mobile nav/permissions/API.
5. Event-driven workflow engine.
6. Shared AI service.
7. Editor-driven homepage.
8. Shared public shell and dashboard shell.
9. Fast bootstrap config.
10. Immutable migration safety.

Do not try to rebuild everything in one commit.

First deliver:

- current module inventory
- current endpoint inventory
- current DB/migration inventory
- installer data model
- license placeholder data model
- module manifest schema
- generated registry design
- migration strategy
- phase-by-phase PR plan

The final architecture must allow a new module to be dropped into the repo and automatically registered without editing core router/sidebar/mobile nav/permissions/netlify redirects by hand.
```

---

## 27. Absolute Non-Negotiable Summary

- Same Netlify/static/functions/database environment.
- Installer must be first on fresh deployment; homepage must not show before install completion.
- Installer must collect or verify Environment Variables before completion.
- Environment Variables must not be hardcoded.
- Secret values must stay server-side only.
- Owner is Super User with access to all workspace views for testing.
- Owner can impersonate users with audit logging.
- Owner automatically sees all dropped-in modules.
- No required Next.js runtime.
- Full first-run installer.
- License key area for future selling.
- License verification inactive by default.
- True drop-in modules.
- No hardcoded module list as source of truth.
- No hardcoded homepage content as source of truth.
- No public placeholder text.
- No duplicate workflow state.
- No editing applied migrations.
- No manual core edits when adding modules.
- One premium design system.
- AI is shared service, not scattered one-off endpoints.
- Public config loads fast.
- Dashboard config loads once.
- All role/permission changes save and enforce server-side.
- All workflows move items forward and remove them from old active lists.
---

## 28. Final Master Acceptance Tests

### Install-First

- Fresh deployment redirects `/` to `/install/`.
- `/install/` never shows a blank white page.
- Installer static fallback renders before APIs finish.
- Installer has error boundary and recovery mode.
- `/api/install/health` reports database/migration/module/bootstrap status.
- Installer APIs return useful JSON errors, not empty/HTML failures.
- Build verifies installer assets and routes exist.
- Homepage cannot render before install completes.
- Dashboard cannot render before install completes.
- Login/client portal cannot render before install completes.
- Public quote/invoice pages cannot render before install completes.
- Installer resumes after interruption.
- Installer uses a simple guided wizard instead of technical configuration dumps.
- Installer explains each step in plain English.
- Optional integrations can be skipped and configured later.
- Finish Install uses a real `/api/install/finish` finalization endpoint.
- Finish Install writes `installation_complete = true` only after all required validations pass.
- Finish Install shows clear errors and never silently fails.
- Installer creates owner account.
- Installer creates company settings.
- Installer seeds homepage editor.
- Installer seeds theme manager.
- Installer seeds services.
- Installer seeds module registry.
- Installer generates bootstrap cache.
- Installer marks installation complete.
- After install, homepage becomes public.

### Environment Variables

- Installer includes Environment Variables / Integrations step.
- Required variable status is shown.
- Optional variable status is shown.
- Missing values can be entered during install.
- Secret values are never returned to frontend.
- Secret values are never stored in browser storage.
- Secret values are never written to public bootstrap config.
- Secret values are never logged.
- Owner can test OpenAI, Resend, Square, reCAPTCHA, license server, and SITE_URL.
- Installer provides help links and step-by-step instructions for finding each value.
- Installer generates customer-specific callback/webhook URLs using the current deployment domain.
- No customer-specific URL or secret is hardcoded.
- System Center includes Environment & Integrations manager after install.

### Super Owner

- Owner sees every workspace.
- Owner can switch Owner/Admin/Manager/Worker/Client/Public views.
- Owner can impersonate users.
- Impersonation has visible banner.
- Impersonation is audit logged.
- Owner sees hidden, disabled, beta, and experimental modules.
- Owner can simulate complete workflow.

### Drop-In Modules

- Dropping in a module folder registers it automatically.
- No router/sidebar/mobile nav/permission/core file edit is needed.
- Module Manager shows real modules only.
- Permissions auto-register.
- API dispatcher routes module API calls.
- Module health checks work.

### Workflow

- Request moves to quote.
- Quote accepted creates work order.
- Quote leaves active quote list after conversion.
- Work order can be assigned, scheduled, completed, reviewed, invoiced, paid, verified, and archived.
- Completed/paid/closed items leave active queues.
- Counts update across all dashboards.

### Security

- No secrets in frontend.
- No OpenAI/Square/Resend/License secrets exposed.
- Permission checks happen server-side.
- Audit logs record sensitive actions.
- Files respect visibility rules.

### Build

- Static build outputs `/out`.
- Netlify Functions build.
- No Next.js runtime required.
- No @netlify/plugin-nextjs.
- Migrations are unique and immutable.
- Tests and audits pass.


---

# 29. Platform Design Rules (NON-NEGOTIABLE)

These rules override implementation preferences.

1. Installer First.
2. Everything is database-driven.
3. Nothing business-specific is hardcoded.
4. Modules are true drop-ins.
5. One workflow object powers the entire platform.
6. Owner has access to every workspace for testing.
7. Homepage is fully editor-driven.
8. Theme system controls the entire site.
9. Optional integrations never block operation.
10. Every setting can be changed later without code.
11. Platform survives partial failures gracefully.
12. New features should require zero core file modifications whenever possible.

---

# 30. Platform Health Center

Owner → System Center → Platform Health

Monitor:

- Database
- Netlify Functions
- Homepage Cache
- Dashboard Cache
- Bootstrap Cache
- Module Registry
- OpenAI
- Resend
- Square
- Storage
- License Server
- Magic Links

Status:
🟢 Healthy
🟡 Warning
🔴 Offline

Include Run Diagnostics button.

---

# 31. Backup & Restore

System must support:

- Daily Backup
- Weekly Backup
- Manual Backup
- Restore Point

Before updates:

Create Restore Point?

---

# 32. Safe Update System

Upload Update Package

Validate
→ Backup
→ Run Migrations
→ Rebuild Module Registry
→ Clear Cache
→ Restart

Never overwrite blindly.

---

# 33. Module Dependency & Versioning

Each module manifest contains:

- name
- version
- minimumPlatform
- dependencies

System blocks incompatible installs.

---

# 34. File Manager

Owner → System Center → File Manager

Manage:

- Logos
- Homepage images
- Gallery
- AI uploads
- Worker uploads
- Invoice PDFs
- Attachments

Support cleanup and orphan detection.

---

# 35. AI Usage Monitor

Display:

- AI Photo Estimates
- AI Quotes
- AI Troubleshooting
- Token usage
- Estimated daily/monthly cost

---

# 36. Homepage Builder

Homepage Editor becomes a true page builder.

Editable:

- Hero
- Project Cards
- Estimate Card
- Gallery
- Services
- Stats
- CTA
- Footer
- Header
- Background Effects
- Section Order
- Visibility Rules

Drag-and-drop ordering.

No code changes required.

---

# 37. Cache Manager

Owner → System Center → Cache Manager

Actions:

- Clear Homepage Cache
- Clear Dashboard Cache
- Clear Theme Cache
- Rebuild Bootstrap
- Rebuild Module Registry
- Clear Image Cache

---

# 38. Audit Log

Track:

- Installer completed
- Environment variable changed
- Homepage edited
- Theme changed
- Module installed
- User impersonated
- Quote approved
- Invoice paid

---

# 39. Unified Photo Pipeline

One uploaded photo can automatically connect to:

- User profile
- Work order
- AI estimate
- Invoice
- Gallery
- Worker history

No duplicate uploads.

---

# 40. Single Workflow Engine

One master record exists.

Request
→ Quote
→ Work Order
→ Schedule
→ Worker
→ Completion
→ Invoice
→ Payment
→ Verification
→ Archive

Modules reference this object.

Never duplicate workflow data.

---

# 41. White-Label Sales Ready

Installer collects:

- Company Name
- Logo
- Domain
- Colors
- Business Type
- License Key

No TA Contracting references remain in source code.

---

# 42. Installation Recovery

Create:

/install/recovery

Show completed/incomplete steps and Resume Setup.

---

# 43. Platform Self-Test

Owner → Run Platform Diagnostics

Verify:

- Database
- Functions
- Bootstrap
- Module Registry
- Homepage
- Theme
- Permissions
- AI
- Email
- Square
- Storage
- Installer Lock

Generate downloadable report.

---

# Additional Acceptance Tests

- Installer recovery works.
- Platform diagnostics pass.
- Module dependencies enforced.
- Restore points created before updates.
- Homepage builder edits persist.
- Cache manager rebuilds system correctly.
- Audit log records sensitive actions.
- One workflow object drives all modules.
- White-label install contains no hardcoded branding.

---

## Final Installer Override

If any earlier section says Environment Variables are required during first-run install, this section overrides it.

Environment Variables and external integrations are optional during first install.

They belong in post-install System Center unless the owner chooses to configure them early.

The platform must be installable and usable in a basic/manual mode with no external API keys configured.


---

## Final Installer API and UX Override

If any earlier section conflicts with section 2.0J, section 2.0J wins.

The installer must be simple, but it must still include all required API routes, draft saving, finish finalization, helpful review, and post-install business-ready onboarding.

Environment variables are not required during first install.

Missing optional integrations must never block Finish Install.

Missing installer API routes are real system failures and must be fixed before launch.

---


---

# FINAL v12 OVERRIDE

If any earlier section appears to remove or reduce the full module list, magic login, workspace views, account setup, or full workflow, ignore that interpretation.

The installer should be simpler.

The platform should NOT be smaller.

Build the full platform with a simpler, smarter, auto-detecting installer.

---


---

# FINAL v14 UPDATE — 10/10 Quality Standard, Real CMMS Implementation, and No Prototype Shells

This section is a required update to PLAN_FINAL_v13.

The goal is not "working enough."

The goal is a 10/10 professional white-label Contractor CMMS + AI Quoting Platform.

The finished product should feel like a serious commercial SaaS product, not a prototype, placeholder dashboard, or developer demo.

If any earlier section allows placeholder-only behavior, hardcoded-only modules, temporary stores, fake data persistence, or unfinished module cards, this v14 section overrides it.

---

## v14.1 10/10 Product Standard

Every part of the system must meet these standards:

```txt
Professional
Polished
Fast
Reliable
Mobile-friendly
Desktop-friendly
Database-backed
Theme-aware
Role-aware
Permission-aware
Workflow-aware
Empty-state friendly
No placeholder-only modules
No fake persistence
No broken routes
No white screens
No random hardcoded UI
```

A page or module is not complete unless it can be used by a real contractor business.

---

## v14.2 No Prototype Shells

The implementation must not stop at:

- placeholder cards
- fake module tiles
- static module arrays
- temporary JSON file storage
- "coming soon" modules
- hardcoded demo-only dashboards
- empty tables with no actions
- buttons that do nothing
- forms that do not save
- routes that 404
- APIs that return fake success
- modules that only show text

Every core module must include real UI, real API, real database persistence, real validation, and real empty states.

---

## v14.3 Real Database Required

The platform must use Netlify Database / PostgreSQL for production data.

Temporary JSON storage such as `/tmp/*.json` is not acceptable for production platform data.

The following must be stored in real database tables:

```txt
installation state
installer draft
company settings
theme settings
homepage settings
users
roles
permissions
role permissions
workspace access
module registry
module settings
customers
properties
requests
quotes
quote line items
work orders
assignments
schedule events
inventory items
inventory transactions
invoices
payments
uploaded files
photo estimates
AI runs
audit logs
system health events
```

Temporary in-memory or file storage may only be used for local development fallback and must be clearly separated from production behavior.

Production must use database persistence.

---

## v14.4 Core Module Completion Definition

A core module is complete only when it has:

```txt
module manifest
registered route
sidebar entry
mobile behavior
permissions
database table support
API endpoints
list view
detail view
create form
edit form
delete/archive behavior where appropriate
empty state with action
loading state
error state
audit logging where appropriate
theme support
mobile support
desktop support
role filtering
workflow integration where applicable
```

This applies at minimum to:

```txt
Dashboard / Overview
Customers / Clients
Request Estimate
Estimate & Quote Center
Work Orders
Schedule / Calendar
Inventory
Invoices
Finance
Users & Roles
Workspace & Permissions
File / Photo Manager
System Center
Environment & Integrations
Homepage Editor
Theme Manager
Module Manager
Platform Health
Audit Logs
Cache Manager
Backup / Restore
Licensing
AI Photo Estimate
AI Quote Builder
AI Troubleshooting
Client Portal
Worker Portal
```

---

## v14.5 Required Core Module Behavior

### Dashboard / Overview

Must show:

- role-aware overview
- quick stats
- active requests
- active quotes
- active work orders
- invoices due
- schedule today
- quick actions
- setup checklist
- business health
- recent activity

### Customers / Clients

Must support:

- create customer
- edit customer
- view customer
- archive customer
- add properties/addresses
- view related requests, quotes, work orders, invoices, files

### Request Estimate

Must support:

- manual request creation
- public request creation
- client request creation
- photo upload
- service category
- address/property
- urgency/priority
- notes
- convert to quote
- status tracking

This module is not AI-only.

### Estimate & Quote Center

Must support:

- create manual quote
- create quote from request
- edit labor/material lines
- pricing totals
- status
- send to client when email configured
- manual share link when email not configured
- client acceptance
- convert accepted quote to work order
- remove converted quotes from active quote queue

### Work Orders

Must support:

- create from quote
- create manually
- assign worker
- schedule
- priority
- status
- job notes
- photos
- materials used
- inventory connection
- worker completion
- admin review
- archive/close

### Schedule / Calendar

Must support:

- calendar view
- list view
- worker filter
- date filter
- scheduled work orders
- drag/reschedule optional
- mobile-friendly schedule cards

### Inventory

Must support:

- inventory items
- stock quantity
- reorder level
- locations
- material usage on work orders
- stock adjustments
- inventory transaction history

### Invoices

Must support:

- create from work order
- create manually
- line items
- totals
- taxes/fees placeholders
- view invoice
- download invoice
- send invoice if email configured
- Square payment link if configured
- manual payment tracking if Square not configured

### Finance

Must support:

- invoice totals
- paid/unpaid
- manual payments
- payment verification
- revenue overview
- outstanding balances
- basic reporting

### Client Portal

Must support:

- my requests
- my quotes
- quote approval
- my invoices
- payment link/manual payment instructions
- project/work status
- uploaded photos/files
- account setup

### Worker Portal

Must support:

- assigned jobs
- schedule
- job details
- upload photos
- record materials used
- submit completion
- notes
- status updates

---

## v14.6 10/10 UX Requirements

The system must feel polished on both desktop and mobile.

### Desktop

Test and polish:

```txt
1024px
1280px
1440px
1920px
```

Requirements:

- clean spacing
- no overlapping buttons
- no clipped text
- no random white cards in dark mode
- clear page titles
- professional cards/tables
- responsive grids
- sticky actions where useful
- dashboard feels like commercial SaaS

### Mobile

Test and polish:

```txt
320px
390px
430px
768px
```

Requirements:

- no horizontal scroll
- tappable buttons
- readable forms
- cards stack correctly
- bottom nav does not overlap content
- safe-area support
- tables become cards
- modals fit screen
- no merged buttons
- no blank wasted space

---

## v14.7 Dashboard Sidebar 10/10 Standard

Sidebar must be organized, elegant, and scalable.

Required:

- logo
- company name
- current role/view
- owner view switcher
- grouped navigation
- icons
- active state
- collapsed mode
- search/filter modules if many
- mobile bottom nav
- More menu on mobile
- no duplicate nav
- no internal developer IDs visible

Sidebar groups:

```txt
Main
Operations
Financial
People
AI Tools
System
```

The sidebar should feel like a finished CMMS product, not a list of test links.

---

## v14.8 Theme System 10/10 Standard

Theme must work everywhere:

```txt
installer
homepage
login
account setup
dashboard
client portal
worker portal
quote viewer
invoice viewer
all modules
all modals
all forms
all cards
all tables
```

Light, Dark, System, and Custom must work.

System must follow OS.

Theme must apply before first paint.

No page may hardcode white backgrounds or black text.

Theme live preview during install and Theme Manager must update immediately.

---

## v14.9 Install Must Create a Real Platform

Finish Install must create a usable system.

After install, the owner should be able to:

```txt
log in
view dashboard
switch role views
create customer
create request
create quote
accept quote
create work order
assign worker
schedule work
complete work
create invoice
mark paid
archive job
edit homepage
change theme
manage modules
view health
```

without external integrations configured.

If OpenAI, Resend, Square, or SerpAPI are missing, manual mode must still work.

---

## v14.10 Workflow Engine Must Be Real

All status transitions must use one shared workflow engine.

Do not duplicate quote/work order/invoice status logic across modules.

The system must enforce valid transitions.

Example:

```txt
request.new
request.reviewed
quote.draft
quote.sent
quote.accepted
work_order.ready_to_assign
work_order.assigned
work_order.scheduled
work_order.in_progress
work_order.worker_completed
work_order.admin_review
invoice.draft
invoice.sent
invoice.paid
payment.verified
workflow.closed
workflow.archived
```

Completed/paid/closed/archived records must leave active queues.

---

## v14.11 AI Must Be Real but Optional

AI modules must exist, but must not fake output.

If OpenAI is configured:

- AI Photo Estimate analyzes uploaded photos.
- AI Quote Builder produces editable quote drafts.
- AI Troubleshooting provides structured troubleshooting steps.

If OpenAI is not configured:

- show clear "AI not configured" state.
- allow manual fallback.
- save uploaded photos/requests.
- do not crash.
- do not invent fake analysis.

---

## v14.12 Platform Verification Must Be Strict

Use a single verification command:

```txt
npm run verify
```

It must check:

- installer routes exist
- install finish works
- database tables/migrations exist
- core modules exist
- module manifests valid
- sidebar generated from modules
- required environment keys use exact names
- `SERPAPI_KEY` does not appear anywhere
- `SERPAPI_API_KEY` does appear where needed
- no hardcoded white/black theme violations
- no missing API handlers
- no placeholder-only modules
- no temporary JSON production store
- magic login routes exist
- workflow routes exist
- build outputs `/out`

Do not call the build complete if verification fails.

---

## v14.13 10/10 Acceptance Tests

The implementation is not complete until:

- Fresh install loads `/install/`.
- Installer theme preview updates live.
- Integration warnings detect all required environment variable names.
- Finish Install creates real DB records.
- Dashboard opens after install.
- Owner account exists.
- Roles and permissions exist.
- Owner can switch all role views.
- Sidebar is organized and professional.
- Basic modules are real, not placeholders.
- Request can become quote.
- Quote can become work order.
- Work order can become invoice.
- Invoice can be marked paid.
- Paid/closed items leave active lists.
- Client portal works.
- Worker portal works.
- Magic login exists.
- Homepage Editor works.
- Theme Manager works.
- Module Manager works.
- Environment & Integrations works.
- Platform Health works.
- No white screens.
- No empty dead-end pages.
- No fake persistence.
- No prototype-only module cards.
- Mobile and desktop UX are polished.

---

## v14.14 Final v14 Override

If any earlier section conflicts with v14, v14 wins.

The platform must be 10/10.

Do not stop at "it builds."

Do not stop at "the route exists."

Do not stop at "there is a placeholder card."

Build the real product.

---


---

# FINAL v15 UPDATE — Fresh Install Netlify Database Package, Automatic Schema Bootstrap, and Real DB Write Verification

This section is a required update to PLAN_FINAL_v14.

The platform must complete a fresh install using the correct Netlify Database client dependency and must automatically create/write the database schema after a database connection is available.

The installer must not pretend that memory storage, temporary JSON files, or placeholder persistence is production-ready.

---

## v15.1 Database Package Must Be Installed at Build Time

The project must include the correct Netlify Database client package in `package.json`.

Required dependency:

```bash
npm install @netlify/database
```

If the implementation also requires PostgreSQL compatibility, include the required package as well, such as:

```bash
npm install pg
```

or the current supported Netlify/Postgres driver.

The selected package must be documented in the implementation.

Rules:

- Do not run `npm install` from the browser.
- Do not run `npm install` from the installer UI.
- Do not dynamically import an undefined database module path.
- Do not rely on a dependency that is not listed in `package.json`.
- `npm run verify` must fail if the required DB client dependency is missing.

---

## v15.2 Fresh Install Database Flow

A fresh deployment must follow this database flow:

```txt
1. Build installs database dependency from package.json.
2. User opens /install/.
3. Installer calls /api/install-status.
4. Backend checks for database connection.
5. Installer calls /api/install/bootstrap-database.
6. If database connection exists:
   - connect to database,
   - create all required tables,
   - seed required starter data,
   - run write/read/delete verification,
   - mark schema ready.
7. If database connection does not exist:
   - show clear setup instructions,
   - do not crash,
   - do not raw 502/503,
   - do not finish install.
```

The installer must create/write the schema automatically after the DB is connected.

The installer does not need to create the external Netlify database resource from the browser unless Netlify exposes a safe supported API for doing so.

However, once a database connection exists, all table creation and seed data must be automatic.

---

## v15.3 Database Provisioning vs Schema Bootstrap

The plan must clearly separate two different things.

### Database Provisioning

This means creating/linking the actual Netlify Database resource to the Netlify site.

If this cannot be done from the deployed runtime, the installer must say so clearly.

Example message:

```txt
No database connection was detected.

A Netlify Database must be linked to this site first.

After the database is linked, this installer will automatically create every required table and seed the platform records.
```

### Schema Bootstrap

This means creating all tables and initial records inside an already connected database.

Schema bootstrap must be automatic.

No manual SQL should be required.

No manual table creation should be required.

---

## v15.4 Required Database Environment Detection

The backend must check these possible connection variables safely:

```txt
NETLIFY_DATABASE_URL
DATABASE_URL
POSTGRES_URL
POSTGRES_PRISMA_URL
POSTGRES_URL_NON_POOLING
NEON_DATABASE_URL
```

Use the first configured value.

Never crash if none exist.

If none exist, return safe JSON:

```json
{
  "ok": false,
  "code": "NO_DATABASE_URL",
  "message": "No database connection URL was found.",
  "manualDatabaseLinkRequired": true,
  "canBootstrapSchema": false,
  "nextAction": "Link a Netlify Database to this site, then retry."
}
```

---

## v15.5 Required Bootstrap Endpoint

Create or fix:

```txt
POST /api/install/bootstrap-database
```

This endpoint must always return JSON.

If Database URL is missing, return:

```json
{
  "ok": false,
  "code": "NO_DATABASE_URL",
  "manualDatabaseLinkRequired": true,
  "canBootstrapSchema": false,
  "message": "No database connection was detected. Link a Netlify Database, then retry."
}
```

If Database client package is missing, return:

```json
{
  "ok": false,
  "code": "DATABASE_CLIENT_MISSING",
  "message": "Database client package is missing from package.json.",
  "manualDatabaseLinkRequired": false,
  "canBootstrapSchema": false
}
```

Also fail `npm run verify`.

If Database URL exists, the endpoint must:

1. load the DB client,
2. connect to the database,
3. create all required tables,
4. create required indexes,
5. seed required platform records,
6. run a write/read/delete verification test,
7. return success.

Success response:

```json
{
  "ok": true,
  "code": "SCHEMA_READY",
  "databaseConnected": true,
  "schemaReady": true,
  "writeTestPassed": true,
  "message": "Database schema is ready."
}
```

If connection fails, return:

```json
{
  "ok": false,
  "code": "DATABASE_CONNECTION_FAILED",
  "message": "A database URL was found, but the connection failed.",
  "safeDetails": "Non-secret safe error detail."
}
```

Never expose secrets.

Never raw 502/503.

---

## v15.6 Required Tables for Fresh Install

The automatic schema bootstrap must create these tables at minimum:

```txt
platform_installation
installer_drafts
company_settings
theme_settings
homepage_settings
app_users
roles
permissions
role_permissions
user_roles
workspace_access
module_registry
module_settings
service_categories
customers
customer_properties
job_requests
quotes
quote_line_items
work_orders
work_order_assignments
schedule_events
inventory_items
inventory_transactions
invoices
payments
uploaded_files
ai_runs
workflow_events
magic_tokens
platform_secret_settings
audit_logs
system_health_events
```

The schema should use real relational columns where appropriate, not only one generic JSON blob for every production table.

JSONB metadata fields are allowed, but core business fields must be queryable.

Examples:

```txt
customers: name, email, phone, status
job_requests: customer_id, service_category_id, status, priority
quotes: customer_id, request_id, status, subtotal, total
work_orders: customer_id, quote_id, status, assigned_to_user_id, scheduled_at
invoices: customer_id, work_order_id, status, total, paid_at
payments: invoice_id, amount, method, status
```

---

## v15.7 Required Seed Data

After schema bootstrap, seed:

```txt
platform_installation default row
installer draft default row
owner/admin/manager/worker/client roles
default permissions
role_permissions
workspace access defaults
required core module registry rows
required module settings
default service categories
default theme settings
default homepage settings
audit log entry for bootstrap
```

Do not mark installation complete until Finish Install creates the owner account and validates required setup.

---

## v15.8 Required Database Write Test

The installer must verify the DB can actually write.

Create a write test during bootstrap:

```txt
insert test row
read test row
delete test row
confirm deletion
```

Return:

```json
{
  "writeTestPassed": true
}
```

Finish Install must not complete unless:

```txt
databaseConnected = true
schemaReady = true
writeTestPassed = true
```

in production.

---

## v15.9 Production Memory Fallback Is Not Allowed

Memory fallback may exist only for local development.

In production:

- do not use memory store as real persistence,
- do not use `/tmp` JSON as real persistence,
- do not mark install complete with only memory storage,
- do not call memory fallback "database ready."

If database is missing in production, show:

```txt
Database connection required.
```

The installer may still load safely, but Finish Install must not complete.

---

## v15.10 Installer UI Copy for Database Setup

When DB is missing, show:

```txt
Database connection not detected.

A Netlify Database must be linked to this site before installation can finish.

After it is linked, setup will automatically create all required tables and seed the CMMS platform.

Steps:
1. Open Netlify dashboard.
2. Go to Storage → Database.
3. Create or link a database.
4. Redeploy if Netlify requires it.
5. Click Retry Database Check.
```

Buttons:

```txt
Open Netlify Dashboard
Retry Database Check
Open Recovery Mode
Copy Diagnostic Report
```

No broken inline handlers.

No `retryAutomaticSetup is not defined`.

---

## v15.11 Retry Database Check Must Work

The Retry Database Check button must:

1. disable itself,
2. show loading state,
3. call `/api/install/bootstrap-database`,
4. display returned status,
5. call `/api/install-status`,
6. continue installer if schema is ready,
7. re-enable on failure.

Use event listeners.

Do not use broken inline `onclick`.

---

## v15.12 Install Finish Database Requirements

`POST /api/install/finish` must:

1. verify DB connection exists,
2. verify schema is ready,
3. verify write test passed,
4. save company settings,
5. save branding/theme/homepage settings,
6. create owner account,
7. seed or verify roles and permissions,
8. seed or verify module registry,
9. seed or verify service categories,
10. set `installation_complete = true`,
11. write audit log,
12. return JSON success.

If database is missing:

```json
{
  "ok": false,
  "code": "DATABASE_REQUIRED",
  "message": "Installation cannot finish until a database is linked and schema bootstrap succeeds.",
  "goToStep": "review"
}
```

---

## v15.13 Verification Requirements

`npm run verify` must fail if:

- `@netlify/database` or selected DB client is missing from `package.json`,
- DB loader can import undefined,
- `/api/install/bootstrap-database` route is missing,
- missing DB URL is reported as ready,
- production memory fallback is treated as real DB,
- schema bootstrap does not include required tables,
- write/read/delete DB test is missing,
- Finish Install can complete in production without a real DB.

---

## v15.14 Acceptance Tests

- Fresh install loads `/install/`.
- DB client dependency is installed at build time.
- Missing DB URL returns safe JSON.
- Missing DB URL does not raw 502/503.
- Retry Database Check works.
- Linked DB automatically creates all required tables.
- Linked DB automatically seeds required starter data.
- DB write/read/delete test passes.
- Finish Install writes real DB records.
- Finish Install refuses to complete without DB in production.
- Owner account is saved in DB.
- Roles and permissions are saved in DB.
- Module registry is saved in DB.
- Services are saved in DB.
- Dashboard reads from DB after install.
- No production memory fallback is used as real persistence.

---

## v15.15 Final v15 Override

If any earlier section says memory fallback or temporary JSON storage is acceptable for production install completion, this section overrides it.

Production install must use a real database.

The database client must be installed at build time.

The schema must bootstrap automatically after the database is linked.

Finish Install must write real records into the database.

---
