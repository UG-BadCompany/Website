-- Homepage editor layout and project configuration belongs in this
-- forward-only migration because 0048 is the applied module registry identity.
-- The structured layout, grouped services, projects, contact CTA, estimate,
-- and footer editor payloads are stored in homepage_settings.homepage_config.
alter table if exists homepage_settings
  add column if not exists homepage_config jsonb not null default '{}'::jsonb;
