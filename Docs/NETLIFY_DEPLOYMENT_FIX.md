# Netlify Deployment Fix: Remove Next.js Runtime Plugin

This site is **not** a Next.js application. It is a static frontend deployed from `dist` with Netlify Functions in `netlify/functions`.

The repository configuration explicitly skips the Next.js runtime, but the failing Netlify log shows the Next.js plugin is installed from the Netlify UI:

```text
Using Next.js Runtime - v5.15.10
plugins:
  - origin: ui
    package: "@netlify/plugin-nextjs"
```

Because the plugin origin is `ui`, repository changes alone may not remove it. Remove the installed UI plugin before redeploying.

## Remove the plugin in Netlify UI

1. Open the Netlify site dashboard.
2. Go to **Site settings**.
3. Go to **Build & deploy**.
4. Go to **Plugins**.
5. Remove **@netlify/plugin-nextjs** / **Next.js Runtime**.
6. Trigger a fresh deploy.

## Alternative Netlify App path

1. Open the Netlify site in the Netlify App.
2. Go to **Integrations / Plugins**.
3. Open **Installed plugins**.
4. Remove the **Next.js Runtime** plugin.
5. Trigger a fresh deploy.

## Expected deploy behavior

After the UI plugin is removed, Netlify should:

1. Install dependencies.
2. Run `npm run build`.
3. Build the static app into `dist`.
4. Deploy Netlify Functions from `netlify/functions`.
5. Skip the Next.js Runtime completely.
6. Complete successfully.
