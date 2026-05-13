-- Custom roles and role-level permissions for the admin portal.

alter table roles
  drop constraint if exists roles_key_check;

alter table roles
  add column if not exists is_system boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

update roles
set is_system = true
where key in ('client', 'worker', 'admin');

create table if not exists role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_key text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (role_id, permission_key)
);

with permission_defaults(role_key, permission_key) as (
  values
    ('client', 'client.tools'),
    ('client', 'client.requests.manage'),
    ('client', 'client.quotes.manage'),
    ('worker', 'worker.tools'),
    ('admin', 'client.tools'),
    ('admin', 'client.requests.manage'),
    ('admin', 'client.quotes.manage'),
    ('admin', 'worker.tools'),
    ('admin', 'admin.tools'),
    ('admin', 'admin.requests.manage'),
    ('admin', 'admin.quotes.manage'),
    ('admin', 'admin.users.manage'),
    ('admin', 'admin.roles.manage'),
    ('admin', 'dashboard.switch_views')
)
insert into role_permissions (role_id, permission_key, enabled)
select roles.id, permission_defaults.permission_key, true
from permission_defaults
join roles on roles.key = permission_defaults.role_key
on conflict (role_id, permission_key) do update set
  enabled = true,
  updated_at = now();

create index if not exists idx_role_permissions_role_id on role_permissions (role_id);
create index if not exists idx_role_permissions_permission_key on role_permissions (permission_key);
