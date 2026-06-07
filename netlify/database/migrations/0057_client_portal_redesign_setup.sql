-- Client portal landing-page redesign support and first-time setup preferences.

alter table app_users
  add column if not exists preferred_contact_method text;
