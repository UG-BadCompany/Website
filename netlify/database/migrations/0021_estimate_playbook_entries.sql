create table if not exists estimate_playbook_entries (
  id bigint generated always as identity primary key,
  sheet_key text not null,
  source_gid text not null,
  source_tab text not null,
  row_number integer not null,
  row_payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sheet_key, source_gid, row_number)
);

create index if not exists estimate_playbook_entries_sheet_idx
  on estimate_playbook_entries (sheet_key, source_gid, row_number);
