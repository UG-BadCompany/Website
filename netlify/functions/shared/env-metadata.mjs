export const ENVIRONMENT_KEYS = [
  { key: 'MAGIC_LINK_FROM_EMAIL', label: 'Magic Link Sender Email', category: 'Email', requiredForInstall: false, secret: false, publicSafe: false, description: 'Sender address for passwordless login links.', helpUrl: 'https://resend.com/domains', setupSteps: ['Verify a sending domain in Resend.', 'Enter the sender address here.', 'Send a test magic link.'] },
  { key: 'OPENAI_API_KEY', label: 'OpenAI API Key', category: 'AI', requiredForInstall: false, secret: true, publicSafe: false, description: 'Enables AI photo estimates, quote drafting, and troubleshooting.', helpUrl: 'https://platform.openai.com/api-keys', setupSteps: ['Open OpenAI API Keys.', 'Create a secret key for this deployment.', 'Paste it only into the secure server-side field.'] },
  { key: 'QUOTE_FROM_EMAIL', label: 'Quote Sender Email', category: 'Email', requiredForInstall: false, secret: false, publicSafe: false, description: 'Sender address for quote and invoice emails.', helpUrl: 'https://resend.com/domains', setupSteps: ['Verify the sending domain.', 'Use an address customers recognize.'] },
  { key: 'RECAPTCHA_SECRET_KEY', label: 'reCAPTCHA Secret Key', category: 'Security', requiredForInstall: false, secret: true, publicSafe: false, description: 'Server-side bot protection secret.', helpUrl: 'https://www.google.com/recaptcha/admin', setupSteps: ['Create a site in Google reCAPTCHA.', 'Copy the secret key into the secure field.'] },
  { key: 'RECAPTCHA_SITE_KEY', label: 'reCAPTCHA Site Key', category: 'Security', requiredForInstall: false, secret: false, publicSafe: true, description: 'Public browser site key for reCAPTCHA.', helpUrl: 'https://www.google.com/recaptcha/admin', setupSteps: ['Create a site in Google reCAPTCHA.', 'Copy the site key.'] },
  { key: 'RESEND_API_KEY', label: 'Resend API Key', category: 'Email', requiredForInstall: false, secret: true, publicSafe: false, description: 'Enables outgoing transactional email.', helpUrl: 'https://resend.com/api-keys', setupSteps: ['Open Resend API keys.', 'Create a restricted production key.', 'Paste it only into the secure server-side field.'] },
  { key: 'SERPAPI_API_KEY', label: 'SerpAPI API Key', category: 'Search', requiredForInstall: false, secret: true, publicSafe: false, description: 'Optional search data for research workflows.', helpUrl: 'https://serpapi.com/dashboard', setupSteps: ['Open SerpAPI dashboard.', 'Copy the API key for this customer account.'] },
  { key: 'SITE_URL', label: 'Site URL', category: 'Site URL', requiredForInstall: false, secret: false, publicSafe: true, description: 'Primary deployed URL for public links and callbacks.', helpUrl: '', generatedValueHint: 'Detected from current deployment origin.' },
  { key: 'SITE_URL_ALIASES', label: 'Site URL Aliases', category: 'Site URL', requiredForInstall: false, secret: false, publicSafe: true, description: 'Additional domains that should be accepted.', helpUrl: '', generatedValueHint: 'Comma-separated custom domains.' },
  { key: 'SQUARE_ACCESS_TOKEN', label: 'Square Access Token', category: 'Payments', requiredForInstall: false, secret: true, publicSafe: false, description: 'Enables Square payment links.', helpUrl: 'https://developer.squareup.com/apps', setupSteps: ['Open the Square developer application.', 'Copy the access token for sandbox or production.'] },
  { key: 'SQUARE_API_VERSION', label: 'Square API Version', category: 'Payments', requiredForInstall: false, secret: false, publicSafe: false, description: 'Square API version to use.', helpUrl: 'https://developer.squareup.com/docs/build-basics/versioning', placeholder: '2026-06-08' },
  { key: 'SQUARE_ENVIRONMENT', label: 'Square Environment', category: 'Payments', requiredForInstall: false, secret: false, publicSafe: false, description: 'Square environment: sandbox or production.', helpUrl: 'https://developer.squareup.com/apps', placeholder: 'production' },
  { key: 'SQUARE_LOCATION_ID', label: 'Square Location ID', category: 'Payments', requiredForInstall: false, secret: false, publicSafe: false, description: 'Square location receiving payments.', helpUrl: 'https://developer.squareup.com/apps' },
  { key: 'SQUARE_WEBHOOK_SIGNATURE_KEY', label: 'Square Webhook Signature Key', category: 'Payments', requiredForInstall: false, secret: true, publicSafe: false, description: 'Verifies Square webhook calls.', helpUrl: 'https://developer.squareup.com/apps', generatedValueHint: 'Webhook URL: {origin}/api/payments/square/webhook' },
];

export function integrationStatus(env = process.env, origin = '') {
  return ENVIRONMENT_KEYS.map((item) => {
    const value = env[item.key];
    return {
      ...item,
      configured: Boolean(value),
      statusText: value ? 'Configured' : 'Not configured; platform will use manual mode.',
      lastFour: value && !item.secret ? String(value).slice(-4) : undefined,
      generatedValue: item.key === 'SITE_URL' ? (env.SITE_URL || origin || undefined) : undefined,
      webhookUrl: item.key === 'SQUARE_WEBHOOK_SIGNATURE_KEY' && origin ? `${origin}/api/payments/square/webhook` : undefined,
    };
  });
}

export function publicEnvironment(integrations) {
  return integrations
    .filter((item) => item.publicSafe)
    .reduce((result, item) => ({ ...result, [item.key]: item.configured }), {});
}
