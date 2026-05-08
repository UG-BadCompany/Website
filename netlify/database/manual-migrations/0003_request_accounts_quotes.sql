-- Request-created client accounts, quote links, and admin-managed role support.

alter table job_requests
  add column if not exists street_address text;

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  job_request_id uuid references job_requests(id) on delete set null,
  client_id uuid references app_users(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired')),
  title text not null,
  summary text,
  amount_cents integer,
  magic_link_token_hash text unique,
  magic_link_expires_at timestamptz,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_job_requests_city_address on job_requests (city, street_address);
create index if not exists idx_quotes_client_id on quotes (client_id);
create index if not exists idx_quotes_job_request_id on quotes (job_request_id);
create index if not exists idx_quotes_status on quotes (status);
create index if not exists idx_quotes_magic_link_token_hash on quotes (magic_link_token_hash);
