-- Production work order pipeline status alignment.

alter table job_requests
  drop constraint if exists job_requests_status_check;

alter table job_requests
  add constraint job_requests_status_check check (status in (
    'new',
    'needs_review',
    'information_needed',
    'quote_in_progress',
    'quote_sent',
    'accepted',
    'waiting_assignment',
    'assigned',
    'scheduled',
    'in_progress',
    'worker_completed',
    'admin_review',
    'client_review',
    'invoice_ready',
    'invoiced',
    'payment_pending',
    'payment_verified',
    'waiting_payment',
    'pending_review',
    'completed',
    'closed',
    'cancelled'
  ));

alter table worker_assignments
  drop constraint if exists worker_assignments_status_check;

alter table worker_assignments
  add constraint worker_assignments_status_check check (status in (
    'assigned',
    'accepted',
    'in_progress',
    'worker_completed',
    'completed',
    'blocked',
    'cancelled'
  ));
