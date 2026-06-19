import { Resend } from 'resend';
import { canAccessResource, hasPermission, type AuthUser, HttpError } from './auth';
import { readConfig } from './config';
import { createDatabase, type Queryable } from './database';

type Body = Record<string, unknown>;
type EntityType = 'request' | 'quote' | 'job' | 'invoice' | 'payment' | 'client' | 'property' | 'asset';

export const workflowStatuses = {
  request: ['new','reviewing','needs_info','quoted','approved','scheduled','in_progress','completed','closed','cancelled','inactive'],
  quote: ['draft','ready','sent','viewed','approved','declined','expired','converted','void'],
  job: ['pending','scheduled','dispatched','in_progress','waiting_parts','waiting_customer','blocked','completed','cancelled','closed'],
  invoice: ['draft','sent','viewed','partially_paid','paid','overdue','void','closed'],
  payment: ['pending','completed','failed','refunded','partially_refunded','voided'],
} as const;

const allowedTransitions: Record<string, Record<string, string[]>> = {
  request: {
    new: ['reviewing','needs_info','quoted','cancelled','inactive'], reviewing: ['needs_info','quoted','approved','cancelled','inactive'], needs_info: ['reviewing','quoted','cancelled'], quoted: ['approved','cancelled','inactive'], approved: ['scheduled','in_progress','completed','closed','cancelled'], scheduled: ['in_progress','completed','closed','cancelled'], in_progress: ['completed','cancelled'], completed: ['closed'], closed: [], cancelled: [], inactive: ['reviewing','cancelled'],
  },
  quote: {
    draft: ['ready','sent','approved','declined'], ready: ['sent','approved','declined'], sent: ['viewed','approved','declined'], viewed: ['approved','declined'], approved: ['converted','void'], declined: ['draft'], expired: ['draft'], converted: [], void: [],
  },
  job: {
    pending: ['scheduled','dispatched','in_progress','cancelled'], scheduled: ['dispatched','in_progress','waiting_customer','cancelled'], dispatched: ['in_progress','waiting_parts','waiting_customer','blocked','cancelled'], in_progress: ['waiting_parts','waiting_customer','blocked','completed','cancelled'], waiting_parts: ['in_progress','completed','cancelled'], waiting_customer: ['in_progress','completed','cancelled'], blocked: ['in_progress','completed','cancelled'], completed: ['closed'], closed: [], cancelled: [],
  },
  invoice: {
    draft: ['sent','void'], sent: ['viewed','partially_paid','paid','overdue','void'], viewed: ['partially_paid','paid','overdue','void'], partially_paid: ['paid','overdue','void'], paid: ['closed'], overdue: ['partially_paid','paid','void'], void: [], closed: [],
  },
};

function requireManage(user: AuthUser, group: string) {
  if (!hasPermission(user, `${group}.manage`)) throw new HttpError(403, `Missing permission ${group}.manage`);
}
function cents(v: unknown) { const n = Number(v); return Number.isFinite(n) ? Math.round(n) : 0; }
function str(v: unknown, fallback = '') { return typeof v === 'string' ? v : fallback; }
function maybeUuid(v: unknown) { return typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v) ? v : null; }
function jsonb(v: unknown) { return JSON.stringify(v && typeof v === 'object' ? v : {}); }

export async function ensureWorkflowFoundation(db: Queryable = createDatabase()) {
  await db.query(`create table if not exists activity_events (id uuid primary key default gen_random_uuid(), entity_type text not null, entity_id uuid not null, actor_user_id uuid references users(id), event_type text not null, title text not null, description text, metadata jsonb not null default '{}'::jsonb, visibility text not null default 'internal', created_at timestamptz not null default now())`);
  await db.query(`create index if not exists activity_events_entity_idx on activity_events(entity_type, entity_id, created_at desc)`);
  await db.query(`alter table work_requests add column if not exists title text, add column if not exists updated_at timestamptz default now(), add column if not exists source text default 'website', add column if not exists assigned_user_id uuid references users(id), add column if not exists internal_notes text, add column if not exists customer_notes text`);
  await db.query(`alter table quotes add column if not exists property_id uuid references properties(id), add column if not exists subtotal_cents int default 0, add column if not exists tax_cents int default 0, add column if not exists discount_cents int default 0, add column if not exists deposit_cents int default 0, add column if not exists terms text, add column if not exists customer_notes text, add column if not exists internal_notes text, add column if not exists updated_at timestamptz default now(), add column if not exists expires_at timestamptz`);
  await db.query(`alter table jobs add column if not exists request_id uuid references work_requests(id), add column if not exists title text, add column if not exists scope text, add column if not exists customer_visible_scope text, add column if not exists completion_notes text, add column if not exists customer_summary text, add column if not exists internal_notes text, add column if not exists labor_hours numeric default 0, add column if not exists materials jsonb default '[]'::jsonb, add column if not exists started_at timestamptz, add column if not exists completed_at timestamptz, add column if not exists closed_at timestamptz, add column if not exists updated_at timestamptz default now()`);
  await db.query(`create table if not exists job_closeouts (id uuid primary key default gen_random_uuid(), job_id uuid not null references jobs(id) on delete cascade, completed_by uuid references users(id), completion_notes text, customer_notes text, before_photos jsonb default '[]'::jsonb, after_photos jsonb default '[]'::jsonb, materials_used jsonb default '[]'::jsonb, labor_entries jsonb default '[]'::jsonb, checklist jsonb default '[]'::jsonb, created_invoice_id uuid, created_at timestamptz default now(), updated_at timestamptz default now())`);
  await db.query(`create index if not exists job_closeouts_job_idx on job_closeouts(job_id, created_at desc)`);
  await db.query(`alter table invoices add column if not exists quote_id uuid references quotes(id), add column if not exists request_id uuid references work_requests(id), add column if not exists property_id uuid references properties(id), add column if not exists invoice_number text, add column if not exists subtotal_cents int default 0, add column if not exists tax_cents int default 0, add column if not exists deposit_cents int default 0, add column if not exists paid_cents int default 0, add column if not exists terms text, add column if not exists updated_at timestamptz default now(), add column if not exists viewed_at timestamptz, add column if not exists closed_at timestamptz`);
  await db.query(`alter table payments add column if not exists client_id uuid references clients(id), add column if not exists method text default 'manual', add column if not exists note text, add column if not exists reference text, add column if not exists updated_at timestamptz default now()`);
  await db.query(`alter table message_threads add column if not exists status text default 'open', add column if not exists needs_reply boolean default false, add column if not exists unread_count int default 0`);
  await upsertSetting(db, 'workflow.auto_invoice_on_job_complete', true, true);
  await upsertSetting(db, 'workflow.auto_invoice_on_job_closeout', true, true);
  await upsertSetting(db, 'workflow.closeout_invoice_status', 'draft', true);
  await upsertSetting(db, 'workflow.auto_send_invoice_on_job_complete', false, true);
  await upsertSetting(db, 'workflow.close_request_when_invoice_sent', false, true);
  await upsertSetting(db, 'workflow.close_request_when_invoice_paid', true, true);
  await upsertSetting(db, 'workflow.auto_create_job_on_quote_approval', true, true);
}

async function upsertSetting(db: Queryable, key: string, value: unknown, onlyMissing = false) {
  await db.query(`insert into app_settings (key,value,updated_at) values ($1,$2::jsonb,now()) ${onlyMissing ? 'on conflict (key) do nothing' : 'on conflict (key) do update set value=excluded.value, updated_at=now()'}`, [key, JSON.stringify(value)]);
}
async function getSetting<T>(db: Queryable, key: string, fallback: T): Promise<T> {
  const r = await db.query<{ value: T }>(`select value from app_settings where key=$1`, [key]);
  return r.rows[0]?.value ?? fallback;
}

export async function addActivity(db: Queryable, user: AuthUser | null, entityType: EntityType | string, entityId: string | null, eventType: string, title: string, options: { description?: string; metadata?: unknown; visibility?: 'internal' | 'client' } = {}) {
  if (!entityId) return;
  await db.query(`insert into activity_events (entity_type,entity_id,actor_user_id,event_type,title,description,metadata,visibility) values ($1,$2::uuid,$3,$4,$5,$6,$7::jsonb,$8)`, [entityType, entityId, user?.id || null, eventType, title, options.description || '', jsonb(options.metadata), options.visibility || 'internal']);
  await db.query(`insert into audit_logs (actor_user_id,event,entity_type,entity_id,metadata) values ($1,$2,$3,$4::uuid,$5::jsonb)`, [user?.id || null, eventType, entityType, entityId, jsonb(options.metadata)]).catch(() => undefined);
}

async function transition(db: Queryable, user: AuthUser, entity: keyof typeof allowedTransitions, id: string, table: string, nextStatus: string, group: string, extraSql = '', alternatePermission = '') {
  if (alternatePermission && hasPermission(user, alternatePermission)) { /* allowed through alternate workflow permission */ } else requireManage(user, group);
  const current = await db.query<{ status: string }>(`select status from ${table} where id=$1`, [id]);
  if (!current.rows[0]) throw new HttpError(404, `${entity} not found`);
  const from = current.rows[0].status;
  const allowed = allowedTransitions[entity][from] || [];
  if (from !== nextStatus && !allowed.includes(nextStatus)) throw new HttpError(409, `Cannot transition ${entity} from ${from} to ${nextStatus}`);
  await db.query(`update ${table} set status=$2, updated_at=now() ${extraSql} where id=$1`, [id, nextStatus]);
  await addActivity(db, user, entity === 'request' ? 'request' : entity, id, 'status_changed', `${entity} status changed`, { description: `${from} → ${nextStatus}`, metadata: { from, to: nextStatus }, visibility: 'client' });
}

export async function handleWorkflowRoute(path: string, method: string, body: Body, user: AuthUser, query?: Record<string, string | undefined>, db: Queryable = createDatabase()) {
  await ensureWorkflowFoundation(db);
  if (method !== 'POST' && !path.startsWith('/workflow/')) throw new HttpError(405, 'Method not allowed');

  const timelineMatch = path.match(/^\/workflow\/([^/]+)\/([^/]+)\/timeline$/);
  if (timelineMatch && method === 'POST') return getTimeline(db, user, timelineMatch[1], timelineMatch[2], query);
  const summaryMatch = path.match(/^\/workflow\/([^/]+)\/([^/]+)\/summary$/);
  if (summaryMatch && method === 'GET') return getWorkflowSummary(db, summaryMatch[1], summaryMatch[2]);

  const match = path.match(/^\/(requests|quotes|jobs|invoices)\/([^/]+)\/([^/]+)$/);
  if (!match) throw new HttpError(404, 'Workflow route not found');
  const [, resource, id, action] = match;

  if (resource === 'requests' && action === 'convert-to-quote') return convertRequestToQuote(db, user, id, body);
  if (resource === 'requests' && action === 'convert-to-job') return convertRequestToJob(db, user, id, body);
  if (resource === 'requests' && action === 'notes') return addRequestNote(db, user, id, body);
  if (resource === 'requests' && action === 'media') return attachRequestMedia(db, user, id, body);
  if (resource === 'quotes' && action === 'send') return sendQuote(db, user, id);
  if (resource === 'quotes' && action === 'approve') return approveQuote(db, user, id);
  if (resource === 'quotes' && action === 'decline') return declineQuote(db, user, id, body);
  if (resource === 'quotes' && action === 'convert-to-job') return convertQuoteToJob(db, user, id, body);
  if (resource === 'jobs' && action === 'start') return startJob(db, user, id);
  if (resource === 'jobs' && action === 'complete') return completeJob(db, user, id, body);
  if (resource === 'jobs' && action === 'create-invoice') return createInvoiceFromJob(db, user, id, body);
  if (resource === 'jobs' && action === 'closeout') return closeoutJob(db, user, id, body);
  if (resource === 'invoices' && action === 'send') return sendInvoice(db, user, id);
  if (resource === 'invoices' && action === 'mark-paid') return markInvoicePaid(db, user, id, body);
  throw new HttpError(404, 'Workflow action not found');
}

async function convertRequestToQuote(db: Queryable, user: AuthUser, id: string, body: Body) {
  requireManage(user, 'quotes');
  const req = (await db.query<any>(`select wr.*, wr.client_id::text as "clientId", wr.property_id::text as "propertyId" from work_requests wr where id=$1`, [id])).rows[0];
  if (!req) throw new HttpError(404, 'Request not found');
  const existing = await db.query<{ id: string }>(`select id::text from quotes where request_id=$1 and status <> 'cancelled' order by created_at desc limit 1`, [id]);
  const total = cents(body.total);
  const quoteId = existing.rows[0]?.id || (await db.query<{ id: string }>(`insert into quotes (client_id,request_id,property_id,status,total_cents,subtotal_cents,tax_cents,terms,customer_notes,internal_notes) values ($1,$2,$3,'draft',$4,$5,$6,$7,$8,$9) returning id::text`, [req.clientId, id, req.propertyId, total, cents(body.subtotal) || total, cents(body.tax), str(body.terms), str(body.customerNotes), str(body.internalNotes)])).rows[0].id;
  await saveQuoteItems(db, quoteId, body.items, Boolean(body.items));
  await transition(db, user, 'request', id, 'work_requests', 'quoted', 'requests').catch(async () => db.query(`update work_requests set status='quoted', updated_at=now() where id=$1`, [id]));
  await addLinkedEvent(db, user, req.clientId, req.propertyId, id, quoteId, null, null, 'quote_created', 'Quote created from request');
  return { ok: true, id: quoteId, quoteId, summary: await getWorkflowSummary(db, 'request', id) };
}

async function convertRequestToJob(db: Queryable, user: AuthUser, id: string, body: Body) {
  requireManage(user, 'jobs');
  const req = (await db.query<any>(`select wr.*, wr.client_id::text as "clientId", wr.property_id::text as "propertyId" from work_requests wr where id=$1`, [id])).rows[0];
  if (!req) throw new HttpError(404, 'Request not found');
  const existing = await db.query<{ id: string }>(`select id::text from jobs where request_id=$1 and status <> 'cancelled' order by created_at desc limit 1`, [id]);
  const jobId = existing.rows[0]?.id || (await db.query<{ id: string }>(`insert into jobs (client_id,property_id,request_id,status,assigned_user_id,title,scope,customer_visible_scope) values ($1,$2,$3,'pending',$4,$5,$6,$7) returning id::text`, [req.clientId, req.propertyId, id, maybeUuid(body.assignedUserId), str(body.title, req.title || `Job for request ${id.slice(0, 8).toUpperCase()}`), str(body.scope, req.description || ''), str(body.customerVisibleScope, req.customer_notes || '')])).rows[0].id;
  await db.query(`update work_requests set status='scheduled', updated_at=now() where id=$1`, [id]);
  await addLinkedEvent(db, user, req.clientId, req.propertyId, id, null, jobId, null, 'job_created', 'Job created directly from request');
  return { ok: true, id: jobId, jobId, status: 'pending', summary: await getWorkflowSummary(db, 'job', jobId) };
}

async function addRequestNote(db: Queryable, user: AuthUser, id: string, body: Body) {
  const req = (await db.query<any>(`select client_id::text as "clientId" from work_requests where id=$1`, [id])).rows[0];
  if (!req) throw new HttpError(404, 'Request not found');
  await addActivity(db, user, 'request', id, str(body.customerVisible) ? 'customer_update' : 'internal_note', str(body.note) || str(body.body) || 'Request note added', { visibility: body.customerVisible ? 'client' : 'internal', description: str(body.note) || str(body.body) });
  return { ok: true, id, note: true };
}

async function attachRequestMedia(db: Queryable, user: AuthUser, id: string, body: Body) {
  requireManage(user, 'media');
  const req = (await db.query<any>(`select client_id::text as "clientId" from work_requests where id=$1`, [id])).rows[0];
  if (!req) throw new HttpError(404, 'Request not found');
  const mediaId = maybeUuid(body.mediaId) || maybeUuid(body.id);
  if (!mediaId) throw new HttpError(400, 'mediaId is required');
  await db.query(`update media_assets set link_type='request', link_id=$2::uuid, visibility=coalesce(nullif($3,''), visibility), alt_text=coalesce(nullif($4,''), alt_text) where id=$1`, [mediaId, id, str(body.visibility), str(body.altText)]);
  await addActivity(db, user, 'request', id, 'media_attached', 'Media attached to request', { metadata: { mediaId }, visibility: body.visibility === 'public' ? 'client' : 'internal' });
  return { ok: true, id, mediaId };
}

async function sendQuote(db: Queryable, user: AuthUser, id: string) {
  await transition(db, user, 'quote', id, 'quotes', 'sent', 'quotes', `, sent_at=now()`);
  const quote = await quoteContext(db, id);
  await createMessage(db, quote.clientId, 'quote', id, 'Quote sent', `Quote ${id.slice(0, 8).toUpperCase()} was sent to the client.`);
  await addActivity(db, user, 'quote', id, 'quote_sent', 'Quote sent', { visibility: 'client' });
  return { ok: true, id, status: 'sent', email: await maybeSendEmail(quote.email, 'Your quote is ready', `Your quote is ready to review.`, `/portal`) , summary: await getWorkflowSummary(db, 'quote', id) };
}

async function approveQuote(db: Queryable, user: AuthUser, id: string) {
  const quote = await quoteContext(db, id);
  if (!canAccessResource(user, { clientId: quote.clientId })) throw new HttpError(403, 'Record is outside your role scope');
  if (user.role !== 'Client') requireManage(user, 'quotes');
  const allowedStatuses = user.role === 'Client' ? ['sent','viewed'] : ['draft','ready','sent','viewed'];
  if (!allowedStatuses.includes(String(quote.status || 'draft'))) throw new HttpError(409, `QUOTE_INVALID_TRANSITION:Quote cannot be approved from current status. currentStatus=${quote.status || ''}; allowedStatuses=${allowedStatuses.join(',')}`);
  await db.query(`update quotes set status='approved', approved_at=now(), updated_at=now() where id=$1`, [id]);
  if (quote.requestId) await db.query(`update work_requests set status='approved', updated_at=now() where id=$1`, [quote.requestId]);
  await addLinkedEvent(db, user, quote.clientId, quote.propertyId, quote.requestId, id, null, null, 'quote_approved', 'Quote approved');
  let jobId: string | null = null;
  if (await getSetting(db, 'workflow.auto_create_job_on_quote_approval', true)) jobId = (await convertQuoteToJob(db, user, id, {}, true)).jobId;
  return { ok: true, id, status: 'approved', message: 'Quote approved.', quote: await quoteContext(db, id), jobId, summary: await getWorkflowSummary(db, 'quote', id) };
}

async function declineQuote(db: Queryable, user: AuthUser, id: string, body: Body) {
  const quote = await quoteContext(db, id);
  if (!canAccessResource(user, { clientId: quote.clientId })) throw new HttpError(403, 'Record is outside your role scope');
  if (user.role !== 'Client') requireManage(user, 'quotes');
  const allowedStatuses = user.role === 'Client' ? ['sent','viewed'] : ['draft','ready','sent','viewed'];
  if (!allowedStatuses.includes(String(quote.status || 'draft'))) throw new HttpError(409, `QUOTE_INVALID_TRANSITION:Quote cannot be declined from current status. currentStatus=${quote.status || ''}; allowedStatuses=${allowedStatuses.join(',')}`);
  await db.query(`update quotes set status='declined', declined_at=now(), updated_at=now() where id=$1`, [id]);
  await addActivity(db, user, 'quote', id, 'quote_declined', 'Quote declined', { description: str(body.reason || body.declineReason), visibility: 'client' });
  return { ok: true, id, status: 'declined', message: 'Quote declined.', quote: await quoteContext(db, id), summary: await getWorkflowSummary(db, 'quote', id) };
}

async function convertQuoteToJob(db: Queryable, user: AuthUser, id: string, body: Body, internalAutomation = false) {
  if (!internalAutomation) requireManage(user, 'jobs');
  const quote = await quoteContext(db, id);
  const existing = await db.query<{ id: string }>(`select id::text from jobs where quote_id=$1 and status <> 'cancelled' order by created_at desc limit 1`, [id]);
  const jobId = existing.rows[0]?.id || (await db.query<{ id: string }>(`insert into jobs (client_id,property_id,quote_id,request_id,status,assigned_user_id,title,scope,customer_visible_scope) values ($1,$2,$3,$4,'pending',$5,$6,$7,$8) returning id::text`, [quote.clientId, quote.propertyId, id, quote.requestId, maybeUuid(body.assignedUserId), str(body.title, `Job for quote ${id.slice(0, 8).toUpperCase()}`), str(body.scope, quote.description || ''), str(body.customerVisibleScope, quote.customerNotes || '')])).rows[0].id;
  await db.query(`update quotes set status='converted', updated_at=now() where id=$1 and status='approved'`, [id]);
  if (quote.requestId) await db.query(`update work_requests set status='scheduled', updated_at=now() where id=$1 and status in ('approved','quoted')`, [quote.requestId]);
  await addLinkedEvent(db, user, quote.clientId, quote.propertyId, quote.requestId, id, jobId, null, 'job_created', 'Job created from approved quote');
  return { ok: true, id: jobId, jobId, status: 'pending', summary: await getWorkflowSummary(db, 'job', jobId) };
}

async function startJob(db: Queryable, user: AuthUser, id: string) {
  await transition(db, user, 'job', id, 'jobs', 'in_progress', 'jobs', `, started_at=coalesce(started_at,now())`);
  const job = await jobContext(db, id);
  if (job.requestId) await db.query(`update work_requests set status='in_progress', updated_at=now() where id=$1`, [job.requestId]);
  await addActivity(db, user, 'job', id, 'job_started', 'Job started', { visibility: 'client' });
  return { ok: true, id, status: 'in_progress', summary: await getWorkflowSummary(db, 'job', id) };
}

async function completeJob(db: Queryable, user: AuthUser, id: string, body: Body) { return closeoutJob(db, user, id, { ...body, createAndSendInvoice: body.createAndSendInvoice ?? false }); }

async function closeoutJob(db: Queryable, user: AuthUser, id: string, body: Body) {
  requireManage(user, 'jobs');
  const warnings: string[] = [];
  if (!body || typeof body !== 'object') throw new HttpError(400, 'VALIDATION_ERROR:Closeout details are required.');
  const job = await jobContext(db, id);
  if (!canAccessResource(user, { clientId: job.clientId, assignedUserId: job.assigned_user_id || job.assignedUserId })) throw new HttpError(403, 'Record is outside your role scope');
  if (['cancelled','closed'].includes(job.status)) throw new HttpError(409, `VALIDATION_ERROR:Cannot close out a ${job.status} job`);

  const completionNotes = str(body.completionNotes) || str(body.workPerformed) || str(body.outcome, 'Job completed.');
  if (!completionNotes.trim()) throw new HttpError(400, 'VALIDATION_ERROR:Closeout details are required.');
  const materials = Array.isArray(body.materials) ? body.materials : Array.isArray(body.materialsUsed) ? body.materialsUsed : [];
  await db.query(`update jobs set status='completed', completed_at=coalesce(completed_at,now()), closed_at=coalesce(closed_at,now()), completion_notes=$2, customer_summary=$3, internal_notes=$4, labor_hours=$5, materials=$6::jsonb, updated_at=now() where id=$1`, [id, completionNotes, str(body.customerSummary) || str(body.customerNotes), str(body.internalNotes), Number(body.laborHours) || 0, JSON.stringify(materials)]);
  await addActivity(db, user, 'job', id, 'job_completed', 'Job completed', { description: completionNotes, visibility: 'client' }).catch((error) => warnings.push(`Activity timeline could not be updated: ${error.message}`));
  if (job.requestId) await db.query(`update work_requests set status='completed', updated_at=now() where id=$1`, [job.requestId]).catch((error) => warnings.push(`Linked request could not be marked completed: ${error.message}`));

  let invoiceId: string | null = null;
  let closeout: any = null;
  try {
    closeout = (await db.query<any>(`insert into job_closeouts (job_id,completed_by,completion_notes,customer_notes,before_photos,after_photos,materials_used,labor_entries,checklist) values ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb) returning id::text, job_id::text as "jobId", completed_by::text as "completedBy", completion_notes as "completionNotes", customer_notes as "customerNotes", before_photos as "beforePhotos", after_photos as "afterPhotos", materials_used as "materialsUsed", labor_entries as "laborEntries", checklist, created_invoice_id::text as "createdInvoiceId", created_at::text as "createdAt", updated_at::text as "updatedAt"`, [id, user.id, completionNotes, str(body.customerNotes) || str(body.customerSummary), JSON.stringify(Array.isArray(body.beforePhotos) ? body.beforePhotos : []), JSON.stringify(Array.isArray(body.afterPhotos) ? body.afterPhotos : []), JSON.stringify(materials), JSON.stringify(Array.isArray(body.laborEntries) ? body.laborEntries : []), JSON.stringify(Array.isArray(body.checklist) ? body.checklist : [])])).rows[0];
  } catch (error: any) { warnings.push(`Closeout record could not be saved: ${error.message}`); }

  const shouldInvoice = body.createInvoice ?? body.createAndSendInvoice ?? await getSetting(db, 'workflow.auto_invoice_on_job_closeout', await getSetting(db, 'workflow.auto_invoice_on_job_complete', true));
  if (shouldInvoice) {
    try {
      const created = await createInvoiceFromJob(db, user, id, body);
      invoiceId = created.invoiceId;
      if (closeout?.id && invoiceId) await db.query(`update job_closeouts set created_invoice_id=$2, updated_at=now() where id=$1`, [closeout.id, invoiceId]).catch(() => undefined);
      const shouldSend = body.sendInvoice ?? await getSetting(db, 'workflow.auto_send_invoice_on_job_complete', true);
      if (shouldSend && invoiceId) await sendInvoice(db, user, invoiceId).catch((error) => warnings.push(`Invoice was created but could not be sent automatically: ${error.message}`));
    } catch (error: any) { const raw=String(error.message||''); const code=raw.split(':')[0] || 'INVOICE_CREATE_FAILED'; warnings.push(raw.includes('INVOICE_CLIENT_REQUIRED') ? 'Invoice was not created because no client is linked to this job.' : raw.replace(/^[-A-Z_]+:/,'')); (body as any).__invoiceCode = code; }
  }
  const closeOnSent = await getSetting(db, 'workflow.close_request_when_invoice_sent', false);
  if (closeOnSent && job.requestId && invoiceId) await db.query(`update work_requests set status='closed', updated_at=now() where id=$1`, [job.requestId]).catch((error) => warnings.push(`Linked request could not be closed: ${error.message}`));
  const [updatedJob, invoice] = await Promise.all([
    db.query<any>(`select id::text,status,completed_at::text as "completedAt",closed_at::text as "closedAt",completion_notes as "completionNotes" from jobs where id=$1`, [id]),
    invoiceId ? db.query<any>(`select id::text,invoice_number as "invoiceNumber",status,total_cents as total,balance_cents as balance from invoices where id=$1`, [invoiceId]) : Promise.resolve({ rows: [] } as any),
  ]);
  return { ok: true, job: updatedJob.rows[0], closeout, invoice: invoice.rows[0] || null, warnings, code: (body as any).__invoiceCode, summary: await getWorkflowSummary(db, 'job', id) };
}

async function createInvoiceFromJob(db: Queryable, user: AuthUser, id: string, body: Body) {
  requireManage(user, 'invoices');
  const job = await jobContext(db, id);
  const existing = await db.query<{ id: string }>(`select id::text from invoices where job_id=$1 and status <> 'void' order by created_at desc limit 1`, [id]);
  if (existing.rows[0]) return { ok: true, id: existing.rows[0].id, invoiceId: existing.rows[0].id, summary: await getWorkflowSummary(db, 'invoice', existing.rows[0].id) };
  const quoteItems = job.quoteId ? (await db.query<any>(`select description,quantity,unit_price_cents from quote_items where quote_id=$1 order by sort_order`, [job.quoteId])).rows : [];
  const fallbackTotal = cents(body.total) || Math.round((Number(body.laborHours) || Number(job.laborHours) || 0) * (cents(body.laborRate) || 10000));
  const total = quoteItems.reduce((sum, item) => sum + Math.round(Number(item.quantity || 1) * Number(item.unit_price_cents || 0)), 0) || fallbackTotal;
  const resolvedClientId = await resolveJobClientId(db, job, user); if (!resolvedClientId) throw new HttpError(400, 'INVOICE_CLIENT_REQUIRED:Cannot create invoice because no client is linked to this job.'); await db.query(`update jobs set client_id=$2, updated_at=now() where id=$1 and client_id is null`, [id, resolvedClientId]); const inv = await db.query<{ id: string; invoice_number: string }>(`insert into invoices (client_id,job_id,quote_id,request_id,property_id,status,total_cents,subtotal_cents,deposit_cents,paid_cents,balance_cents,due_at,invoice_number,terms) values ($1,$2,$3,$4,$5,$10,$6,$6,$7,0,greatest(0,$6-$7),now()+interval '14 days',$8,$9) returning id::text, invoice_number`, [resolvedClientId, id, job.quoteId, job.requestId, job.propertyId, total, cents(body.deposit), `INV-${Date.now().toString().slice(-8)}`, str(body.terms, 'Due on receipt'), String(await getSetting(db, 'workflow.closeout_invoice_status', 'draft')) === 'sent' ? 'sent' : 'draft']);
  if (quoteItems.length) for (const item of quoteItems) await db.query(`insert into invoice_items (invoice_id,description,quantity,unit_price_cents) values ($1,$2,$3,$4)`, [inv.rows[0].id, item.description, item.quantity, item.unit_price_cents]);
  else await db.query(`insert into invoice_items (invoice_id,description,quantity,unit_price_cents) values ($1,$2,1,$3)`, [inv.rows[0].id, str(body.workPerformed, job.title || 'Completed work'), total]);
  await addLinkedEvent(db, user, resolvedClientId, job.propertyId, job.requestId, job.quoteId, id, inv.rows[0].id, 'invoice_created', 'Invoice created from completed job');
  return { ok: true, id: inv.rows[0].id, invoiceId: inv.rows[0].id, invoiceNumber: inv.rows[0].invoice_number, summary: await getWorkflowSummary(db, 'invoice', inv.rows[0].id) };
}


async function resolveJobClientId(db: Queryable, job: any, user: AuthUser) {
  if (job.clientId) return job.clientId;
  const resolved = await db.query<any>(`select coalesce(j.client_id,q.client_id,wr.client_id,p.client_id)::text as "clientId" from jobs j left join quotes q on q.id=j.quote_id left join work_requests wr on wr.id=coalesce(j.request_id,q.request_id) left join properties p on p.id=coalesce(j.property_id,q.property_id,wr.property_id) where j.id=$1`, [job.id]);
  return resolved.rows[0]?.clientId || (user.role === 'Client' ? user.clientId || null : null);
}

async function sendInvoice(db: Queryable, user: AuthUser, id: string) {
  await transition(db, user, 'invoice', id, 'invoices', 'sent', 'invoices', `, sent_at=now()`);
  const invoice = await invoiceContext(db, id);
  await createMessage(db, invoice.clientId, 'invoice', id, 'Invoice sent', `Invoice ${invoice.invoiceNumber || id.slice(0,8).toUpperCase()} was sent to the client.`);
  await addActivity(db, user, 'invoice', id, 'invoice_sent', 'Invoice sent', { visibility: 'client' });
  return { ok: true, id, status: 'sent', email: await maybeSendEmail(invoice.email, 'Your invoice is ready', 'Your invoice is ready to view and pay.', '/portal'), summary: await getWorkflowSummary(db, 'invoice', id) };
}

async function markInvoicePaid(db: Queryable, user: AuthUser, id: string, body: Body) {
  requireManage(user, 'payments');
  const invoice = await invoiceContext(db, id);
  const amount = cents(body.amount) || Number(invoice.balanceCents || invoice.totalCents || 0);
  const payment = await db.query<{ id: string }>(`insert into payments (invoice_id,client_id,amount_cents,provider,method,status,note,reference) values ($1,$2,$3,'manual',$4,'completed',$5,$6) returning id::text`, [id, invoice.clientId, amount, str(body.method, 'manual'), str(body.note), str(body.reference)]);
  await db.query(`update invoices set paid_cents=least(total_cents,coalesce(paid_cents,0)+$2), balance_cents=greatest(0,coalesce(balance_cents,total_cents)-$2), status=case when greatest(0,coalesce(balance_cents,total_cents)-$2)=0 then 'paid' else 'partially_paid' end, updated_at=now() where id=$1`, [id, amount]);
  const refreshed = await invoiceContext(db, id);
  await addLinkedEvent(db, user, invoice.clientId, null, invoice.requestId, invoice.quoteId, invoice.jobId, id, 'payment_recorded', 'Payment recorded');
  await addActivity(db, user, 'payment', payment.rows[0].id, 'payment_recorded', 'Payment recorded', { metadata: { invoiceId: id, amount }, visibility: 'client' });
  if (refreshed.status === 'paid') {
    if (invoice.jobId) await db.query(`update jobs set status='closed', closed_at=now(), updated_at=now() where id=$1 and status='completed'`, [invoice.jobId]);
    if (invoice.requestId && await getSetting(db, 'workflow.close_request_when_invoice_paid', true)) await db.query(`update work_requests set status='closed', updated_at=now() where id=$1`, [invoice.requestId]);
    await addActivity(db, user, 'invoice', id, 'closed', 'Invoice paid and closed', { visibility: 'client' });
  }
  return { ok: true, id: payment.rows[0].id, paymentId: payment.rows[0].id, invoiceStatus: refreshed.status, balance: refreshed.balanceCents, summary: await getWorkflowSummary(db, 'invoice', id) };
}

async function getTimeline(db: Queryable, user: AuthUser, entityType: string, id: string, query?: Record<string, string | undefined>) {
  const clientOnly = user.role === 'Client' || query?.visibility === 'client';
  const rows = await db.query(`select id::text,entity_type as "entityType",entity_id::text as "entityId",actor_user_id::text as "actorUserId",event_type as "eventType",title,description,metadata,visibility,created_at::text as "createdAt" from activity_events where entity_type=$1 and entity_id=$2::uuid ${clientOnly ? `and visibility='client'` : ''} order by created_at desc limit 100`, [entityType, id]);
  return { ok: true, events: rows.rows, records: rows.rows };
}

export async function getWorkflowSummary(db: Queryable, entityType: string, id: string) {
  let requestId: string | null = entityType === 'request' ? id : null;
  let quoteId: string | null = entityType === 'quote' ? id : null;
  let jobId: string | null = entityType === 'job' ? id : null;
  let invoiceId: string | null = entityType === 'invoice' ? id : null;
  if (quoteId) requestId = (await db.query<{ request_id: string | null }>(`select request_id::text from quotes where id=$1`, [quoteId])).rows[0]?.request_id || null;
  if (jobId) { const j = (await db.query<any>(`select request_id::text, quote_id::text from jobs where id=$1`, [jobId])).rows[0]; requestId ||= j?.request_id || null; quoteId ||= j?.quote_id || null; }
  if (invoiceId) { const i = (await db.query<any>(`select job_id::text, quote_id::text from invoices where id=$1`, [invoiceId])).rows[0]; jobId ||= i?.job_id || null; quoteId ||= i?.quote_id || null; if (jobId) requestId ||= (await db.query<{ request_id: string | null }>(`select request_id::text from jobs where id=$1`, [jobId])).rows[0]?.request_id || null; }
  if (requestId && !quoteId) quoteId = (await db.query<{ id: string }>(`select id::text from quotes where request_id=$1 order by created_at desc limit 1`, [requestId])).rows[0]?.id || null;
  if ((quoteId || requestId) && !jobId) {
    const lookup = quoteId
      ? await db.query<{ id: string }>(`select id::text from jobs where quote_id=$1 order by created_at desc limit 1`, [quoteId])
      : await db.query<{ id: string }>(`select id::text from jobs where request_id=$1 order by created_at desc limit 1`, [requestId]);
    jobId = lookup.rows[0]?.id || null;
  }
  if (jobId && !invoiceId) invoiceId = (await db.query<{ id: string }>(`select id::text from invoices where job_id=$1 order by created_at desc limit 1`, [jobId])).rows[0]?.id || null;
  const [request, quote, job, invoice, payments, timeline] = await Promise.all([
    requestId ? db.query(`select id::text,status,title,priority from work_requests where id=$1`, [requestId]) : Promise.resolve({ rows: [] } as any),
    quoteId ? db.query(`select id::text,status,total_cents as total from quotes where id=$1`, [quoteId]) : Promise.resolve({ rows: [] } as any),
    jobId ? db.query(`select id::text,status,title from jobs where id=$1`, [jobId]) : Promise.resolve({ rows: [] } as any),
    invoiceId ? db.query(`select id::text,status,invoice_number as "invoiceNumber",total_cents as total,balance_cents as balance from invoices where id=$1`, [invoiceId]) : Promise.resolve({ rows: [] } as any),
    invoiceId ? db.query(`select id::text,status,amount_cents as amount,received_at::text as "receivedAt" from payments where invoice_id=$1 order by received_at desc`, [invoiceId]) : Promise.resolve({ rows: [] } as any),
    db.query(`select entity_type as "entityType",entity_id::text as "entityId",event_type as "eventType",title,visibility,created_at::text as "createdAt" from activity_events where (entity_type='request' and entity_id=$1::uuid) or (entity_type='quote' and entity_id=$2::uuid) or (entity_type='job' and entity_id=$3::uuid) or (entity_type='invoice' and entity_id=$4::uuid) order by created_at desc limit 30`, [requestId, quoteId, jobId, invoiceId]),
  ]);
  return { ok: true, workflow: { request: request.rows[0] || null, quote: quote.rows[0] || null, job: job.rows[0] || null, invoice: invoice.rows[0] || null, payments: payments.rows || [], timeline: timeline.rows || [] } };
}

async function quoteContext(db: Queryable, id: string) {
  const row = (await db.query<any>(`select q.*, q.client_id::text as "clientId", q.request_id::text as "requestId", q.property_id::text as "propertyId", c.email, q.customer_notes as "customerNotes", q.internal_notes as description from quotes q left join clients c on c.id=q.client_id where q.id=$1`, [id])).rows[0];
  if (!row) throw new HttpError(404, 'Quote not found');
  return row;
}
async function jobContext(db: Queryable, id: string) {
  const row = (await db.query<any>(`select j.*, j.client_id::text as "clientId", j.property_id::text as "propertyId", j.quote_id::text as "quoteId", j.request_id::text as "requestId", c.email from jobs j left join clients c on c.id=j.client_id where j.id=$1`, [id])).rows[0];
  if (!row) throw new HttpError(404, 'JOB_NOT_FOUND:Job not found');
  return row;
}
async function invoiceContext(db: Queryable, id: string) {
  const row = (await db.query<any>(`select i.*, i.client_id::text as "clientId", i.job_id::text as "jobId", i.quote_id::text as "quoteId", i.total_cents as "totalCents", i.balance_cents as "balanceCents", i.invoice_number as "invoiceNumber", c.email, j.request_id::text as "requestId" from invoices i left join clients c on c.id=i.client_id left join jobs j on j.id=i.job_id where i.id=$1`, [id])).rows[0];
  if (!row) throw new HttpError(404, 'Invoice not found');
  return row;
}
async function saveQuoteItems(db: Queryable, quoteId: string, items: unknown, replace = false) {
  if (!Array.isArray(items)) return;
  if (replace) await db.query(`delete from quote_items where quote_id=$1`, [quoteId]);
  let i = 0;
  for (const item of items as Body[]) await db.query(`insert into quote_items (quote_id,item_type,description,quantity,unit_price_cents,sort_order) values ($1,$2,$3,$4,$5,$6)`, [quoteId, str(item.type, 'service'), str(item.description, 'Line item'), Number(item.quantity) || 1, cents(item.unitPrice), i++]);
}
async function addLinkedEvent(db: Queryable, user: AuthUser, clientId: string | null, propertyId: string | null, requestId: string | null, quoteId: string | null, jobId: string | null, invoiceId: string | null, eventType: string, title: string) {
  for (const [type, id] of [['client', clientId], ['property', propertyId], ['request', requestId], ['quote', quoteId], ['job', jobId], ['invoice', invoiceId]] as Array<[EntityType, string | null]>) await addActivity(db, user, type, id, eventType, title, { metadata: { clientId, propertyId, requestId, quoteId, jobId, invoiceId }, visibility: 'client' });
}
async function createMessage(db: Queryable, clientId: string | null, entityType: string, entityId: string, subject: string, body: string) {
  const thread = await db.query<{ id: string }>(`insert into message_threads (subject,client_id,entity_type,entity_id,visibility,status) values ($1,$2,$3,$4::uuid,'client','open') returning id::text`, [subject, clientId, entityType, entityId]);
  await db.query(`insert into messages (thread_id,body,internal_only,visibility) values ($1,$2,false,'client')`, [thread.rows[0].id, body]);
}
async function maybeSendEmail(to: string | null | undefined, subject: string, text: string, path: string) {
  const config = readConfig();
  const configured = Boolean(config.resendApiKey && config.emailFrom && to);
  if (!configured) return { configured: false, sent: false };
  await new Resend(config.resendApiKey).emails.send({ from: config.emailFrom!, to: to!, subject, html: `<p>${text}</p><p><a href="${config.appUrl}${path}">Open ContractorOS portal</a></p>` });
  return { configured: true, sent: true };
}
