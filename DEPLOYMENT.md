# Netlify Deployment Fix

The Netlify error was caused by the deploy step looking for a publish directory named `out` when that directory did not exist after the build.

This repository now fixes that by making the build command create the same directory Netlify publishes.

## Current Netlify settings

Use these settings in Netlify:

- **Build command:** `npm run build`
- **Publish directory:** `out`
- **Node version:** `20`

These settings are committed in `netlify.toml`, so Netlify should read them automatically from the repository.

## Why this fixes the error

Netlify was failing with:

```text
Deploy did not succeed: Deploy directory 'out' does not exist
```

The build script now copies the static website from `public/` into `out/` every time `npm run build` runs. That means Netlify has a real deploy directory to publish.

## Local verification

Run this before pushing changes:

```bash
npm run build
```

A successful build prints:

```text
Static site built successfully into ./out
```

To preview locally:

```bash
npm start
```

Then open <http://localhost:3000>.

## Important note for future Next.js conversion

This current fix deploys the site as a static website. If the project is later converted into the full Next.js client/admin/worker portal, update Netlify to one of these approaches:

1. **Full Next.js on Netlify:** use the Next.js plugin/runtime, remove `NETLIFY_NEXT_PLUGIN_SKIP`, and use the Netlify-recommended Next.js publish setting.
2. **Static Next.js export:** configure Next.js static export so `next build` creates `out/`, then keep the publish directory as `out`.

Do not mix the two approaches. The error usually happens when Netlify is configured for a static `out` deploy, but the build does not generate `out`.
