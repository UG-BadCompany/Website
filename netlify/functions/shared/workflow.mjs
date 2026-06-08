import { audit } from './db.mjs';

export const transitions = {
  'request.new': ['request.reviewed', 'quote.draft', 'workflow.archived'],
  'request.reviewed': ['quote.draft', 'workflow.archived'],
  'quote.draft': ['quote.sent', 'quote.accepted', 'workflow.archived'],
  'quote.sent': ['quote.accepted', 'quote.declined', 'workflow.archived'],
  'quote.accepted': ['work_order.ready_to_assign'],
  'work_order.ready_to_assign': ['work_order.assigned', 'work_order.scheduled', 'workflow.archived'],
  'work_order.assigned': ['work_order.scheduled', 'work_order.in_progress', 'workflow.archived'],
  'work_order.scheduled': ['work_order.in_progress', 'workflow.archived'],
  'work_order.in_progress': ['work_order.worker_completed', 'workflow.archived'],
  'work_order.worker_completed': ['work_order.admin_review', 'invoice.draft'],
  'work_order.admin_review': ['invoice.draft', 'workflow.closed'],
  'invoice.draft': ['invoice.sent', 'invoice.paid', 'workflow.archived'],
  'invoice.sent': ['invoice.paid', 'workflow.archived'],
  'invoice.paid': ['payment.verified', 'workflow.closed'],
  'payment.verified': ['workflow.closed'],
  'workflow.closed': ['workflow.archived'],
};

export const activeStatusExclusions = [
  'workflow.closed',
  'workflow.archived',
  'quote.accepted',
  'quote.declined',
  'invoice.paid',
];

export function assertTransition(from, to) {
  if (from === to) return;
  if (!transitions[from]?.includes(to)) {
    const error = new Error(`Invalid workflow transition from ${from} to ${to}.`);
    error.statusCode = 422;
    error.code = 'INVALID_WORKFLOW_TRANSITION';
    throw error;
  }
}

export function tableForEntity(entityType) {
  return {
    request: 'estimate_requests',
    quote: 'quotes',
    work_order: 'work_orders',
    invoice: 'invoices',
  }[entityType];
}

export async function transition(db, { entityType, entityId, fromStatus, toStatus, actorId = null, notes = null }) {
  assertTransition(fromStatus, toStatus);
  const table = tableForEntity(entityType);
  if (!table) {
    const error = new Error('Unsupported workflow entity.');
    error.statusCode = 400;
    throw error;
  }

  await db.begin(async (tx) => {
    await tx.unsafe(`update ${table} set status = $1, updated_at = now() where id = $2`, [toStatus, entityId]);
    await tx`insert into workflow_events(entity_type, entity_id, from_status, to_status, actor_id, notes)
      values(${entityType}, ${entityId}, ${fromStatus}, ${toStatus}, ${actorId}, ${notes})`;
    await audit(tx, 'workflow.transition', { fromStatus, toStatus, notes }, entityType, String(entityId), actorId);
  });
}

export async function getCurrentStatus(db, entityType, entityId) {
  const table = tableForEntity(entityType);
  if (!table) {
    const error = new Error('Unsupported workflow entity.');
    error.statusCode = 400;
    throw error;
  }
  const [record] = await db.unsafe(`select status from ${table} where id = $1`, [entityId]);
  if (!record) {
    const error = new Error('Workflow entity not found.');
    error.statusCode = 404;
    throw error;
  }
  return record.status;
}
