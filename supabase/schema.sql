-- T&A Contracting Sprint 1 backend foundation schema.
-- Run in Supabase SQL editor after creating the project.
-- This schema starts auth profiles, roles, properties, job requests, and files.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  company_name text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key in ('client', 'worker', 'admin')),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  street text,
  city text,
  state text not null default 'AZ',
  postal_code text,
  access_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.job_request_status as enum (
  'new',
  'needs_review',
  'quote_in_progress',
  'quote_sent',
  'accepted',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled'
);

create table if not exists public.job_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.profiles(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  status public.job_request_status not null default 'new',
  requester_name text not null,
  requester_email text,
  requester_phone text not null,
  city text,
  service_type text not null,
  preferred_timeframe text,
  description text not null,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  job_request_id uuid references public.job_requests(id) on delete cascade,
  bucket text not null default 'job-files',
  path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

insert into public.roles (key, name, description)
values
  ('client', 'Client', 'Can manage their own properties, requests, quotes, invoices, files, and messages.'),
  ('worker', 'Worker', 'Can view and update assigned jobs, checklists, notes, materials, and photos.'),
  ('admin', 'Admin', 'Can manage all users, requests, quotes, jobs, invoices, payments, files, and settings.')
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description;

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.properties enable row level security;
alter table public.job_requests enable row level security;
alter table public.files enable row level security;

create or replace function public.has_role(role_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.key = role_key
  );
$$;

create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.has_role('admin'));

create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = auth.uid() or public.has_role('admin'));

create policy "roles_read_authenticated" on public.roles
  for select to authenticated using (true);

create policy "user_roles_read_own_or_admin" on public.user_roles
  for select using (user_id = auth.uid() or public.has_role('admin'));

create policy "properties_select_owner_or_admin" on public.properties
  for select using (client_id = auth.uid() or public.has_role('admin'));

create policy "properties_insert_owner_or_admin" on public.properties
  for insert with check (client_id = auth.uid() or public.has_role('admin'));

create policy "properties_update_owner_or_admin" on public.properties
  for update using (client_id = auth.uid() or public.has_role('admin'));

create policy "job_requests_select_owner_worker_admin" on public.job_requests
  for select using (
    client_id = auth.uid()
    or public.has_role('worker')
    or public.has_role('admin')
  );

create policy "job_requests_insert_public_or_authenticated" on public.job_requests
  for insert with check (true);

create policy "job_requests_update_admin" on public.job_requests
  for update using (public.has_role('admin'));

create policy "files_select_owner_related_or_admin" on public.files
  for select using (
    owner_id = auth.uid()
    or public.has_role('worker')
    or public.has_role('admin')
  );

create policy "files_insert_authenticated" on public.files
  for insert to authenticated with check (owner_id = auth.uid() or public.has_role('admin'));
