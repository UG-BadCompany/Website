-- Allows sidebar and mobile nav colors to follow the selected theme by default.
alter table if exists company_settings add column if not exists custom_sidebar_colors_enabled boolean not null default false;
alter table if exists company_settings add column if not exists custom_mobile_nav_colors_enabled boolean not null default false;
