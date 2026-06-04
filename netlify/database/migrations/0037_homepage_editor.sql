-- Homepage Editor module storage and permission.
create extension if not exists pgcrypto;

create table if not exists homepage_settings (
  id uuid primary key default gen_random_uuid(),
  hero_headline text,
  hero_subheadline text,
  primary_button_text text,
  primary_button_link text,
  secondary_button_text text,
  secondary_button_link text,
  show_secondary_button boolean not null default true,
  hero_background_url text,
  services_title text,
  services_subtitle text,
  services_config jsonb not null default '[]'::jsonb,
  about_title text,
  about_text text,
  about_text_2 text,
  years_experience_text text,
  local_text text,
  show_about boolean not null default true,
  why_choose_title text,
  why_choose_cards jsonb not null default '[]'::jsonb,
  service_area_title text,
  service_area_text text,
  cities_served jsonb not null default '[]'::jsonb,
  travel_notes text,
  cta_headline text,
  cta_subheadline text,
  cta_button_text text,
  cta_button_link text,
  footer_text text,
  footer_phone text,
  footer_email text,
  footer_address text,
  social_links jsonb not null default '{}'::jsonb,
  license_text text,
  section_visibility jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists homepage_gallery (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  category text,
  location text,
  image_url text,
  before_image_url text,
  after_image_url text,
  featured boolean not null default false,
  visible boolean not null default true,
  sort_order integer not null default 100,
  project_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_homepage_gallery_visible_sort on homepage_gallery (visible, sort_order, created_at);

-- Owner receives homepage.manage automatically through code-level ALL_PERMISSION_KEYS.
-- Admin/Manager must receive homepage.manage only when Owner grants it in role permissions.
