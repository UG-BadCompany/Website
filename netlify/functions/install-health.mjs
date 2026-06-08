import { json, options } from './shared/json-response.mjs';
import { readState } from './shared/install-store.mjs';
export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return options();
  const state = await readState();
  return json(200, { ok: true, service: 'installer', routes: ['GET /api/install-status','GET /api/install/health','GET /api/install/draft','POST /api/install/draft','POST /api/install/finish'], database: process.env.NETLIFY_DATABASE_URL ? 'netlify_database_configured' : 'safe_file_fallback', installationComplete: Boolean(state.installation_complete), currentStep: state.current_step || 'welcome' });
}
