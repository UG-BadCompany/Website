-- AI Photo Estimate module storage and quote conversion linkage.

create table if not exists photo_estimates (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references app_users(id) on delete set null,
  request_id uuid references job_requests(id) on delete set null,
  quote_id uuid references quotes(id) on delete set null,
  work_order_id uuid references worker_assignments(id) on delete set null,
  created_by uuid references app_users(id) on delete set null,
  status text not null default 'draft' check (status in (
    'draft',
    'photo_uploaded',
    'ai_analyzing',
    'needs_more_info',
    'ready_for_review',
    'quote_created',
    'sent_to_client',
    'accepted',
    'declined',
    'cancelled'
  )),
  service_category text,
  description text,
  property_address text,
  photo_urls jsonb not null default '[]'::jsonb,
  ai_analysis jsonb not null default '{}'::jsonb,
  labor_line_items jsonb not null default '[]'::jsonb,
  material_line_items jsonb not null default '[]'::jsonb,
  pricing_summary jsonb not null default '{}'::jsonb,
  confidence jsonb not null default '{}'::jsonb,
  admin_notes text,
  customer_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table photo_estimates
  add column if not exists customer_id uuid references app_users(id) on delete set null,
  add column if not exists request_id uuid references job_requests(id) on delete set null,
  add column if not exists quote_id uuid references quotes(id) on delete set null,
  add column if not exists work_order_id uuid references worker_assignments(id) on delete set null,
  add column if not exists created_by uuid references app_users(id) on delete set null,
  add column if not exists status text not null default 'draft',
  add column if not exists service_category text,
  add column if not exists description text,
  add column if not exists property_address text,
  add column if not exists photo_urls jsonb not null default '[]'::jsonb,
  add column if not exists ai_analysis jsonb not null default '{}'::jsonb,
  add column if not exists labor_line_items jsonb not null default '[]'::jsonb,
  add column if not exists material_line_items jsonb not null default '[]'::jsonb,
  add column if not exists pricing_summary jsonb not null default '{}'::jsonb,
  add column if not exists confidence jsonb not null default '{}'::jsonb,
  add column if not exists admin_notes text,
  add column if not exists customer_summary text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_photo_estimates_customer_id on photo_estimates (customer_id);
create index if not exists idx_photo_estimates_request_id on photo_estimates (request_id);
create index if not exists idx_photo_estimates_quote_id on photo_estimates (quote_id);
create index if not exists idx_photo_estimates_status on photo_estimates (status);
create index if not exists idx_photo_estimates_created_by on photo_estimates (created_by);
create index if not exists idx_photo_estimates_updated_at on photo_estimates (updated_at desc);

with permission_defaults(role_key, permission_key) as (
  values
    ('owner', 'ai.photo-estimate.use'),
    ('admin', 'ai.photo-estimate.use'),
    ('manager', 'ai.photo-estimate.use'),
    ('worker', 'ai.photo-estimate.use')
)
insert into role_permissions (role_id, permission_key, enabled)
select roles.id, permission_defaults.permission_key, true
from permission_defaults
join roles on roles.key = permission_defaults.role_key
on conflict (role_id, permission_key) do update set
  enabled = true,
  updated_at = now();
