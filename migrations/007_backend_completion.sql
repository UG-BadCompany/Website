-- ContractorOS backend completion: messages, catalog detail support, and core tables.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  client_id uuid REFERENCES clients(id),
  entity_type text,
  entity_id uuid,
  visibility text DEFAULT 'client',
  status text DEFAULT 'open',
  needs_reply boolean DEFAULT false,
  unread_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_user_id uuid REFERENCES users(id),
  body text NOT NULL,
  internal_only boolean DEFAULT false,
  visibility text DEFAULT 'client',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS message_participants (
  thread_id uuid REFERENCES message_threads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  participant_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);
CREATE TABLE IF NOT EXISTS message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  media_asset_id uuid REFERENCES media_assets(id),
  file_id uuid REFERENCES files(id),
  name text,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS message_reads (
  thread_id uuid REFERENCES message_threads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS default_labor_rate_cents int DEFAULT 0;
ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE TABLE IF NOT EXISTS service_catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES service_categories(id),
  name text NOT NULL,
  description text,
  enabled boolean DEFAULT true,
  public_visible boolean DEFAULT true,
  default_labor_hours numeric DEFAULT 0,
  default_labor_rate_cents int DEFAULT 0,
  default_checklist jsonb DEFAULT '[]'::jsonb,
  quote_template_text text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_catalog_items_category_idx ON service_catalog_items(category_id);

CREATE TABLE IF NOT EXISTS quote_line_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE, description text NOT NULL, quantity numeric DEFAULT 1, unit_price_cents int DEFAULT 0, total_cents int DEFAULT 0, sort_order int DEFAULT 0, metadata jsonb DEFAULT '{}'::jsonb, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS invoice_line_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE, description text NOT NULL, quantity numeric DEFAULT 1, unit_price_cents int DEFAULT 0, total_cents int DEFAULT 0, sort_order int DEFAULT 0, metadata jsonb DEFAULT '{}'::jsonb, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS job_checklists (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), job_id uuid REFERENCES jobs(id) ON DELETE CASCADE, label text NOT NULL, completed boolean DEFAULT false, completed_at timestamptz, sort_order int DEFAULT 0, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS job_materials (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), job_id uuid REFERENCES jobs(id) ON DELETE CASCADE, name text NOT NULL, quantity numeric DEFAULT 1, unit_cost_cents int DEFAULT 0, total_cost_cents int DEFAULT 0, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS asset_service_history (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), asset_id uuid REFERENCES assets(id), job_id uuid REFERENCES jobs(id), summary text NOT NULL, serviced_at timestamptz DEFAULT now(), created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS activity_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entity_type text NOT NULL, entity_id uuid NOT NULL, actor_user_id uuid REFERENCES users(id), event_type text NOT NULL, title text NOT NULL, description text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, visibility text NOT NULL DEFAULT 'internal', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS project_showcases (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, description text, before_image_id uuid REFERENCES media_assets(id), after_image_id uuid REFERENCES media_assets(id), gallery_image_ids uuid[] DEFAULT '{}', featured boolean DEFAULT false, show_on_homepage boolean DEFAULT false, status text DEFAULT 'draft', metadata jsonb DEFAULT '{}'::jsonb, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
ALTER TABLE project_showcases ADD COLUMN IF NOT EXISTS before_image_id uuid REFERENCES media_assets(id);
ALTER TABLE project_showcases ADD COLUMN IF NOT EXISTS after_image_id uuid REFERENCES media_assets(id);
ALTER TABLE project_showcases ADD COLUMN IF NOT EXISTS gallery_image_ids uuid[] DEFAULT '{}';
ALTER TABLE project_showcases ADD COLUMN IF NOT EXISTS show_on_homepage boolean DEFAULT false;
ALTER TABLE project_showcases ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';
ALTER TABLE project_showcases ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE project_showcases ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE TABLE IF NOT EXISTS google_reviews_cache (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), place_id text, reviews jsonb NOT NULL DEFAULT '[]'::jsonb, rating numeric DEFAULT 0, fetched_at timestamptz DEFAULT now(), metadata jsonb DEFAULT '{}'::jsonb);
CREATE TABLE IF NOT EXISTS global_design_settings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tokens jsonb NOT NULL DEFAULT '{}'::jsonb, active boolean DEFAULT true, updated_at timestamptz DEFAULT now());
ALTER TABLE global_design_settings ADD COLUMN IF NOT EXISTS tokens jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE global_design_settings ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
CREATE TABLE IF NOT EXISTS workflow_automation_settings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text UNIQUE NOT NULL, value jsonb NOT NULL DEFAULT '{}'::jsonb, enabled boolean DEFAULT true, updated_at timestamptz DEFAULT now());

INSERT INTO permissions (key, group_name, description)
SELECT key, split_part(key,'.',1), key || ' permission'
FROM unnest(ARRAY[
  'messages.view','messages.manage','messages.create','messages.reply','messages.internal','messages.delete',
  'service_catalog.view','service_catalog.manage','project_showcase.view','project_showcase.manage',
  'google_reviews.view','google_reviews.manage','global_design.view','global_design.manage',
  'workflow_automation.view','workflow_automation.manage','portal.view','account.view','jobs.view','work_orders.view','assets.view'
]) key
ON CONFLICT (key) DO UPDATE SET group_name=excluded.group_name, description=excluded.description;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name='Owner' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key = ANY(ARRAY['portal.view','messages.view','messages.create','account.view']) WHERE r.name='Client' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key = ANY(ARRAY['jobs.view','work_orders.view','messages.view','messages.reply','assets.view','account.view']) WHERE r.name='Technician' ON CONFLICT DO NOTHING;

COMMIT;
