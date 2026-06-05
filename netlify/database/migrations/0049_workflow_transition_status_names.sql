-- Add explicit workflow transition names used by client/admin workflow copy.

alter table job_requests
  drop constraint if exists job_requests_status_check;

alter table job_requests
  add constraint job_requests_status_check check (status in (
    'new',
    'request_new',
    'needs_review',
    'information_needed',
    'quote_draft',
    'quote_in_progress',
    'quote_sent',
    'accepted',
    'quote_accepted',
    'work_order_created',
    'waiting_assignment',
    'assigned',
    'scheduled',
    'in_progress',
    'worker_completed',
    'admin_review',
    'admin_review_complete',
    'client_review',
    'client_approved_completion',
    'invoice_ready',
    'invoice_sent',
    'invoiced',
    'payment_pending',
    'paid',
    'payment_verified',
    'waiting_payment',
    'pending_review',
    'completed',
    'closed',
    'cancelled'
  ));
