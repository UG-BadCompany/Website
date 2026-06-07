-- 0001 core white-label contractor CMMS platform
create table if not exists platform_installation (
  id text primary key default 'default',
  installation_complete boolean not null default false,
  installed_version text,
  installed_at timestamptz,
  installed_by_user_id uuid,
  current_step text not null default 'welcome',
  license_status text not null default 'not_checked',
  bootstrap_generated boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into platform_installation (id) values ('default') on conflict (id) do nothing;

create table if not exists company_settings (
  id text primary key default 'default', company_name text, site_url text,
  business_type text, logo_url text, support_email text,
  theme_mode text not null default 'system', theme_primary_color text default '#2563eb',
  theme_accent_color text default '#f97316', theme_background_color text default '#f8fafc',
  theme_surface_color text default '#ffffff', theme_text_color text default '#0f172a',
  theme_border_color text default '#cbd5e1', theme_button_color text default '#2563eb',
  theme_button_text_color text default '#ffffff', custom_sidebar_colors_enabled boolean default false,
  sidebar_background_color text default '#0f172a', sidebar_text_color text default '#e2e8f0',
  sidebar_active_background_color text default '#2563eb', sidebar_active_text_color text default '#ffffff',
  sidebar_hover_background_color text default '#1e293b', custom_mobile_nav_colors_enabled boolean default false,
  mobile_nav_background_color text default '#ffffff', mobile_nav_active_color text default '#2563eb',
  mobile_nav_text_color text default '#0f172a', metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists app_users (id uuid primary key default gen_random_uuid(), email text unique not null, full_name text, phone text, status text default 'active', metadata jsonb default '{}'::jsonb, created_at timestamptz default now());
create table if not exists roles (key text primary key, label text not null, hierarchy int not null default 0);
create table if not exists permissions (key text primary key, label text not null, module_id text, metadata jsonb default '{}'::jsonb);
create table if not exists role_permissions (role_key text references roles(key), permission_key text references permissions(key), primary key(role_key, permission_key));
create table if not exists user_roles (user_id uuid references app_users(id), role_key text references roles(key), primary key(user_id, role_key));
create table if not exists workspace_access (user_id uuid references app_users(id), workspace text not null, primary key(user_id, workspace));

create table if not exists encrypted_environment_values (key text primary key, category text not null, ciphertext text not null, status text default 'saved', updated_at timestamptz default now());
create table if not exists license_settings (id text primary key default 'default', license_key_fingerprint text, status text default 'placeholder', grace_days int default 14, metadata jsonb default '{}'::jsonb, updated_at timestamptz default now());

create table if not exists module_registry (id text primary key, title text not null, version text not null, enabled boolean default true, visibility jsonb default '[]'::jsonb, manifest jsonb not null, status text default 'available', updated_at timestamptz default now());
create table if not exists module_settings (module_id text references module_registry(id), key text not null, value jsonb default '{}'::jsonb, primary key(module_id, key));

create table if not exists customers (id uuid primary key default gen_random_uuid(), email text, full_name text, phone text, metadata jsonb default '{}'::jsonb, created_at timestamptz default now());
create table if not exists customer_properties (id uuid primary key default gen_random_uuid(), customer_id uuid references customers(id), address text, metadata jsonb default '{}'::jsonb);
create table if not exists workflow_records (id uuid primary key default gen_random_uuid(), record_type text not null default 'request', status text not null default 'request_received', customer_id uuid, title text, active boolean default true, payload jsonb default '{}'::jsonb, created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists job_requests (id uuid primary key default gen_random_uuid(), workflow_id uuid references workflow_records(id), customer_email text, status text default 'request_received', payload jsonb default '{}'::jsonb, created_at timestamptz default now());
create table if not exists quotes (id uuid primary key default gen_random_uuid(), workflow_id uuid references workflow_records(id), status text default 'quote_draft', total_cents int default 0, payload jsonb default '{}'::jsonb, created_at timestamptz default now());
create table if not exists quote_line_items (id uuid primary key default gen_random_uuid(), quote_id uuid references quotes(id), description text, quantity numeric default 1, unit_price_cents int default 0);
create table if not exists work_orders (id uuid primary key default gen_random_uuid(), workflow_id uuid references workflow_records(id), status text default 'work_order_created', scheduled_for timestamptz, payload jsonb default '{}'::jsonb, created_at timestamptz default now());
create table if not exists work_order_assignments (id uuid primary key default gen_random_uuid(), work_order_id uuid references work_orders(id), user_id uuid references app_users(id), status text default 'assigned');
create table if not exists work_order_updates (id uuid primary key default gen_random_uuid(), work_order_id uuid references work_orders(id), user_id uuid, note text, created_at timestamptz default now());
create table if not exists work_order_materials (id uuid primary key default gen_random_uuid(), work_order_id uuid references work_orders(id), inventory_item_id uuid, quantity numeric default 1);
create table if not exists inventory_items (id uuid primary key default gen_random_uuid(), sku text, name text not null, quantity numeric default 0, reorder_level numeric default 0, metadata jsonb default '{}'::jsonb);
create table if not exists inventory_transactions (id uuid primary key default gen_random_uuid(), item_id uuid references inventory_items(id), change numeric not null, reason text, created_at timestamptz default now());
create table if not exists invoices (id uuid primary key default gen_random_uuid(), workflow_id uuid references workflow_records(id), status text default 'invoice_draft', total_cents int default 0, square_payment_link text, payload jsonb default '{}'::jsonb, created_at timestamptz default now());
create table if not exists payments (id uuid primary key default gen_random_uuid(), invoice_id uuid references invoices(id), provider text default 'square', status text default 'pending', amount_cents int default 0, payload jsonb default '{}'::jsonb, created_at timestamptz default now());
create table if not exists uploaded_files (id uuid primary key default gen_random_uuid(), owner_user_id uuid, linked_type text, linked_id uuid, category text, visibility text default 'private', url text, filename text, metadata jsonb default '{}'::jsonb, created_at timestamptz default now());
create table if not exists photo_estimates (id uuid primary key default gen_random_uuid(), workflow_id uuid references workflow_records(id), file_id uuid references uploaded_files(id), status text default 'uploaded', ai_summary text, payload jsonb default '{}'::jsonb, created_at timestamptz default now());
create table if not exists ai_runs (id uuid primary key default gen_random_uuid(), feature text not null, model text, status text default 'queued', input_summary text, output_summary text, token_usage jsonb default '{}'::jsonb, cost_estimate numeric, created_at timestamptz default now());
create table if not exists homepage_settings (id text primary key default 'default', sections jsonb not null default '[]'::jsonb, settings jsonb not null default '{}'::jsonb, updated_at timestamptz default now());
create table if not exists homepage_projects (id uuid primary key default gen_random_uuid(), title text, description text, image_url text, sort_order int default 0, visible boolean default true);
create table if not exists audit_logs (id uuid primary key default gen_random_uuid(), actor_user_id uuid, action text not null, target_type text, target_id text, metadata jsonb default '{}'::jsonb, created_at timestamptz default now());
create table if not exists backups (id uuid primary key default gen_random_uuid(), kind text not null, status text default 'created', metadata jsonb default '{}'::jsonb, created_at timestamptz default now());
