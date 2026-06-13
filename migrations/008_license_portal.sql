-- ContractorOS License Portal API local snapshot storage.
CREATE TABLE IF NOT EXISTS license_settings (
  id uuid primary key default gen_random_uuid(),
  license_api_url text not null default 'https://taselling.netlify.app',
  license_key text not null,
  license_email text not null,
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

UPDATE license_settings
SET license_api_url = 'https://taselling.netlify.app',
    license_key = coalesce(license_key, ''),
    license_email = coalesce(license_email, ''),
    tier = coalesce(tier, 'basic'),
    status = coalesce(status, 'unverified');

ALTER TABLE license_settings
  ALTER COLUMN license_api_url SET DEFAULT 'https://taselling.netlify.app',
  ALTER COLUMN license_api_url SET NOT NULL,
  ALTER COLUMN license_key SET NOT NULL,
  ALTER COLUMN license_email SET NOT NULL;

CREATE TABLE IF NOT EXISTS license_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  summary text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
