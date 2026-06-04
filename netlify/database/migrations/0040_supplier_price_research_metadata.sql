-- Phase 61: OpenAI-first pricing research metadata for quote material sources.
alter table if exists supplier_prices add column if not exists low_price_cents integer;
alter table if exists supplier_prices add column if not exists average_price_cents integer;
alter table if exists supplier_prices add column if not exists high_price_cents integer;
alter table if exists supplier_prices add column if not exists pricing_confidence numeric not null default 0.25;
alter table if exists supplier_prices add column if not exists search_provider text not null default 'supplier_database';
alter table if exists supplier_prices add column if not exists source_payload jsonb not null default '{}'::jsonb;

create index if not exists supplier_prices_provider_recent_idx on supplier_prices (search_provider, fetched_at desc);
