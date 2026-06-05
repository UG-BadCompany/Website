(() => {
  const WORKFLOW = Object.freeze({
    pipeline: ['submitted', 'quote_pending', 'draft', 'sent', 'accepted', 'waiting_assignment', 'assigned', 'scheduled', 'in_progress', 'worker_completed', 'admin_review', 'client_review', 'invoice_ready', 'invoiced', 'payment_pending', 'paid', 'payment_verified', 'closed'],
    quoteActive: ['new', 'needs_review', 'pending_review', 'draft', 'sent', 'viewed', 'information_needed', 'quote_in_progress'],
    quoteHistory: ['accepted', 'converted', 'declined', 'cancelled', 'expired'],
    workOrderActive: ['waiting_assignment', 'assigned', 'scheduled', 'in_progress', 'worker_completed', 'admin_review', 'admin_review_complete', 'client_review', 'client_approved_completion', 'invoice_ready', 'invoice_sent', 'invoiced', 'payment_pending'],
    workOrderHistory: ['paid', 'payment_verified', 'closed', 'completed', 'cancelled'],
    workerActive: ['assigned', 'scheduled', 'in_progress'],
    workerHistory: ['worker_completed', 'admin_review', 'client_review', 'invoice_ready', 'invoice_sent', 'invoiced', 'payment_pending', 'paid', 'payment_verified', 'closed', 'completed', 'cancelled'],
    clientRequestActive: ['submitted', 'new', 'needs_review', 'information_needed', 'quote_pending', 'quote_in_progress'],
    clientRequestHistory: ['quote_created', 'quote_sent', 'accepted', 'declined', 'converted', 'cancelled', 'closed'],
    clientQuoteActive: ['sent', 'viewed', 'needs_response', 'requested_changes'],
    clientQuoteHistory: ['accepted', 'declined', 'expired', 'converted', 'cancelled'],
    invoiceActive: ['draft', 'open', 'sent', 'payment_pending', 'overdue'],
    invoiceHistory: ['paid', 'payment_verified', 'void', 'cancelled'],
  });
  const normalizeStatus = (status = '') => ({ quoted:'sent', quote_sent:'sent', quote_accepted:'waiting_assignment', accepted_quote:'waiting_assignment', work_order_created:'waiting_assignment', completed_by_worker:'worker_completed', pending_review:'admin_review', ready_to_invoice:'invoice_ready', invoice_sent:'invoiced', waiting_payment:'payment_pending', open:'payment_pending', payment_received:'paid', completed:'closed' }[String(status || '').toLowerCase()] || String(status || '').toLowerCase());
  const isStatusIn = (status, group) => (WORKFLOW[group] || []).includes(normalizeStatus(status)) || (WORKFLOW[group] || []).includes(String(status || '').toLowerCase());
  const filter = (items = [], group, selector = (item) => item?.status) => items.filter((item) => isStatusIn(selector(item), group));
  const listeners = new Map();
  const on = (event, handler) => { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(handler); return () => listeners.get(event)?.delete(handler); };
  const emit = (event, detail = {}) => { window.dispatchEvent(new CustomEvent(`ta:${event}`, { detail })); (listeners.get(event) || []).forEach((handler) => { try { handler(detail); } catch (error) { console.warn('Workflow event handler failed', event, error); } }); (listeners.get('*') || []).forEach((handler) => { try { handler(event, detail); } catch (error) { console.warn('Workflow wildcard handler failed', event, error); } }); };
  window.TAWorkflow = { WORKFLOW, normalizeStatus, isStatusIn, filter, on, emit, events: ['quote:accepted', 'quote:converted', 'workorder:created', 'workorder:assigned', 'workorder:completed', 'workorder:closed', 'invoice:created', 'invoice:paid', 'payment:verified', 'inventory:updated'] };
  window.TAEventBus = window.TAEventBus || { on, emit };
})();
