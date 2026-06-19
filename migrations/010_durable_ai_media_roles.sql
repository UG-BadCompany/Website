CREATE TABLE IF NOT EXISTS ai_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key text NOT NULL,
  job_type text NOT NULL,
  related_type text,
  related_id uuid,
  status text DEFAULT 'queued',
  stage text DEFAULT 'queued',
  input jsonb DEFAULT '{}'::jsonb,
  output jsonb DEFAULT '{}'::jsonb,
  error_code text,
  error_message text,
  warnings jsonb DEFAULT '[]'::jsonb,
  sources jsonb DEFAULT '[]'::jsonb,
  model text,
  attempts int DEFAULT 0,
  max_attempts int DEFAULT 3,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);
ALTER TABLE ai_quote_drafts ADD COLUMN IF NOT EXISTS ai_job_id uuid REFERENCES ai_jobs(id);
ALTER TABLE ai_troubleshooting_reports ADD COLUMN IF NOT EXISTS ai_job_id uuid REFERENCES ai_jobs(id);
ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS original_name text,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS size_bytes int,
  ADD COLUMN IF NOT EXISTS storage_provider text DEFAULT 'database',
  ADD COLUMN IF NOT EXISTS storage_key text,
  ADD COLUMN IF NOT EXISTS public_url text,
  ADD COLUMN IF NOT EXISTS data bytea,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS link_type text,
  ADD COLUMN IF NOT EXISTS link_id uuid,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id);
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON lower(r.name)=lower(u.role)
WHERE u.role IS NOT NULL
ON CONFLICT DO NOTHING;
