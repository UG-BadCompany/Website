# Fresh PR Notes

Use this when GitHub says the old pull request conflicts are too complex to resolve in the web editor.

## Why this fresh PR exists

The current `work` branch contains the latest T&A Contracting website and portal code, including the Vercel request-estimate parser fix. A fresh PR should be opened from this latest branch state instead of trying to repair the older conflicted PR in GitHub's web editor.

## Current coding checkpoint

- Public marketing website pages are in place.
- Client, admin, worker, and quote review portal routes are in place.
- Supabase/PostgreSQL persistence and the initial production migration are in place.
- Supabase Auth, Supabase Storage, Resend email, branded React PDFs, Stripe Checkout, and the Stripe webhook route are in place.
- The request-estimate page JSX was rewritten to avoid the Vercel parser failure.
- Portal dashboard pages are marked dynamic to avoid static pre-rendering of Supabase-backed data.

## Recommended GitHub flow

1. Close the old conflicted PR without merging it.
2. Push this latest branch state to GitHub.
3. Open a brand-new PR from this branch into `main`.
4. In Vercel, run a fresh preview deployment from the new PR.
5. If Vercel fails again, use the newest build log as the next coding checkpoint.

## Production setup still required

- Apply `supabase/migrations/0001_initial_schema.sql` to the production Supabase project.
- Add the real Supabase, Stripe, Resend, site URL, and admin email environment variables to Vercel.
- Configure Stripe webhook forwarding to `/api/stripe/webhook`.
- Replace the placeholder contact status after the real company phone number and email are available.
