-- Ensure profile metadata columns exist on already-applied magic-link tables.
-- Some Netlify Database environments applied 0002 before these optional fields were added.

alter table auth_magic_links
  add column if not exists client_name text,
  add column if not exists client_phone text;
