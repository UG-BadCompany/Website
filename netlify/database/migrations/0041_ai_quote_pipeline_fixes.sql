-- Move AI quote pipeline defaults out of applied migration 0031.
-- Applied migrations are immutable; use this forward-only migration for model default updates.

alter table if exists ai_model_settings
  alter column quote_model set default 'gpt-5.5',
  alter column troubleshooting_model set default 'gpt-5.5';
