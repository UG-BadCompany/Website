BEGIN;
ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS service_area text,
  ADD COLUMN IF NOT EXISTS business_hours text;

CREATE TABLE IF NOT EXISTS dashboard_layouts (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  layout_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO permissions (key, group_name, description) VALUES
('portal.view','portal','View client portal'),('portal.manage','portal','Manage/support client portal'),
('account.view','account','View own account'),('account.manage','account','Manage account records'),
('company.view','company','View company settings'),('company.manage','company','Manage company settings'),
('foundation.view','foundation','View Foundation status'),('foundation.manage','foundation','Manage Foundation status'),
('payment.view','payment','View payment settings'),('payment.manage','payment','Manage payment settings'),
('email.view','email','View email settings'),('email.manage','email','Manage email settings'),
('homepage.view','homepage','View homepage builder'),('diagnostics.view','diagnostics','View system diagnostics')
ON CONFLICT (key) DO UPDATE SET group_name = excluded.group_name, description = excluded.description;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'Owner'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key = ANY(ARRAY['portal.view','portal.manage','account.view','account.manage']) WHERE r.name = 'Admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key = ANY(ARRAY['portal.view','account.view']) WHERE r.name = 'Client'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key = 'account.view' WHERE r.name IN ('Office','Dispatcher','Technician','Vendor')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key = 'portal.manage' WHERE r.name = 'Office'
ON CONFLICT DO NOTHING;
COMMIT;
