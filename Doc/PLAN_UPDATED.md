# PLAN.md — Full Rebuild Plan for White-Label Contractor CMMS + AI Quoting Platform with True Drop-In Modules, Full Installer, and Future Licensing

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
Step 2: License Key / Future Activation
Step 3: Company Profile
Step 4: Branding and Logo
Step 5: Theme and Sidebar Colors
Step 6: Owner Account
Step 7: Roles and Permissions
Step 8: Modules
Step 9: Services and Trades
Step 10: Homepage Content
Step 11: AI Settings
Step 12: Email Settings
Step 13: Payments / Square Settings
Step 14: Public Portal Settings
Step 15: Review and Finish
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
