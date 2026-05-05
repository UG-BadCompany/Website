# Job Completed Check

## Current Completed Slice

- [x] Read `WEBSITE_PLAN.md` before coding each implementation pass.
- [x] Created a Next.js application foundation for the T&A Contracting site.
- [x] Built the Phase 1 public marketing website pages: Home, Services, About, Gallery, Contact, Request Estimate, and Client Login entry.
- [x] Updated service-area copy for Phoenix, Goodyear, Surprise, Scottsdale, Chandler, and surrounding Arizona communities.
- [x] Removed fake phone/email links because the company phone number and business email are not confirmed yet.
- [x] Replaced local JSON-file persistence with Supabase/PostgreSQL repositories and a production migration.
- [x] Added Row Level Security policies for client-owned records, worker/admin access, admin-only financial writes, notifications, and audit logs.
- [x] Configured production environment variables for deployed site URL, Supabase, object storage buckets, Resend, Stripe, and admin notifications.
- [x] Connected file uploads and generated documents to Supabase Storage buckets.
- [x] Replaced custom password hashing/session cookies with Supabase Auth signup, login, password reset, and server-side user lookup.
- [x] Connected request, login, registration, password reset, quote, invoice, payment, schedule, worker status, message, and file-upload forms to production-backed route handlers.
- [x] Replaced lightweight text PDFs with branded React PDF quote and invoice PDFs.
- [x] Replaced payment placeholder behavior with real Stripe Checkout Session creation.
- [x] Added a verified Stripe webhook endpoint for completed and expired Checkout sessions.
- [x] Added Resend transactional email sending with notification persistence and PDF attachment support.
- [x] Added production setup documentation for Supabase, Resend, Stripe, deployed site URL, and local environment configuration.
- [x] Added `.gitignore` protections for local dependencies, builds, environment files, and runtime data.
- [x] Created this job completed check file.

## Not Yet Complete / Next Work

- [ ] Replace placeholder contact status with confirmed phone number and business email when available.
- [ ] Apply `supabase/migrations/0001_initial_schema.sql` to the production Supabase project.
- [ ] Add real Stripe, Supabase, Resend, and site URL secrets to the production host.
- [ ] Test Supabase Auth email confirmation/reset templates against the deployed domain.
- [ ] Run Stripe webhook forwarding/test events against `/api/stripe/webhook` after secrets are configured.
- [ ] Add real project photos, testimonials, Google review links, and production deployment configuration.
