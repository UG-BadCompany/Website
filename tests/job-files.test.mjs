import assert from 'node:assert/strict';
import test from 'node:test';
import { createJobFilesHandler } from '../netlify/functions/job-files.mjs';
import { hashToken } from '../netlify/functions/auth-utils.mjs';

const readJson = async (response) => ({ status: response.status, body: await response.json() });
const createMockDb = (responses = []) => ({
  queries: [],
  sql(strings, ...values) {
    this.queries.push({ text: strings.join('?'), values });
    return responses.shift() || [];
  },
});

test('job files endpoint requires a signed-in session', async () => {
  let openedDatabase = false;
  const handler = createJobFilesHandler({ getDatabase: async () => { openedDatabase = true; return createMockDb(); } });
  const response = await readJson(await handler(new Request('https://site.test/api/job-files?jobRequestId=job-1')));
  assert.equal(response.status, 401);
  assert.equal(openedDatabase, false);
});

test('job files endpoint lists files for a client-owned request', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'client-1', email: 'client@example.com', full_name: 'Client' }],
    [],
    [{ key: 'client' }],
    [],
    [{ id: 'job-1' }],
    [{ id: 'file-1', owner_id: 'client-1', job_request_id: 'job-1', storage_provider: 'netlify_blobs', bucket: 'job-files', path: 'job-1/client/file.jpg', file_name: 'file.jpg', mime_type: 'image/jpeg', size_bytes: 1234, created_at: '2026-05-09T00:00:00.000Z' }],
  ]);
  const handler = createJobFilesHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/job-files?jobRequestId=job-1', { headers: { cookie: 'ta_session=session-token' } })));
  assert.equal(response.status, 200);
  assert.equal(response.body.files[0].fileName, 'file.jpg');
  assert.equal(db.queries[0].values[0], hashToken('session-token'));
  assert.match(db.queries[4].text, /client_id = \?/);
  assert.match(db.queries[5].text, /from files/);
});

test('job files endpoint creates file records for assigned workers', async () => {
  const db = createMockDb([
    [{ id: 'session-1', user_id: 'worker-1', email: 'worker@example.com', full_name: 'Worker' }],
    [],
    [{ key: 'worker' }],
    [],
    [{ id: 'assignment-1' }],
    [{ id: 'file-1', owner_id: 'worker-1', job_request_id: 'job-1', storage_provider: 'netlify_blobs', bucket: 'job-files', path: 'job-1/worker_after/file.jpg', file_name: 'after.jpg', mime_type: 'image/jpeg', size_bytes: 2048, created_at: '2026-05-09T00:00:00.000Z' }],
    [],
  ]);
  const handler = createJobFilesHandler({ getDatabase: async () => db });
  const response = await readJson(await handler(new Request('https://site.test/api/job-files', {
    method: 'POST',
    headers: { cookie: 'ta_session=session-token', 'content-type': 'application/json' },
    body: JSON.stringify({ jobRequestId: 'job-1', files: [{ fileName: 'after.jpg', mimeType: 'image/jpeg', sizeBytes: 2048, category: 'worker_after' }] }),
  })));

  assert.equal(response.status, 201);
  assert.equal(response.body.files[0].fileName, 'after.jpg');
  assert.match(db.queries[4].text, /worker_assignments/);
  assert.match(db.queries[5].text, /insert into files/);
  assert.equal(db.queries[5].values[0], 'worker-1');
  assert.equal(db.queries[6].values[1], 'job_files.uploaded');
});
