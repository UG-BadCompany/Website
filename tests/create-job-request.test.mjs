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
];

const createMockDb = (responses = defaultDbResponses()) => ({
  queries: [],
  sql(strings, ...values) {
    this.queries.push({ text: strings.join('?'), values });
    return responses.shift() || [];
  },
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
  assert.equal(normalized.email, 'TEST@example.com');
  assert.equal(normalized.city, '');
  assert.equal(normalized.streetAddress.length, 240);
  assert.equal(normalized.service, 'Home repair');
  assert.equal(normalized.timeframe, 'Flexible');
  assert.equal(normalized.description.length, 4000);
  assert.equal(normalized.botField, '');
});

test('requires the minimum fields needed to create a client account and job request', () => {
  assert.equal(
    validatePayload({ name: '', phone: '', email: '', city: '', streetAddress: '', service: '', description: '' }),
    'Missing required fields: name, phone, email, city, streetAddress, service, description',
  );
});

test('rejects invalid required email addresses', () => {
  assert.equal(
    validatePayload({ name: 'A', phone: 'B', service: 'C', description: 'D', email: 'not-email', city: 'Mesa', streetAddress: '123 Main St' }),
    'Enter a valid email address.',
  );
});

test('returns validation errors before opening a database connection', async () => {
  let openedDatabase = false;
  const handler = createJobRequestHandler({
    getDatabase: async () => {
      openedDatabase = true;
      return createMockDb();
    },
  });

  const response = await readJson(await handler(request({ name: '', phone: '', service: '', description: '' })));

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
  const handler = createJobRequestHandler({ getDatabase: async () => db });

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
  assert.deepEqual(response.body, {
    ok: true,
    id: 'job-123',
    clientId: 'client-123',
    propertyId: 'property-123',
    createdAt: '2026-05-06T22:00:00.000Z',
    message: 'Estimate request saved.',
  });
  assert.equal(db.queries.length, 6);
  assert.match(db.queries[0].text, /insert into app_users/);
  assert.match(db.queries[1].text, /insert into user_roles/);
  assert.match(db.queries[2].text, /from properties/);
  assert.match(db.queries[3].text, /insert into properties/);
  assert.match(db.queries[4].text, /insert into job_requests/);
  assert.match(db.queries[5].text, /insert into audit_events/);
  assert.deepEqual(db.queries[4].values, [
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
});


test('reuses an existing property for repeat requests at the same client address', async () => {
  const db = createMockDb([
    [{ id: 'client-123', email: 'jane@example.com' }],
    [],
    [{ id: 'property-existing' }],
    [{ id: 'job-456', created_at: '2026-05-07T22:00:00.000Z' }],
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
  assert.equal(db.queries.length, 5);
  assert.match(db.queries[2].text, /from properties/);
  assert.doesNotMatch(db.queries[3].text, /insert into properties/);
  assert.match(db.queries[3].text, /insert into job_requests/);
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
