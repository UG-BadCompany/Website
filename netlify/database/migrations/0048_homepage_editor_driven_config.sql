-- Extends homepage settings with editor-driven structured config for sections,
-- grouped services, projects, contact CTA, request estimate, and footer data.
alter table if exists homepage_settings
  add column if not exists homepage_config jsonb not null default '{}'::jsonb;
