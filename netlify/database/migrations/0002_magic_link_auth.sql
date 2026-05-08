-- Passwordless portal login support.
-- Stores only token/session hashes; raw magic-link and session tokens are never persisted.

create table if not exists auth_magic_links (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,
  purpose text not null default 'sign_in' check (purpose in ('sign_in', 'client_account')),
  client_name text,
  client_phone text,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  session_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists idx_auth_magic_links_email on auth_magic_links (email);
create index if not exists idx_auth_magic_links_token_hash on auth_magic_links (token_hash);
create index if not exists idx_auth_magic_links_expires_at on auth_magic_links (expires_at);
create index if not exists idx_auth_sessions_user_id on auth_sessions (user_id);
create index if not exists idx_auth_sessions_session_hash on auth_sessions (session_hash);
create index if not exists idx_auth_sessions_expires_at on auth_sessions (expires_at);
