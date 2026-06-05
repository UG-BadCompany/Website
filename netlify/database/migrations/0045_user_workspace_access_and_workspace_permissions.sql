-- Persist direct user workspace access and add explicit owner/manager dashboard view permissions.

create table if not exists user_workspace_access (
  user_id uuid not null references app_users(id) on delete cascade,
  workspace_key text not null check (workspace_key in ('owner', 'admin', 'manager', 'worker', 'client')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, workspace_key)
);

create index if not exists idx_user_workspace_access_user_id on user_workspace_access (user_id);
create index if not exists idx_user_workspace_access_workspace_key on user_workspace_access (workspace_key);

create table if not exists permissions (
  key text primary key,
  label text,
  description text,
  category text,
  created_at timestamptz not null default now()
);

insert into permissions (key, label, description, category)
values
  ('dashboard.view.owner', 'dashboard.view.owner', 'Allows dashboard view owner.', 'Dashboard'),
  ('dashboard.view.admin', 'dashboard.view.admin', 'Allows dashboard view admin.', 'Dashboard'),
  ('dashboard.view.manager', 'dashboard.view.manager', 'Allows dashboard view manager.', 'Dashboard'),
  ('dashboard.view.worker', 'dashboard.view.worker', 'Allows dashboard view worker.', 'Dashboard'),
  ('dashboard.view.client', 'dashboard.view.client', 'Allows dashboard view client.', 'Dashboard')
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description,
  category = excluded.category;

insert into roles (key, name, description, is_system)
values
  ('owner', 'Owner', 'Can manage all users, roles, permissions, workspaces, settings, and company data.', true),
  ('manager', 'Manager', 'Can manage approved operational workflows and lower-level worker/client users when permitted.', true),
  ('guest', 'Guest', 'Limited placeholder role with no management permissions.', true)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  is_system = true,
  updated_at = now();

with permission_defaults(role_key, permission_key) as (
  values
    ('owner', 'dashboard.view.owner'),
    ('owner', 'dashboard.view.admin'),
    ('owner', 'dashboard.view.manager'),
    ('owner', 'dashboard.view.worker'),
    ('owner', 'dashboard.view.client'),
    ('admin', 'dashboard.view.admin'),
    ('manager', 'dashboard.view.manager'),
    ('worker', 'dashboard.view.worker'),
    ('client', 'dashboard.view.client')
)
insert into role_permissions (role_id, permission_key, enabled)
select roles.id, permission_defaults.permission_key, true
from permission_defaults
join roles on roles.key = permission_defaults.role_key
on conflict (role_id, permission_key) do update set
  enabled = true,
  updated_at = now();

with current_owner as (
  select app_users.id as user_id
  from app_users
  join user_roles on user_roles.user_id = app_users.id
  join roles on roles.id = user_roles.role_id
  where roles.key in ('owner', 'admin')
  order by case when roles.key = 'owner' then 0 else 1 end, app_users.created_at
  limit 1
), owner_role as (
  select id as role_id from roles where key = 'owner' limit 1
)
insert into user_roles (user_id, role_id)
select current_owner.user_id, owner_role.role_id
from current_owner, owner_role
on conflict do nothing;
