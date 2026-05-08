-- Restore the applied work-order schedule migration expected by Netlify Database.
-- These statements are intentionally idempotent because later migrations also
-- ensure the same schedule columns exist for fresh databases.

alter table job_requests
  add column if not exists estimated_start_date date,
  add column if not exists completion_date date;

create index if not exists idx_job_requests_estimated_start_date on job_requests (estimated_start_date);
create index if not exists idx_job_requests_completion_date on job_requests (completion_date);
