import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createJobRequestHandler,
  normalizePayload,
  validatePayload,
} from '../netlify/functions/create-job-request.mjs';

const request = (body, method = 'POST') => new Request('https://example.test/api/job-requests', {
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
  headers: body === undefined ? undefined : { 'content-type': 'application/json' },
});

const readJson = async (response) => ({
  status: response.status,
  body: await response.json(),
});

const defaultDbResponses = () => [
  [{ id: 'client-123', email: 'jane@example.com' }],
  [],
  [],
  [{ id: 'property-123' }],
  [{ id: 'job-123', created_at: '2026-05-06T22:00:00.000Z' }],
  [],
  [{ id: 'quote-123', job_request_id: 'job-123', client_id: 'client-123', status: 'draft', title: 'Home repair estimate', summary: 'Draft summary', amount_cents: 25000, created_at: '2026-05-06T22:01:00.000Z', updated_at: '2026-05-06T22:01:00.000Z' }],
  [],
  [],
  [],
];

const createMockDb = (responses = defaultDbResponses()) => ({
  queries: [],
  sql(strings, ...values) {
    this.queries.push({ text: strings.join('?'), values });
    return responses.shift() || [];
  },
});



test('rejects unsupported methods before parsing request payloads', async () => {
  let openedDatabase = false;
  const handler = createJobRequestHandler({
    getDatabase: async () => {
      openedDatabase = true;
      return createMockDb();
    },
  });

  const response = await readJson(await handler(request(undefined, 'PATCH')));

  assert.equal(response.status, 405);
  assert.deepEqual(response.body, { ok: false, message: 'Method not allowed.' });
  assert.equal(openedDatabase, false);
});
test('normalizes strings and caps long public form fields', () => {
  const normalized = normalizePayload({
    name: `  ${'A'.repeat(200)}  `,
    phone: ' 555-0100 ',
    email: ' TEST@example.com ',
    city: undefined,
    streetAddress: ` ${'Street '.repeat(80)} `,
    service: ' Home repair ',
    timeframe: ' Flexible ',
    description: ` ${'x'.repeat(5000)} `,
    'bot-field': ' ',
  });

  assert.equal(normalized.name.length, 140);
  assert.equal(normalized.phone, '555-0100');
  assert.equal(normalized.email, 'test@example.com');
  assert.equal(normalized.city, 'Not provided');
  assert.equal(normalized.streetAddress.length, 240);
  assert.equal(normalized.service, 'Home repair');
  assert.equal(normalized.timeframe, 'Flexible');
  assert.equal(normalized.description.length, 4000);
  assert.equal(normalized.botField, '');
});

test('does not require technical or contact fields before saving intake', () => {
  const normalized = normalizePayload({});
  assert.equal(validatePayload(normalized), null);
  assert.equal(normalized.name, 'Customer');
  assert.equal(normalized.service, 'General service request');
  assert.equal(normalized.description, 'Customer submitted a request and needs follow-up. Technical details were not required.');
});

test('rejects invalid required email addresses', () => {
  assert.equal(
    validatePayload(normalizePayload({ name: 'A', phone: 'B', service: 'C', description: 'D', email: 'not-email', city: 'Mesa', streetAddress: '123 Main St' })),
    'Enter a valid email address.',
  );
});

test('invalid provided emails fail validation before opening a database connection', async () => {
  let openedDatabase = false;
  const handler = createJobRequestHandler({
    getDatabase: async () => {
      openedDatabase = true;
      return createMockDb();
    },
  });

  const response = await readJson(await handler(request({ email: 'not-email' })));

  assert.equal(response.status, 422);
  assert.equal(response.body.ok, false);
  assert.equal(openedDatabase, false);
});

test('silently accepts honeypot submissions without writing to the database', async () => {
  let openedDatabase = false;
  const handler = createJobRequestHandler({
    getDatabase: async () => {
      openedDatabase = true;
      return createMockDb();
    },
  });

  const response = await readJson(await handler(request({ 'bot-field': 'spam' })));

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(openedDatabase, false);
});

test('creates or updates a client account, property, job request, and audit event for valid submissions', async () => {
  const db = createMockDb();
  const sentEmails = [];
  const handler = createJobRequestHandler({
    getDatabase: async () => db,
    makeToken: () => 'request-token',
    sendEmail: async (message) => {
      sentEmails.push(message);
      return { sent: true };
    },
  });

  const response = await readJson(await handler(request({
    name: 'Jane Customer',
    phone: '555-0100',
    email: 'jane@example.com',
    city: 'Mesa',
    streetAddress: '123 Main St',
    service: 'Home repair',
    timeframe: 'This week',
    description: 'Please repair drywall near the garage.',
  })));

  assert.equal(response.status, 201);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.id, 'job-123');
  assert.equal(response.body.clientId, 'client-123');
  assert.equal(response.body.propertyId, 'property-123');
  assert.equal(response.body.createdAt, '2026-05-06T22:00:00.000Z');
  assert.equal(response.body.emailSent, true);
  assert.equal(response.body.quoteId, 'quote-123');
  assert.equal(response.body.quoteStatus, 'draft');
  assert.equal(typeof response.body.estimateDraft.quoteReady, 'boolean');
  assert.equal(response.body.intakeAnalysis.quoteCreationBlocked, false);
  assert.equal(response.body.estimateDraft.informationCompletenessScore >= 25, true);
  assert.equal(response.body.message, 'Estimate request saved. Check your email for a confirmation and secure client portal link.');
  assert.deepEqual(sentEmails, [{
    to: 'jane@example.com',
    magicLinkUrl: 'https://example.test/api/auth/verify?token=request-token',
    purpose: 'client_account',
  }]);
  assert.equal(db.queries.length, 10);
  assert.match(db.queries[0].text, /insert into app_users/);
  assert.match(db.queries[1].text, /insert into user_roles/);
  assert.match(db.queries[2].text, /from properties/);
  assert.match(db.queries[3].text, /insert into properties/);
  assert.match(db.queries[4].text, /insert into job_requests/);
  assert.match(db.queries[5].text, /insert into audit_events/);
  assert.match(db.queries[6].text, /insert into quotes/);
  assert.match(db.queries[7].text, /update job_requests/);
  assert.equal(db.queries[8].values[0], 'estimate_draft.created');
  assert.match(db.queries[9].text, /insert into auth_magic_links/);
  assert.deepEqual(db.queries[4].values.slice(0, 10), [
    'client-123',
    'property-123',
    'Jane Customer',
    'jane@example.com',
    '555-0100',
    'Mesa',
    '123 Main St',
    'Home repair',
    'This week',
    'Please repair drywall near the garage.',
  ]);
  assert.match(db.queries[4].text, /information_completeness_score/);
  assert.equal(db.queries[4].values[11] >= 25, true);
});


test('reuses an existing property for repeat requests at the same client address', async () => {
  const db = createMockDb([
    [{ id: 'client-123', email: 'jane@example.com' }],
    [],
    [{ id: 'property-existing' }],
    [{ id: 'job-456', created_at: '2026-05-07T22:00:00.000Z' }],
    [],
    [{ id: 'quote-456', job_request_id: 'job-456', client_id: 'client-123', status: 'draft', title: 'Home repair estimate', summary: 'Draft summary', amount_cents: 25000 }],
    [],
    [],
    [],
  ]);
  const handler = createJobRequestHandler({ getDatabase: async () => db });

  const response = await readJson(await handler(request({
    name: 'Jane Customer',
    phone: '555-0100',
    email: 'jane@example.com',
    city: 'Mesa',
    streetAddress: '123 Main St',
    service: 'Home repair',
    timeframe: 'Next week',
    description: 'A second request for the same property.',
  })));

  assert.equal(response.status, 201);
  assert.equal(response.body.propertyId, 'property-existing');
  assert.equal(db.queries.length, 9);
  assert.match(db.queries[2].text, /from properties/);
  assert.doesNotMatch(db.queries[3].text, /insert into properties/);
  assert.match(db.queries[3].text, /insert into job_requests/);
  assert.match(db.queries[8].text, /insert into auth_magic_links/);
  assert.deepEqual(db.queries[3].values.slice(0, 2), ['client-123', 'property-existing']);
});

test('returns method and JSON parse errors with useful statuses', async () => {
  const handler = createJobRequestHandler({ getDatabase: async () => createMockDb() });

  assert.deepEqual(await readJson(await handler(request(undefined, 'GET'))), {
    status: 405,
    body: { ok: false, message: 'Method not allowed.' },
  });

  const invalidJson = new Request('https://example.test/api/job-requests', {
    method: 'POST',
    body: '{',
    headers: { 'content-type': 'application/json' },
  });

  assert.deepEqual(await readJson(await handler(invalidJson)), {
    status: 400,
    body: { ok: false, message: 'Request body must be valid JSON.' },
  });
});
