import { json, readStore } from './shared/data-store.mjs';
import { coreModules } from './shared/seed-data.mjs';
export async function handler() {
  const store = await readStore();
  return json(200, { ok: true, modules: store.module_registry?.length ? store.module_registry : coreModules });
}
