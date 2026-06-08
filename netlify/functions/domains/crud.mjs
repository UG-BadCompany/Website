import { audit } from '../shared/db.mjs';
import { activeStatusExclusions, transition } from '../shared/workflow.mjs';

export const resources = {
  customers: {
    table: 'customers',
    defaults: { status: 'active' },
    fields: ['name', 'email', 'phone', 'notes', 'status'],
    archiveStatus: 'archived',
  },
  requests: {
    table: 'estimate_requests',
    defaults: { status: 'request.new', priority: 'normal', photos: [] },
    fields: ['customer_id', 'service_category', 'address', 'priority', 'notes', 'status', 'photos'],
    archiveStatus: 'workflow.archived',
  },
  quotes: {
    table: 'quotes',
    defaults: { status: 'quote.draft', line_items: [], subtotal: 0, tax: 0, total: 0 },
    fields: ['request_id', 'customer_id', 'title', 'status', 'line_items', 'subtotal', 'tax', 'total'],
    archiveStatus: 'workflow.archived',
  },
  'work-orders': {
    table: 'work_orders',
    defaults: { status: 'work_order.ready_to_assign', priority: 'normal', materials_used: [], photos: [] },
    fields: ['quote_id', 'customer_id', 'assigned_user_id', 'title', 'status', 'priority', 'scheduled_start', 'scheduled_end', 'notes', 'completion_notes', 'materials_used', 'photos'],
    archiveStatus: 'workflow.archived',
  },
  inventory: {
    table: 'inventory_items',
    defaults: { quantity: 0, reorder_level: 0, active: true },
    fields: ['sku', 'name', 'quantity', 'reorder_level', 'location', 'active'],
    archiveStatus: null,
  },
  invoices: {
    table: 'invoices',
    defaults: { status: 'invoice.draft', line_items: [], subtotal: 0, tax: 0, total: 0, paid_total: 0 },
    fields: ['work_order_id', 'customer_id', 'title', 'status', 'line_items', 'subtotal', 'tax', 'total', 'paid_total', 'due_at'],
    archiveStatus: 'workflow.archived',
  },
  payments: {
    table: 'payments',
    defaults: { method: 'manual', status: 'payment.verified' },
    fields: ['invoice_id', 'amount', 'method', 'status', 'reference'],
    archiveStatus: null,
  },
  files: {
    table: 'files',
    defaults: { visibility: 'private', metadata: {} },
    fields: ['owner_type', 'owner_id', 'file_name', 'content_type', 'url', 'visibility', 'metadata'],
    archiveStatus: null,
  },
  users: {
    table: 'app_users',
    defaults: { active: true, contact_permission: true, metadata: {} },
    fields: ['full_name', 'email', 'normalized_email', 'phone', 'company', 'preferred_contact_method', 'contact_permission', 'active', 'metadata'],
    archiveStatus: null,
  },
  audit: {
    table: 'audit_logs',
    defaults: {},
    fields: [],
    archiveStatus: null,
    readonly: true,
  },
};

function normalizeBody(resourceName, body) {
  const config = resources[resourceName];
  const data = { ...config.defaults, ...body };
  if (resourceName === 'users' && data.email && !data.normalized_email) {
    data.normalized_email = String(data.email).trim().toLowerCase();
  }
  if (data.line_items && typeof data.line_items === 'string') {
    data.line_items = [{ description: data.line_items, quantity: 1, price: Number(data.total || 0) }];
  }
  for (const key of ['photos', 'materials_used', 'line_items', 'metadata']) {
    if (typeof data[key] === 'string') {
      try { data[key] = JSON.parse(data[key]); } catch { data[key] = key === 'metadata' ? {} : []; }
    }
  }
  return data;
}

function valuesForInsert(resourceName, body) {
  const config = resources[resourceName];
  const data = normalizeBody(resourceName, body);
  const keys = config.fields.filter((field) => data[field] !== undefined);
  return { keys, values: keys.map((key) => data[key]) };
}

export async function listResource(db, resourceName, { includeArchived = false } = {}) {
  const config = resources[resourceName];
  if (!config) return null;
  let where = '';
  if (!includeArchived && resourceName !== 'audit') {
    if (config.table === 'inventory_items') where = ' where active = true';
    else if (config.table !== 'payments' && config.table !== 'files' && config.table !== 'app_users') {
      where = ` where coalesce(status, 'active') <> all($1)`;
    }
  }
  const params = where.includes('$1') ? [activeStatusExclusions] : [];
  return db.unsafe(`select * from ${config.table}${where} order by created_at desc limit 300`, params);
}

export async function getResource(db, resourceName, id) {
  const config = resources[resourceName];
  if (!config) return null;
  const [record] = await db.unsafe(`select * from ${config.table} where id = $1`, [id]);
  return record || null;
}

export async function createResource(db, resourceName, body) {
  const config = resources[resourceName];
  if (!config || config.readonly) return null;
  const { keys, values } = valuesForInsert(resourceName, body);
  if (!keys.length) {
    const error = new Error('No writable fields were provided.');
    error.statusCode = 400;
    throw error;
  }
  const columns = keys.map((key) => `"${key}"`).join(', ');
  const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
  const [record] = await db.unsafe(`insert into ${config.table}(${columns}) values(${placeholders}) returning *`, values);
  await audit(db, `${resourceName}.create`, { id: record.id }, resourceName, String(record.id));
  return record;
}

export async function updateResource(db, resourceName, id, body) {
  const config = resources[resourceName];
  if (!config || config.readonly) return null;
  const data = normalizeBody(resourceName, body);
  const keys = config.fields.filter((field) => data[field] !== undefined && field !== 'id');
  if (!keys.length) return getResource(db, resourceName, id);
  const sets = keys.map((key, index) => `"${key}" = $${index + 1}`).join(', ');
  const [record] = await db.unsafe(`update ${config.table} set ${sets}, updated_at = now() where id = $${keys.length + 1} returning *`, [...keys.map((key) => data[key]), id]);
  await audit(db, `${resourceName}.update`, { id }, resourceName, String(id));
  return record;
}

export async function archiveResource(db, resourceName, id) {
  const config = resources[resourceName];
  if (!config || config.readonly) return false;
  if (config.table === 'inventory_items') {
    await db.unsafe(`update ${config.table} set active = false, updated_at = now() where id = $1`, [id]);
  } else if (config.archiveStatus) {
    await db.unsafe(`update ${config.table} set status = $1, updated_at = now() where id = $2`, [config.archiveStatus, id]);
  } else {
    await db.unsafe(`delete from ${config.table} where id = $1`, [id]);
  }
  await audit(db, `${resourceName}.archive`, { id }, resourceName, String(id));
  return true;
}

export async function createQuoteFromRequest(db, body) {
  const [request] = await db`select * from estimate_requests where id = ${body.request_id}`;
  if (!request) throw Object.assign(new Error('Request not found.'), { statusCode: 404 });
  const quote = await createResource(db, 'quotes', {
    ...body,
    customer_id: body.customer_id || request.customer_id,
    title: body.title || `Quote for ${request.service_category || 'Service'}`,
  });
  await transition(db, { entityType: 'request', entityId: request.id, fromStatus: request.status, toStatus: 'quote.draft' });
  return quote;
}

export async function createWorkOrderFromQuote(db, body) {
  const [quote] = await db`select * from quotes where id = ${body.quote_id}`;
  if (!quote) throw Object.assign(new Error('Quote not found.'), { statusCode: 404 });
  if (quote.status !== 'quote.accepted') {
    await transition(db, { entityType: 'quote', entityId: quote.id, fromStatus: quote.status, toStatus: 'quote.accepted' });
  }
  return createResource(db, 'work-orders', {
    ...body,
    customer_id: body.customer_id || quote.customer_id,
    title: body.title || quote.title || 'Work Order',
  });
}

export async function createInvoiceFromWorkOrder(db, body) {
  const [workOrder] = await db`select * from work_orders where id = ${body.work_order_id}`;
  if (!workOrder) throw Object.assign(new Error('Work order not found.'), { statusCode: 404 });
  return createResource(db, 'invoices', {
    ...body,
    customer_id: body.customer_id || workOrder.customer_id,
    title: body.title || `Invoice: ${workOrder.title || 'Work'}`,
  });
}
