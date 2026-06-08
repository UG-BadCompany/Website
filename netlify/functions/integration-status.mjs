import { json } from './shared/data-store.mjs';
import { getIntegrationStatus } from './shared/env-metadata.mjs';
export async function handler() {
  const integrations = getIntegrationStatus(process.env);
  return json(200, { ok: true, integrations, message: 'These integrations can be configured later in System Center.' });
}
