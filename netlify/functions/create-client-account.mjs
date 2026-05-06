import {
  authProviderStatus,
  json,
  normalizeClientAccountPayload,
  notConfiguredResponse,
  parseJsonBody,
  validateClientAccount,
} from './auth-utils.mjs';

export const createClientAccountHandler = ({ getAuthProviderStatus = authProviderStatus } = {}) => async (request) => {
  if (request.method !== 'POST') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const body = await parseJsonBody(request);

  if (!body) {
    return json(400, { ok: false, message: 'Request body must be valid JSON.' });
  }

  const payload = normalizeClientAccountPayload(body);

  if (payload.botField) {
    return json(200, { ok: true, message: 'If this account can be created, a secure link will be sent.' });
  }

  const validationError = validateClientAccount(payload);

  if (validationError) {
    return json(422, { ok: false, message: validationError });
  }

  const authProvider = getAuthProviderStatus();

  if (!authProvider.configured) {
    return notConfiguredResponse();
  }

  return json(501, {
    ok: false,
    code: 'AUTH_PROVIDER_ADAPTER_PENDING',
    provider: authProvider.provider,
    message: 'Auth provider settings are present, but the provider-specific client account adapter still needs to be implemented.',
  });
};

export default createClientAccountHandler();

export const config = {
  path: '/api/auth/client-account',
};
