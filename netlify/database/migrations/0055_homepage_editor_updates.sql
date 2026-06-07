-- Homepage editor updates belong in a new immutable migration after 0048 was applied.
-- Re-assert the structured homepage config column here so any post-0048 deploys get
-- the editor-driven schema without changing the already-applied 0048 migration body.
alter table if exists homepage_settings
  add column if not exists homepage_config jsonb not null default '{}'::jsonb;
