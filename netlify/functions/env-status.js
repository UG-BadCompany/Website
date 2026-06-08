import { json, readStore, publicEnvStatus } from './_shared.mjs';
export async function handler() { return json(200, { ok: true, variables: publicEnvStatus(readStore()) }); }
