let postgresClient;
let postgresModule;

export function getDatabaseUrl() {
  return process.env.NETLIFY_DATABASE_URL
    || process.env.DATABASE_URL
    || process.env.POSTGRES_URL
    || process.env.POSTGRES_PRISMA_URL;
}

export function isDatabaseConfigured() {
  return Boolean(getDatabaseUrl());
}

async function loadPostgres() {
  if (!postgresModule) {
    try {
      postgresModule = (await import('postgres')).default;
    } catch (error) {
      const wrapped = new Error('Postgres driver is not installed. Run npm install during deployment or make the postgres package available.');
      wrapped.statusCode = 503;
      wrapped.cause = error;
      throw wrapped;
    }
  }
  return postgresModule;
}

export async function sql() {
  const url = getDatabaseUrl();
  if (!url) {
    const error = new Error('Database URL is not configured. Set NETLIFY_DATABASE_URL, DATABASE_URL, or POSTGRES_URL.');
    error.statusCode = 503;
    error.code = 'DATABASE_NOT_CONFIGURED';
    throw error;
  }
  if (!postgresClient) {
    const postgres = await loadPostgres();
    postgresClient = postgres(url, {
      ssl: process.env.NODE_ENV === 'development' ? false : 'require',
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return postgresClient;
}

export async function tryDb(callback, fallback) {
  try {
    const db = await sql();
    await ensureSchema(db);
    return callback(db);
  } catch (error) {
    if (fallback) return fallback(error);
    throw error;
  }
}

export async function withDb(callback) {
  const db = await sql();
  await ensureSchema(db);
  return callback(db);
}

export async function ensureSchema(db) {
  await db.unsafe(`
    create extension if not exists pgcrypto;

    create table if not exists platform_installation (
      id text primary key default 'default',
      installation_complete boolean not null default false,
      installer_draft jsonb not null default '{}'::jsonb,
      recovery_mode boolean not null default false,
      completed_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists company_settings (
      id text primary key default 'default',
      company_name text not null default 'Contractor Platform',
      logo_url text,
      phone text,
      email text,
      address text,
      theme jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists homepage_settings (
      id text primary key default 'default',
      content jsonb not null default '{}'::jsonb,
      published boolean not null default true,
      updated_at timestamptz not null default now()
    );

    create table if not exists app_users (
      id uuid primary key default gen_random_uuid(),
      full_name text not null,
      email text not null unique,
      normalized_email text not null unique,
      phone text,
      company text,
      preferred_contact_method text,
      contact_permission boolean not null default true,
      active boolean not null default true,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists roles (
      id uuid primary key default gen_random_uuid(),
      key text not null unique,
      label text not null,
      description text,
      created_at timestamptz not null default now()
    );

    create table if not exists permissions (
      id uuid primary key default gen_random_uuid(),
      key text not null unique,
      label text not null,
      created_at timestamptz not null default now()
    );

    create table if not exists role_permissions (
      role_key text not null references roles(key) on delete cascade,
      permission_key text not null references permissions(key) on delete cascade,
      primary key(role_key, permission_key)
    );

    create table if not exists user_roles (
      user_id uuid not null references app_users(id) on delete cascade,
      role_key text not null references roles(key) on delete cascade,
      primary key(user_id, role_key)
    );

    create table if not exists workspace_access (
      user_id uuid not null references app_users(id) on delete cascade,
      workspace text not null,
      role_key text not null,
      primary key(user_id, workspace)
    );

    create table if not exists module_registry (
      id text primary key,
      label text not null,
      group_name text not null,
      icon text,
      route text not null,
      permission_key text,
      enabled boolean not null default true,
      manifest jsonb not null default '{}'::jsonb,
      version text not null default '1.0.0',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists module_settings (
      module_id text primary key references module_registry(id) on delete cascade,
      settings jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now()
    );

    create table if not exists service_categories (
      id uuid primary key default gen_random_uuid(),
      name text not null unique,
      active boolean not null default true,
      created_at timestamptz not null default now()
    );

    create table if not exists customers (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      email text,
      phone text,
      status text not null default 'active',
      notes text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists customer_properties (
      id uuid primary key default gen_random_uuid(),
      customer_id uuid references customers(id) on delete cascade,
      label text not null default 'Primary',
      address text not null,
      created_at timestamptz not null default now()
    );

    create table if not exists estimate_requests (
      id uuid primary key default gen_random_uuid(),
      customer_id uuid references customers(id),
      service_category text,
      address text,
      priority text not null default 'normal',
      notes text,
      status text not null default 'request.new',
      photos jsonb not null default '[]'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists quotes (
      id uuid primary key default gen_random_uuid(),
      request_id uuid references estimate_requests(id),
      customer_id uuid references customers(id),
      title text not null,
      status text not null default 'quote.draft',
      line_items jsonb not null default '[]'::jsonb,
      subtotal numeric not null default 0,
      tax numeric not null default 0,
      total numeric not null default 0,
      share_token text unique default encode(gen_random_bytes(16), 'hex'),
      accepted_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists work_orders (
      id uuid primary key default gen_random_uuid(),
      quote_id uuid references quotes(id),
      customer_id uuid references customers(id),
      assigned_user_id uuid references app_users(id),
      title text not null,
      status text not null default 'work_order.ready_to_assign',
      priority text not null default 'normal',
      scheduled_start timestamptz,
      scheduled_end timestamptz,
      notes text,
      completion_notes text,
      materials_used jsonb not null default '[]'::jsonb,
      photos jsonb not null default '[]'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists inventory_items (
      id uuid primary key default gen_random_uuid(),
      sku text,
      name text not null,
      quantity numeric not null default 0,
      reorder_level numeric not null default 0,
      location text,
      active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists inventory_transactions (
      id uuid primary key default gen_random_uuid(),
      item_id uuid references inventory_items(id),
      work_order_id uuid references work_orders(id),
      type text not null,
      quantity numeric not null,
      notes text,
      created_at timestamptz not null default now()
    );

    create table if not exists invoices (
      id uuid primary key default gen_random_uuid(),
      work_order_id uuid references work_orders(id),
      customer_id uuid references customers(id),
      title text not null,
      status text not null default 'invoice.draft',
      line_items jsonb not null default '[]'::jsonb,
      subtotal numeric not null default 0,
      tax numeric not null default 0,
      total numeric not null default 0,
      paid_total numeric not null default 0,
      due_at date,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists payments (
      id uuid primary key default gen_random_uuid(),
      invoice_id uuid references invoices(id),
      amount numeric not null,
      method text not null default 'manual',
      status text not null default 'payment.verified',
      reference text,
      created_at timestamptz not null default now()
    );

    create table if not exists files (
      id uuid primary key default gen_random_uuid(),
      owner_type text not null,
      owner_id uuid,
      file_name text not null,
      content_type text,
      url text,
      visibility text not null default 'private',
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );

    create table if not exists workflow_events (
      id uuid primary key default gen_random_uuid(),
      entity_type text not null,
      entity_id uuid not null,
      from_status text,
      to_status text not null,
      actor_id uuid,
      notes text,
      created_at timestamptz not null default now()
    );

    create table if not exists audit_logs (
      id uuid primary key default gen_random_uuid(),
      actor_id uuid,
      action text not null,
      entity_type text,
      entity_id text,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );

    create table if not exists magic_link_tokens (
      id uuid primary key default gen_random_uuid(),
      normalized_email text not null,
      token_hash text not null unique,
      expires_at timestamptz not null,
      used_at timestamptz,
      created_at timestamptz not null default now()
    );

    create table if not exists platform_secret_settings (
      id uuid primary key default gen_random_uuid(),
      key text not null unique,
      encrypted_value text not null,
      provider text not null default 'encrypted_db',
      last_four text,
      status text not null default 'configured',
      last_tested_at timestamptz,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
}

export async function audit(db, action, metadata = {}, entityType = null, entityId = null, actorId = null) {
  await db`insert into audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values(${actorId}, ${action}, ${entityType}, ${entityId}, ${db.json(metadata)})`;
}
