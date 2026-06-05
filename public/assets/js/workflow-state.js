(() => {
  const WORKFLOW = Object.freeze({
    statuses: ['request_new','request_info_needed','quote_draft','quote_sent','quote_changes_requested','quote_declined','quote_accepted','quote_converted','work_order_created','waiting_assignment','assigned','scheduled','in_progress','worker_completed','admin_review','client_review','invoice_ready','invoice_sent','invoiced','payment_pending','paid','payment_verified','closed','archived','cancelled','completed'],
    pipeline: ['request_new','quote_draft','quote_sent','quote_accepted','quote_converted','work_order_created','waiting_assignment','assigned','scheduled','in_progress','worker_completed','admin_review','client_review','invoice_ready','invoice_sent','payment_pending','paid','payment_verified','closed'],
    quoteActive: ['request_new','request_info_needed','quote_draft','quote_sent','quote_changes_requested','new','needs_review','pending_review','draft','sent','viewed','information_needed','quote_in_progress'],
    quoteHistory: ['quote_declined','quote_accepted','quote_converted','accepted','converted','declined','cancelled','expired'],
    workOrderActive: ['waiting_assignment','assigned','scheduled','in_progress','worker_completed','admin_review','client_review','invoice_ready','invoice_sent','invoiced','payment_pending'],
    workOrderHistory: ['paid','payment_verified','closed','archived','cancelled','completed'],
    workerActive: ['assigned','scheduled','in_progress'],
    workerHistory: ['worker_completed','admin_review','client_review','invoice_ready','invoice_sent','invoiced','payment_pending','paid','payment_verified','closed','archived','completed','cancelled'],
    clientRequestActive: ['request_new','request_info_needed','new','submitted','needs_review','information_needed','quote_pending','quote_in_progress'],
    clientRequestHistory: ['quote_draft','quote_sent','quote_accepted','quote_converted','quote_created','accepted','declined','converted','cancelled','closed'],
    clientQuoteActive: ['quote_sent','quote_changes_requested','sent','viewed','needs_response','requested_changes'],
    clientQuoteHistory: ['quote_accepted','quote_declined','quote_converted','accepted','declined','expired','converted','cancelled'],
    invoiceActive: ['invoice_ready','invoice_sent','invoiced','payment_pending','draft','open','sent','overdue'],
    invoiceHistory: ['paid','payment_verified','closed','void','cancelled'],
    tabs: Object.freeze({
      active: ['waiting_assignment','assigned','scheduled','in_progress','worker_completed','admin_review','client_review','invoice_ready','invoice_sent','invoiced','payment_pending'],
      needs_assignment: ['waiting_assignment'],
      in_progress: ['assigned','scheduled','in_progress'],
      review: ['worker_completed','admin_review','client_review'],
      invoice_payment: ['invoice_ready','invoice_sent','invoiced','payment_pending'],
      history: ['paid','payment_verified','closed','archived','cancelled','completed'],
    }),
  });
  const normalizeStatus = (status = '') => ({ submitted:'request_new', new:'request_new', needs_review:'request_new', information_needed:'request_info_needed', quote_pending:'quote_draft', quote_in_progress:'quote_draft', draft:'quote_draft', quoted:'quote_sent', sent:'quote_sent', viewed:'quote_sent', requested_changes:'quote_changes_requested', accepted:'quote_accepted', accepted_quote:'quote_accepted', converted:'quote_converted', declined:'quote_declined', work_order_created:'waiting_assignment', completed_by_worker:'worker_completed', pending_review:'admin_review', admin_review_complete:'client_review', client_approved_completion:'invoice_ready', ready_to_invoice:'invoice_ready', open:'payment_pending', waiting_payment:'payment_pending', payment_received:'paid', void:'cancelled' }[String(status || '').toLowerCase()] || String(status || '').toLowerCase());
  const statusSet = (group) => WORKFLOW[group] || WORKFLOW.tabs[group] || [];
  const isStatusIn = (status, group) => statusSet(group).includes(normalizeStatus(status)) || statusSet(group).includes(String(status || '').toLowerCase());
  const filter = (items = [], group, selector = (item) => item?.status) => items.filter((item) => isStatusIn(selector(item), group));

  const STATUS_TABS = Object.freeze({ active: 'Active', completed: 'Completed', inactive: 'Inactive', cancelled: 'Cancelled', all: 'All' });
  const statusDetails = (status = '') => {
    const normalized = normalizeStatus(status);
    const labels = { request_new:'🟢 Active', request_info_needed:'🟡 Waiting Approval', quote_draft:'🟡 Waiting Approval', quote_sent:'🟡 Waiting Approval', quote_changes_requested:'🟡 Waiting Approval', quote_accepted:'🟢 Active', quote_converted:'🟢 Active', waiting_assignment:'🟢 Active', assigned:'🟢 Active', scheduled:'🔵 Scheduled', in_progress:'🟢 Active', worker_completed:'🟡 Waiting Approval', admin_review:'🟡 Waiting Approval', client_review:'🟡 Waiting Approval', invoice_ready:'🟡 Waiting Approval', invoice_sent:'🟡 Waiting Approval', invoiced:'🟡 Waiting Approval', payment_pending:'🟡 Waiting Approval', paid:'✅ Completed', payment_verified:'✅ Completed', closed:'✅ Completed', archived:'⚪ Inactive', inactive:'⚪ Inactive', cancelled:'🔴 Cancelled', completed:'✅ Completed', quote_declined:'🔴 Cancelled', declined:'🔴 Cancelled', expired:'⚪ Inactive' };
    const tab = ['cancelled','quote_declined','declined'].includes(normalized) ? 'cancelled' : ['paid','payment_verified','closed','completed'].includes(normalized) ? 'completed' : ['archived','inactive','expired'].includes(normalized) ? 'inactive' : 'active';
    const tone = tab === 'cancelled' ? 'cancelled' : tab === 'completed' ? 'completed' : tab === 'inactive' ? 'inactive' : normalized === 'scheduled' ? 'scheduled' : ['quote_sent','quote_draft','request_info_needed','worker_completed','admin_review','client_review','invoice_ready','invoice_sent','payment_pending'].includes(normalized) ? 'waiting' : 'active';
    const fallback = normalized ? normalized.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()) : 'Active';
    return { normalized, label: labels[normalized] || `🟢 ${fallback}`, tab, tone };
  };
  const statusTabFor = (status) => statusDetails(status).tab;
  const statusBadge = (status) => { const details = statusDetails(status); return `<span class="status-badge ${details.tone}">${details.label}</span>`; };
  const filterByStatusTab = (items = [], tab = 'active', selector = (item) => item?.status) => tab === 'all' ? items : items.filter((item) => statusTabFor(selector(item)) === tab);

  const listeners = new Map();
  const on = (event, handler) => { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(handler); return () => listeners.get(event)?.delete(handler); };
  const emit = (event, detail = {}) => { window.dispatchEvent(new CustomEvent(`ta:${event}`, { detail })); window.dispatchEvent(new CustomEvent('ta:workflow-refresh', { detail: { event, ...detail } })); (listeners.get(event) || []).forEach((handler) => { try { handler(detail); } catch (error) { console.warn('Workflow event handler failed', event, error); } }); (listeners.get('*') || []).forEach((handler) => { try { handler(event, detail); } catch (error) { console.warn('Workflow wildcard handler failed', event, error); } }); };
  const refreshEvents = ['request:created','quote:sent','quote:accepted','quote:converted','workorder:created','workorder:assigned','workorder:completed','workorder:closed','invoice:created','invoice:paid','payment:verified','photo:uploaded','photo:analyzed','user:created','user:linked'];
  refreshEvents.forEach((event) => window.addEventListener(`ta:${event}`, () => window.TADashboardRouter?.refresh?.()));
  window.TAWorkflow = { WORKFLOW, STATUS_TABS, normalizeStatus, statusDetails, statusTabFor, statusBadge, filterByStatusTab, statusSet, isStatusIn, filter, on, emit, refreshEvents };
})();
