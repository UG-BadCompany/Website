import { detectDatabaseAdapter, type DbAdapterName } from './database';
import type { PaymentProviderName } from './payments';

export type EnvStatus = 'found' | 'missing' | 'optional' | 'invalid' | 'not_checked';
export type EnvCheck = {
  key: string;
  status: EnvStatus;
  description: string;
  matchedKey?: string;
};
export type EnvValidationInput = {
  databaseProvider?: DbAdapterName;
  paymentProvider?: PaymentProviderName;
  mapping?: Record<string, string>;
};
export type EnvValidationResult = {
  basic: EnvCheck[];
  database: EnvCheck[];
  payment: EnvCheck[];
  email: EnvCheck[];
  databaseAdapter: DbAdapterName;
};

const hasValue = (env: NodeJS.ProcessEnv, keys: string[]) => keys.find((key) => Boolean(env[key] && String(env[key]).trim()));
const checkAny = (env: NodeJS.ProcessEnv, keys: string[], description: string, optional = false): EnvCheck => {
  const matchedKey = hasValue(env, keys);
  return {
    key: keys.join(' or '),
    status: matchedKey ? 'found' : optional ? 'optional' : 'missing',
    description,
    matchedKey,
  };
};
const checkOne = (env: NodeJS.ProcessEnv, key: string, description: string, optional = false): EnvCheck => ({
  key,
  status: env[key] && String(env[key]).trim() ? 'found' : optional ? 'optional' : 'missing',
  description,
  matchedKey: env[key] && String(env[key]).trim() ? key : undefined,
});

const paymentKeys: Record<PaymentProviderName, { required: string[]; optional: string[] }> = {
  square: {
    required: ['SQUARE_ACCESS_TOKEN', 'SQUARE_LOCATION_ID', 'SQUARE_ENVIRONMENT'],
    optional: ['SQUARE_API_VERSION', 'SQUARE_WEBHOOK_SIGNATURE_KEY'],
  },
  stripe: { required: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY'], optional: ['STRIPE_WEBHOOK_SECRET'] },
  paypal: { required: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_ENVIRONMENT'], optional: [] },
  authorize_net: { required: ['AUTHORIZE_API_LOGIN_ID', 'AUTHORIZE_TRANSACTION_KEY', 'AUTHORIZE_ENVIRONMENT'], optional: [] },
  manual: { required: [], optional: [] },
  configure_later: { required: [], optional: [] },
};

export function validateEnvironment(env = process.env, input: EnvValidationInput = {}): EnvValidationResult {
  const mapping = input.mapping ?? {};
  const appUrlKeys = [mapping.APP_URL, 'APP_URL', 'SITE_URL'].filter(Boolean) as string[];
  const emailFromKeys = [mapping.EMAIL_FROM, 'MAGIC_LINK_FROM_EMAIL', 'EMAIL_FROM'].filter(Boolean) as string[];
  const databaseKeys = [mapping.DATABASE_URL, 'NETLIFY_DATABASE_URL', 'DATABASE_URL'].filter(Boolean) as string[];
  const paymentProvider = input.paymentProvider ?? 'square';
  const databaseProvider = input.databaseProvider ?? detectDatabaseAdapter(env);

  const basic = [
    checkAny(env, appUrlKeys, 'Public website URL used for links and redirects.'),
    checkOne(env, mapping.RESEND_API_KEY || 'RESEND_API_KEY', 'Server-only key used to send email.'),
    checkAny(env, emailFromKeys, 'From address used for login and system emails.'),
  ];

  const database = databaseProvider === 'netlify_database'
    ? [checkAny(env, ['NETLIFY_DATABASE_URL', 'NETLIFY_DATABASE_URL_UNPOOLED', 'DATABASE_URL'], 'Netlify database connection used by server functions only.')]
    : [checkAny(env, databaseKeys, 'External database connection used by server functions only.')];

  const selectedPayment = paymentKeys[paymentProvider] ?? paymentKeys.square;
  const payment = [
    ...selectedPayment.required.map((key) => checkOne(env, key, `Required ${paymentProvider} environment key.`)),
    ...selectedPayment.optional.map((key) => checkOne(env, key, `Optional ${paymentProvider} environment key.`, true)),
  ];

  return {
    basic,
    database,
    payment,
    email: [basic[1], basic[2]],
    databaseAdapter: detectDatabaseAdapter(env),
  };
}
