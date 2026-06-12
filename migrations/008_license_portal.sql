-- ContractorOS License Portal API local snapshot storage.
CREATE TABLE IF NOT EXISTS license_settings (
  id uuid primary key default gen_random_uuid(),
  license_key text,
  license_email text,
  license_api_url text,
  tier text,
  status text,
  enabled_modules jsonb default '[]'::jsonb,
  install_id text unique not null,
  site_url text,
  domain text,
  app_version text,
  expires_at timestamptz,
  last_verified_at timestamptz,
  last_check_error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS license_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  summary text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
