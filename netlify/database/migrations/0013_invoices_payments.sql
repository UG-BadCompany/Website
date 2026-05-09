-- Invoice and payment tracking for completed work waiting on payment.

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
    'waiting_payment',
    'completed',
    'cancelled'
  ));

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  job_request_id uuid not null references job_requests(id) on delete cascade,
  client_id uuid references app_users(id) on delete set null,
  quote_id uuid references quotes(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'paid', 'void')),
  title text not null,
  amount_cents integer not null default 0,
  due_at timestamptz,
  paid_at timestamptz,
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_request_id)
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  job_request_id uuid references job_requests(id) on delete set null,
  client_id uuid references app_users(id) on delete set null,
  amount_cents integer not null default 0,
  method text,
  reference text,
  confirmed_by uuid references app_users(id) on delete set null,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

with permission_defaults(role_key, permission_key) as (
  values
    ('client', 'client.invoices.manage'),
    ('admin', 'client.invoices.manage'),
    ('admin', 'admin.invoices.manage')
)
insert into role_permissions (role_id, permission_key, enabled)
select roles.id, permission_defaults.permission_key, true
from permission_defaults
join roles on roles.key = permission_defaults.role_key
on conflict (role_id, permission_key) do update set
  enabled = true,
  updated_at = now();

create index if not exists idx_invoices_client_id on invoices (client_id);
create index if not exists idx_invoices_status on invoices (status);
create index if not exists idx_invoices_job_request_id on invoices (job_request_id);
create index if not exists idx_payments_invoice_id on payments (invoice_id);
create index if not exists idx_payments_client_id on payments (client_id);
