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

const createMockDb = () => {
  const queries = [];
  const db = {
    queries,
    sql(strings, ...values) {
      queries.push({ text: strings.join('?'), values });

      if (queries.length === 1) {
        return [{ id: 'job-123', created_at: '2026-05-06T22:00:00.000Z' }];
      }

      return [];
    },
  };

  return db;
};

test('normalizes strings and caps long public form fields', () => {
  const normalized = normalizePayload({
    name: `  ${'A'.repeat(200)}  `,
    phone: ' 555-0100 ',
    email: ' TEST@example.com ',
    city: undefined,
    service: ' Home repair ',
    timeframe: ' Flexible ',
    description: ` ${'x'.repeat(5000)} `,
    'bot-field': ' ',
  });

  assert.equal(normalized.name.length, 140);
  assert.equal(normalized.phone, '555-0100');
  assert.equal(normalized.email, 'TEST@example.com');
  assert.equal(normalized.city, '');
  assert.equal(normalized.service, 'Home repair');
  assert.equal(normalized.timeframe, 'Flexible');
  assert.equal(normalized.description.length, 4000);
  assert.equal(normalized.botField, '');
});

test('requires the minimum fields needed to create a job request', () => {
  assert.equal(
    validatePayload({ name: '', phone: '', service: '', description: '' }),
    'Missing required fields: name, phone, service, description',
  );
});

test('rejects invalid optional email addresses', () => {
  assert.equal(
    validatePayload({ name: 'A', phone: 'B', service: 'C', description: 'D', email: 'not-email' }),
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

test('inserts a job request and audit event for valid submissions', async () => {
  const db = createMockDb();
  const handler = createJobRequestHandler({ getDatabase: async () => db });

  const response = await readJson(await handler(request({
    name: 'Jane Customer',
    phone: '555-0100',
    email: 'jane@example.com',
    city: 'Mesa',
    service: 'Home repair',
    timeframe: 'This week',
    description: 'Please repair drywall near the garage.',
  })));

  assert.equal(response.status, 201);
  assert.deepEqual(response.body, {
    ok: true,
    id: 'job-123',
    createdAt: '2026-05-06T22:00:00.000Z',
    message: 'Estimate request saved.',
  });
  assert.equal(db.queries.length, 2);
  assert.match(db.queries[0].text, /insert into job_requests/);
  assert.match(db.queries[1].text, /insert into audit_events/);
  assert.deepEqual(db.queries[0].values, [
    'Jane Customer',
    'jane@example.com',
    '555-0100',
    'Mesa',
    'Home repair',
    'This week',
    'Please repair drywall near the garage.',
  ]);
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
