alter table quote_research_queue
  add column if not exists confidence_score numeric(5,2),
  add column if not exists normalized_key text,
  add column if not exists notes text;

create index if not exists quote_research_queue_normalized_key_idx
  on quote_research_queue (normalized_key, created_at desc);
