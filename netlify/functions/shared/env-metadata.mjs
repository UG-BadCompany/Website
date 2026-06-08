export const ENVIRONMENT_KEYS = [
  { key:'MAGIC_LINK_FROM_EMAIL', label:'Magic Link Sender Email', category:'Email', requiredForInstall:false, secret:false, publicSafe:false, description:'Sender address for passwordless login links.', helpUrl:'https://resend.com/domains' },
  { key:'OPENAI_API_KEY', label:'OpenAI API Key', category:'AI', requiredForInstall:false, secret:true, publicSafe:false, description:'Enables AI photo estimates, quote drafting, and troubleshooting.', helpUrl:'https://platform.openai.com/api-keys' },
  { key:'QUOTE_FROM_EMAIL', label:'Quote Sender Email', category:'Email', requiredForInstall:false, secret:false, publicSafe:false, description:'Sender address for quote and invoice emails.', helpUrl:'https://resend.com/domains' },
  { key:'RECAPTCHA_SECRET_KEY', label:'reCAPTCHA Secret Key', category:'Security', requiredForInstall:false, secret:true, publicSafe:false, description:'Server-side bot protection secret.', helpUrl:'https://www.google.com/recaptcha/admin' },
  { key:'RECAPTCHA_SITE_KEY', label:'reCAPTCHA Site Key', category:'Security', requiredForInstall:false, secret:false, publicSafe:true, description:'Public browser site key for reCAPTCHA.', helpUrl:'https://www.google.com/recaptcha/admin' },
  { key:'RESEND_API_KEY', label:'Resend API Key', category:'Email', requiredForInstall:false, secret:true, publicSafe:false, description:'Enables outgoing transactional email.', helpUrl:'https://resend.com/api-keys' },
  { key:'SERPAPI_API_KEY', label:'SerpAPI API Key', category:'Search', requiredForInstall:false, secret:true, publicSafe:false, description:'Optional search data for research workflows.', helpUrl:'https://serpapi.com/dashboard' },
  { key:'SITE_URL', label:'Site URL', category:'Site URL', requiredForInstall:false, secret:false, publicSafe:true, description:'Primary deployed URL for public links and callbacks.', helpUrl:'' },
  { key:'SITE_URL_ALIASES', label:'Site URL Aliases', category:'Site URL', requiredForInstall:false, secret:false, publicSafe:true, description:'Additional domains that should be accepted.', helpUrl:'' },
  { key:'SQUARE_ACCESS_TOKEN', label:'Square Access Token', category:'Payments', requiredForInstall:false, secret:true, publicSafe:false, description:'Enables Square payment links.', helpUrl:'https://developer.squareup.com/apps' },
  { key:'SQUARE_API_VERSION', label:'Square API Version', category:'Payments', requiredForInstall:false, secret:false, publicSafe:false, description:'Square API version to use.', helpUrl:'https://developer.squareup.com/docs/build-basics/versioning' },
  { key:'SQUARE_ENVIRONMENT', label:'Square Environment', category:'Payments', requiredForInstall:false, secret:false, publicSafe:false, description:'sandbox or production.', helpUrl:'https://developer.squareup.com/apps' },
  { key:'SQUARE_LOCATION_ID', label:'Square Location ID', category:'Payments', requiredForInstall:false, secret:false, publicSafe:false, description:'Square location receiving payments.', helpUrl:'https://developer.squareup.com/apps' },
  { key:'SQUARE_WEBHOOK_SIGNATURE_KEY', label:'Square Webhook Signature Key', category:'Payments', requiredForInstall:false, secret:true, publicSafe:false, description:'Verifies Square webhook calls.', helpUrl:'https://developer.squareup.com/apps' }
];
export function integrationStatus(env = process.env) {
  return ENVIRONMENT_KEYS.map((item) => ({
    key: item.key, label: item.label, category: item.category, requiredForInstall: item.requiredForInstall,
    configured: Boolean(env[item.key]), secret: item.secret, publicSafe: item.publicSafe,
    description: item.description, helpUrl: item.helpUrl,
    statusText: env[item.key] ? 'Configured' : 'Not configured; platform will use manual mode.',
    lastFour: env[item.key] && !item.secret ? String(env[item.key]).slice(-4) : undefined
  }));
}
