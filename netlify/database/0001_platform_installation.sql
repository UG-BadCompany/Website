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

create table if not exists platform_secret_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  encrypted_value text not null,
  provider text not null default 'encrypted_db',
  last_four text,
  status text not null default 'configured',
  last_tested_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists platform_license_settings (
  id text primary key default 'default',
  license_key text,
  license_status text not null default 'verification_disabled',
  license_plan text,
  license_holder text,
  license_expires_at timestamptz,
  validation_enabled boolean not null default false,
  verification_provider text,
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists company_settings (
  id text primary key default 'default',
  company_name text,
  display_name text,
  legal_name text,
  phone text,
  support_email text,
  quote_email text,
  website_url text,
  address jsonb not null default '{}'::jsonb,
  service_area text,
  timezone text,
  license_number text,
  business_hours jsonb not null default '{}'::jsonb,
  emergency_service_enabled boolean not null default false,
  theme_mode text not null default 'system',
  theme_primary_color text,
  theme_accent_color text,
  theme_background_color text,
  theme_surface_color text,
  theme_text_color text,
  theme_border_color text,
  theme_button_color text,
  theme_button_text_color text,
  custom_sidebar_colors_enabled boolean not null default false,
  sidebar_background_color text,
  sidebar_text_color text,
  sidebar_active_background_color text,
  sidebar_active_text_color text,
  sidebar_hover_background_color text,
  custom_mobile_nav_colors_enabled boolean not null default false,
  mobile_nav_background_color text,
  mobile_nav_active_color text,
  mobile_nav_text_color text,
  updated_at timestamptz not null default now()
);

create table if not exists module_registry (
  id text primary key,
  title text not null,
  version text not null,
  category text not null,
  manifest jsonb not null,
  enabled boolean not null default true,
  status text not null default 'discovered',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists homepage_settings (
  id text primary key default 'default',
  sections jsonb not null default '[]'::jsonb,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists roles (id text primary key, label text not null, hierarchy integer not null, created_at timestamptz not null default now());
create table if not exists permissions (key text primary key, label text not null, permission_group text not null, created_at timestamptz not null default now());
create table if not exists role_permissions (role_id text references roles(id), permission_key text references permissions(key), primary key (role_id, permission_key));
create table if not exists audit_logs (id uuid primary key default gen_random_uuid(), actor_user_id text, action text not null, target text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
