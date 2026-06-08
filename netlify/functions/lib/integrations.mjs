export const integrationRegistry = [
  ['MAGIC_LINK_FROM_EMAIL','Email'],['QUOTE_FROM_EMAIL','Email'],['RESEND_API_KEY','Email'],
  ['OPENAI_API_KEY','AI'],['SERPAPI_API_KEY','Search'],
  ['RECAPTCHA_SECRET_KEY','Security'],['RECAPTCHA_SITE_KEY','Security'],
  ['SITE_URL','Site URL'],['SITE_URL_ALIASES','Site URL'],
  ['SQUARE_ACCESS_TOKEN','Payments'],['SQUARE_API_VERSION','Payments'],['SQUARE_ENVIRONMENT','Payments'],['SQUARE_LOCATION_ID','Payments'],['SQUARE_WEBHOOK_SIGNATURE_KEY','Payments']
];
export function getIntegrationStatus() {
  return integrationRegistry.map(([key, category]) => ({ key, configured: Boolean(process.env[key]), requiredForInstall: false, category, label: process.env[key] ? 'Configured' : 'Not configured; platform will use manual mode.' }));
}
