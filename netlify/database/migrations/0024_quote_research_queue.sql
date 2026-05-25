create table if not exists quote_research_queue (
  id bigint generated always as identity primary key,
  job_request_id text,
  city text,
  source_text text not null,
  candidate_name text not null,
  candidate_unit_cost_cents integer,
  evidence jsonb not null default '[]'::jsonb,
  status text not null default 'new',
  reviewed_by bigint,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quote_research_queue_status_idx
  on quote_research_queue (status, created_at desc);

create index if not exists quote_research_queue_job_request_idx
  on quote_research_queue (job_request_id, created_at desc);
