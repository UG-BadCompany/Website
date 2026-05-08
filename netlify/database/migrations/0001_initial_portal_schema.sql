-- T&A Contracting Netlify Database initial portal schema.
-- Netlify Database is Postgres, so this schema avoids provider-specific auth tables.
-- Authentication users are mapped into app_users by auth_provider + auth_subject.

create extension if not exists pgcrypto;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  auth_provider text not null default 'pending',
  auth_subject text,
  email text not null unique,
  full_name text,
  phone text,
  company_name text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (auth_provider, auth_subject)
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key in ('client', 'worker', 'admin')),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists user_roles (
  user_id uuid not null references app_users(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references app_users(id) on delete cascade,
  label text,
  street text,
  city text,
  state text not null default 'AZ',
  postal_code text,
  access_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists job_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references app_users(id) on delete set null,
  property_id uuid references properties(id) on delete set null,
  status text not null default 'new' check (status in (
    'new',
    'needs_review',
    'quote_in_progress',
    'quote_sent',
    'accepted',
    'scheduled',
    'in_progress',
    'completed',
    'cancelled'
  )),
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

create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references app_users(id) on delete set null,
  job_request_id uuid references job_requests(id) on delete cascade,
  storage_provider text not null default 'netlify_blobs',
  bucket text not null default 'job-files',
  path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references app_users(id) on delete set null,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into roles (key, name, description)
values
  ('client', 'Client', 'Can manage their own properties, requests, quotes, invoices, files, and messages.'),
  ('worker', 'Worker', 'Can view and update assigned jobs, checklists, notes, materials, and photos.'),
  ('admin', 'Admin', 'Can manage all users, requests, quotes, jobs, invoices, payments, files, and settings.')
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description;


-- Default owner/admin account placeholder.
-- The auth_provider/auth_subject values should be updated by the auth integration
-- after the real login provider is connected. No password is stored here.
with owner_user as (
  insert into app_users (auth_provider, auth_subject, email, full_name)
  values ('pending', 'thomas.debacker.ii@gmail.com', 'thomas.debacker.ii@gmail.com', 'Thomas DeBacker')
  on conflict (email) do update set
    full_name = excluded.full_name,
    is_active = true
  returning id
), admin_role as (
  select id from roles where key = 'admin'
)
insert into user_roles (user_id, role_id)
select owner_user.id, admin_role.id
from owner_user, admin_role
on conflict do nothing;

create index if not exists idx_app_users_email on app_users (email);
create index if not exists idx_app_users_auth_subject on app_users (auth_provider, auth_subject);
create index if not exists idx_user_roles_user_id on user_roles (user_id);
create index if not exists idx_properties_client_id on properties (client_id);
create index if not exists idx_job_requests_client_id on job_requests (client_id);
create index if not exists idx_job_requests_status on job_requests (status);
create index if not exists idx_files_job_request_id on files (job_request_id);
create index if not exists idx_audit_events_actor on audit_events (actor_user_id);
create index if not exists idx_audit_events_entity on audit_events (entity_type, entity_id);
