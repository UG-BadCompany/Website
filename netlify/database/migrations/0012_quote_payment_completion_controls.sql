-- Quote edit locks, payment verification states, and required worker completion photos.

alter table quotes
  add column if not exists revision integer not null default 1,
  add column if not exists edit_unlocked_at timestamptz,
  add column if not exists edit_unlocked_by uuid references app_users(id) on delete set null,
  add column if not exists edit_reason text,
  add column if not exists resent_at timestamptz;

alter table worker_assignments
  add column if not exists completion_photo_paths jsonb not null default '[]'::jsonb;

create table if not exists payment_verifications (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references quotes(id) on delete cascade,
  job_request_id uuid references job_requests(id) on delete cascade,
  client_id uuid references app_users(id) on delete set null,
  amount_cents integer not null check (amount_cents >= 0),
  provider text not null default 'manual_pending_system',
  provider_reference text,
  status text not null default 'pending_system_verification' check (status in ('pending_system_verification', 'system_verified', 'failed', 'cancelled')),
  admin_reviewed_by uuid references app_users(id) on delete set null,
  admin_reviewed_at timestamptz,
  system_verified_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payment_verifications_quote_id on payment_verifications (quote_id);
create index if not exists idx_payment_verifications_job_request_id on payment_verifications (job_request_id);
create index if not exists idx_payment_verifications_status on payment_verifications (status);
