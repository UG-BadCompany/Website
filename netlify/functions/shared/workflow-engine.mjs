export const CANONICAL_STATUSES = ['request_new','request_info_needed','quote_draft','quote_sent','quote_changes_requested','quote_declined','quote_accepted','quote_converted','work_order_created','waiting_assignment','assigned','scheduled','in_progress','worker_completed','admin_review','client_review','invoice_ready','invoice_sent','invoiced','payment_pending','paid','payment_verified','closed','archived','cancelled','completed'];

export const TRANSITIONS = {
  'request.created': { from: ['new', 'request_new'], to: 'request_new', entityType: 'request' },
  'quote.drafted': { from: ['request_new', 'request_info_needed'], to: 'quote_draft', entityType: 'quote' },
  'quote.sent': { from: ['quote_draft'], to: 'quote_sent', entityType: 'quote' },
  'quote.accepted': { from: ['quote_sent'], to: 'quote_accepted', entityType: 'quote', sideEffects: ['mark_quote_accepted'] },
  'quote.converted': { from: ['quote_accepted'], to: 'quote_converted', entityType: 'quote', sideEffects: ['create_work_order', 'remove_from_active_quotes'] },
  'workorder.created': { from: ['quote_converted'], to: 'waiting_assignment', entityType: 'work_order' },
  'workorder.assigned': { from: ['waiting_assignment'], to: 'assigned', entityType: 'work_order' },
  'workorder.scheduled': { from: ['assigned'], to: 'scheduled', entityType: 'work_order' },
  'workorder.started': { from: ['scheduled'], to: 'in_progress', entityType: 'work_order' },
  'workorder.worker_completed': { from: ['in_progress'], to: 'admin_review', entityType: 'work_order', sideEffects: ['remove_from_worker_active', 'save_completion_photos'] },
  'workorder.admin_approved': { from: ['admin_review'], to: 'client_review', entityType: 'work_order' },
  'workorder.client_approved': { from: ['client_review'], to: 'invoice_ready', entityType: 'work_order' },
  'invoice.created': { from: ['invoice_ready'], to: 'invoice_sent', entityType: 'invoice' },
  'invoice.sent': { from: ['invoice_sent'], to: 'payment_pending', entityType: 'invoice' },
  'invoice.paid': { from: ['payment_pending'], to: 'paid', entityType: 'invoice', sideEffects: ['update_finance'] },
  'payment.verified': { from: ['paid'], to: 'payment_verified', entityType: 'payment', sideEffects: ['close_work_order', 'remove_from_active_invoices'] },
  'workorder.closed': { from: ['payment_verified'], to: 'closed', entityType: 'work_order' },
  'workorder.archived': { from: ['closed'], to: 'archived', entityType: 'work_order' }
};

export function transition({ entityType, entityId, event, status = 'new', userId, metadata = {} }) {
  const rule = TRANSITIONS[event];
  if (!rule) return { ok: false, code: 'UNKNOWN_WORKFLOW_EVENT', message: `Unknown workflow event: ${event}` };
  if (entityType && rule.entityType !== entityType && !(entityType === 'workorder' && rule.entityType === 'work_order')) return { ok: false, code: 'ENTITY_TYPE_MISMATCH', message: `Event ${event} does not apply to ${entityType}.` };
  if (!rule.from.includes(status)) return { ok: false, code: 'INVALID_TRANSITION', message: `Cannot apply ${event} from ${status}.`, from: status, allowedFrom: rule.from };
  return { ok: true, entityId, event, previousStatus: status, status: rule.to, sideEffects: rule.sideEffects || [], audit: { userId, at: new Date().toISOString(), metadata } };
}

export function activeFilter(items, view = 'active') {
  const inactive = new Set(['quote_converted','quote_declined','paid','payment_verified','closed','archived','cancelled','completed']);
  if (view === 'all') return items;
  if (view === 'history') return items.filter((item) => inactive.has(item.status));
  return items.filter((item) => !inactive.has(item.status));
}
