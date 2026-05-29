-- Recurring maintenance plans for Phase 54 sidebar workspace.

create table if not exists maintenance_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references app_users(id) on delete set null,
  property_id uuid references properties(id) on delete set null,
  plan_name text not null,
  plan_type text not null default 'property_care',
  frequency text not null default 'quarterly',
  next_due_date date,
  assigned_worker_id uuid references app_users(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'cancelled')),
  notes text,
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_maintenance_plans_client_id on maintenance_plans (client_id);
create index if not exists idx_maintenance_plans_property_id on maintenance_plans (property_id);
create index if not exists idx_maintenance_plans_next_due_date on maintenance_plans (next_due_date);
create index if not exists idx_maintenance_plans_status on maintenance_plans (status);
