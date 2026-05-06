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
