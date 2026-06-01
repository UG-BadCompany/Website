-- Phase 59: photo-aware AI metadata for uploaded job/request/work-order files.
alter table if exists files add column if not exists caption text;
alter table if exists files add column if not exists notes text;
alter table if exists files add column if not exists photo_type text not null default 'issue';
alter table if exists files add column if not exists source_context text not null default 'job_request';
alter table if exists files add column if not exists quote_id text;
alter table if exists files add column if not exists work_order_id text;
alter table if exists files add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists files_job_photo_type_idx on files (job_request_id, photo_type, created_at desc);
create index if not exists files_work_order_idx on files (work_order_id, created_at desc);
