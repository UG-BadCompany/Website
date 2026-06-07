export const WORKFLOW_STATUSES = {
  request_received: { label: 'Request Received', active: true, next: ['quote_draft'] },
  quote_draft: { label: 'Quote Draft', active: true, next: ['quote_sent'] },
  quote_sent: { label: 'Quote Sent', active: true, next: ['quote_accepted','quote_declined'] },
  quote_accepted: { label: 'Quote Accepted', active: true, next: ['work_order_created'] },
  quote_declined: { label: 'Quote Declined', active: false, next: ['archived'] },
  work_order_created: { label: 'Work Order Created', active: true, next: ['scheduled'] },
  scheduled: { label: 'Scheduled', active: true, next: ['worker_assigned'] },
  worker_assigned: { label: 'Worker Assigned', active: true, next: ['in_progress'] },
  in_progress: { label: 'In Progress', active: true, next: ['completed'] },
  completed: { label: 'Completed', active: false, next: ['reviewed','invoice_draft'] },
  reviewed: { label: 'Reviewed', active: false, next: ['invoice_draft'] },
  invoice_draft: { label: 'Invoice Draft', active: true, next: ['invoice_sent'] },
  invoice_sent: { label: 'Invoice Sent', active: true, next: ['paid'] },
  paid: { label: 'Paid', active: false, next: ['verified'] },
  verified: { label: 'Verified', active: false, next: ['archived'] },
  archived: { label: 'Archived', active: false, next: [] }
};
export function transition(record, toStatus, actor = 'system') {
  const current = WORKFLOW_STATUSES[record.status] || WORKFLOW_STATUSES.request_received;
  if (!current.next.includes(toStatus)) throw Object.assign(new Error(`Cannot move ${record.status} to ${toStatus}`), { code: 'INVALID_TRANSITION' });
  return { ...record, status: toStatus, active: WORKFLOW_STATUSES[toStatus].active, updatedAt: new Date().toISOString(), history: [...(record.history || []), { from: record.status, to: toStatus, actor, at: new Date().toISOString() }] };
}
export function createWorkflow(payload = {}) { return { id: crypto.randomUUID(), recordType: 'request', status: 'request_received', active: true, payload, history: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; }
