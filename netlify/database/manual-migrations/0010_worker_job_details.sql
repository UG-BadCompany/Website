-- Worker work-order detail fields for checklist and material notes.

alter table worker_assignments
  add column if not exists material_notes text,
  add column if not exists checklist_items jsonb not null default '[]'::jsonb;
