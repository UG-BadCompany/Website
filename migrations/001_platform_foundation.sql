create table if not exists platform_installation (
  id text primary key default 'default',
  installation_complete boolean not null default false,
  installed_version text,
  installed_at timestamptz,
  installed_by_user_id uuid,
  current_step text not null default 'welcome',
  license_status text not null default 'not_checked',
  bootstrap_generated boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists platform_settings (id text primary key default 'default', settings jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists platform_modules (id text primary key, manifest jsonb not null, enabled boolean not null default true, health text not null default 'healthy', updated_at timestamptz not null default now());
create table if not exists platform_workflows (id uuid primary key default gen_random_uuid(), stage text not null, status text not null, record jsonb not null default '{}'::jsonb, archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists audit_logs (id uuid primary key default gen_random_uuid(), actor_id text, action text not null, target text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
