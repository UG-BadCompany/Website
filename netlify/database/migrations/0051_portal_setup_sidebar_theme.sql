-- Portal first-time account setup, sidebar theme tokens, and file linkage hardening.

alter table app_users add column if not exists account_setup_complete boolean not null default true;
alter table app_users add column if not exists source text;
alter table app_users add column if not exists last_login_at timestamptz;
alter table app_users add column if not exists last_seen_at timestamptz;
alter table app_users add column if not exists login_count integer not null default 0;

alter table if exists company_settings add column if not exists selected_theme text;
alter table if exists company_settings add column if not exists color_scheme text;
alter table if exists company_settings add column if not exists sidebar_background_color text;
alter table if exists company_settings add column if not exists sidebar_text_color text;
alter table if exists company_settings add column if not exists sidebar_active_color text;
alter table if exists company_settings add column if not exists sidebar_border_color text;
alter table if exists company_settings add column if not exists sidebar_hover_color text;
alter table if exists company_settings add column if not exists mobile_nav_background_color text;
alter table if exists company_settings add column if not exists mobile_nav_active_color text;

alter table if exists files add column if not exists uploaded_by_user_id uuid references app_users(id) on delete set null;
alter table if exists files add column if not exists customer_id uuid references app_users(id) on delete set null;
alter table if exists files add column if not exists request_id uuid references job_requests(id) on delete cascade;
alter table if exists files add column if not exists quote_id uuid references quotes(id) on delete set null;
alter table if exists files add column if not exists work_order_id uuid references worker_assignments(id) on delete set null;
alter table if exists files add column if not exists photo_estimate_id uuid references photo_estimates(id) on delete set null;
alter table if exists files add column if not exists file_url text;
alter table if exists files add column if not exists file_category text not null default 'job_file';
alter table if exists files add column if not exists visibility text not null default 'worker_visible';
alter table if exists files add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table if exists files add column if not exists ai_analysis jsonb not null default '{}'::jsonb;

update files set uploaded_by_user_id = coalesce(uploaded_by_user_id, owner_id) where uploaded_by_user_id is null;
create index if not exists files_uploaded_by_user_idx on files (uploaded_by_user_id, created_at desc);
create index if not exists files_customer_visibility_idx on files (customer_id, visibility, created_at desc);
