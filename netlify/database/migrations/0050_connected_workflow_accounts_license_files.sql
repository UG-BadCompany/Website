-- Connected CMMS workflow/account/license/file metadata alignment.

alter table app_users add column if not exists source text;
alter table app_users add column if not exists last_login_at timestamptz;
alter table app_users add column if not exists last_seen_at timestamptz;
alter table app_users add column if not exists login_count integer not null default 0;
create unique index if not exists app_users_email_lower_unique on app_users (lower(email));

alter table job_requests drop constraint if exists job_requests_status_check;
alter table job_requests add constraint job_requests_status_check check (status in (
  'new','request_new','needs_review','information_needed','request_info_needed','quote_draft','quote_in_progress','quote_sent','quote_changes_requested','quote_declined','accepted','quote_accepted','quote_converted','work_order_created','waiting_assignment','assigned','scheduled','in_progress','worker_completed','admin_review','admin_review_complete','client_review','client_approved_completion','invoice_ready','invoice_sent','invoiced','payment_pending','paid','payment_verified','waiting_payment','pending_review','completed','closed','archived','cancelled'
));

alter table if exists company_settings add column if not exists license_key text;
alter table if exists company_settings add column if not exists license_status text not null default 'verification_disabled';
alter table if exists company_settings add column if not exists license_verified_at timestamptz;
alter table if exists company_settings add column if not exists license_verification_provider text;
alter table if exists company_settings add column if not exists license_validation_enabled boolean not null default false;

alter table if exists platform_install add column if not exists license_key text;
alter table if exists platform_install add column if not exists license_status text not null default 'verification_disabled';
alter table if exists platform_install add column if not exists license_verified_at timestamptz;
alter table if exists platform_install add column if not exists license_verification_provider text;
alter table if exists platform_install add column if not exists license_validation_enabled boolean not null default false;

alter table if exists files add column if not exists file_url text;
alter table if exists files add column if not exists file_path text;
alter table if exists files add column if not exists file_type text;
alter table if exists files add column if not exists file_size bigint;
alter table if exists files add column if not exists file_category text not null default 'job_file';
alter table if exists files add column if not exists visibility text not null default 'worker_visible';
alter table if exists files add column if not exists customer_id uuid references app_users(id) on delete set null;
alter table if exists files add column if not exists request_id uuid references job_requests(id) on delete cascade;
alter table if exists files add column if not exists photo_estimate_id uuid references photo_estimates(id) on delete set null;
alter table if exists files add column if not exists invoice_id uuid references invoices(id) on delete set null;
alter table if exists files add column if not exists ai_analysis jsonb not null default '{}'::jsonb;
alter table if exists files add column if not exists updated_at timestamptz not null default now();

update files set file_path = coalesce(file_path, path), file_type = coalesce(file_type, mime_type), file_size = coalesce(file_size, size_bytes), file_category = coalesce(file_category, photo_type, 'job_file'), request_id = coalesce(request_id, job_request_id) where file_path is null or file_type is null or file_size is null or request_id is null;

create index if not exists files_request_visibility_idx on files (request_id, visibility, created_at desc);
create index if not exists files_photo_estimate_idx on files (photo_estimate_id, created_at desc);
create index if not exists files_invoice_idx on files (invoice_id, created_at desc);

alter table quotes drop constraint if exists quotes_status_check;
alter table quotes add constraint quotes_status_check check (status in (
  'draft','quote_draft','sent','quote_sent','viewed','accepted','quote_accepted','quote_converted','converted','declined','quote_declined','expired','pending_review','needs_review','quote_changes_requested','requested_changes','quote_in_progress','information_needed','request_info_needed','cancelled'
));
