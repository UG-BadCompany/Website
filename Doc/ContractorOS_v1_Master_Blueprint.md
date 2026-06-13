# ContractorOS v1 Master Blueprint

## Purpose

This is the single source of truth for the full ContractorOS v1 rewrite. It replaces all older PLAN.md, architecture, and build-spec drafts.

ContractorOS v1 is a contractor business operating system for service companies, maintenance companies, handyman businesses, and small contractors. It combines a public website, client portal, quoting, CMMS, work orders, invoicing, payments, communications, and future expansion support.

This is a full rewrite. Do not patch or copy the old architecture. The old T&A Contracting website may be used only as a business and visual reference.

---

# 1. Product Architecture

ContractorOS is divided into three layers:

1. ContractorOS Foundation — always installed and cannot be disabled.
2. ContractorOS Expansion Packs — officially supported add-ons that may be installed during setup or later.
3. Marketplace Modules — true optional third-party or future drop-in modules.

The previous wording of “core modules” is removed. Foundation components are part of the base product, not optional modules.

---

# 2. ContractorOS Foundation — Always Installed

These components must ship with every ContractorOS install and should not be treated as removable modules.

## 2.1 System Foundation

- Installer
- License verification
- Hosting provider detection
- Database provisioning
- Database migrations
- Environment key mapping
- User management
- Roles
- Permissions
- Audit logs
- Notifications
- File/media manager
- Settings
- Branding
- Theme system
- PWA support

## 2.2 Authentication Foundation

- Magic link login
- Resend email integration
- Session management
- Account page
- Logout
- Login activity
- Secure cookie handling
- Rate limiting for login requests

## 2.3 Website Foundation

- Homepage
- About page
- Services page
- Contact page
- Request Estimate page
- Thank You pages
- SEO settings
- Branding controls
- Full drag-and-drop homepage/page builder
- Theme editor

The homepage builder is Option B: full drag-and-drop builder.

Required builder features:

- Add/remove/reorder sections
- Drag-and-drop sections
- Section templates
- Hero blocks
- Service blocks
- Gallery blocks
- Before/after blocks
- Reviews/testimonials
- CTA sections
- Contact blocks
- Image/slideshow blocks
- Mobile preview
- Draft/save/publish workflow
- Persist content in database
- Render published homepage from database content

## 2.4 CRM Foundation

- Clients
- Client contacts
- Properties
- Notes
- Communication history
- Activity timeline
- Client status

## 2.5 Operations Foundation

- Work requests
- Scheduling shell
- Dispatching shell
- Jobs
- Work orders
- Technician notes
- Job photos
- Status tracking
- Completion workflow

## 2.6 Estimating Foundation

- Quotes
- Quote templates
- Labor items
- Material items
- Custom line items
- Revisions
- Client approval/decline
- Convert quote to job

## 2.7 Financial Foundation

Invoices and payments are part of the default Foundation. They are not future modules.

Required:

- Invoices
- Invoice templates
- Deposits
- Progress payments
- Final payments
- Partial payments
- Outstanding balances
- Customer statements
- Payment tracking
- Payment history
- Refund tracking
- Manual payment entry
- Invoice email sending
- Convert completed job to invoice

## 2.8 Payment Gateway Framework

The payment engine is part of Foundation. Individual gateways are provider adapters.

Default gateway:

- Square

Built-in supported gateways:

- Square
- Stripe
- PayPal
- Authorize.net
- Manual cash
- Manual check
- Configure later

Future marketplace gateways may include:

- QuickBooks Payments
- Clover
- Helcim
- ACH providers

Payment provider setup must be handled in installer and settings.

## 2.9 CMMS Foundation

- Assets
- Equipment
- Service history
- PM framework shell
- Asset notes
- Asset documents
- Property-to-asset relationship

Do not overbuild advanced PMs in v1. Build a clean structure that can expand later.

## 2.10 Communications Foundation

Customer communication must be built in by default.

Required:

- Advanced portal messaging
- Client ↔ Office ↔ Technician thread system
- Internal-only notes
- Customer-visible replies
- Quote emails
- Invoice emails
- Work request updates
- Job status updates
- Magic link emails
- Notification templates
- Communication history tied to client, request, quote, job, and invoice

Future:

- SMS provider adapters
- Voice notifications
- AI communication assistant

## 2.11 Service Catalog Foundation

Built-in editable service categories:

- HVAC
- Plumbing
- Electrical
- Handyman
- Appliance
- Maintenance
- General Repair

Rules:

- Owners can edit, disable, rename, and add categories.
- Avoid duplicate categories such as HVAC and mini splits as separate defaults.
- Avoid “Commercial Plumbing” style duplicates by default.
- Service catalog should later support AI estimating and troubleshooting modules.

## 2.12 Media Foundation

Media is part of Foundation because quotes, jobs, CMMS, and future AI need photos.

Required:

- Storage abstraction layer
- Company logo storage
- Request photos
- Job photos
- Before/after photos
- Quote attachments
- Invoice attachments
- Asset documents
- File metadata in database
- Permission checks for media access

Storage strategy: Option C — storage abstraction layer.

Supported providers should be adapter-based:

- Netlify storage / blobs where available
- Supabase Storage
- S3-compatible storage later
- Local development storage

Business logic must call the internal storage service only. Pages and API routes should not directly depend on a specific storage provider.

---

# 3. Expansion Packs — Official Optional Add-ons

Expansion Packs are officially supported by ContractorOS but not required in v1 Foundation.

Examples:

## 3.1 Inventory Expansion

- Inventory
- Trucks
- Warehouses
- Parts bins
- Purchase orders
- Stock adjustments

## 3.2 Workforce Expansion

- Time tracking
- GPS shell
- Payroll integration shell
- Technician productivity

## 3.3 Accounting Expansion

- QuickBooks sync
- Xero sync
- Accounting export

## 3.4 Reporting Expansion

- Advanced KPIs
- Forecasting
- Revenue reports
- Technician reports
- Service category reports

## 3.5 Customer Expansion

- Reviews
- Maintenance agreements
- Membership plans
- Customer campaigns

---

# 4. Marketplace Modules — True Drop-ins

Marketplace Modules are true optional drop-ins and may be first-party, third-party, or future AI tools.

Examples:

- AI Quoting
- AI Troubleshooting
- AI Dispatcher
- AI Work Order Assistant
- Vendor Portal
- Fleet tracking
- Industry-specific modules
- Custom integrations

Marketplace modules must use the module contract and cannot modify Foundation code directly.

---

# 5. Hosting Strategy

ContractorOS must support:

- Netlify
- Vercel
- Docker
- VPS/manual Node hosting
- Other/custom

Netlify is first-class because the current owner uses Netlify, but the system must not be locked to Netlify.

Docker should be supported, not required.

---

# 6. Database Strategy

ContractorOS supports both:

- Netlify Database / serverless Postgres for Netlify installs
- Standard PostgreSQL
- Supabase PostgreSQL

PostgreSQL is the database engine.

Supabase is treated as hosted PostgreSQL, not a hard lock-in.

## 6.1 Netlify Database First Flow

If hosting provider is Netlify, installer should recommend Netlify Database first.

Installer should attempt:

1. Detect existing Netlify Database integration.
2. If missing, guide/provision Netlify Database using the supported Netlify workflow.
3. Connect using the Netlify-native database adapter/package where possible.
4. Run migrations.
5. Create schema.
6. Continue installation.

For Netlify Database mode, the user should not be forced to manually paste a database URL.

Fallback options:

- Use existing PostgreSQL
- Use Supabase
- Use custom database

## 6.2 Database Adapter Rules

Create one internal database service.

Supported adapters:

- netlify_database
- postgres_url
- supabase_postgres

Application code must not care which adapter is active.

---

# 7. Installer Flow

Installer path:

```text
/install
```

The installer runs only when ContractorOS is not configured or when explicitly re-enabled by an owner.

## Step 1 — License Verification

Ask for:

- License key
- Owner email
- Domain

Use License Option B:

- License server URL
- Email + license + domain verification
- Installation tracking
- License status checks

For v1, build the provider interface even if the license server starts as mock/local.

## Step 2 — Hosting Provider

Ask:

```text
Which hosting provider are you using?
```

Options:

- Netlify
- Vercel
- Docker
- VPS
- Other/custom

## Step 3 — Database Setup

If Netlify:

- Recommend Netlify Database
- Allow external database fallback

If Netlify Database:

- Detect/provision database
- Run migrations
- Create schema
- Continue

If external:

- PostgreSQL
- Supabase
- Custom provider

## Step 4 — Environment Key Mapping

The installer should support provider presets and custom key mapping.

For Netlify, suggest common keys but do not require every user to use the same names.

Netlify suggested keys may include:

```env
SITE_URL=
URL=
DEPLOY_URL=
CONTEXT=
RESEND_API_KEY=
MAGIC_LINK_FROM_EMAIL=
AUTH_SECRET=
SQUARE_ACCESS_TOKEN=
SQUARE_APPLICATION_ID=
SQUARE_LOCATION_ID=
```

For custom hosting, allow:

```env
APP_URL=
DATABASE_URL=
RESEND_API_KEY=
EMAIL_FROM=
AUTH_SECRET=
```

Rule:

- The installer maps external environment keys to ContractorOS internal config names.
- ContractorOS internals should use normalized config names.
- Users may keep their provider-specific key names.

## Step 5 — Email Provider

Default:

- Resend

Future:

- SMTP
- SendGrid

For Resend:

```env
RESEND_API_KEY=
MAGIC_LINK_FROM_EMAIL=
```

Installer must send a test email before completing auth setup.

## Step 6 — Payment Provider

Default:

- Square

Options:

- Square
- Stripe
- PayPal
- Authorize.net
- Manual payments
- Configure later

Payment env keys by provider:

### Square

```env
SQUARE_ACCESS_TOKEN=
SQUARE_APPLICATION_ID=
SQUARE_LOCATION_ID=
SQUARE_ENVIRONMENT=sandbox_or_production
SQUARE_WEBHOOK_SIGNATURE_KEY=
```

### Stripe

```env
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

### PayPal

```env
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_ENVIRONMENT=sandbox_or_live
```

### Authorize.net

```env
AUTHORIZE_API_LOGIN_ID=
AUTHORIZE_TRANSACTION_KEY=
AUTHORIZE_ENVIRONMENT=sandbox_or_production
```

### Manual Payments

No external payment keys required.

## Step 7 — Company Setup

Ask for:

- Company name
- Company email
- Company phone
- Address
- Website URL
- Logo optional
- Time zone

## Step 8 — Owner Setup

Ask for:

- Owner name
- Owner email

Create owner user, assign Owner role, send magic login link.

## Step 9 — Theme Setup

Modes:

- Light
- Dark
- System
- Custom

Default: System.

System mode must follow device preference using `prefers-color-scheme`.

## Step 10 — Install ContractorOS Foundation

Automatically create/install:

- Tables
- Migrations
- Default roles
- Default permissions
- Default navigation
- Default dashboards
- Default email templates
- Default service categories
- Default page builder content
- Payment framework
- Storage provider configuration
- Core settings

## Step 11 — Select Expansion Packs

Optional during setup:

- Inventory Expansion
- Workforce Expansion
- Accounting Expansion
- Reporting Expansion
- Customer Expansion

Default v1 recommendation: none selected unless user chooses them.

## Step 12 — Finish

- Lock installer
- Redirect to login
- Send owner magic link
- Show setup summary

---

# 8. Required Routes / Pages

## Public Website

```text
/
/about
/services
/contact
/request-estimate
/thank-you
```

## Auth

```text
/login
/magic-link-sent
/auth/callback
/logout
/account
```

## Dashboard

```text
/dashboard
```

## Client Portal

```text
/portal
/portal/properties
/portal/requests
/portal/quotes
/portal/invoices
/portal/messages
```

## Admin/Foundation App

```text
/clients
/clients/:id
/properties
/properties/:id
/requests
/requests/new
/requests/:id
/quotes
/quotes/new
/quotes/:id
/jobs
/jobs/:id
/work-orders
/work-orders/:id
/invoices
/invoices/new
/invoices/:id
/payments
/assets
/assets/:id
/messages
/settings
/settings/company
/settings/theme
/settings/users
/settings/roles
/settings/permissions
/settings/foundation
/settings/expansion-packs
/settings/payment
/settings/email
/settings/license
/settings/media
/settings/homepage-builder
```

## Installer

```text
/install
/install/license
/install/hosting
/install/database
/install/environment
/install/email
/install/payment
/install/company
/install/owner
/install/theme
/install/foundation
/install/expansion-packs
/install/finish
```

---

# 9. Dashboard Requirements

Dashboard widgets must be customizable.

Users with permission may:

- Add widgets
- Remove widgets
- Move widgets
- Resize widgets
- Save layout

Dashboard layouts should be role-based with user-level overrides.

Default dashboards:

## Owner Dashboard

- Open requests
- Pending quotes
- Active jobs
- Unpaid invoices
- Recent payments
- Recent activity

## Admin / Office Dashboard

- New requests
- Quotes needing follow-up
- Jobs needing scheduling
- Recent messages

## Technician Dashboard

- Assigned jobs
- Work orders
- Job notes
- Upload photos
- Complete job button

## Client Dashboard

- My properties
- My requests
- My quotes
- My invoices
- My messages

---

# 10. Roles and Permissions

Default roles:

- Owner
- Admin
- Office
- Dispatcher
- Technician
- Client
- Vendor

Permission system must be database-driven.

Never hardcode only by role name.

Example permissions:

```text
settings.view
settings.manage
users.view
users.manage
roles.manage
permissions.manage
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
invoices.view
invoices.manage
payments.view
payments.manage
cmms.view
cmms.manage
messages.view
messages.manage
media.view
media.manage
homepage.manage
theme.manage
license.view
license.manage
expansion_packs.view
expansion_packs.manage
```

Every protected page and API route must verify:

1. Session
2. User
3. Role
4. Permission

---

# 11. Business Workflow Requirements

Minimum v1 working flow:

1. Visitor submits request estimate.
2. Request is created.
3. Admin/Office sees request.
4. Admin creates quote.
5. Quote is sent to client.
6. Client logs in by magic link.
7. Client approves or declines quote.
8. Approved quote converts to job.
9. Job/work order is assigned.
10. Technician updates job.
11. Job is completed.
12. Invoice is created.
13. Client pays invoice or manual payment is recorded.
14. Payment history and communication history are saved.

---

# 12. Database Schema Groups

Create migrations for these groups.

## System

```text
app_settings
company_settings
license_installation
installer_state
environment_key_mappings
audit_logs
notifications
files
media_assets
```

## Auth / Users

```text
users
sessions
magic_links
roles
permissions
role_permissions
user_permissions
login_activity
```

## Website / Builder

```text
pages
page_versions
page_sections
theme_settings
seo_settings
```

## CRM

```text
clients
client_contacts
properties
client_notes
activity_timeline
```

## Operations

```text
service_categories
work_requests
work_request_status_history
jobs
job_status_history
work_orders
technician_notes
schedules
```

## Estimating

```text
quotes
quote_items
quote_revisions
quote_templates
labor_items
material_items
```

## Financial

```text
invoices
invoice_items
invoice_templates
payments
payment_transactions
payment_methods
refunds
customer_statements
payment_provider_settings
```

## CMMS

```text
assets
asset_documents
asset_notes
pm_tasks
service_history
```

## Communications

```text
message_threads
messages
message_participants
email_templates
email_logs
notification_preferences
```

## Expansion / Marketplace

```text
expansion_packs
marketplace_modules
module_settings
module_events
```

---

# 13. API Route Groups

## Installer

```text
/api/install/check
/api/install/license
/api/install/hosting
/api/install/database
/api/install/environment
/api/install/email-test
/api/install/payment-test
/api/install/company
/api/install/owner
/api/install/theme
/api/install/foundation
/api/install/finish
```

## Auth

```text
/api/auth/magic-link
/api/auth/callback
/api/auth/logout
/api/me
```

## Business

```text
/api/clients
/api/properties
/api/requests
/api/quotes
/api/jobs
/api/work-orders
/api/invoices
/api/payments
/api/assets
/api/messages
/api/media
```

## Settings

```text
/api/settings/company
/api/settings/theme
/api/settings/users
/api/settings/roles
/api/settings/permissions
/api/settings/payment
/api/settings/email
/api/settings/license
/api/settings/homepage-builder
```

---

# 14. Payment Rules

- Square is the default recommended provider.
- Payment provider is selected during installer.
- Provider can be changed later from settings.
- Payment provider credentials must never be exposed to frontend.
- Manual cash/check payments must always be available.
- Online payments should create payment transaction records.
- Webhooks should update invoice/payment status when supported.
- Failed payments should not mark invoices paid.

---

# 15. Theme Rules

Theme must apply globally to:

- Public website
- Login
- Installer
- Dashboard
- Client portal
- Sidebar
- Mobile nav
- Forms
- Cards
- Modals
- Builder preview

Use CSS variables.

Theme modes:

- light
- dark
- system
- custom

System must follow OS preference.

Theme settings must persist across navigation and refresh.

---

# 16. PWA / Mobile Requirements

Mobile-first.

Required:

- App manifest
- Installable PWA
- Mobile bottom navigation
- Touch-friendly UI
- Responsive dashboard
- No giant blank spaces
- Client portal works on phone
- Technician workflow works on phone
- Page builder must have mobile preview

Mobile navigation should be permission-aware.

---

# 17. Security Requirements

Required:

- HTTP-only secure session cookies
- CSRF protection where applicable
- Rate limit magic link requests
- Hash magic link tokens in database
- Magic links expire
- Magic links are one-time use
- Validate all API input
- Sanitize user input
- Server-side permission checks
- Audit logs for important actions
- Never expose secrets in frontend

Audit log events:

- Login
- Logout
- Magic link requested
- User created
- Role changed
- Permission changed
- License checked
- Installer completed
- Theme changed
- Page published
- Quote sent
- Quote approved
- Invoice sent
- Payment received
- Job completed
- Expansion pack installed
- Marketplace module installed

---

# 18. Future AI Preparation

Do not build AI features into Foundation v1.

Prepare for future Marketplace Modules:

- AI Quoting
- AI Troubleshooting
- AI Dispatcher
- AI Work Order Assistant

Reserve config keys but do not require them:

```env
OPENAI_API_KEY=
AI_MODULES_ENABLED=false
```

AI modules should later use:

- Service catalog
- Quote data
- Job history
- CMMS assets
- Photos/media
- Communication history
- Handyman estimating playbook

---

# 19. Build Order

## Phase 1 — Clean Foundation

1. Create clean repo structure.
2. Add TypeScript.
3. Add UI/component system.
4. Add theme tokens.
5. Add environment/config service.
6. Add database adapter service.
7. Add storage adapter service.
8. Add installer shell.

## Phase 2 — Database + Installer

1. Create migrations.
2. Add Netlify Database adapter.
3. Add PostgreSQL URL adapter.
4. Add Supabase PostgreSQL adapter.
5. Build installer flow.
6. Add environment key mapping.
7. Add license provider interface.

## Phase 3 — Auth + Roles

1. Add users.
2. Add roles.
3. Add permissions.
4. Add sessions.
5. Add magic links.
6. Add Resend.
7. Build login flow.

## Phase 4 — Foundation UI

1. Public website.
2. Full homepage builder.
3. Dashboard shell.
4. Client portal shell.
5. Settings.
6. PWA/mobile navigation.

## Phase 5 — Business Flow

1. CRM.
2. Work requests.
3. Quotes.
4. Jobs/work orders.
5. Invoices.
6. Payments.
7. Communications.
8. Basic CMMS.

## Phase 6 — Expansion + Marketplace Framework

1. Expansion pack registry.
2. Marketplace module registry.
3. Module contract.
4. Provider event hooks.
5. Safe install/uninstall rules.

## Phase 7 — Deployment

1. Netlify working.
2. Vercel working.
3. Docker working.
4. VPS instructions.
5. Production validation.

## Phase 8 — QA

Test:

- Fresh install
- Netlify Database flow
- External PostgreSQL flow
- Supabase flow
- Resend magic link
- Owner dashboard
- Client dashboard
- Homepage builder publish
- Theme persistence
- Request to quote to job to invoice to payment
- File upload
- Advanced messaging
- Permission checks
- Mobile/PWA

---

# 20. Definition of Done

ContractorOS v1 is complete only when:

- App installs from scratch.
- Netlify can provision/connect database without manual database URL entry.
- External PostgreSQL/Supabase can also work.
- Migrations run cleanly.
- Owner account is created.
- Resend magic link login works.
- Roles and permissions work.
- Foundation installs as one base product, not optional modules.
- Homepage builder works and publishes content.
- Dashboard widgets can be added, moved, resized, and saved.
- Client can submit request.
- Admin can create quote.
- Client can approve quote.
- Approved quote converts to job.
- Job can be completed.
- Invoice can be created.
- Payment can be accepted or manually recorded.
- Communication history is saved.
- Media uploads work through storage abstraction.
- Theme system persists.
- Mobile layout works.
- PWA installs.
- Expansion/marketplace framework exists.
- No hardcoded demo data is required.
- No broken blank dashboard space.
- No disconnected duplicate modules.

---

# 21. Codex Implementation Rules

- Do not patch the old project structure.
- Do not build random disconnected files.
- Do not hardcode roles instead of checking permissions.
- Do not make Netlify the only supported platform.
- Do not make Docker required.
- Do not treat Foundation components as optional modules.
- Do not make invoices/payments future add-ons.
- Do not expose secret keys to the browser.
- Do not skip installer validation.
- Do not overbuild AI in v1.
- Build the Foundation first, then Expansion/Marketplace support.

ContractorOS v1 should feel like a complete contractor operating system from day one.

