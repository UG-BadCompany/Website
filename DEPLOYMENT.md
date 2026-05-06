# Netlify Deployment Fix

The Netlify error was caused by Netlify trying to publish a directory named `out` that was not present in the deployed checkout.

This repo now uses the most fail-safe static Netlify setup:

- Netlify publishes `public/` directly.
- `public/` is committed to Git.
- `npm run build` validates that `public/index.html` exists.
- The deploy no longer depends on a generated `out/` folder.

## Current Netlify settings

Use these settings in Netlify:

- **Build command:** `npm run build`
- **Publish directory:** `public`
- **Node version:** `20`

These settings are committed in `netlify.toml`, so Netlify should read them automatically from the repository.

## Why this fixes the error

Netlify was failing with:

```text
Deploy did not succeed: Deploy directory 'out' does not exist
```

Publishing `public/` directly avoids that failure because `public/index.html` is committed to the repository and exists before the build starts.

## If Netlify still shows `publish: /opt/build/repo/out`

That means the deploy is still using an old configuration or an override in the Netlify dashboard.

Check these in Netlify:

1. Go to **Site configuration → Build & deploy → Continuous deployment**.
2. Confirm the connected Git branch is the branch containing this commit.
3. Set **Publish directory** to `public`.
4. Set **Build command** to `npm run build`.
5. Remove any forced `out` publish setting.
6. In **Plugins**, remove `@netlify/plugin-nextjs` for this static version.
7. Remove `NETLIFY_NEXT_PLUGIN_SKIP`; it is not needed for this static deploy.
8. Trigger **Clear cache and deploy site**.

## Local verification

Run this before pushing changes:

```bash
npm run build
```

A successful build prints:

```text
Static site validated successfully. Netlify will publish ./public
```

To preview locally:

```bash
npm start
```

Then open <http://localhost:3000>.

## Important note for future Next.js conversion

This current fix deploys the site as a static website. If the project is later converted into the full Next.js client/admin/worker portal, update Netlify to one of these approaches:

1. **Full Next.js on Netlify:** use the Next.js runtime/plugin and the Netlify-recommended Next.js settings.
2. **Static Next.js export:** configure Next.js static export so `next build` creates `out/`, then use `out` as the publish directory.

Do not mix the two approaches. The reported error happens when Netlify is configured for a static `out` deploy, but the build does not generate or commit `out`.
