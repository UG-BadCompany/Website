alter table job_requests
  add column if not exists work_scope text,
  add column if not exists work_category text;

create index if not exists job_requests_scope_trade_idx
  on job_requests (work_scope, work_category, created_at desc);
