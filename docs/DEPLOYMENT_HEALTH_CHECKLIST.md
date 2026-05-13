# Deployment Health Checklist

Use this checklist before merging deployment-sensitive changes and immediately after a Netlify deploy. It is intentionally short so each future PR can stay small and easy to review.

## Before merging a PR

1. **Confirm the branch is the one Netlify will deploy.**
   - Production deploys should come from the configured production branch.
   - Deploy previews should show the expected PR number and branch name in the Netlify log.
2. **Run the local build checks.**
   ```bash
   npm test
   npm run build
   ```
3. **Verify migration validation runs as a script.**
   ```bash
   node scripts/check-netlify-migrations.mjs
   ```
4. **Keep migration changes small.**
   - Do not edit SQL files that Netlify has already applied.
   - Do not rename old migrations after they have been applied.
   - Add one new migration per schema change and keep its four-digit prefix unique.
5. **Avoid mixing unrelated work.**
   - UI-only work should not include migration changes.
   - Database/API changes should include targeted tests.
   - Generated `out/` files should match `public/` after `npm run build`.

## Netlify log checks

A healthy deploy should show:

- `build.command from netlify.toml`
- `$ npm run build`
- `Netlify Database migrations verified:`
- `Static site built successfully. Netlify will publish ./out`
- `Netlify publish directory verified: ./out`

If the log shows old migration names or old script code that is not in the current branch, trigger **Clear cache and deploy site** in Netlify before changing more code.

## After deploy

1. Open the production site and verify the homepage loads.
2. Open `/login/` and confirm the login page renders.
3. Sign in with a test/admin account if available.
4. Check dashboard views that changed in the PR.
5. If the PR touched functions, verify at least one successful function request in Netlify logs.

## Current migration rule

The current repository expects Netlify automatic migrations to load from `netlify/database/migrations`. The prebuild script removes only the stale cached `0004_custom_roles_permissions.sql` file when the canonical `0005_custom_roles_permissions.sql` migration is present.

If future work needs a database schema change, prefer this sequence:

1. Add a new SQL migration with the next unused four-digit prefix.
2. Add or update tests for the API behavior that needs the schema.
3. Run `node scripts/check-netlify-migrations.mjs` locally.
4. Run `npm test` and `npm run build`.
5. Merge only after the deploy preview reaches the publish step.
