-- ContractorOS default dashboard module completion schema additions.
BEGIN;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(), ADD COLUMN IF NOT EXISTS email citext, ADD COLUMN IF NOT EXISTS phone text, ADD COLUMN IF NOT EXISTS billing_address text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(), ADD COLUMN IF NOT EXISTS property_type text, ADD COLUMN IF NOT EXISTS access_notes text, ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE work_requests ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(), ADD COLUMN IF NOT EXISTS title text, ADD COLUMN IF NOT EXISTS internal_notes text, ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES users(id);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(), ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id), ADD COLUMN IF NOT EXISTS subtotal_cents int DEFAULT 0, ADD COLUMN IF NOT EXISTS tax_cents int DEFAULT 0, ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(), ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES work_requests(id), ADD COLUMN IF NOT EXISTS title text, ADD COLUMN IF NOT EXISTS scope text, ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(), ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES quotes(id), ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES work_requests(id), ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id), ADD COLUMN IF NOT EXISTS deposit_cents int DEFAULT 0, ADD COLUMN IF NOT EXISTS paid_cents int DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id), ADD COLUMN IF NOT EXISTS method text DEFAULT 'manual', ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE message_threads ADD COLUMN IF NOT EXISTS status text DEFAULT 'open', ADD COLUMN IF NOT EXISTS needs_reply boolean DEFAULT false, ADD COLUMN IF NOT EXISTS unread_count int DEFAULT 0;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'client';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(), ADD COLUMN IF NOT EXISTS serial_number text, ADD COLUMN IF NOT EXISTS model_number text, ADD COLUMN IF NOT EXISTS manufacturer text, ADD COLUMN IF NOT EXISTS installed_at date, ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS description text, ADD COLUMN IF NOT EXISTS default_labor_rate_cents int;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS archived_at timestamptz, ADD COLUMN IF NOT EXISTS link_type text, ADD COLUMN IF NOT EXISTS link_id uuid;
INSERT INTO service_categories (name, enabled, sort_order, description) VALUES
('HVAC', true, 0, 'HVAC services'),('Plumbing', true, 1, 'Plumbing services'),('Electrical', true, 2, 'Electrical services'),('Handyman', true, 3, 'Handyman services'),('Appliance', true, 4, 'Appliance services'),('Maintenance', true, 5, 'Maintenance services'),('General Repair', true, 6, 'General repair services')
ON CONFLICT (name) DO UPDATE SET description = coalesce(service_categories.description, excluded.description);
INSERT INTO permissions (key, group_name, description)
SELECT key, split_part(key,'.',1), key || ' permission'
FROM unnest(ARRAY['clients.view','clients.manage','properties.view','properties.manage','requests.view','requests.manage','quotes.view','quotes.manage','jobs.view','jobs.manage','invoices.view','invoices.manage','payments.view','payments.manage','messages.view','messages.manage','cmms.view','cmms.manage','service_catalog.view','service_catalog.manage','media.view','media.manage','account.view','account.manage']) key
ON CONFLICT (key) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'Owner' ON CONFLICT DO NOTHING;
COMMIT;
