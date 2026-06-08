import { json, readStore, publicEnvStatus } from './_shared.mjs';
export async function handler() {
 const store = readStore();
 return json(200, { ok: true, checks: [
  { name: 'Database', status: 'warning', detail: 'Using safe local/file fallback unless Netlify Database is configured.' },
  { name: 'Netlify Functions', status: 'healthy' },
  { name: 'Installer Lock', status: store.installation.installation_complete ? 'healthy' : 'warning' },
  { name: 'Module Registry', status: 'healthy' },
  ...publicEnvStatus(store).filter(v=>['OPENAI_API_KEY','RESEND_API_KEY','SQUARE_ACCESS_TOKEN'].includes(v.key)).map(v=>({ name:v.key, status:v.configured?'healthy':'warning'}))] });
}
