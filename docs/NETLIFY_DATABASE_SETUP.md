# Netlify Database Setup

This project is configured for Netlify hosting and Netlify Database.

Netlify Database is managed Postgres built into Netlify. Netlify handles provisioning, database branching for deploy previews, and automatic migrations when migration files live in `netlify/database/migrations/`.

## Current migration

The first migration is:

```text
netlify/database/migrations/0001_initial_portal_schema.sql
```

It creates the first portal tables:

- `app_users`
- `roles`
- `user_roles`
- `properties`
- `job_requests`
- `files`
- `audit_events`

## Auth mapping approach

Because this project is using Netlify Database, the schema uses normal Postgres tables and maps external auth identities into `app_users` with:

- `auth_provider`
- `auth_subject`
- `email`

## Local / Netlify setup steps

1. Enable Netlify Database for the site in Netlify.
2. Install or update Netlify CLI if needed.
3. Run `netlify database init` if the project has not been initialized for Netlify Database yet.
4. Keep schema changes in `netlify/database/migrations/`.
5. Add required environment variables in Netlify.
6. Use Netlify Functions for server-side database reads/writes.

## Important security note

Browser JavaScript should not connect directly to the database with privileged credentials.

The app should use Netlify Functions for database-backed actions such as:

- creating job requests,
- loading role-based dashboard data,
- assigning workers,
- sending quotes,
- generating invoices,
- writing audit events.

## Seeded default admin

The initial migration seeds this admin email:

```text
thomas.debacker.ii@gmail.com
```

This creates an `app_users` row and assigns the `admin` role. It does **not** create a password. The future auth provider should verify this same email and then update/link the app user with the provider subject.

## Public job request endpoint

The public estimate form progressively enhances to `POST /api/job-requests` when JavaScript and the Netlify Function are available.

- The function accepts JSON with `name`, `phone`, `email`, `city`, `service`, `timeframe`, `description`, and the Netlify honeypot field `bot-field`.
- `name`, `phone`, `service`, and `description` are required.
- Successful database writes insert a `job_requests` row and a matching `audit_events` row with `event_type = 'job_request.created'`.
- Requests with file uploads intentionally continue through the static Netlify Forms path so uploaded files are still captured.
- If the function or database is unavailable, the browser falls back to the existing Netlify Form submission and redirects to `/thank-you/`.

Install project dependencies before deploying so the function can import Netlify Database helpers:

```sh
npm install
```

The endpoint uses `@netlify/database`, which automatically selects the correct Netlify Database branch for production deploys and deploy previews.

## Magic-link auth tables

The second migration is:

```text
netlify/database/migrations/0002_magic_link_auth.sql
```

It adds first-party passwordless login storage:

- `auth_magic_links` for expiring, single-use magic-link token hashes.
- `auth_sessions` for HttpOnly session cookie hashes.

Only SHA-256 hashes are stored for magic-link tokens and session tokens. Raw tokens exist only in the emailed link or browser cookie.

## Request account and quote migration

The third migration is:

```text
netlify/database/migrations/0003_request_accounts_quotes.sql
```

It adds `job_requests.street_address` and a first `quotes` table. Public Request Work submissions now create or update the client account, assign the `client` role, create a property row, and then create the job request linked to both records.
