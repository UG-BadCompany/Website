import {
  authProviderStatus,
  json,
  normalizeAuthEmailPayload,
  notConfiguredResponse,
  parseJsonBody,
  validateEmail,
} from './auth-utils.mjs';

export const createMagicLinkHandler = ({ getAuthProviderStatus = authProviderStatus } = {}) => async (request) => {
  if (request.method !== 'POST') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const body = await parseJsonBody(request);

  if (!body) {
    return json(400, { ok: false, message: 'Request body must be valid JSON.' });
  }

  const payload = normalizeAuthEmailPayload(body);

  if (payload.botField) {
    return json(200, { ok: true, message: 'If this email can sign in, a secure link will be sent.' });
  }

  const validationError = validateEmail(payload.email);

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
    message: 'Auth provider settings are present, but the provider-specific magic-link adapter still needs to be implemented.',
  });
};

export default createMagicLinkHandler();

export const config = {
  path: '/api/auth/magic-link',
};
