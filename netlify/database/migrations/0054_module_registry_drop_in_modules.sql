-- Keep Module Manager scoped to major drop-in modules and ensure safe registry columns exist.

create table if not exists module_registry (
  id text primary key,
  role_key text,
  module_key text,
  workspace text,
  title text not null,
  description text,
  enabled boolean not null default true,
  permissions jsonb not null default '[]'::jsonb,
  required_permissions jsonb not null default '[]'::jsonb,
  dependencies jsonb not null default '[]'::jsonb,
  nav_label text,
  nav_icon text,
  module_path text,
  sort_order integer not null default 100,
  last_loaded_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table module_registry add column if not exists role_key text;
alter table module_registry alter column role_key drop not null;
alter table module_registry add column if not exists module_key text;
alter table module_registry add column if not exists workspace text;
alter table module_registry add column if not exists description text;
alter table module_registry add column if not exists permissions jsonb not null default '[]'::jsonb;
alter table module_registry add column if not exists required_permissions jsonb not null default '[]'::jsonb;
alter table module_registry add column if not exists dependencies jsonb not null default '[]'::jsonb;
alter table module_registry add column if not exists nav_label text;
alter table module_registry add column if not exists nav_icon text;
alter table module_registry add column if not exists module_path text;
alter table module_registry add column if not exists sort_order integer not null default 100;
alter table module_registry add column if not exists last_loaded_status text;

update module_registry
set workspace = coalesce(workspace, role_key, split_part(id, '.', 1)),
    role_key = coalesce(role_key, workspace, split_part(id, '.', 1)),
    module_key = coalesce(module_key, id),
    nav_label = coalesce(nav_label, title),
    required_permissions = case when required_permissions = '[]'::jsonb then coalesce(permissions, '[]'::jsonb) else required_permissions end,
    updated_at = now();

create index if not exists module_registry_workspace_idx on module_registry(workspace, enabled, sort_order);
create index if not exists module_registry_module_key_idx on module_registry(module_key);
