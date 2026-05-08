# Netlify Database migrations

Automatic Netlify Database migrations are intentionally disabled for this site.

Netlify applies migrations automatically only from `netlify/database/migrations`. This
project keeps the SQL history in `netlify/database/manual-migrations` instead because
the production database already has a legacy migration history with renamed and
conflicting numeric prefixes. Leaving those files in the automatic directory causes
Netlify's deploy lifecycle to fail before the site can publish.

Use `npm run prebuild` to validate the archived migration history before deploying.
If future schema changes are needed, apply them manually/out-of-band to the Netlify
Database first, then add the SQL here for auditability.
