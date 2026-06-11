export type NormalizedConfig = {
  appUrl: string;
  databaseUrl?: string;
  resendApiKey?: string;
  emailFrom?: string;
  authSecret?: string;
  licenseServerUrl?: string;
  paymentProvider: string;
  storageProvider: string;
};

export function readConfig(env = process.env): NormalizedConfig {
  return {
    appUrl: env.APP_URL || env.SITE_URL || env.URL || env.DEPLOY_URL || 'http://localhost:5173',
    databaseUrl: env.DATABASE_URL || env.NETLIFY_DATABASE_URL || env.SUPABASE_DB_URL,
    resendApiKey: env.RESEND_API_KEY,
    emailFrom: env.EMAIL_FROM || env.MAGIC_LINK_FROM_EMAIL,
    authSecret: env.AUTH_SECRET,
    licenseServerUrl: env.LICENSE_SERVER_URL,
    paymentProvider: env.PAYMENT_PROVIDER || 'square',
    storageProvider: env.STORAGE_PROVIDER || (env.NETLIFY ? 'netlify_blobs' : 'local')
  };
}
