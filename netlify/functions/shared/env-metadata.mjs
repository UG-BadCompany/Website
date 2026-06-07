const setup = (key, label, category, required, secret, description, helpUrl, setupSteps, placeholder, canTest = false, publicSafe = false, generatedValueHint = null) => ({
  key, label, category, required, secret, publicSafe, description, helpUrl, setupSteps, placeholder, canTest, generatedValueHint
});

export const ENV_CATEGORIES = [
  { key: 'Required', label: 'Required', expandedByDefault: true, description: 'Only the values needed to launch the installer and send owner/client emails.' },
  { key: 'AI', label: 'AI', expandedByDefault: false, description: 'Optional AI quote, photo estimate, and troubleshooting services.' },
  { key: 'Payments', label: 'Payments', expandedByDefault: false, description: 'Optional Square payment links and webhook verification.' },
  { key: 'Security', label: 'Security', expandedByDefault: false, description: 'Optional spam protection and security controls.' },
  { key: 'Advanced', label: 'Advanced', expandedByDefault: false, description: 'Optional delivery, maps, file, and cache controls.' },
  { key: 'Future', label: 'Future', expandedByDefault: false, description: 'Future licensing and module automation controls.' }
];

export const ENV_METADATA = [
  setup('SITE_URL', 'Site URL', 'Required', true, false, 'Canonical URL for this specific deployment. Used for magic links, public pages, callbacks, and webhook guidance.', 'https://docs.netlify.com/domains-https/custom-domains/', ['Use the current deployment URL shown by your browser or configure a custom domain in Netlify.', 'Confirm the domain opens this website.', 'Paste the full URL including https://.', 'The installer uses this domain to generate deployment-specific URLs.'], 'https://your-domain.com', true, true, 'origin'),
  setup('MAGIC_LINK_FROM_EMAIL', 'Magic Link From Email', 'Required', true, false, 'Sender address used for secure login links. This must be a sender/domain verified in your email provider.', 'https://resend.com/docs/dashboard/domains/introduction', ['Open your Resend dashboard.', 'Verify the sending domain for this customer.', 'Create or choose the sender address.', 'Paste the verified address here.'], 'login@your-domain.com', true, false),
  setup('RESEND_API_KEY', 'Resend API Key', 'Required', true, true, 'Server-side API key used to send magic links, quote emails, invoice emails, and owner notifications.', 'https://resend.com/api-keys', ['Open Resend API Keys.', 'Sign in to the customer or agency account that sends email for this deployment.', 'Create a restricted production key.', 'Paste it here. The value is stored server-side only.'], 'Paste your Resend API key', true),

  setup('OPENAI_API_KEY', 'OpenAI API Key', 'AI', false, true, 'Enables AI Quote, AI Photo Estimate, and AI Troubleshooting.', 'https://platform.openai.com/api-keys', ['Open the OpenAI API keys page.', 'Sign in to the account that will pay for this customer’s AI usage.', 'Create a new secret key.', 'Paste it here. The value is stored server-side only.'], 'Paste your OpenAI API key', true),
  setup('OPENAI_MODEL', 'Default OpenAI Model', 'AI', false, false, 'Optional default model override for shared AI requests.', 'https://platform.openai.com/docs/models', ['Review available models in OpenAI documentation.', 'Choose the approved production model for this deployment.', 'Enter only the model name.'], 'gpt-5.5', false, true),
  setup('OPENAI_RESPONSES_MODEL', 'Responses Model', 'AI', false, false, 'Optional model for general Responses API work.', 'https://platform.openai.com/docs/models', ['Choose the model for general assistant responses.', 'Leave blank to inherit the default model.'], 'gpt-5.5', false, true),
  setup('OPENAI_PHOTO_ESTIMATE_MODEL', 'Photo Estimate Model', 'AI', false, false, 'Optional model for photo-based estimating.', 'https://platform.openai.com/docs/models', ['Choose a vision-capable model approved for photo estimates.', 'Leave blank to inherit the default model.'], 'gpt-5.5', false, true),
  setup('OPENAI_QUOTE_MODEL', 'Quote Model', 'AI', false, false, 'Optional model for quote generation.', 'https://platform.openai.com/docs/models', ['Choose the model for quote drafts.', 'Leave blank to inherit the default model.'], 'gpt-5.5', false, true),
  setup('OPENAI_TROUBLESHOOTING_MODEL', 'Troubleshooting Model', 'AI', false, false, 'Optional model for AI troubleshooting.', 'https://platform.openai.com/docs/models', ['Choose the model for troubleshooting flows.', 'Leave blank to inherit the default model.'], 'gpt-5.5', false, true),
  setup('SERPAPI_API_KEY', 'SerpAPI API Key', 'AI', false, true, 'Optional web search provider for AI research flows.', 'https://serpapi.com/manage-api-key', ['Open the SerpAPI dashboard.', 'Copy this customer’s API key.', 'Paste it here for server-side storage.'], 'Paste your SerpAPI API key', true),

  setup('SQUARE_ACCESS_TOKEN', 'Square Access Token', 'Payments', false, true, 'Server-side Square token for payment links and payment verification.', 'https://developer.squareup.com/apps', ['Open Square Developer Dashboard.', 'Choose this customer’s application.', 'Copy the production or sandbox access token.', 'Paste it here.'], 'Paste your Square access token', true),
  setup('SQUARE_API_VERSION', 'Square API Version', 'Payments', false, false, 'Pinned Square API version for predictable payment behavior.', 'https://developer.squareup.com/docs/build-basics/versioning', ['Open Square API versioning docs.', 'Use the approved version for this deployment.', 'Leave blank to use server default.'], 'YYYY-MM-DD', false, true),
  setup('SQUARE_ENVIRONMENT', 'Square Environment', 'Payments', false, false, 'Choose sandbox or production for this deployment.', 'https://developer.squareup.com/docs/devtools/sandbox/overview', ['Use sandbox for testing deployments.', 'Use production only after the customer Square account is ready.'], 'sandbox or production', true, true),
  setup('SQUARE_LOCATION_ID', 'Square Location ID', 'Payments', false, true, 'Location ID from the customer’s Square account; each account/location is different.', 'https://developer.squareup.com/explorer/square/locations-api/list-locations', ['Open Square Locations.', 'Choose the customer’s correct location.', 'Copy the Location ID.', 'Paste it here.'], 'Paste your Square Location ID', true),
  setup('SQUARE_WEBHOOK_SIGNATURE_KEY', 'Square Webhook Signature Key', 'Payments', false, true, 'Secret used server-side to verify Square webhook signatures.', 'https://developer.squareup.com/docs/webhooks/step3validate', ['Open the Square webhook subscription.', 'Copy the signature key for this deployment webhook.', 'Paste it here.'], 'Paste your Square webhook signature key', true),

  setup('RECAPTCHA_SITE_KEY', 'reCAPTCHA Site Key', 'Security', false, false, 'Public site key for spam protection on public forms.', 'https://www.google.com/recaptcha/admin/create', ['Open Google reCAPTCHA Admin.', 'Create a site for this deployment domain.', 'Copy the site key.'], 'Paste your reCAPTCHA site key', true, true),
  setup('RECAPTCHA_SECRET_KEY', 'reCAPTCHA Secret Key', 'Security', false, true, 'Server-side secret for verifying reCAPTCHA tokens.', 'https://www.google.com/recaptcha/admin/create', ['Open the same reCAPTCHA site.', 'Copy the secret key.', 'Paste it here for server-side storage.'], 'Paste your reCAPTCHA secret key', true),
  setup('INSTALLATION_LOCK_ENABLED', 'Installation Lock Enabled', 'Security', false, false, 'Keeps installation-first protection active for fresh/partial deployments.', 'https://docs.netlify.com/routing/redirects/', ['Leave enabled unless support instructs otherwise.', 'Use true or false.'], 'true', false, true),
  setup('INSTALLATION_ROUTE', 'Installation Route', 'Security', false, false, 'Installer route path.', 'https://docs.netlify.com/routing/redirects/', ['Keep /install/ for standard deployments.'], '/install/', false, true),

  setup('QUOTE_FROM_EMAIL', 'Quote From Email', 'Advanced', false, false, 'Verified sender address for quote and invoice messages.', 'https://resend.com/docs/dashboard/domains/introduction', ['Verify the customer sending domain.', 'Paste the quote sender address.'], 'quotes@your-domain.com', true),
  setup('SMTP_HOST', 'SMTP Host', 'Advanced', false, false, 'Optional SMTP host if not using Resend.', 'https://en.wikipedia.org/wiki/Simple_Mail_Transfer_Protocol', ['Open your mail provider SMTP settings.', 'Copy the host name.'], 'smtp.your-provider.com', true),
  setup('SMTP_USER', 'SMTP User', 'Advanced', false, true, 'Optional SMTP username if not using Resend.', 'https://en.wikipedia.org/wiki/Simple_Mail_Transfer_Protocol', ['Open your mail provider SMTP settings.', 'Copy the username.'], 'Paste your SMTP username', false),
  setup('SMTP_PASSWORD', 'SMTP Password', 'Advanced', false, true, 'Optional SMTP password or app password.', 'https://en.wikipedia.org/wiki/Simple_Mail_Transfer_Protocol', ['Create an app password with your mail provider.', 'Paste it here for server-side storage.'], 'Paste your SMTP password', false),
  setup('GOOGLE_MAPS_API_KEY', 'Google Maps API Key', 'Advanced', false, true, 'Optional maps/geocoding key for service areas and addresses.', 'https://console.cloud.google.com/apis/credentials', ['Open Google Cloud Credentials.', 'Create or select an API key restricted to this deployment.', 'Paste it here.'], 'Paste your Google Maps API key', true),
  setup('SUPPLIER_API_KEY', 'Supplier API Key', 'Advanced', false, true, 'Optional supplier integration key for inventory/pricing.', '#', ['Open the supplier account for this customer.', 'Copy the API key or token.', 'Paste it here.'], 'Paste supplier API key', true),
  setup('CDN_URL', 'CDN URL', 'Advanced', false, false, 'Optional CDN base URL for public assets.', 'https://docs.netlify.com/image-cdn/overview/', ['Configure CDN for this deployment if needed.', 'Paste the CDN base URL.'], 'https://cdn.your-domain.com', false, true),
  setup('FILE_STORAGE_PROVIDER', 'File Storage Provider', 'Advanced', false, false, 'Optional file storage provider identifier.', '#', ['Choose the configured storage provider.', 'Leave blank to use the default deployment storage.'], 'netlify', false, true),
  setup('IMAGE_MAX_UPLOAD_MB', 'Image Max Upload MB', 'Advanced', false, false, 'Maximum image upload size for estimate photos.', '#', ['Choose a safe upload limit for this customer.', 'Enter a number in megabytes.'], '10', false, true),
  setup('PUBLIC_BOOTSTRAP_CACHE_TTL', 'Public Bootstrap Cache TTL', 'Advanced', false, false, 'Cache TTL for public bootstrap config.', '#', ['Choose TTL in seconds.', 'Lower values update faster; higher values cache longer.'], '300', false, true),
  setup('DASHBOARD_BOOTSTRAP_CACHE_TTL', 'Dashboard Bootstrap Cache TTL', 'Advanced', false, false, 'Cache TTL for dashboard bootstrap config.', '#', ['Choose TTL in seconds.', 'Dashboard values should stay reasonably fresh.'], '60', false, true),

  setup('LICENSE_VERIFY_URL', 'License Verify URL', 'Future', false, false, 'Future licensing server URL. Verification is disabled by default.', '#', ['Use your licensing portal URL when license validation is enabled.', 'Leave blank while disabled.'], 'https://license-server.example/verify', true, false),
  setup('LICENSE_VERIFY_TOKEN', 'License Verify Token', 'Future', false, true, 'Server-side token for future license verification.', '#', ['Create the token in the future license server.', 'Paste it here only when validation is enabled.'], 'Paste license verification token', true),
  setup('LICENSE_PRODUCT_ID', 'License Product ID', 'Future', false, false, 'Future product identifier for white-label licensing.', '#', ['Copy the product ID from the future licensing portal.'], 'contractor-platform', false, true),
  setup('LICENSE_GRACE_DAYS', 'License Grace Days', 'Future', false, false, 'Grace period for future license validation outages.', '#', ['Choose the allowed grace period in days.'], '14', false, true),
  setup('LICENSE_VALIDATION_ENABLED', 'License Validation Enabled', 'Future', false, false, 'Future feature flag. Defaults to false so setup is never blocked today.', '#', ['Keep false until the license server is ready.'], 'false', false, true),
  setup('MODULE_AUTO_DISCOVERY', 'Module Auto Discovery', 'Future', false, false, 'Controls automatic module discovery during builds.', '#', ['Leave true for drop-in modules.'], 'true', false, true)
];

export const ENV_ALLOWLIST = new Set(ENV_METADATA.map((item) => item.key));
export const SECRET_KEYS = new Set(ENV_METADATA.filter((item) => item.secret).map((item) => item.key));
export const REQUIRED_KEYS = ENV_METADATA.filter((item) => item.required).map((item) => item.key);

export function publicEnvMetadata() {
  return { categories: ENV_CATEGORIES, variables: ENV_METADATA.map(({ key, label, category, required, secret, publicSafe, description, helpUrl, setupSteps, placeholder, canTest, generatedValueHint }) => ({ key, label, category, required, secret, publicSafe, description, helpUrl, setupSteps, placeholder, canTest, generatedValueHint })) };
}

export function safeStatusFor(key, source = 'missing', value = process.env[key], tested = false) {
  const meta = ENV_METADATA.find((item) => item.key === key);
  const configured = Boolean(value);
  const lastFour = configured && meta?.secret ? String(value).slice(-4) : undefined;
  return { key, required: Boolean(meta?.required), configured, source: configured ? source : 'missing', lastFour, valid: configured ? true : !meta?.required, lastCheckedAt: tested ? new Date().toISOString() : null };
}
