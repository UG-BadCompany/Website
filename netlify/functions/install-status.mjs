import { json, envStatus } from './_shared/config.mjs'; import { getInstallation } from './_shared/store.mjs';
export async function handler(){return json(200,{...(await getInstallation()),environment:envStatus(),license:{validationEnabled:false,status:'verification_disabled'}})}
