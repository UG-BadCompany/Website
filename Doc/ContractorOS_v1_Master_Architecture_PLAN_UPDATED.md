# ContractorOS v1 Master Architecture Plan

## Project Name

ContractorOS

## Project Type

Contractor CMMS, quoting, client portal, work order, and modular business operating system.

## Main Goal

Rebuild the current T&A Contracting website/platform from scratch into a clean, stable, modular ContractorOS foundation.

This must not be a patch of the old website.

This is a full architecture reset.

The system should still support the same business idea:

- Public contractor website
- Magic link login
- Client portal
- Dashboard
- Role-based permissions
- Work requests
- Quotes
- Jobs/work orders
- Basic CMMS structure
- Future AI quoting
- Future AI troubleshooting
- Future drop-in modules

The first version must focus on getting the foundation working perfectly before adding advanced features.

---

# Core Build Rules

## 1. Start From Scratch

Do not reuse messy page logic from the current website.

Use the old website only as a visual/business reference.

The new app must be built from a clean architecture.

## 2. Database First

Build the database schema first.

Then build backend services.

Then build frontend pages.

Do not build random pages before the data model is stable.

## 3. Module System First

Everything except the core platform should be treated as a module.

Core platform:

- Installer
- Auth
- Database connection
- Roles
- Permissions
- Settings
- Theme system
- Dashboard shell
- Module loader

Everything else is a module.

## 4. Netlify Must Work

Netlify is the first-class personal deploy target.

However, the app must also support:

- Netlify
- Vercel
- Docker
- VPS/manual Node hosting

Do not make Docker required.

Docker should be supported, not mandatory.

## 5. One Company Per Install

ContractorOS v1 is not multi-tenant.

One install equals one company.

Do not build company switching, tenant IDs everywhere, or multi-company admin panels in v1.

Keep it simple and stable.

## 6. PWA Ready

The app must be mobile-first and installable as a PWA.

Mobile should feel like an app, not a broken desktop page.

---

# Recommended Tech Stack

## Frontend

Use one modern framework consistently.

Preferred:

- Next.js or Astro with server routes
- TypeScript
- Tailwind CSS
- Component-based UI
- PWA support
- Responsive layout from the beginning

Do not mix random standalone HTML files, disconnected scripts, and duplicate CSS.

## Backend

Use serverless-compatible API routes.

Must work on:

- Netlify Functions
- Vercel Functions
- Node server
- Docker container

Create a provider adapter layer so deployment differences do not affect business logic.

## Database

Support both:

- Standard PostgreSQL
- Supabase PostgreSQL

Use PostgreSQL as the engine.

Supabase is treated as a hosted PostgreSQL provider, not as a hard lock-in.

## Email

Support:

- Resend first
- SMTP fallback later

Magic login links should be sent through Resend.

## Auth

Use custom magic-link auth or a clean auth provider layer.

Auth must support:

- Email magic link
- Secure token generation
- Token expiration
- Session cookies
- Logout
- Role loading
- Permission loading

Do not hardcode demo users.

---

# Environment Variable Keys

Do not commit real values.

Create `.env.example` with placeholders only.

Important: ContractorOS must support different hosting providers and different environment variable naming styles. The app should use one internal normalized config layer, but the installer should detect common provider-specific keys and let the installer map custom keys.

## Environment Variable Design Rule

The app should not directly reference random environment variable names all over the codebase.

Create one config loader:

```text
/src/core/config/env.ts
```

That loader should normalize keys into internal names such as:

```text
app.url
app.urlAliases
database.url
email.from
quote.from
resend.apiKey
openai.apiKey
recaptcha.siteKey
recaptcha.secretKey
square.accessToken
square.environment
square.locationId
square.webhookSignatureKey
```

The loader may read multiple possible key names for the same internal value.

Example:

```text
database.url can come from DATABASE_URL or NETLIFY_DATABASE_URL
app.url can come from APP_URL or SITE_URL or URL
email.from can come from EMAIL_FROM or MAGIC_LINK_FROM_EMAIL
```

This lets ContractorOS work for Netlify users, Vercel users, Docker users, VPS users, and people who already have existing env key names.

---

## Installer Hosting Provider Step

During install, add a step called:

```text
Hosting / Environment Setup
```

Ask:

```text
Which hosting provider are you using?
```

Options:

- Netlify
- Vercel
- Docker
- VPS / Node server
- Other / Custom

After selection, show suggested environment variable keys for that provider.

The installer should allow:

1. Use recommended ContractorOS keys
2. Use detected existing keys
3. Manually map custom keys

For example, if the user chooses Netlify, the installer should detect and suggest existing Netlify-style keys like:

```env
SITE_URL=
SITE_URL_ALIASES=
NETLIFY_DATABASE_URL=
MAGIC_LINK_FROM_EMAIL=
QUOTE_FROM_EMAIL=
RESEND_API_KEY=
OPENAI_API_KEY=
RECAPTCHA_SECRET_KEY=
RECAPTCHA_SITE_KEY=
SQUARE_ACCESS_TOKEN=
SQUARE_API_VERSION=
SQUARE_ENVIRONMENT=
SQUARE_LOCATION_ID=
SQUARE_WEBHOOK_SIGNATURE_KEY=
SERPAPI_API_KEY=
```

The installer should not require all of these for v1. It should classify each key as required, optional, future module, or payment module.

---

## Recommended ContractorOS Standard Keys

These are the preferred clean keys for new installs.

### App Keys

```env
APP_NAME=ContractorOS
APP_URL=https://example.com
APP_URL_ALIASES=
APP_ENV=development
HOSTING_PROVIDER=netlify
INSTALLER_ENABLED=true
```

### Database Keys

```env
DATABASE_PROVIDER=postgres
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

### Supabase Keys

Required only if using Supabase.

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Resend / Email Keys

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM="ContractorOS <noreply@example.com>"
MAGIC_LINK_FROM_EMAIL="ContractorOS <noreply@example.com>"
QUOTE_FROM_EMAIL="ContractorOS Quotes <quotes@example.com>"
```

### SMTP Fallback Keys

Optional for later.

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
SMTP_FROM="ContractorOS <noreply@example.com>"
```

### Auth Keys

```env
AUTH_SECRET=random-long-secret
MAGIC_LINK_EXPIRATION_MINUTES=15
SESSION_COOKIE_NAME=contractoros_session
SESSION_EXPIRATION_DAYS=30
```

### License Keys

```env
LICENSE_SERVER_URL=https://license.example.com
LICENSE_PUBLIC_KEY=your-license-public-key
LICENSE_PRODUCT_ID=contractoros-v1
LICENSE_CHECK_INTERVAL_HOURS=24
```

### Recaptcha Keys

Optional for public forms and spam protection.

```env
RECAPTCHA_SITE_KEY=
RECAPTCHA_SECRET_KEY=
```

### Square Payment Keys

Optional payment module keys. Do not require these for v1 core unless the payment module is enabled.

```env
SQUARE_ACCESS_TOKEN=
SQUARE_API_VERSION=
SQUARE_ENVIRONMENT=sandbox
SQUARE_LOCATION_ID=
SQUARE_WEBHOOK_SIGNATURE_KEY=
```

### Future AI / Search Keys

Do not activate in v1 core. These are reserved for future AI estimating, troubleshooting, and web/search modules.

```env
OPENAI_API_KEY=
AI_MODULES_ENABLED=false
SERPAPI_API_KEY=
```

### Storage Keys

```env
STORAGE_PROVIDER=local
STORAGE_BUCKET=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_ENDPOINT=
```

---

## Netlify-Specific Key Support

Netlify must work first because the current personal deployment target is Netlify.

The config loader should support these Netlify/current-site keys:

```env
SITE_URL=
SITE_URL_ALIASES=
NETLIFY_DATABASE_URL=
MAGIC_LINK_FROM_EMAIL=
QUOTE_FROM_EMAIL=
RESEND_API_KEY=
OPENAI_API_KEY=
RECAPTCHA_SECRET_KEY=
RECAPTCHA_SITE_KEY=
SQUARE_ACCESS_TOKEN=
SQUARE_API_VERSION=
SQUARE_ENVIRONMENT=
SQUARE_LOCATION_ID=
SQUARE_WEBHOOK_SIGNATURE_KEY=
SERPAPI_API_KEY=
```

Netlify mapping rules:

```text
SITE_URL -> APP_URL
SITE_URL_ALIASES -> APP_URL_ALIASES
NETLIFY_DATABASE_URL -> DATABASE_URL
MAGIC_LINK_FROM_EMAIL -> EMAIL_FROM fallback for auth emails
QUOTE_FROM_EMAIL -> quote email sender
RESEND_API_KEY -> Resend provider key
OPENAI_API_KEY -> future AI module key
RECAPTCHA_SITE_KEY -> public captcha key
RECAPTCHA_SECRET_KEY -> private captcha verification key
SQUARE_* -> future payment module keys
SERPAPI_API_KEY -> future search/research module key
```

If both `DATABASE_URL` and `NETLIFY_DATABASE_URL` exist, installer should ask which one to use instead of guessing silently.

If both `APP_URL` and `SITE_URL` exist, installer should prefer the one matching the current deployed domain but show both.

---

## Vercel Key Support

Suggested Vercel keys:

```env
APP_URL=
VERCEL_URL=
DATABASE_URL=
POSTGRES_URL=
POSTGRES_PRISMA_URL=
RESEND_API_KEY=
EMAIL_FROM=
AUTH_SECRET=
```

Mapping rules:

```text
VERCEL_URL -> APP_URL fallback
POSTGRES_URL -> DATABASE_URL fallback
POSTGRES_PRISMA_URL -> DATABASE_URL fallback
```

---

## Docker / VPS Key Support

Suggested Docker/VPS keys:

```env
APP_URL=
DATABASE_URL=
RESEND_API_KEY=
EMAIL_FROM=
AUTH_SECRET=
```

Docker compose should include local Postgres environment values, but secrets should still be passed through `.env`.

---

## Required vs Optional Keys For v1 Core

Required for v1 core:

```env
APP_URL or SITE_URL
DATABASE_URL or NETLIFY_DATABASE_URL
RESEND_API_KEY
EMAIL_FROM or MAGIC_LINK_FROM_EMAIL
AUTH_SECRET
```

Required only if Supabase provider is selected:

```env
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Optional in v1:

```env
APP_URL_ALIASES or SITE_URL_ALIASES
QUOTE_FROM_EMAIL
RECAPTCHA_SITE_KEY
RECAPTCHA_SECRET_KEY
```

Future module only:

```env
OPENAI_API_KEY
SERPAPI_API_KEY
SQUARE_ACCESS_TOKEN
SQUARE_API_VERSION
SQUARE_ENVIRONMENT
SQUARE_LOCATION_ID
SQUARE_WEBHOOK_SIGNATURE_KEY
```

---

## Deployment Notes

- Never expose service role keys to frontend.
- Never expose `DATABASE_URL` or `NETLIFY_DATABASE_URL` to frontend.
- Never expose `AUTH_SECRET` to frontend.
- Never expose `RESEND_API_KEY` to frontend.
- Never expose `RECAPTCHA_SECRET_KEY` to frontend.
- Never expose `SQUARE_ACCESS_TOKEN` to frontend.
- Only public frontend variables should use a clear public prefix.
- Installer should validate required env keys before setup continues.
- Installer should clearly show which keys were detected and which keys are missing.
- Installer should support custom key mapping so different users are not forced into Netlify naming.

---

# Installer System

The installer is required.

The installer should run when the app has not been configured yet.

Installer path:

```text
/install
```

## Installer Steps

### Step 1: System Check

Check:

- App URL exists
- Database connection works
- Email provider configured
- Required environment variables exist
- Migrations can run
- Storage path/bucket is available if needed

Show clear pass/fail results.

### Step 2: License Verification

Use Option B license system.

The installer asks for:

- License key
- Owner email
- Domain

The app sends these to the license server.

License server verifies:

- License exists
- Email matches
- Domain is allowed
- License is active
- Install count is valid

For v1, create the local license verification structure even if the real license server is added later.

Store license result locally in:

```text
license_installation
```

Fields:

- id
- license_key_hash
- licensed_email
- licensed_domain
- status
- verified_at
- expires_at
- last_checked_at
- created_at
- updated_at

### Step 3: Company Setup

Ask for:

- Company name
- Company phone
- Company email
- Company address
- Logo upload optional
- Website URL

Create company settings.

### Step 4: Owner Account

Ask for:

- Owner name
- Owner email

Create the owner user.

Assign Owner role.

Send magic login link.

### Step 5: Theme Setup

Allow:

- Light
- Dark
- System
- Custom

Default should be System.

System theme must follow device preference correctly.

### Step 6: Enable Core Modules

Automatically enable:

- Homepage
- Auth
- Dashboard
- Client Portal
- Work Requests
- Quotes
- Jobs / Work Orders
- Basic CMMS
- Settings

### Step 7: Finish

Disable installer unless explicitly re-enabled.

Redirect to login.

---

# Database Schema

Create migrations for all core tables.

## Core Tables

```text
app_settings
company_settings
license_installation
users
sessions
magic_links
roles
permissions
role_permissions
user_permissions
modules
module_settings
audit_logs
files
notifications
```

## Business Tables

```text
clients
client_contacts
properties
service_categories
work_requests
quotes
quote_items
jobs
work_orders
assets
pm_tasks
messages
```

---

# Default Roles

Create these roles automatically:

## Owner

Full access.

## Admin

Full business access except license ownership and destructive system settings.

## Office

Can manage clients, requests, quotes, schedules, and messages.

## Dispatcher

Can manage work orders and assigned jobs.

## Technician

Can view assigned work, update job status, add notes, upload photos.

## Client

Can view their own properties, requests, quotes, invoices, messages.

## Vendor

Limited future role.

---

# Permission System

Permissions must be database-driven.

Never hardcode access by checking only role name.

Use permissions like:

```text
settings.view
settings.manage
users.view
users.manage
roles.manage
clients.view
clients.manage
properties.view
properties.manage
requests.view
requests.manage
quotes.view
quotes.create
quotes.approve
quotes.manage
jobs.view
jobs.manage
work_orders.view
work_orders.manage
cmms.view
cmms.manage
modules.view
modules.manage
theme.manage
license.view
license.manage
```

Every page, API route, and module must check permissions.

---

# Module System

Create a module registry.

Each module has:

```text
id
name
version
description
status
required_permissions
routes
navigation_items
dashboard_widgets
install_migration
uninstall_allowed
```

Module statuses:

```text
enabled
disabled
installed
needs_setup
error
```

Modules should be drop-in friendly.

Future modules should be able to be added without rewriting the core app.

---

# v1 Required Modules

## 1. Homepage Module

Public website.

Pages:

- Home
- About
- Services
- Contact
- Request Estimate

Features:

- Company info from database
- Logo from settings
- Theme support
- Mobile responsive
- Request estimate form connected to work requests

## 2. Auth Module

Pages:

- Login
- Magic link sent
- Magic callback
- Logout
- Account

Features:

- Email magic link
- Resend integration
- Secure session cookie
- Role loading
- Permission loading

## 3. Dashboard Module

Role-based dashboard shell.

Owner dashboard:

- Open requests
- Pending quotes
- Active jobs
- Completed jobs
- Recent activity

Office dashboard:

- Requests
- Quotes
- Scheduling

Technician dashboard:

- Assigned work
- Job notes
- Status updates

Client dashboard:

- My properties
- My requests
- My quotes
- My messages

## 4. Client Portal Module

Client can:

- Login
- View properties
- Submit request
- View request status
- View quotes
- Approve/decline quote
- Send messages

## 5. Work Requests Module

Statuses:

```text
new
reviewing
quoted
approved
scheduled
in_progress
completed
cancelled
inactive
```

Features:

- Public request form
- Client request form
- Admin request list
- Status history
- Notes
- Photos

## 6. Quotes Module

Features:

- Create quote from request
- Add labor
- Add material
- Add custom line items
- Add notes
- Send to client
- Client approve/decline
- Convert approved quote to job

Quote statuses:

```text
draft
sent
viewed
approved
declined
expired
converted
```

## 7. Jobs / Work Orders Module

Features:

- Convert approved quote to job
- Assign technician
- Schedule date
- Job notes
- Photos
- Status updates
- Completion status

Job statuses:

```text
pending
scheduled
in_progress
waiting_parts
completed
cancelled
inactive
```

## 8. Basic CMMS Module

Keep v1 simple.

Features:

- Properties
- Assets
- Asset notes
- PM task shell
- Service history

Do not overbuild preventive maintenance in v1.

## 9. Settings Module

Settings pages:

- Company
- Branding
- Theme
- Users
- Roles
- Permissions
- Modules
- Email
- License
- Installer status

---

# Theme System

Theme must be stable and global.

Do not let each page invent its own theme.

Use CSS variables.

Required modes:

```text
light
dark
system
custom
```

System mode must use:

```css
prefers-color-scheme
```

Theme must apply to:

- Public homepage
- Login
- Dashboard
- Sidebar
- Mobile nav
- Cards
- Forms
- Buttons
- Modals

Custom theme should allow:

- Primary color
- Secondary color
- Background
- Card background
- Text color
- Border radius
- Button style

Save theme to database.

Theme must persist after navigation and refresh.

---

# Mobile / PWA Requirements

Mobile must be built first, not fixed later.

Required:

- Installable PWA
- App manifest
- Mobile bottom navigation
- Responsive dashboard
- No giant blank spaces
- No broken hidden menus
- Touch-friendly buttons
- Client portal works on phone
- Technician workflow works on phone

Mobile navigation should include:

- Home
- Dashboard
- Requests
- Quotes
- Jobs
- More

Role permissions decide which items appear.

---

# File Uploads

Support uploads for:

- Company logo
- Request photos
- Job photos
- Quote attachments

Storage provider should be abstracted.

v1 can support local/server storage first, with Supabase Storage or S3-style storage later.

---

# API Structure

Use clean API routes.

Example:

```text
/api/install/check
/api/install/license
/api/install/company
/api/install/owner
/api/auth/magic-link
/api/auth/callback
/api/auth/logout
/api/me
/api/modules
/api/settings/company
/api/settings/theme
/api/requests
/api/quotes
/api/jobs
/api/cmms/assets
```

Every protected API route must:

1. Verify session
2. Load user
3. Load permissions
4. Check required permission
5. Return clean error if denied

---

# Frontend Structure

Recommended structure:

```text
/src
  /app
  /components
  /components/ui
  /components/layout
  /core
    /auth
    /database
    /email
    /license
    /modules
    /permissions
    /theme
  /modules
    /homepage
    /client-portal
    /dashboard
    /work-requests
    /quotes
    /jobs
    /cmms
    /settings
  /server
    /api
    /services
  /styles
  /types
  /utils
/migrations
/scripts
/public
```

Do not create duplicate disconnected files.

---

# Deployment Targets

## Netlify

Must include:

```text
netlify.toml
```

Support:

- Netlify Functions
- Netlify environment variables
- Netlify build command
- Netlify redirects

## Vercel

Must include:

```text
vercel.json
```

Support:

- Vercel env vars
- Serverless routes

## Docker

Must include:

```text
Dockerfile
docker-compose.yml
```

Docker should run:

- App
- PostgreSQL
- Optional local mail test service

## VPS

Must include:

- Production build command
- Start command
- PM2 or Node service example
- Nginx reverse proxy example later

---

# License System Option B

Build a license provider interface.

```text
LicenseProvider
  verifyLicense()
  checkStatus()
  deactivateInstall()
```

For v1, use:

- Mock/local provider
- Remote-ready provider

License checks should happen:

- During install
- On admin license page
- Periodically by scheduled check if supported

If license check fails:

- Do not break public website immediately
- Restrict admin/module management
- Show license warning to Owner/Admin

---

# Security Requirements

Required:

- HTTP-only session cookies
- CSRF protection where needed
- Rate limit magic link requests
- Hash magic tokens in database
- Expire magic links
- One-time use magic links
- Sanitize user input
- Validate all API input
- Permission checks on server
- Audit log for admin actions

Audit log important events:

- Login
- Logout
- Magic link requested
- User created
- Role changed
- Permission changed
- Module enabled/disabled
- Quote approved
- Job completed
- License checked
- Installer completed

---

# Future AI Modules

Do not build AI in v1 core.

Prepare for future modules only.

Future modules:

## AI Quoting Module

Will use:

- OpenAI
- Trade labor database
- Material database
- Photo analysis
- Quote suggestions

## AI Troubleshooting Module

Will use:

- OpenAI
- Equipment symptoms
- Troubleshooting trees
- Technician notes
- CMMS asset history

The core app should only reserve:

```text
OPENAI_API_KEY=
AI_MODULES_ENABLED=false
```

Do not connect OpenAI yet unless the AI module is installed.

---

# Build Order

## Phase 1: Foundation

1. Create clean repo structure
2. Add TypeScript
3. Add styling system
4. Add environment loader
5. Add database adapter
6. Add migrations
7. Add installer shell

## Phase 2: Database + Auth

1. Create core tables
2. Create roles
3. Create permissions
4. Create magic link auth
5. Create sessions
6. Add Resend email
7. Add login/logout/account pages

## Phase 3: Installer

1. System check
2. License verification shell
3. Company setup
4. Owner setup
5. Theme setup
6. Module enablement
7. Installer lock

## Phase 4: Dashboard + Layout

1. App shell
2. Sidebar
3. Mobile nav
4. Role dashboards
5. Permission-based navigation
6. PWA support

## Phase 5: Core Modules

Build in this order:

1. Homepage
2. Client Portal
3. Work Requests
4. Quotes
5. Jobs / Work Orders
6. Basic CMMS
7. Settings

## Phase 6: Deployment

1. Netlify working
2. Vercel working
3. Docker working
4. VPS instructions
5. Production env validation

## Phase 7: QA

Test:

- Fresh install
- Existing install
- Magic login
- Owner dashboard
- Client dashboard
- Request creation
- Quote creation
- Quote approval
- Job conversion
- Theme switching
- Mobile PWA
- Permissions
- Module enable/disable
- Netlify deploy

---

# Definition of Done

ContractorOS v1 is complete only when:

- App installs from scratch
- Database connects automatically after env setup
- Migrations run cleanly
- Owner account is created
- Magic link login works
- Resend sends login email
- Roles and permissions work
- Dashboard loads by role
- Homepage works
- Client can submit request
- Admin can create quote
- Client can approve quote
- Approved quote converts to job
- Job can be completed
- Theme system persists
- Mobile layout works
- PWA installs
- Netlify deployment works
- No hardcoded demo data is required
- No broken blank dashboard space
- No disconnected duplicate modules
- Future modules can be dropped in cleanly

---

# Important Notes For Codex

Do not rush features.

Do not keep patching the old architecture.

Build the core correctly first.

The goal is not just to make the site work.

The goal is to create a 10/10 contractor operating system foundation that can grow into quoting, CMMS, client portal, AI estimating, AI troubleshooting, inventory, scheduling, and future business modules.

Prioritize stability, clean architecture, mobile usability, and permission safety over flashy features.
