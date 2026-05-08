-- Admin-managed user contact details for portal profiles.

alter table app_users
  add column if not exists secondary_phone text,
  add column if not exists mailing_address text,
  add column if not exists internal_notes text;
