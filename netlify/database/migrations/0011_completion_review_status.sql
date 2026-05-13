-- Add a client/admin completion review state before work orders become completed.

alter table job_requests
  drop constraint if exists job_requests_status_check;

alter table job_requests
  add constraint job_requests_status_check check (status in (
    'new',
    'needs_review',
    'quote_in_progress',
    'quote_sent',
    'accepted',
    'scheduled',
    'in_progress',
    'pending_review',
    'completed',
    'cancelled'
  ));
