import { json, readStore } from './shared/data-store.mjs';
export async function handler() {
  const store = await readStore();
  return json(200, { ok: true, installation_complete: Boolean(store.platform_installation?.installation_complete), company: store.company_settings, theme: store.theme_settings });
}
