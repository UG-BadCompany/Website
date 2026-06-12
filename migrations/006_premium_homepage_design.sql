BEGIN;
CREATE TABLE IF NOT EXISTS global_design_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'entire-app' CHECK (scope in ('homepage','public','entire-app')),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
INSERT INTO global_design_settings (scope, settings)
SELECT 'entire-app', '{"header":{"style":"glass","sticky":true,"showLogo":true,"showCompanyName":true,"navAlignment":"right"},"background":{"type":"solid","color":"#f5f9ff","gradient":"","imageUrl":""},"buttons":{"style":"pill"},"cards":{"style":"raised"},"typography":{"headingStyle":"Inter","bodyStyle":"Inter"}}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM global_design_settings);

CREATE TABLE IF NOT EXISTS project_showcases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT '',
  location text DEFAULT '',
  before_image text DEFAULT '',
  after_image text DEFAULT '',
  gallery_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS google_business_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key text DEFAULT '',
  place_id text DEFAULT '',
  reviews_cache jsonb NOT NULL DEFAULT '[]'::jsonb,
  average_rating numeric DEFAULT 0,
  review_count integer DEFAULT 0,
  refreshed_at timestamptz NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
INSERT INTO google_business_integrations (api_key, place_id)
SELECT '', '' WHERE NOT EXISTS (SELECT 1 FROM google_business_integrations);

INSERT INTO permissions (key, group_name, description) VALUES
  ('project_showcase.view','marketing','View project showcase'),
  ('project_showcase.manage','marketing','Manage project showcase'),
  ('integrations.manage','settings','Manage third-party integrations')
ON CONFLICT (key) DO UPDATE SET group_name=excluded.group_name, description=excluded.description;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key in ('project_showcase.view','project_showcase.manage','integrations.manage')
WHERE r.name in ('Owner','Admin') ON CONFLICT DO NOTHING;
COMMIT;
