import { randomUUID } from 'node:crypto';
import {
  clean,
  getPermissionKeysForRoles,
  getSessionToken,
  hashToken,
  json,
  loadDatabase,
  loadRolePermissionKeys,
  parseJsonBody,
} from './auth-utils.mjs';

const MAX_FILES_PER_REQUEST = 12;
const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024;
const ALLOWED_FILE_TYPES = /^(image\/(jpeg|jpg|png|webp|gif)|application\/pdf)$/i;
const URL_STORAGE_MESSAGE = 'File upload storage is not configured. Paste a hosted image URL or configure storage.';
const isStaff = (context) => context.roleKeys.some((role) => ['owner', 'admin', 'manager'].includes(role));

const normalizeFilePayload = (file = {}) => ({
  fileName: clean(file.fileName || file.name, 240),
  fileUrl: clean(file.fileUrl || file.file_url || file.url, 1000),
  filePath: clean(file.filePath || file.file_path || file.path, 1000),
  mimeType: clean(file.mimeType || file.type || file.fileType, 120),
  sizeBytes: Math.max(0, Number(file.sizeBytes || file.size || file.fileSize || 0)),
  category: clean(file.category || file.fileCategory, 80) || 'job_file',
  photoType: clean(file.photoType || file.photo_type || file.category, 80) || 'issue',
  caption: clean(file.caption, 500),
  notes: clean(file.notes, 1200),
  sourceContext: clean(file.sourceContext || file.source_context, 80) || 'job_request',
  quoteId: clean(file.quoteId || file.quote_id, 80),
  workOrderId: clean(file.workOrderId || file.work_order_id, 80),
  photoEstimateId: clean(file.photoEstimateId || file.photo_estimate_id, 80),
  invoiceId: clean(file.invoiceId || file.invoice_id, 80),
  visibility: clean(file.visibility, 40) || 'worker_visible',
});

const mapFile = (file) => ({
  id: file.id,
  ownerId: file.owner_id,
  jobRequestId: file.job_request_id,
  storageProvider: file.storage_provider,
  bucket: file.bucket,
  path: file.file_path || file.path,
  fileUrl: file.file_url || '',
  fileName: file.file_name,
  mimeType: file.file_type || file.mime_type,
  sizeBytes: Number(file.file_size || file.size_bytes || 0),
  caption: file.caption || '',
  notes: file.notes || '',
  photoType: file.photo_type || file.file_category || file.category || 'issue',
  fileCategory: file.file_category || file.photo_type || 'job_file',
  visibility: file.visibility || 'worker_visible',
  sourceContext: file.source_context || 'job_request',
  quoteId: file.quote_id || '',
  workOrderId: file.work_order_id || '',
  photoEstimateId: file.photo_estimate_id || '',
  invoiceId: file.invoice_id || '',
  metadata: file.metadata || {},
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
  const assignedRoleKeys = roles.map((role) => role.key);
  const roleKeys = assignedRoleKeys.length ? assignedRoleKeys : ['client'];

  const assignedPermissionKeys = await loadRolePermissionKeys(db, session.user_id, {
    logPrefix: 'Failed to load job file permissions; using role defaults',
  });

  return {
    session,
    roleKeys,
    permissionKeys: getPermissionKeysForRoles(roleKeys, assignedPermissionKeys),
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
    select id, owner_id, job_request_id, storage_provider, bucket, path, file_url, file_path, file_name, mime_type, file_type, size_bytes, caption, notes, photo_type, file_category, visibility, source_context, quote_id, work_order_id, photo_estimate_id, invoice_id, metadata, created_at
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
  const [jobRequest] = await db.sql`select client_id from job_requests where id = ${jobRequestId} limit 1`;

  for (const file of normalizedFiles) {
    if (file.sizeBytes > MAX_FILE_SIZE_BYTES) {
      return json(422, { ok: false, message: `${file.fileName} is larger than the 12 MB upload limit.` });
    }
    if (file.mimeType && !ALLOWED_FILE_TYPES.test(file.mimeType)) {
      return json(422, { ok: false, message: `${file.fileName} must be an image or PDF.` });
    }
    if (!file.fileUrl && !file.filePath) {
      return json(422, { ok: false, storageConfigured: false, message: URL_STORAGE_MESSAGE });
    }
    const path = file.filePath || createFilePath({ jobRequestId, category: file.category, fileName: file.fileName });
    const [createdFile] = await db.sql`
      insert into files (owner_id, job_request_id, request_id, customer_id, path, file_path, file_url, file_name, mime_type, file_type, size_bytes, file_size, caption, notes, photo_type, file_category, visibility, source_context, quote_id, work_order_id, photo_estimate_id, invoice_id, metadata)
      values (${context.session.user_id}, ${jobRequestId}, ${jobRequestId}, ${jobRequest?.client_id || null}, ${path}, ${path}, ${file.fileUrl || null}, ${file.fileName}, ${file.mimeType || null}, ${file.mimeType || null}, ${file.sizeBytes || null}, ${file.sizeBytes || null}, ${file.caption || null}, ${file.notes || null}, ${file.photoType || 'issue'}, ${file.category}, ${file.visibility}, ${file.sourceContext || 'job_request'}, ${file.quoteId || null}, ${file.workOrderId || null}, ${file.photoEstimateId || null}, ${file.invoiceId || null}, ${JSON.stringify({ originalCategory: file.category })}::jsonb)
      returning id, owner_id, job_request_id, storage_provider, bucket, path, file_url, file_path, file_name, mime_type, file_type, size_bytes, caption, notes, photo_type, file_category, visibility, source_context, quote_id, work_order_id, photo_estimate_id, invoice_id, metadata, created_at
    `;
    createdFiles.push(mapFile(createdFile));
  }

  await db.sql`
    insert into audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
    values (${context.session.user_id}, ${'photo.uploaded'}, ${'job_request'}, ${jobRequestId}, ${JSON.stringify({ fileCount: createdFiles.length, fileNames: createdFiles.map((file) => file.fileName), photoTypes: createdFiles.map((file) => file.photoType) })}::jsonb)
  `;

  return json(201, { ok: true, files: createdFiles });
};

export const createJobFilesHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(request.method)) {
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
    const body = ['POST', 'PATCH', 'DELETE'].includes(request.method) ? await parseJsonBody(request) : null;
    if (['POST', 'PATCH', 'DELETE'].includes(request.method) && !body) {
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
      const files = await listJobFiles(db, jobRequestId);
      const visibleFiles = isStaff(context) ? files : context.roleKeys.includes('worker') ? files.filter((file) => ['worker_visible', 'client_visible'].includes(file.visibility)) : files.filter((file) => file.visibility === 'client_visible');
      return json(200, { ok: true, storageConfigured: false, storageMessage: URL_STORAGE_MESSAGE, files: visibleFiles });
    }
    if (request.method === 'PATCH') {
      if (!isStaff(context)) return json(403, { ok: false, message: 'Only staff can change file visibility or category.' });
      const fileId = clean(body.fileId || body.id, 80);
      const visibility = clean(body.visibility, 40);
      const category = clean(body.fileCategory || body.category, 80);
      if (!fileId || (!visibility && !category)) return json(422, { ok: false, message: 'File and visibility/category are required.' });
      const [file] = await db.sql`update files set visibility=coalesce(nullif(${visibility}, ''), visibility), file_category=coalesce(nullif(${category}, ''), file_category), updated_at=now() where id=${fileId} and job_request_id=${jobRequestId} returning id, owner_id, job_request_id, storage_provider, bucket, path, file_url, file_path, file_name, mime_type, file_type, size_bytes, caption, notes, photo_type, file_category, visibility, source_context, quote_id, work_order_id, photo_estimate_id, invoice_id, metadata, created_at`;
      if (!file) return json(404, { ok: false, message: 'File not found.' });
      return json(200, { ok: true, file: mapFile(file) });
    }
    if (request.method === 'DELETE') {
      const fileId = clean(body.fileId || body.id, 80);
      if (!fileId) return json(422, { ok: false, message: 'File is required.' });
      const [file] = await db.sql`delete from files where id=${fileId} and job_request_id=${jobRequestId} and (${isStaff(context)} or owner_id=${context.session.user_id}) returning id`;
      if (!file) return json(404, { ok: false, message: 'File not found or cannot be removed.' });
      return json(200, { ok: true, fileId });
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
