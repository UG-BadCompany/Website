-- Phase 60: admin mobile quote workspace metadata for AI-first quote editing.
alter table if exists quotes add column if not exists ai_enhanced boolean not null default false;
alter table if exists quotes add column if not exists fallback_used boolean not null default false;
alter table if exists quotes add column if not exists fallback_reason text;
alter table if exists quotes add column if not exists pricing_confidence_level text;
alter table if exists quotes add column if not exists range_low_cents integer;
alter table if exists quotes add column if not exists range_high_cents integer;
alter table if exists quotes add column if not exists fixed_price_recommendation_cents integer;
alter table if exists quotes add column if not exists ai_metadata jsonb not null default '{}'::jsonb;
alter table if exists quotes add column if not exists sourcing_notes text;

create index if not exists idx_quotes_updated_at on quotes (updated_at desc);
create index if not exists idx_quotes_ai_metadata_gin on quotes using gin (ai_metadata);
