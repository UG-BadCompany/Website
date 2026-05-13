-- Worker assignment tables for scheduled job execution.

create table if not exists worker_assignments (
  id uuid primary key default gen_random_uuid(),
  job_request_id uuid not null references job_requests(id) on delete cascade,
  worker_id uuid not null references app_users(id) on delete cascade,
  assigned_by_user_id uuid references app_users(id) on delete set null,
  status text not null default 'assigned' check (status in ('assigned', 'accepted', 'in_progress', 'blocked', 'completed', 'cancelled')),
  scheduled_date date,
  start_time text,
  end_time text,
  notes text,
  worker_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_request_id, worker_id)
);

with permission_defaults(role_key, permission_key) as (
  values
    ('worker', 'worker.jobs.manage'),
    ('admin', 'worker.jobs.manage')
)
insert into role_permissions (role_id, permission_key, enabled)
select roles.id, permission_defaults.permission_key, true
from permission_defaults
join roles on roles.key = permission_defaults.role_key
on conflict (role_id, permission_key) do update set
  enabled = true,
  updated_at = now();

create index if not exists idx_worker_assignments_job_request_id on worker_assignments (job_request_id);
create index if not exists idx_worker_assignments_worker_id on worker_assignments (worker_id);
create index if not exists idx_worker_assignments_status on worker_assignments (status);
create index if not exists idx_worker_assignments_scheduled_date on worker_assignments (scheduled_date);
