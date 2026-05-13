-- Worker completion evidence fields for required closeout notes and photos.

alter table worker_assignments
  add column if not exists completion_notes text,
  add column if not exists completion_photo_names jsonb not null default '[]'::jsonb,
  add column if not exists completion_submitted_at timestamptz;

create index if not exists idx_worker_assignments_completion_submitted_at on worker_assignments (completion_submitted_at);
