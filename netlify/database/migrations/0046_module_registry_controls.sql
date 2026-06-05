create table if not exists module_registry (
  id text primary key,
  module_key text,
  workspace text,
  title text not null,
  description text,
  enabled boolean not null default true,
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

alter table module_registry add column if not exists module_key text;
alter table module_registry add column if not exists workspace text;
alter table module_registry add column if not exists description text;
alter table module_registry add column if not exists required_permissions jsonb not null default '[]'::jsonb;
alter table module_registry add column if not exists dependencies jsonb not null default '[]'::jsonb;
alter table module_registry add column if not exists nav_icon text;
alter table module_registry add column if not exists module_path text;
alter table module_registry add column if not exists sort_order integer not null default 100;
alter table module_registry add column if not exists last_loaded_status text;

update module_registry
set module_key = coalesce(module_key, id),
    workspace = coalesce(workspace, split_part(id, '.', 1)),
    nav_label = coalesce(nav_label, title),
    updated_at = now();

do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'module_registry' and column_name = 'role_key') then
    execute 'update module_registry set workspace = coalesce(workspace, role_key), updated_at = now()';
  end if;
  if exists (select 1 from information_schema.columns where table_name = 'module_registry' and column_name = 'permissions') then
    execute 'update module_registry set required_permissions = coalesce(required_permissions, permissions, ''[]''::jsonb), updated_at = now()';
  end if;
end $$;

create index if not exists module_registry_workspace_idx on module_registry(workspace, enabled, sort_order);
create index if not exists module_registry_module_key_idx on module_registry(module_key);
