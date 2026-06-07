create table if not exists platform_settings (key text primary key, value jsonb not null, updated_at timestamptz default now());
create table if not exists companies (id uuid primary key default gen_random_uuid(), name text not null, site_url text, created_at timestamptz default now());
create table if not exists users (id uuid primary key default gen_random_uuid(), company_id uuid references companies(id), email text unique not null, name text not null, role text not null default 'owner', created_at timestamptz default now());
create table if not exists roles (id text primary key, label text not null, permissions jsonb not null default '[]'::jsonb);
create table if not exists modules (id text primary key, manifest jsonb not null, enabled boolean default true, installed_at timestamptz default now());
create table if not exists audit_logs (id bigserial primary key, actor_id text, action text not null, target text, metadata jsonb default '{}'::jsonb, created_at timestamptz default now());
create table if not exists workflow_items (id uuid primary key default gen_random_uuid(), type text not null, status text not null, payload jsonb not null default '{}'::jsonb, created_at timestamptz default now(), updated_at timestamptz default now());
