const json = (status, body) => Response.json(body, {
  status,
  headers: {
    'cache-control': 'no-store',
  },
});

const hasEnv = (name) => Boolean(process.env[name]);

const routeChecks = [
  { label: 'Request Estimate', route: '/api/job-requests', functionName: 'create-job-request' },
  { label: 'Magic Link Login', route: '/api/auth/magic-link', functionName: 'request-magic-link' },
  { label: 'Session Check', route: '/api/me', functionName: 'me' },
  { label: 'Admin Estimate Review', route: '/api/admin/estimate-review', functionName: 'admin-estimate-review' },
  { label: 'Admin Work Orders', route: '/api/admin/work-orders', functionName: 'admin-work-orders' },
  { label: 'Admin Finance Overview', route: '/api/admin/finance-overview', functionName: 'admin-finance-overview' },
  { label: 'Executive Overview', route: '/api/admin/executive-overview', functionName: 'admin-executive-overview' },
  { label: 'Square Payment Link', route: '/api/square/create-payment-link', functionName: 'square-create-payment-link' },
  { label: 'Client Invoices', route: '/api/client/invoices', functionName: 'client-invoices' },
  { label: 'Worker Jobs', route: '/api/worker/jobs', functionName: 'worker-jobs' },
];

export default async (request) => {
  if (request.method !== 'GET') return json(405, { ok: false, message: 'Method not allowed.' });

  const env = {
    openaiConfigured: hasEnv('OPENAI_API_KEY'),
    resendConfigured: hasEnv('RESEND_API_KEY') && hasEnv('MAGIC_LINK_FROM_EMAIL'),
    squareConfigured: hasEnv('SQUARE_ACCESS_TOKEN') && hasEnv('SQUARE_LOCATION_ID'),
    recaptchaConfigured: hasEnv('RECAPTCHA_SECRET_KEY'),
    databaseExpected: true,
  };

  const warnings = [];
  if (!env.openaiConfigured) warnings.push('OPENAI_API_KEY is not set, so estimates will use local fallback only.');
  if (!env.resendConfigured) warnings.push('RESEND_API_KEY or MAGIC_LINK_FROM_EMAIL is missing, so magic-link email will not send.');
  if (!env.squareConfigured) warnings.push('SQUARE_ACCESS_TOKEN or SQUARE_LOCATION_ID is missing, so payment links may fail.');
  if (!env.recaptchaConfigured) warnings.push('RECAPTCHA_SECRET_KEY is missing; reCAPTCHA may be skipped depending on recaptcha-utils behavior.');

  let database = { ok: false, message: 'Not checked.' };
  try {
    const { getDatabase } = await import('@netlify/database');
    const db = getDatabase();
    const [result] = await db.sql`select now() as checked_at`;
    database = { ok: true, checkedAt: result?.checked_at || new Date().toISOString() };
  } catch (error) {
    database = { ok: false, message: error?.message || 'Database check failed.' };
    warnings.push('Netlify Database check failed. Verify database setup and migrations.');
  }

  return json(200, {
    ok: true,
    service: 'Contractor Portal',
    phase: 'Phase 8 cleanup / readiness',
    checkedAt: new Date().toISOString(),
    env,
    database,
    routeChecks,
    warnings,
  });
};

export const config = {
  path: '/api/system-health',
};
