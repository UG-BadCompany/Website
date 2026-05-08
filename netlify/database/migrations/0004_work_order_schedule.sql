-- Work order scheduling, completion tracking, and client reschedule requests.

alter table job_requests
  add column if not exists planned_service_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists client_requested_service_at timestamptz,
  add column if not exists client_reschedule_note text;

create index if not exists idx_job_requests_planned_service_at on job_requests (planned_service_at);
create index if not exists idx_job_requests_completed_at on job_requests (completed_at);
