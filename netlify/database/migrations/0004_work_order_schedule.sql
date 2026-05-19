-- Restore admin-managed work order schedule dates used in the dashboard.

alter table job_requests
  add column if not exists estimated_start_date date,
  add column if not exists completion_date date;

create index if not exists idx_job_requests_estimated_start_date on job_requests (estimated_start_date);
create index if not exists idx_job_requests_completion_date on job_requests (completion_date);
