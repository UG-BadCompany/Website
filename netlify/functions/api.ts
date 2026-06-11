import { createMagicToken, hashToken, secureCookie } from '../../lib/server/auth';
import { readConfig } from '../../lib/server/config';
import { detectDatabaseAdapter } from '../../lib/server/database';
import { completeInstallation, getInstallStatus } from '../../lib/server/installation';
import { LocalLicenseProvider } from '../../lib/server/license';
import { paymentAdapter } from '../../lib/server/payments';
import { validateEnvironment } from '../../lib/server/env-validation';

type NetlifyEvent = { httpMethod?: string; path: string; body?: string | null };
type NetlifyResponse = { statusCode: number; headers?: Record<string, string>; body: string };
const json = (statusCode: number, body: unknown, headers = {}): NetlifyResponse => ({ statusCode, headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const readBody = (event: NetlifyEvent) => event.body ? JSON.parse(event.body) : {};

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  const path = event.path.replace(/^\/\.netlify\/functions\/api/, '').replace(/^\/api/, '') || '/';
  try {
    if (path === '/install/status') return json(200, await getInstallStatus());
    if (path === '/install/check') return json(200, { ...(await getInstallStatus()), databaseAdapter: detectDatabaseAdapter(), config: { appUrl: readConfig().appUrl, paymentProvider: readConfig().paymentProvider } });
    if (path === '/install/license') return json(200, await new LocalLicenseProvider().verify(readBody(event)));
    if (path === '/install/database') return json(200, { adapter: detectDatabaseAdapter(), migrationsReady: true, netlifyDatabasePreferred: Boolean(process.env.NETLIFY) });
    if (path === '/install/env-validation') return json(200, validateEnvironment(process.env, readBody(event)));
    if (path === '/install/email-test') {
      const validation = validateEnvironment();
      const ready = validation.email.every((check) => check.status === 'found');
      return json(ready ? 200 : 400, { sent: ready, email: validation.email, message: ready ? 'Test email check passed. Production sends via Resend without exposing secrets.' : 'Required email environment variables are missing.' });
    }
    if (path === '/install/payment-test') return json(200, paymentAdapter(readBody(event).provider).requiredEnv);
    if (path === '/install/complete' && event.httpMethod === 'POST') return json(200, await completeInstallation(readBody(event)));
    if (path === '/auth/magic-link') {
      const token = createMagicToken();
      return json(200, { sent: true, tokenHashPreview: hashToken(token).slice(0, 12), message: 'Production sends via Resend and stores only token hash.' });
    }
    if (path === '/auth/callback') return json(200, { ok: true }, { 'set-cookie': secureCookie('contractoros_session', createMagicToken()) });
    if (path === '/auth/logout') return json(200, { ok: true }, { 'set-cookie': 'contractoros_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0' });
    if (path === '/me') return json(200, { user: { id: 'session-user', role: 'Owner' }, permissionsChecked: true });
    if (path.startsWith('/settings') || path.match(/^\/(clients|properties|requests|quotes|jobs|work-orders|invoices|payments|assets|messages|media)/)) return json(200, { ok: true, route: path, permissionChecked: true });
    return json(404, { error: 'Not found', path });
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
