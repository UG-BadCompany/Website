# Production Setup

This project is wired for production services instead of local JSON persistence.

## Required services

1. **Supabase PostgreSQL + Auth + Storage**
   - Create a Supabase project.
   - Apply `supabase/migrations/0001_initial_schema.sql` in the SQL editor or with the Supabase CLI.
   - Create/confirm storage buckets named `job-files` and `generated-documents`.
   - Copy `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` into the production host.

2. **Resend**
   - Verify the sending domain.
   - Set `RESEND_API_KEY`, `RESEND_FROM`, and `ADMIN_NOTIFICATION_EMAIL`.
   - Quote emails attach generated branded PDFs when a quote is sent.

3. **Stripe**
   - Set `STRIPE_SECRET_KEY`.
   - Add a webhook endpoint for `/api/stripe/webhook`.
   - Set `STRIPE_WEBHOOK_SECRET` from the Stripe webhook endpoint.
   - The checkout route creates hosted Stripe Checkout Sessions, and the webhook marks invoices/payments paid on `checkout.session.completed`.

4. **Deployment URL**
   - Set `NEXT_PUBLIC_SITE_URL` to the live website URL so Stripe redirects and emailed links point to production.

## Local development

Copy `.env.example` to `.env.local` and fill in sandbox/test keys. Do not commit real secrets.
