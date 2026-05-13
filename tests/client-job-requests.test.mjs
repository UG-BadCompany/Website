import assert from 'node:assert/strict';
import test from 'node:test';
import { createClientJobRequestsHandler } from '../netlify/functions/client-job-requests.mjs';
import { hashToken } from '../netlify/functions/auth-utils.mjs';

const readJson = async (response) => ({
  status: response.status,
  body: await response.json(),
});

const createMockDb = (responses = []) => ({
  queries: [],
  sql(strings, ...values) {
    this.queries.push({ text: strings.join('?'), values });
    return responses.shift() || [];
  },
});

test('client job request endpoint requires a signed-in session', async () => {
  let openedDatabase = false;
  const handler = createClientJobRequestsHandler({
    getDatabase: async () => {
      openedDatabase = true;
      return createMockDb();
    },
  });

  const response = await readJson(await handler(new Request('https://site.test/api/client/job-requests')));

  assert.equal(response.status, 401);
  assert.equal(response.body.authenticated, false);
  assert.equal(openedDatabase, false);
});

test('client job request endpoint rejects users without client or admin access', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'worker-1', email: 'worker@example.com', full_name: 'Worker' }],
    [],
    [{ key: 'worker', name: 'Worker' }],
  ]);
  const handler = createClientJobRequestsHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/client/job-requests', {
    headers: { cookie: 'ta_session=session-token' },
  })));

  assert.equal(response.status, 403);
  assert.equal(response.body.authorized, false);
  assert.equal(db.queries[0].values[0], hashToken('session-token'));
  assert.equal(db.queries.length, 3);
});

test('client job request endpoint returns only requests for the signed-in client', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'client-1', email: 'client@example.com', full_name: 'Client' }],
    [],
    [{ key: 'client', name: 'Client' }],
    [
      {
        id: 'job-1',
        status: 'new',
        city: 'Mesa',
        street_address: '123 Main St',
        service_type: 'Drywall repair',
        preferred_timeframe: 'This week',
        description: 'Patch garage drywall.',
        estimated_start_date: '2026-05-12',
        completion_date: null,
        created_at: '2026-05-07T00:00:00.000Z',
        updated_at: '2026-05-08T00:00:00.000Z',
        property_id: 'property-1',
        property_label: 'Home',
        property_street: '123 Main St',
        property_city: 'Mesa',
        property_state: 'AZ',
        property_postal_code: '85201',
        property_access_notes: 'Gate code 1234',
      },
      {
        id: 'job-2',
        status: 'completed',
        city: 'Tempe',
        street_address: '456 Oak Ave',
        service_type: 'Fence repair',
        preferred_timeframe: null,
        description: 'Re-hang gate.',
        estimated_start_date: '2026-05-09',
        completion_date: '2026-05-10',
        created_at: '2026-05-06T00:00:00.000Z',
        updated_at: '2026-05-10T00:00:00.000Z',
        property_id: 'property-2',
        property_label: 'Rental',
        property_street: '456 Oak Ave',
        property_city: 'Tempe',
        property_state: 'AZ',
        property_postal_code: null,
        property_access_notes: null,
      },
    ],
    [
      {
        id: 'property-1',
        label: 'Home',
        street: '123 Main St',
        city: 'Mesa',
        state: 'AZ',
        postal_code: '85201',
        access_notes: 'Gate code 1234',
        request_count: 1,
        last_request_at: '2026-05-07T00:00:00.000Z',
        created_at: '2026-05-01T00:00:00.000Z',
        updated_at: '2026-05-02T00:00:00.000Z',
      },
      {
        id: 'property-2',
        label: 'Rental',
        street: '456 Oak Ave',
        city: 'Tempe',
        state: 'AZ',
        postal_code: null,
        access_notes: null,
        request_count: 1,
        last_request_at: '2026-05-06T00:00:00.000Z',
        created_at: '2026-05-03T00:00:00.000Z',
        updated_at: '2026-05-04T00:00:00.000Z',
      },
    ],
  ]);
  const handler = createClientJobRequestsHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/client/job-requests', {
    headers: { cookie: 'ta_session=session-token' },
  })));

  assert.equal(response.status, 200);
  assert.equal(response.body.authorized, true);
  assert.deepEqual(response.body.summary, { total: 2, active: 1, properties: 2 });
  assert.deepEqual(response.body.requests, [
    {
      id: 'job-1',
      status: 'new',
      city: 'Mesa',
      streetAddress: '123 Main St',
      serviceType: 'Drywall repair',
      preferredTimeframe: 'This week',
      description: 'Patch garage drywall.',
      estimatedStartDate: '2026-05-12',
      completionDate: null,
      createdAt: '2026-05-07T00:00:00.000Z',
      updatedAt: '2026-05-08T00:00:00.000Z',
      property: {
        id: 'property-1',
        label: 'Home',
        street: '123 Main St',
        city: 'Mesa',
        state: 'AZ',
        postalCode: '85201',
        accessNotes: 'Gate code 1234',
      },
    },
    {
      id: 'job-2',
      status: 'completed',
      city: 'Tempe',
      streetAddress: '456 Oak Ave',
      serviceType: 'Fence repair',
      preferredTimeframe: null,
      description: 'Re-hang gate.',
      estimatedStartDate: '2026-05-09',
      completionDate: '2026-05-10',
      createdAt: '2026-05-06T00:00:00.000Z',
      updatedAt: '2026-05-10T00:00:00.000Z',
      property: {
        id: 'property-2',
        label: 'Rental',
        street: '456 Oak Ave',
        city: 'Tempe',
        state: 'AZ',
        postalCode: null,
        accessNotes: null,
      },
    },
  ]);
  assert.deepEqual(response.body.properties, [
    {
      id: 'property-1',
      label: 'Home',
      street: '123 Main St',
      city: 'Mesa',
      state: 'AZ',
      postalCode: '85201',
      accessNotes: 'Gate code 1234',
      requestCount: 1,
      lastRequestAt: '2026-05-07T00:00:00.000Z',
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-02T00:00:00.000Z',
    },
    {
      id: 'property-2',
      label: 'Rental',
      street: '456 Oak Ave',
      city: 'Tempe',
      state: 'AZ',
      postalCode: null,
      accessNotes: null,
      requestCount: 1,
      lastRequestAt: '2026-05-06T00:00:00.000Z',
      createdAt: '2026-05-03T00:00:00.000Z',
      updatedAt: '2026-05-04T00:00:00.000Z',
    },
  ]);
  assert.match(db.queries[3].text, /properties.client_id = \?/);
  assert.match(db.queries[3].text, /where job_requests.client_id = \?/);
  assert.equal(db.queries[3].values[0], 'client-1');
  assert.equal(db.queries[3].values[1], 'client-1');
  assert.match(db.queries[4].text, /where properties.client_id = \?/);
  assert.equal(db.queries[4].values[0], 'client-1');
  assert.equal(db.queries[4].values[1], 'client-1');
});

test('client job request endpoint creates a portal request for an owned property', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'client-1', email: 'client@example.com', full_name: 'Client', phone: '555-0100' }],
    [],
    [{ key: 'client', name: 'Client' }],
    [{ id: 'property-1', street: '123 Main St', city: 'Mesa' }],
    [{ id: 'job-3', created_at: '2026-05-08T00:00:00.000Z' }],
    [],
  ]);
  const handler = createClientJobRequestsHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/client/job-requests', {
    method: 'POST',
    headers: { cookie: 'ta_session=session-token', 'content-type': 'application/json' },
    body: JSON.stringify({
      propertyId: 'property-1',
      service: 'Drywall repair',
      timeframe: 'Next week',
      description: 'Patch the hallway drywall.',
    }),
  })));

  assert.equal(response.status, 201);
  assert.equal(response.body.id, 'job-3');
  assert.equal(response.body.propertyId, 'property-1');
  assert.match(db.queries[3].text, /where id = \?/);
  assert.match(db.queries[3].text, /and client_id = \?/);
  assert.deepEqual(db.queries[3].values, ['property-1', 'client-1']);
  assert.match(db.queries[4].text, /insert into job_requests/);
  assert.deepEqual(db.queries[4].values.slice(0, 10), [
    'client-1',
    'property-1',
    'Client',
    'client@example.com',
    '555-0100',
    'Mesa',
    '123 Main St',
    'Drywall repair',
    'Next week',
    'Patch the hallway drywall.',
  ]);
});

test('client job request endpoint blocks requests for another client property', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'client-1', email: 'client@example.com', full_name: 'Client', phone: '555-0100' }],
    [],
    [{ key: 'client', name: 'Client' }],
    [],
  ]);
  const handler = createClientJobRequestsHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/client/job-requests', {
    method: 'POST',
    headers: { cookie: 'ta_session=session-token', 'content-type': 'application/json' },
    body: JSON.stringify({
      propertyId: 'other-property',
      service: 'Fence repair',
      description: 'Please fix the gate.',
    }),
  })));

  assert.equal(response.status, 404);
  assert.equal(response.body.authorized, false);
  assert.equal(db.queries.length, 4);
  assert.match(db.queries[3].text, /and client_id = \?/);
  assert.deepEqual(db.queries[3].values, ['other-property', 'client-1']);
});

test('client job request endpoint creates a new property when the client enters a new address', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'client-1', email: 'client@example.com', full_name: 'Client', phone: null }],
    [],
    [{ key: 'client', name: 'Client' }],
    [],
    [{ id: 'property-2', street: '456 Oak Ave', city: 'Tempe' }],
    [{ id: 'job-4', created_at: '2026-05-08T01:00:00.000Z' }],
    [],
  ]);
  const handler = createClientJobRequestsHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/client/job-requests', {
    method: 'POST',
    headers: { cookie: 'ta_session=session-token', 'content-type': 'application/json' },
    body: JSON.stringify({
      label: 'Rental',
      phone: '555-0200',
      streetAddress: '456 Oak Ave',
      city: 'Tempe',
      accessNotes: 'Text before arrival.',
      service: 'Fence repair',
      description: 'Please fix the gate.',
    }),
  })));

  assert.equal(response.status, 201);
  assert.equal(response.body.propertyId, 'property-2');
  assert.match(db.queries[3].text, /from properties/);
  assert.match(db.queries[4].text, /insert into properties/);
  assert.deepEqual(db.queries[4].values, ['client-1', 'Rental', '456 Oak Ave', 'Tempe', 'Text before arrival.']);
  assert.deepEqual(db.queries[5].values.slice(0, 10), [
    'client-1',
    'property-2',
    'Client',
    'client@example.com',
    '555-0200',
    'Tempe',
    '456 Oak Ave',
    'Fence repair',
    null,
    'Please fix the gate.',
  ]);
});


test('client job request endpoint lets clients update their own property details', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'client-1', email: 'client@example.com', full_name: 'Client' }],
    [],
    [{ key: 'client', name: 'Client' }],
    [{
      id: 'property-1',
      label: 'Updated home',
      street: '789 Pine St',
      city: 'Mesa',
      state: 'AZ',
      postal_code: '85201',
      access_notes: 'Use side gate.',
      created_at: '2026-05-01T00:00:00.000Z',
      updated_at: '2026-05-09T00:00:00.000Z',
    }],
    [],
  ]);
  const handler = createClientJobRequestsHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/client/job-requests', {
    method: 'PATCH',
    headers: { cookie: 'ta_session=session-token', 'content-type': 'application/json' },
    body: JSON.stringify({
      propertyId: 'property-1',
      label: 'Updated home',
      streetAddress: '789 Pine St',
      city: 'Mesa',
      accessNotes: 'Use side gate.',
    }),
  })));

  assert.equal(response.status, 200);
  assert.equal(response.body.property.street, '789 Pine St');
  assert.equal(response.body.property.accessNotes, 'Use side gate.');
  assert.match(db.queries[3].text, /update properties/);
  assert.match(db.queries[3].text, /and client_id = \?/);
  assert.deepEqual(db.queries[3].values, ['Updated home', '789 Pine St', 'Mesa', 'Use side gate.', 'property-1', 'client-1']);
  assert.match(db.queries[4].text, /insert into audit_events/);
});

test('client job request endpoint lets clients update open job requests', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'client-1', email: 'client@example.com', full_name: 'Client' }],
    [],
    [{ key: 'client', name: 'Client' }],
    [{
      id: 'job-1',
      status: 'needs_review',
      service_type: 'Drywall repair and paint touch-up',
      preferred_timeframe: 'Next Thursday morning',
      description: 'Patch the hallway and include the garage ceiling crack.',
      updated_at: '2026-05-08T00:00:00.000Z',
    }],
    [],
  ]);
  const handler = createClientJobRequestsHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/client/job-requests', {
    method: 'PATCH',
    headers: { cookie: 'ta_session=session-token', 'content-type': 'application/json' },
    body: JSON.stringify({
      jobRequestId: 'job-1',
      service: 'Drywall repair and paint touch-up',
      requestedDate: 'Next Thursday morning',
      description: 'Patch the hallway and include the garage ceiling crack.',
      updateType: 'date_change_or_details',
    }),
  })));

  assert.equal(response.status, 200);
  assert.equal(response.body.request.id, 'job-1');
  assert.equal(response.body.request.preferredTimeframe, 'Next Thursday morning');
  assert.match(db.queries[3].text, /update job_requests/);
  assert.match(db.queries[3].text, /and client_id = \?/);
  assert.match(db.queries[3].text, /status in/);
  assert.deepEqual(db.queries[3].values.slice(0, 5), [
    'Drywall repair and paint touch-up',
    'Next Thursday morning',
    'Patch the hallway and include the garage ceiling crack.',
    'job-1',
    'client-1',
  ]);
  assert.equal(db.queries[4].values[1], 'client_job_request.updated');
});
