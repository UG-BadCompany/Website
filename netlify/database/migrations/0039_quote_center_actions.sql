-- Estimate & Quote Center action support for draft deletion, cancellation, information needed, and conversion workflow.

alter table quotes
  drop constraint if exists quotes_status_check;

alter table quotes
  add constraint quotes_status_check check (status in (
    'draft',
    'sent',
    'viewed',
    'accepted',
    'declined',
    'expired',
    'pending_review',
    'needs_review',
    'quote_in_progress',
    'information_needed',
    'cancelled'
  ));

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
    'scheduled',
    'assigned',
    'in_progress',
    'pending_review',
    'waiting_payment',
    'completed',
    'cancelled'
  ));

with permission_defaults(role_key, permission_key) as (
  values
    ('owner', 'quotes.delete'),
    ('owner', 'workorders.create'),
    ('owner', 'invoices.create'),
    ('admin', 'quotes.delete'),
    ('admin', 'workorders.create'),
    ('admin', 'invoices.create'),
    ('manager', 'workorders.create'),
    ('manager', 'invoices.create')
)
insert into role_permissions (role_id, permission_key, enabled)
select roles.id, permission_defaults.permission_key, true
from permission_defaults
join roles on roles.key = permission_defaults.role_key
on conflict (role_id, permission_key) do update set
  enabled = true,
  updated_at = now();
