export const INTEGRATION_ENV_KEYS = [
  { key: 'MAGIC_LINK_FROM_EMAIL', category: 'Email', label: 'Magic link from email' },
  { key: 'OPENAI_API_KEY', category: 'AI', label: 'OpenAI API key' },
  { key: 'QUOTE_FROM_EMAIL', category: 'Email', label: 'Quote from email' },
  { key: 'RECAPTCHA_SECRET_KEY', category: 'Security', label: 'reCAPTCHA secret key' },
  { key: 'RECAPTCHA_SITE_KEY', category: 'Security', label: 'reCAPTCHA site key' },
  { key: 'RESEND_API_KEY', category: 'Email', label: 'Resend API key' },
  { key: 'SERPAPI_API_KEY', category: 'Search', label: 'SerpAPI API key' },
  { key: 'SITE_URL', category: 'Site URL', label: 'Primary site URL' },
  { key: 'SITE_URL_ALIASES', category: 'Site URL', label: 'Site URL aliases' },
  { key: 'SQUARE_ACCESS_TOKEN', category: 'Payments', label: 'Square access token' },
  { key: 'SQUARE_API_VERSION', category: 'Payments', label: 'Square API version' },
  { key: 'SQUARE_ENVIRONMENT', category: 'Payments', label: 'Square environment' },
  { key: 'SQUARE_LOCATION_ID', category: 'Payments', label: 'Square location ID' },
  { key: 'SQUARE_WEBHOOK_SIGNATURE_KEY', category: 'Payments', label: 'Square webhook signature key' }
];

export function getIntegrationStatus(env = process.env) {
  return INTEGRATION_ENV_KEYS.map((item) => ({
    ...item,
    configured: Boolean(String(env[item.key] || '').trim()),
    requiredForInstall: false,
    statusText: String(env[item.key] || '').trim()
      ? 'Configured'
      : 'Not configured; platform will use manual mode.'
  }));
}
