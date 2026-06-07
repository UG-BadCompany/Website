import { json } from './shared/response.mjs'; import { safeInstallStatus } from './shared/db.mjs';
export async function handler(){ return json(200,safeInstallStatus()); }
