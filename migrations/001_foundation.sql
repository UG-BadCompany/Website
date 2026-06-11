-- ContractorOS v1 Foundation schema: PostgreSQL / Netlify Database / Supabase PostgreSQL
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS app_settings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text UNIQUE NOT NULL, value jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS company_settings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_name text, company_email text, company_phone text, address text, website_url text, logo_file_id uuid, time_zone text DEFAULT 'America/New_York', created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS license_installation (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), license_key_hash text NOT NULL, owner_email text NOT NULL, domain text NOT NULL, status text NOT NULL DEFAULT 'pending', provider_response jsonb DEFAULT '{}'::jsonb, checked_at timestamptz, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS installer_state (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), step text NOT NULL, completed boolean DEFAULT false, locked boolean DEFAULT false, summary jsonb DEFAULT '{}'::jsonb, updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS environment_key_mappings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), internal_name text NOT NULL, external_name text NOT NULL, provider text NOT NULL, is_secret boolean DEFAULT true, created_at timestamptz DEFAULT now(), UNIQUE (internal_name, provider));
CREATE TABLE IF NOT EXISTS audit_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid, event text NOT NULL, entity_type text, entity_id uuid, metadata jsonb DEFAULT '{}'::jsonb, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, title text NOT NULL, body text, read_at timestamptz, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS files (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), storage_provider text NOT NULL, storage_key text NOT NULL, file_name text NOT NULL, mime_type text, size_bytes bigint, uploaded_by uuid, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS media_assets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), file_id uuid REFERENCES files(id), owner_type text, owner_id uuid, visibility text DEFAULT 'private', alt_text text, metadata jsonb DEFAULT '{}'::jsonb, created_at timestamptz DEFAULT now());

CREATE TABLE IF NOT EXISTS users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, email citext UNIQUE NOT NULL, status text DEFAULT 'active', created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES users(id), session_token_hash text UNIQUE NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS magic_links (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email citext NOT NULL, token_hash text UNIQUE NOT NULL, expires_at timestamptz NOT NULL, used_at timestamptz, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text UNIQUE NOT NULL, description text, system_role boolean DEFAULT false);
CREATE TABLE IF NOT EXISTS permissions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text UNIQUE NOT NULL, description text, group_name text NOT NULL);
CREATE TABLE IF NOT EXISTS role_permissions (role_id uuid REFERENCES roles(id) ON DELETE CASCADE, permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE, PRIMARY KEY (role_id, permission_id));
CREATE TABLE IF NOT EXISTS user_permissions (user_id uuid REFERENCES users(id) ON DELETE CASCADE, permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE, granted boolean DEFAULT true, PRIMARY KEY (user_id, permission_id));
CREATE TABLE IF NOT EXISTS user_roles (user_id uuid REFERENCES users(id) ON DELETE CASCADE, role_id uuid REFERENCES roles(id) ON DELETE CASCADE, PRIMARY KEY (user_id, role_id));
CREATE TABLE IF NOT EXISTS login_activity (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES users(id), email citext, ip_address inet, user_agent text, success boolean, created_at timestamptz DEFAULT now());

CREATE TABLE IF NOT EXISTS pages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text UNIQUE NOT NULL, title text NOT NULL, status text DEFAULT 'draft', published_version_id uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS page_versions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), page_id uuid REFERENCES pages(id) ON DELETE CASCADE, version_number int NOT NULL, status text DEFAULT 'draft', created_by uuid REFERENCES users(id), created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS page_sections (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), page_version_id uuid REFERENCES page_versions(id) ON DELETE CASCADE, section_type text NOT NULL, sort_order int NOT NULL, content jsonb NOT NULL DEFAULT '{}'::jsonb);
CREATE TABLE IF NOT EXISTS theme_settings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mode text NOT NULL DEFAULT 'system', tokens jsonb NOT NULL DEFAULT '{}'::jsonb, active boolean DEFAULT true, updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS seo_settings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), page_id uuid REFERENCES pages(id), title text, description text, metadata jsonb DEFAULT '{}'::jsonb);

CREATE TABLE IF NOT EXISTS clients (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), display_name text NOT NULL, status text DEFAULT 'lead', created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS client_contacts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid REFERENCES clients(id), name text NOT NULL, email citext, phone text, primary_contact boolean DEFAULT false);
CREATE TABLE IF NOT EXISTS properties (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid REFERENCES clients(id), address text NOT NULL, notes text, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS client_notes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid REFERENCES clients(id), note text NOT NULL, internal_only boolean DEFAULT true, created_by uuid REFERENCES users(id), created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS activity_timeline (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid REFERENCES clients(id), entity_type text, entity_id uuid, summary text NOT NULL, created_at timestamptz DEFAULT now());

CREATE TABLE IF NOT EXISTS service_categories (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text UNIQUE NOT NULL, enabled boolean DEFAULT true, sort_order int DEFAULT 0, metadata jsonb DEFAULT '{}'::jsonb);
CREATE TABLE IF NOT EXISTS work_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid REFERENCES clients(id), property_id uuid REFERENCES properties(id), service_category_id uuid REFERENCES service_categories(id), status text DEFAULT 'new', priority text DEFAULT 'normal', description text, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS work_request_status_history (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid REFERENCES work_requests(id), old_status text, new_status text NOT NULL, changed_by uuid REFERENCES users(id), created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS jobs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid REFERENCES clients(id), property_id uuid REFERENCES properties(id), quote_id uuid, status text DEFAULT 'ready_to_schedule', assigned_user_id uuid REFERENCES users(id), created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS job_status_history (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), job_id uuid REFERENCES jobs(id), old_status text, new_status text NOT NULL, changed_by uuid REFERENCES users(id), created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS work_orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), job_id uuid REFERENCES jobs(id), assigned_user_id uuid REFERENCES users(id), status text DEFAULT 'open', scope text, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS technician_notes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), job_id uuid REFERENCES jobs(id), work_order_id uuid REFERENCES work_orders(id), user_id uuid REFERENCES users(id), note text NOT NULL, customer_visible boolean DEFAULT false, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS schedules (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), job_id uuid REFERENCES jobs(id), work_order_id uuid REFERENCES work_orders(id), starts_at timestamptz NOT NULL, ends_at timestamptz, assigned_user_id uuid REFERENCES users(id));

CREATE TABLE IF NOT EXISTS quotes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid REFERENCES clients(id), request_id uuid REFERENCES work_requests(id), status text DEFAULT 'draft', total_cents int DEFAULT 0, sent_at timestamptz, approved_at timestamptz, declined_at timestamptz, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS quote_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE, item_type text NOT NULL, description text NOT NULL, quantity numeric DEFAULT 1, unit_price_cents int DEFAULT 0, sort_order int DEFAULT 0);
CREATE TABLE IF NOT EXISTS quote_revisions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_id uuid REFERENCES quotes(id), revision_number int NOT NULL, snapshot jsonb NOT NULL, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS quote_templates (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, content jsonb NOT NULL DEFAULT '{}'::jsonb);
CREATE TABLE IF NOT EXISTS labor_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, rate_cents int NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS material_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, unit_cost_cents int NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS invoices (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid REFERENCES clients(id), job_id uuid REFERENCES jobs(id), status text DEFAULT 'draft', total_cents int DEFAULT 0, balance_cents int DEFAULT 0, due_at timestamptz, sent_at timestamptz, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS invoice_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE, description text NOT NULL, quantity numeric DEFAULT 1, unit_price_cents int DEFAULT 0);
CREATE TABLE IF NOT EXISTS invoice_templates (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, content jsonb NOT NULL DEFAULT '{}'::jsonb);
CREATE TABLE IF NOT EXISTS payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id uuid REFERENCES invoices(id), amount_cents int NOT NULL, provider text NOT NULL, status text DEFAULT 'pending', received_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS payment_transactions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_id uuid REFERENCES payments(id), provider text NOT NULL, provider_ref text, status text NOT NULL, raw_response jsonb DEFAULT '{}'::jsonb, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS payment_methods (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid REFERENCES clients(id), provider text NOT NULL, label text, token_ref text, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS refunds (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_id uuid REFERENCES payments(id), amount_cents int NOT NULL, reason text, status text DEFAULT 'pending', created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS customer_statements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid REFERENCES clients(id), period_start date, period_end date, total_cents int DEFAULT 0, generated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS payment_provider_settings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider text UNIQUE NOT NULL, enabled boolean DEFAULT false, key_mapping jsonb DEFAULT '{}'::jsonb, settings jsonb DEFAULT '{}'::jsonb);

CREATE TABLE IF NOT EXISTS assets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), property_id uuid REFERENCES properties(id), name text NOT NULL, asset_type text, status text DEFAULT 'active', metadata jsonb DEFAULT '{}'::jsonb, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS asset_documents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), asset_id uuid REFERENCES assets(id), media_asset_id uuid REFERENCES media_assets(id), created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS asset_notes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), asset_id uuid REFERENCES assets(id), note text NOT NULL, created_by uuid REFERENCES users(id), created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS pm_tasks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), asset_id uuid REFERENCES assets(id), title text NOT NULL, cadence text, next_due_at timestamptz, status text DEFAULT 'planned');
CREATE TABLE IF NOT EXISTS service_history (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), asset_id uuid REFERENCES assets(id), job_id uuid REFERENCES jobs(id), summary text NOT NULL, serviced_at timestamptz DEFAULT now());

CREATE TABLE IF NOT EXISTS message_threads (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), subject text NOT NULL, client_id uuid REFERENCES clients(id), entity_type text, entity_id uuid, visibility text DEFAULT 'client', created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), thread_id uuid REFERENCES message_threads(id) ON DELETE CASCADE, sender_user_id uuid REFERENCES users(id), body text NOT NULL, internal_only boolean DEFAULT false, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS message_participants (thread_id uuid REFERENCES message_threads(id) ON DELETE CASCADE, user_id uuid REFERENCES users(id) ON DELETE CASCADE, participant_type text NOT NULL, PRIMARY KEY (thread_id, user_id));
CREATE TABLE IF NOT EXISTS email_templates (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text UNIQUE NOT NULL, subject text NOT NULL, body text NOT NULL);
CREATE TABLE IF NOT EXISTS email_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), template_key text, recipient citext NOT NULL, provider text DEFAULT 'resend', status text NOT NULL, metadata jsonb DEFAULT '{}'::jsonb, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS notification_preferences (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES users(id), channel text NOT NULL, enabled boolean DEFAULT true, UNIQUE (user_id, channel));

CREATE TABLE IF NOT EXISTS expansion_packs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text UNIQUE NOT NULL, name text NOT NULL, status text DEFAULT 'available', installed_at timestamptz);
CREATE TABLE IF NOT EXISTS marketplace_modules (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text UNIQUE NOT NULL, name text NOT NULL, version text, status text DEFAULT 'available', manifest jsonb DEFAULT '{}'::jsonb);
CREATE TABLE IF NOT EXISTS module_settings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), module_key text NOT NULL, settings jsonb DEFAULT '{}'::jsonb);
CREATE TABLE IF NOT EXISTS module_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), module_key text NOT NULL, event text NOT NULL, payload jsonb DEFAULT '{}'::jsonb, created_at timestamptz DEFAULT now());
COMMIT;
