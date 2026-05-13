# Netlify Deployment Fix

The latest Netlify logs show the build completes, but the deploy fails because Netlify is still configured to publish `out`:

```text
Custom publish path detected. Proceeding with the specified path: 'out'
Deploy did not succeed: Deploy directory 'out' does not exist
publish: /opt/build/repo/out
```

Because the Netlify dashboard is still forcing `out`, this repo now matches that setting instead of fighting it.

## Current Netlify settings

Use these settings in Netlify:

- **Build command:** `npm run build`
- **Publish directory:** `out`
- **Node version:** `20`

These settings are committed in `netlify.toml`.

## Why this fixes the error

The build now creates the same folder Netlify is trying to publish:

1. `npm run build` validates `public/index.html`.
2. The build removes any stale `out/` folder.
3. The build copies `public/` into `out/`.
4. Netlify publishes `out/` successfully.

A `postbuild` safety script also verifies `out/index.html` exists. If `out/` is missing but `public/index.html` exists, it recreates `out/` from `public/`.

## Local verification

Run:

```bash
rm -rf out
npm run build
ls -la out
```

Expected result:

```text
Static site built successfully. Netlify will publish ./out
Netlify publish directory verified: ./out
```

`out/index.html` should exist.

To preview locally:

```bash
npm start
```

Then open <http://localhost:3000>.


## Committed `out/` fallback

The `out/` directory is intentionally committed in this repository. This is usually not necessary for generated static sites, but it is being committed here because the Netlify logs prove the deploy is still forcing `out` as the publish path.

This gives Netlify two ways to succeed:

1. If `npm run build` from this commit runs, it regenerates `out/` from `public/`.
2. If Netlify runs a stale build command that does not generate `out/`, the committed `out/index.html` still exists for the deploy step.

After the Netlify site is confirmed to deploy from the correct branch and build config, this fallback can be removed later if desired.

## Important branch/config warning

If a future Netlify log still shows Next.js routes like `/portal/admin`, `/_not-found`, or headers for `/_next/static/*`, then Netlify is deploying a different branch or a different version of the repository than this static fix.

Check these in Netlify:

1. Go to **Site configuration → Build & deploy → Continuous deployment**.
2. Confirm Netlify is deploying the Git branch that contains this commit.
3. Confirm the repository is `UG-BadCompany/Website` if that is the intended repo.
4. Keep **Publish directory** as `out` for this fix.
5. Keep **Build command** as `npm run build`.
6. Trigger **Clear cache and deploy site**.

## Future Next.js version

If the site is later converted back into a full Next.js application, choose one deployment mode:

1. **Static export:** configure Next.js with `output: 'export'` so `next build` creates `out/`.
2. **Netlify Next.js runtime:** remove `NETLIFY_NEXT_PLUGIN_SKIP`, remove static `out` publishing, and let the Netlify Next.js runtime handle deployment.

Do not mix both modes. The current production fix is static `out` publishing because that is what the Netlify logs show the site is using.


## Netlify Database duplicate migration number

Netlify Database requires each migration filename to start with a unique four-digit number. If deploy logs still list `0004_custom_roles_permissions.sql` alongside `0004_work_order_schedule.sql`, the build checkout is stale or the deployed branch still contains the old custom-role migration. The custom role migration has been renamed to `0005_custom_roles_permissions.sql`; `0004_custom_roles_permissions.sql` should not exist.

Before redeploying, verify the branch only has one migration per number:

```bash
node scripts/check-netlify-migrations.mjs
```

If Netlify logs still show the deleted `0004_custom_roles_permissions.sql`, the prebuild migration check removes that stale cached file when `0005_custom_roles_permissions.sql` is present. If Netlify Database still reports the duplicate before the prebuild can run, trigger **Clear cache and deploy site** in Netlify so the old migration file is removed from the cached checkout before Netlify Database validates migrations.

## Replacement PR workflow

If an earlier pull request becomes hard to review or is pointed at the wrong branch, create a fresh replacement branch from the repository base and commit this Netlify-ready site as a new single commit. The replacement PR should still use the same Netlify settings above: `npm run build`, publish directory `out`, and Node `20`.
