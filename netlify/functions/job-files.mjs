import { randomUUID } from 'node:crypto';
import {
  clean,
  getPermissionKeysForRoles,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  parseJsonBody,
} from './auth-utils.mjs';

const MAX_FILES_PER_REQUEST = 12;
const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024;

const normalizeFilePayload = (file = {}) => ({
  fileName: clean(file.fileName || file.name, 240),
  mimeType: clean(file.mimeType || file.type, 120),
  sizeBytes: Math.max(0, Number(file.sizeBytes || file.size || 0)),
  category: clean(file.category, 80) || 'job_file',
});

const mapFile = (file) => ({
  id: file.id,
  ownerId: file.owner_id,
  jobRequestId: file.job_request_id,
  storageProvider: file.storage_provider,
  bucket: file.bucket,
  path: file.path,
  fileName: file.file_name,
  mimeType: file.mime_type,
  sizeBytes: Number(file.size_bytes || 0),
  createdAt: file.created_at,
});

const loadSessionContext = async (db, sessionToken) => {
  const [session] = await db.sql`
    select auth_sessions.id, app_users.id as user_id, app_users.email, app_users.full_name
    from auth_sessions
    join app_users on app_users.id = auth_sessions.user_id
    where auth_sessions.session_hash = ${hashToken(sessionToken)}
      and auth_sessions.revoked_at is null
      and auth_sessions.expires_at > now()
      and app_users.is_active = true
    limit 1
  `;

  if (!session) return null;

  await db.sql`
    update auth_sessions
    set last_seen_at = now()
    where id = ${session.id}
  `;

  const roles = await db.sql`
    select roles.key
    from user_roles
    join roles on roles.id = user_roles.role_id
    where user_roles.user_id = ${session.user_id}
    order by roles.key
  `;
  const roleKeys = roles.map((role) => role.key);

  const rolePermissions = await db.sql`
    select distinct role_permissions.permission_key
    from user_roles
    join roles on roles.id = user_roles.role_id
    join role_permissions on role_permissions.role_id = roles.id and role_permissions.enabled = true
    where user_roles.user_id = ${session.user_id}
    order by role_permissions.permission_key
  `;

  return {
    session,
    roleKeys,
    permissionKeys: getPermissionKeysForRoles(roleKeys, rolePermissions.map((permission) => permission.permission_key)),
  };
};

const canAccessJobRequest = async (db, context, jobRequestId) => {
  if (!jobRequestId) return false;

  if (context.roleKeys.includes('admin') || context.permissionKeys.includes('admin.requests.manage')) {
    const [jobRequest] = await db.sql`
      select id from job_requests where id = ${jobRequestId} limit 1
    `;
    return Boolean(jobRequest);
  }

  if (context.roleKeys.includes('client') || context.permissionKeys.includes('client.requests.manage')) {
    const [jobRequest] = await db.sql`
      select id from job_requests
      where id = ${jobRequestId}
        and client_id = ${context.session.user_id}
      limit 1
    `;
    if (jobRequest) return true;
  }

  if (context.roleKeys.includes('worker') || context.permissionKeys.includes('worker.jobs.manage')) {
    const [assignment] = await db.sql`
      select worker_assignments.id
      from worker_assignments
      where worker_assignments.job_request_id = ${jobRequestId}
        and worker_assignments.worker_id = ${context.session.user_id}
      limit 1
    `;
    return Boolean(assignment);
  }

  return false;
};

const listJobFiles = async (db, jobRequestId) => {
  const files = await db.sql`
    select id, owner_id, job_request_id, storage_provider, bucket, path, file_name, mime_type, size_bytes, created_at
    from files
    where job_request_id = ${jobRequestId}
    order by created_at desc
    limit 100
  `;

  return files.map(mapFile);
};

const createFilePath = ({ jobRequestId, category, fileName }) => {
  const safeName = clean(fileName, 180).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'upload';
  return `${jobRequestId}/${category}/${randomUUID()}-${safeName}`;
};

const createJobFiles = async (db, context, jobRequestId, rawFiles = []) => {
  const normalizedFiles = rawFiles.slice(0, MAX_FILES_PER_REQUEST).map(normalizeFilePayload).filter((file) => file.fileName);

  if (!normalizedFiles.length) {
    return json(422, { ok: false, message: 'Choose at least one file to attach.' });
  }

  const createdFiles = [];

  for (const file of normalizedFiles) {
    if (file.sizeBytes > MAX_FILE_SIZE_BYTES) {
      return json(422, { ok: false, message: `${file.fileName} is larger than the 12 MB upload limit.` });
    }

    const [createdFile] = await db.sql`
      insert into files (owner_id, job_request_id, path, file_name, mime_type, size_bytes)
      values (${context.session.user_id}, ${jobRequestId}, ${createFilePath({ jobRequestId, category: file.category, fileName: file.fileName })}, ${file.fileName}, ${file.mimeType || null}, ${file.sizeBytes || null})
      returning id, owner_id, job_request_id, storage_provider, bucket, path, file_name, mime_type, size_bytes, created_at
    `;
    createdFiles.push(mapFile(createdFile));
  }

  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (${context.session.user_id}, ${'job_files.uploaded'}, ${'job_request'}, ${jobRequestId}, ${JSON.stringify({ fileCount: createdFiles.length, fileNames: createdFiles.map((file) => file.fileName) })}::jsonb)
  `;

  return json(201, { ok: true, files: createdFiles });
};

export const createJobFilesHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (!['GET', 'POST'].includes(request.method)) {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const sessionToken = getSessionToken(request);
  if (!sessionToken) {
    return json(401, { ok: false, authenticated: false, message: 'Sign in to manage job files.' });
  }

  try {
    const db = await getDatabase();
    const context = await loadSessionContext(db, sessionToken);

    if (!context) {
      return json(401, { ok: false, authenticated: false, message: 'Your session expired. Request a new magic link.' });
    }

    const url = new URL(request.url);
    const body = request.method === 'POST' ? await parseJsonBody(request) : null;
    if (request.method === 'POST' && !body) {
      return json(400, { ok: false, message: 'Request body must be valid JSON.' });
    }

    const jobRequestId = clean(request.method === 'GET' ? url.searchParams.get('jobRequestId') : body.jobRequestId, 80);
    if (!jobRequestId) {
      return json(422, { ok: false, message: 'Job request is required.' });
    }

    const hasAccess = await canAccessJobRequest(db, context, jobRequestId);
    if (!hasAccess) {
      return json(404, { ok: false, authenticated: true, authorized: false, message: 'Job files not found for this account.' });
    }

    if (request.method === 'GET') {
      return json(200, { ok: true, files: await listJobFiles(db, jobRequestId) });
    }

    return await createJobFiles(db, context, jobRequestId, Array.isArray(body.files) ? body.files : []);
  } catch (error) {
    console.error('Failed to manage job files', error);
    return json(500, { ok: false, message: 'We could not manage job files right now.' });
  }
};

export default createJobFilesHandler();

export const config = {
  path: '/api/job-files',
};
