-- Phase 57 AI intelligence engine persistence.
-- OpenAI is the primary estimator/troubleshooter; fallback output is logged and learned from only after AI failure.

create table if not exists ai_model_settings (
  id boolean primary key default true,
  ai_enabled boolean not null default true,
  quote_model text not null default 'gpt-5.5',
  troubleshooting_model text not null default 'gpt-5.5',
  timeout_ms integer not null default 14000,
  max_retries integer not null default 1,
  fallback_only_on_ai_failure boolean not null default true,
  require_admin_approval boolean not null default true,
  save_ai_knowledge_automatically boolean not null default true,
  require_approval_before_promoting boolean not null default true,
  show_ai_reasoning_details boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_model_settings_singleton check (id = true)
);

insert into ai_model_settings (id)
values (true)
on conflict (id) do nothing;

create table if not exists ai_quote_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null default 'quote',
  entity_id text,
  model text,
  prompt_version text,
  input_summary jsonb not null default '{}'::jsonb,
  service_type text,
  work_category text,
  trade text,
  symptoms text,
  scope text,
  city text,
  output_json jsonb not null default '{}'::jsonb,
  validation_result text not null default 'unknown',
  validation_errors jsonb not null default '[]'::jsonb,
  fallback_used boolean not null default false,
  fallback_reason text,
  fallback_source text,
  ai_enhanced boolean not null default false,
  labor_hours_low numeric,
  labor_hours_high numeric,
  material_list jsonb not null default '[]'::jsonb,
  quantities jsonb not null default '{}'::jsonb,
  confidence_score numeric,
  risk_flags jsonb not null default '[]'::jsonb,
  exclusions jsonb not null default '[]'::jsonb,
  retry_count integer not null default 0,
  admin_edits jsonb not null default '{}'::jsonb,
  final_sent_quote_amount_cents integer,
  final_approved_work_order_result jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_quote_runs_run_type_created_idx on ai_quote_runs (run_type, created_at desc);
create index if not exists ai_quote_runs_entity_idx on ai_quote_runs (entity_id);
create index if not exists ai_quote_runs_input_gin_idx on ai_quote_runs using gin (input_summary);
create index if not exists ai_quote_runs_output_gin_idx on ai_quote_runs using gin (output_json);

create table if not exists ai_quote_knowledge (
  id uuid primary key default gen_random_uuid(),
  source_run_id uuid references ai_quote_runs(id) on delete set null,
  trade text,
  service_type text,
  work_category text,
  city text,
  knowledge_type text not null default 'quote_pattern',
  content jsonb not null default '{}'::jsonb,
  confidence_score numeric,
  review_status text not null default 'pending_review',
  promoted_to_company_standard boolean not null default false,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ai_troubleshooting_knowledge (
  id uuid primary key default gen_random_uuid(),
  source_run_id uuid references ai_quote_runs(id) on delete set null,
  trade text,
  component text,
  symptom text,
  knowledge_type text not null default 'diagnostic_step',
  content text not null,
  source_payload jsonb not null default '{}'::jsonb,
  review_status text not null default 'pending_review',
  promoted_to_company_standard boolean not null default false,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ai_material_knowledge (
  id uuid primary key default gen_random_uuid(),
  source_run_id uuid references ai_quote_runs(id) on delete set null,
  name text not null,
  trade text,
  supplier text,
  sku text,
  quantity_assumption numeric,
  unit text,
  source_payload jsonb not null default '{}'::jsonb,
  review_status text not null default 'pending_review',
  promoted_to_company_standard boolean not null default false,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ai_material_knowledge_unique_idx
  on ai_material_knowledge (name, coalesce(trade, ''), coalesce(unit, ''));

create table if not exists ai_labor_knowledge (
  id uuid primary key default gen_random_uuid(),
  source_run_id uuid references ai_quote_runs(id) on delete set null,
  phase_name text not null,
  trade text,
  hours_low numeric,
  hours_high numeric,
  source_payload jsonb not null default '{}'::jsonb,
  review_status text not null default 'pending_review',
  promoted_to_company_standard boolean not null default false,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ai_labor_knowledge_unique_idx
  on ai_labor_knowledge (phase_name, coalesce(trade, ''));

create table if not exists ai_admin_corrections (
  id uuid primary key default gen_random_uuid(),
  quote_id text,
  job_request_id text,
  actor_user_id text,
  original_ai_result jsonb not null default '{}'::jsonb,
  admin_changes jsonb not null default '{}'::jsonb,
  final_approved_quote jsonb not null default '{}'::jsonb,
  recommended_hours numeric,
  approved_hours numeric,
  price_adjustment_cents integer,
  exclusions_added jsonb not null default '[]'::jsonb,
  customer_wording_changes text,
  created_at timestamptz not null default now()
);

create index if not exists ai_admin_corrections_quote_idx on ai_admin_corrections (quote_id, created_at desc);
create index if not exists ai_material_knowledge_review_idx on ai_material_knowledge (review_status, created_at desc);
create index if not exists ai_labor_knowledge_review_idx on ai_labor_knowledge (review_status, created_at desc);
create index if not exists ai_troubleshooting_knowledge_review_idx on ai_troubleshooting_knowledge (review_status, created_at desc);
