-- Assignment metadata used by the commercial work order pipeline UI.

alter table worker_assignments
  add column if not exists priority text not null default 'normal',
  add column if not exists arrival_window text,
  add column if not exists estimated_duration text,
  add column if not exists required_materials jsonb not null default '[]'::jsonb,
  add column if not exists required_photos jsonb not null default '[]'::jsonb;

create index if not exists idx_worker_assignments_priority on worker_assignments (priority);
