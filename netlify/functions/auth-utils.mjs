const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const PHONE_PATTERN = /^[+()\-\s.\d]{7,30}$/;

export const clean = (value, maxLength = 254) => (
  typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
);

export const json = (status, body) => Response.json(body, {
  status,
  headers: {
    'cache-control': 'no-store',
  },
});

export const parseJsonBody = async (request) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

export const normalizeAuthEmailPayload = (body) => ({
  email: clean(body?.email).toLowerCase(),
  botField: clean(body?.['bot-field']),
});

export const normalizeClientAccountPayload = (body) => ({
  name: clean(body?.name, 140),
  email: clean(body?.email).toLowerCase(),
  phone: clean(body?.phone, 60),
  botField: clean(body?.['bot-field']),
});

export const validateEmail = (email) => {
  if (!email) {
    return 'Email is required.';
  }

  if (!EMAIL_PATTERN.test(email)) {
    return 'Enter a valid email address.';
  }

  return null;
};

export const validateClientAccount = ({ name, email, phone }) => {
  if (!name) {
    return 'Name is required.';
  }

  const emailError = validateEmail(email);

  if (emailError) {
    return emailError;
  }

  if (!phone) {
    return 'Phone is required.';
  }

  if (!PHONE_PATTERN.test(phone)) {
    return 'Enter a valid phone number.';
  }

  return null;
};

export const authProviderStatus = () => {
  const provider = clean(process.env.AUTH_PROVIDER).toLowerCase();
  const issuerUrl = clean(process.env.AUTH_ISSUER_URL);
  const clientId = clean(process.env.AUTH_CLIENT_ID);
  const clientSecret = clean(process.env.AUTH_CLIENT_SECRET);

  return {
    provider,
    configured: Boolean(provider && issuerUrl && clientId && clientSecret),
  };
};

export const notConfiguredResponse = () => json(501, {
  ok: false,
  code: 'AUTH_PROVIDER_NOT_CONFIGURED',
  message: 'Secure magic-link login is not connected yet. Configure the auth provider environment variables before turning on account creation or dashboard access.',
});
