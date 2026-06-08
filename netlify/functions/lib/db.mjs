import { getConnectionString } from '@netlify/database';
import pg from 'pg';
import { coreModules, defaultRoles, permissions, rolePermissions, defaultServices } from './platformData.mjs';

const connectionDetectionOrder = ['DATABASE_URL','NETLIFY_DATABASE_URL','getConnectionString()','POSTGRES_URL','POSTGRES_PRISMA_URL','POSTGRES_URL_NON_POOLING','NEON_DATABASE_URL'];
const databaseUrlEnvNames = connectionDetectionOrder.filter((name) => name !== 'getConnectionString()');
const netlifyDatabaseHelperSource = 'getConnectionString()';
const netlifyDatabaseHelperLabel = 'getConnectionString()';
const noConnectionMessage = 'Waiting for Netlify Database provisioning...';
const connectionFoundButFailedMessage = 'A database connection string was found, but the connection attempt failed. Review the diagnostics below for the safe error message.';
const provisioningMessage = 'Waiting for Netlify Database provisioning...';

let cachedPool;
let cachedConnectionString;

function redactSecretValue(value) {
  return String(value || '')
    .replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi, '[REDACTED_POSTGRES_URL]')
    .replace(/(password|passwd|pwd|token|secret|key)=([^&\s]+)/gi, '$1=[REDACTED]');
}

function safeErrorMessage(error) {
  const name = error instanceof Error && error.name ? error.name : 'Error';
  const message = error instanceof Error ? error.message : String(error || 'Unknown error');
  const code = error && typeof error === 'object' && 'code' in error ? ` code=${error.code}` : '';
  return redactSecretValue(`${name}${code}: ${message}`);
}

function safeRuntimeEnvironment() {
  return process.env.NETLIFY ? `netlify:${process.env.CONTEXT || 'unknown'}` : 'local-or-non-netlify';
}

function readEnvConnection(name) {
  const value = typeof process.env[name] === 'string' ? process.env[name].trim() : '';
  return value ? { name, value, source: name } : null;
}

function readHelperConnection() {
  const helperAvailable = typeof getConnectionString === 'function';
  let helperError = null;
  let helperValue = '';
  if (helperAvailable) {
    try {
      const value = getConnectionString();
      helperValue = typeof value === 'string' ? value.trim() : '';
    } catch (error) {
      helperError = safeErrorMessage(error);
    }
  }
  return {
    helperAvailable,
    helperError,
    helperValue,
    helperSucceeded: Boolean(helperValue && !helperError)
  };
}

export function detectedDatabaseUrl() {
  const helper = readHelperConnection();
  const envDetected = Object.fromEntries(databaseUrlEnvNames.map((name) => [name, Boolean(readEnvConnection(name))]));
  let selected = null;
  for (const source of connectionDetectionOrder) {
    selected = source === netlifyDatabaseHelperSource
      ? (helper.helperValue ? { name: netlifyDatabaseHelperLabel, value: helper.helperValue, source: netlifyDatabaseHelperSource } : null)
      : readEnvConnection(source);
    if (selected) break;
  }
  return {
    name: selected?.name || null,
    value: selected?.value || '',
    source: selected?.source || null,
    helperError: helper.helperError,
    getConnectionStringReturnedValue: helper.helperSucceeded,
    getConnectionStringSucceeded: helper.helperSucceeded,
    getConnectionStringAvailable: helper.helperAvailable,
    getConnectionStringStatus: helper.helperSucceeded ? 'Succeeded' : 'Failed',
    rawEnvUrlAvailable: databaseUrlEnvNames.some((name) => envDetected[name]),
    rawEnvNameDetected: databaseUrlEnvNames.find((name) => envDetected[name]) || null,
    rawEnvUrlName: selected?.source && selected.source !== netlifyDatabaseHelperSource ? selected.source : (databaseUrlEnvNames.find((name) => envDetected[name]) || null),
    databaseUrlDetected: envDetected.DATABASE_URL,
    netlifyDatabaseUrlDetected: envDetected.NETLIFY_DATABASE_URL,
    envDetected,
    detectionOrder: connectionDetectionOrder
  };
}
export function hasDatabaseConfig() { return Boolean(detectedDatabaseUrl().value); }
export function databaseBaseStatus(overrides = {}) {
  const detected = detectedDatabaseUrl();
  const selectedConnectionSource = detected.source || null;
  const connectionAttempt = overrides.connectionAttempt || (overrides.connected || overrides.databaseConnected ? 'Succeeded' : (overrides.connectionAttemptFailed ? 'Failed' : 'Not Run'));
  return {
    databaseClientInstalled: true,
    clientInstalled: true,
    getConnectionStringImportSucceeded: true,
    databaseUrlEnvDetected: Boolean(detected.databaseUrlDetected),
    netlifyDatabaseUrlEnvDetected: Boolean(detected.netlifyDatabaseUrlDetected),
    DATABASE_URL: detected.databaseUrlDetected ? 'Detected' : 'Missing',
    NETLIFY_DATABASE_URL: detected.netlifyDatabaseUrlDetected ? 'Detected' : 'Missing',
    getConnectionStringReturnedValue: Boolean(detected.getConnectionStringReturnedValue),
    getConnectionStringSucceeded: Boolean(detected.getConnectionStringSucceeded),
    getConnectionStringAvailable: Boolean(detected.getConnectionStringAvailable),
    getConnectionStringStatus: detected.getConnectionStringStatus,
    getConnectionStringError: detected.helperError,
    rawEnvDetected: Boolean(detected.rawEnvUrlAvailable),
    rawEnvUrlAvailable: Boolean(detected.rawEnvUrlAvailable),
    rawEnvUrlStatus: detected.rawEnvUrlAvailable ? 'Found' : 'Missing',
    databaseUrlDetected: Boolean(detected.value),
    environmentVariableUsed: detected.rawEnvUrlName,
    connectionSource: selectedConnectionSource,
    selectedConnectionSource,
    databaseConnectionSource: selectedConnectionSource,
    connectionSourceLabel: detected.name || 'None detected',
    connectionAttempt,
    configured: Boolean(detected.value),
    manualDatabaseLinkRequired: !detected.value,
    runtimeEnvironment: safeRuntimeEnvironment(),
    nodeVersion: process.version,
    safeError: detected.helperError || (detected.value ? null : 'No supported database connection source was found.'),
    provisioningMessage,
    ...overrides
  };
}
export function databaseRuntimeDiagnostics() {
  const detected = detectedDatabaseUrl();
  const diagnostic = {
    databaseClientInstalled: true,
    getConnectionStringImportSucceeded: true,
    getConnectionStringAvailable: Boolean(detected.getConnectionStringAvailable),
    getConnectionStringReturnedValue: Boolean(detected.getConnectionStringReturnedValue),
    getConnectionStringSucceeded: Boolean(detected.getConnectionStringSucceeded),
    getConnectionStringStatus: detected.getConnectionStringStatus,
    databaseUrlEnvDetected: Boolean(detected.databaseUrlDetected),
    netlifyDatabaseUrlEnvDetected: Boolean(detected.netlifyDatabaseUrlDetected),
    DATABASE_URL: detected.databaseUrlDetected ? 'Detected' : 'Missing',
    NETLIFY_DATABASE_URL: detected.netlifyDatabaseUrlDetected ? 'Detected' : 'Missing',
    rawEnvDetected: Boolean(detected.rawEnvUrlAvailable),
    connectionSource: detected.source || null,
    selectedConnectionSource: detected.source || null,
    runtimeEnvironment: safeRuntimeEnvironment(),
    nodeVersion: process.version,
    safeError: detected.helperError || (detected.value ? null : 'No supported database connection source was found.'),
    rawEnvNamesChecked: databaseUrlEnvNames,
    connectionDetectionOrder,
    rawEnvNameDetected: detected.rawEnvNameDetected
  };
  console.warn('[install-runtime-diagnostics] Database connection detection', {
    DATABASE_URLExists: diagnostic.databaseUrlEnvDetected,
    NETLIFY_DATABASE_URLExists: diagnostic.netlifyDatabaseUrlEnvDetected,
    getConnectionStringAvailable: diagnostic.getConnectionStringAvailable,
    getConnectionStringSucceeded: diagnostic.getConnectionStringSucceeded,
    selectedSource: diagnostic.selectedConnectionSource || 'none',
    runtimeEnvironment: diagnostic.runtimeEnvironment,
    nodeVersion: diagnostic.nodeVersion,
    safeError: diagnostic.safeError
  });
  return diagnostic;
}

export function getPool() {
  const detected = detectedDatabaseUrl();
  if (!detected.value) {
    const error = new Error(noConnectionMessage);
    error.code = 'NETLIFY_DATABASE_CONNECTION_STRING_FAILED';
    error.safeDetails = detected.helperError || 'No supported database connection source was found.';
    throw error;
  }
  if (!cachedPool || cachedConnectionString !== detected.value) {
    cachedConnectionString = detected.value;
    const connectionString = detected.value;
    cachedPool = new pg.Pool({ connectionString });
  }
  return cachedPool;
}
export async function connectToDatabase() {
  const client = await getPool().connect();
  return client;
}
export async function query(text, params = []) {
  const result = await getPool().query(text, params);
  return result.rows || [];
}
async function requiredTableStatus() {
  const rows = await query(`select table_name from information_schema.tables where table_schema='public' and table_name = any($1)`, [requiredTableNames]);
  const existing = new Set(rows.map((row) => row.table_name));
  const missingTables = requiredTableNames.filter((name) => !existing.has(name));
  return { tablesReady: missingTables.length === 0, missingTables, tableCount: rows.length };
}
export async function databaseStatus() {
  const detected = detectedDatabaseUrl();
  if (!detected.value) {
    return databaseBaseStatus({
      ok: false,
      code: 'NETLIFY_DATABASE_CONNECTION_STRING_FAILED',
      connected: false,
      databaseConnected: false,
      schemaReady: false,
      writeTestPassed: false,
      installationComplete: false,
      canBootstrapSchema: false,
      connectionAttempt: 'Not Run',
      message: noConnectionMessage,
      safeDetails: detected.helperError || 'No supported database connection source was found.'
    });
  }
  try {
    await query('select now() as now');
    const { tablesReady, missingTables, tableCount } = await requiredTableStatus();
    let installationComplete = false;
    let writeTestPassed = false;
    if (tablesReady) {
      const install = await query('select installation_complete, write_test_passed from platform_installation order by id limit 1');
      installationComplete = Boolean(install?.[0]?.installation_complete);
      writeTestPassed = Boolean(install?.[0]?.write_test_passed);
    }
    if (!tablesReady || !writeTestPassed) {
      return bootstrapSchema();
    }
    return databaseBaseStatus({
      ok: true,
      code: tablesReady ? 'SCHEMA_READY' : 'SCHEMA_NOT_READY',
      connected: true,
      databaseConnected: true,
      schemaReady: tablesReady,
      writeTestPassed,
      installationComplete,
      canBootstrapSchema: !tablesReady,
      connectionAttempt: 'Succeeded',
      selectNowSucceeded: true,
      tableCount,
      missingTables
    });
  } catch (error) {
    return databaseBaseStatus({ ok: false, code: 'DATABASE_CONNECTION_FAILED', connected: false, databaseConnected: false, schemaReady: false, writeTestPassed: false, installationComplete: false, canBootstrapSchema: false, connectionAttempt: 'Failed', selectNowSucceeded: false, message: connectionFoundButFailedMessage, safeDetails: safeErrorMessage(error), connectionError: safeErrorMessage(error) });
  }
}

const ddl = [
`create table if not exists platform_installation (id bigserial primary key, installation_complete boolean not null default false, schema_ready boolean not null default false, write_test_passed boolean not null default false, installed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), metadata jsonb not null default '{}'::jsonb)`,
`create table if not exists installer_drafts (id text primary key default 'current', draft jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now())`,
`create table if not exists company_settings (id bigserial primary key, company_name text not null, email text, phone text, website text, address text, logo_file_id bigint, favicon_file_id bigint, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`,
`create table if not exists theme_settings (id bigserial primary key, mode text not null default 'system', primary_color text not null default '#2563eb', accent_color text not null default '#f59e0b', background_color text not null default '#f8fafc', surface_color text not null default '#ffffff', text_color text not null default '#0f172a', sidebar_color text not null default '#0f172a', mobile_nav_color text not null default '#111827', custom jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`,
`create table if not exists homepage_settings (id bigserial primary key, hero_title text not null, hero_subtitle text, cta_label text, sections jsonb not null default '[]'::jsonb, published boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`,
`create table if not exists app_users (id bigserial primary key, full_name text not null, email text not null unique, phone text, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`,
`create table if not exists roles (id bigserial primary key, slug text not null unique, name text not null, description text, created_at timestamptz not null default now())`,
`create table if not exists permissions (id bigserial primary key, slug text not null unique, description text, created_at timestamptz not null default now())`,
`create table if not exists role_permissions (role_id bigint not null references roles(id) on delete cascade, permission_id bigint not null references permissions(id) on delete cascade, primary key(role_id, permission_id))`,
`create table if not exists user_roles (user_id bigint not null references app_users(id) on delete cascade, role_id bigint not null references roles(id) on delete cascade, primary key(user_id, role_id))`,
`create table if not exists workspace_access (id bigserial primary key, user_id bigint not null references app_users(id) on delete cascade, workspace text not null, access_level text not null default 'owner', created_at timestamptz not null default now(), unique(user_id, workspace))`,
`create table if not exists module_registry (id text primary key, label text not null, nav_group text not null, enabled boolean not null default true, installed_version text not null default '1.0.0', manifest jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`,
`create table if not exists module_settings (module_id text primary key references module_registry(id) on delete cascade, settings jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now())`,
`create table if not exists service_categories (id bigserial primary key, name text not null unique, active boolean not null default true, sort_order int not null default 0, created_at timestamptz not null default now())`,
`create table if not exists customers (id bigserial primary key, display_name text not null, email text, phone text, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`,
`create table if not exists customer_properties (id bigserial primary key, customer_id bigint not null references customers(id) on delete cascade, label text not null, address text, city text, state text, postal_code text, created_at timestamptz not null default now())`,
`create table if not exists job_requests (id bigserial primary key, customer_id bigint references customers(id), property_id bigint references customer_properties(id), service_category_id bigint references service_categories(id), title text not null, description text, status text not null default 'new', created_at timestamptz not null default now(), updated_at timestamptz not null default now())`,
`create table if not exists quotes (id bigserial primary key, job_request_id bigint references job_requests(id), customer_id bigint references customers(id), status text not null default 'draft', subtotal numeric(12,2) not null default 0, tax numeric(12,2) not null default 0, total numeric(12,2) not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`,
`create table if not exists quote_line_items (id bigserial primary key, quote_id bigint not null references quotes(id) on delete cascade, description text not null, quantity numeric(12,2) not null default 1, unit_price numeric(12,2) not null default 0, total numeric(12,2) not null default 0)`,
`create table if not exists work_orders (id bigserial primary key, quote_id bigint references quotes(id), customer_id bigint references customers(id), title text not null, status text not null default 'open', scheduled_start timestamptz, scheduled_end timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`,
`create table if not exists work_order_assignments (id bigserial primary key, work_order_id bigint not null references work_orders(id) on delete cascade, user_id bigint not null references app_users(id), assigned_at timestamptz not null default now(), unique(work_order_id, user_id))`,
`create table if not exists schedule_events (id bigserial primary key, work_order_id bigint references work_orders(id) on delete cascade, title text not null, starts_at timestamptz not null, ends_at timestamptz, assigned_user_id bigint references app_users(id), created_at timestamptz not null default now())`,
`create table if not exists inventory_items (id bigserial primary key, sku text unique, name text not null, unit text not null default 'each', quantity_on_hand numeric(12,2) not null default 0, reorder_point numeric(12,2) not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`,
`create table if not exists inventory_transactions (id bigserial primary key, item_id bigint not null references inventory_items(id), work_order_id bigint references work_orders(id), transaction_type text not null, quantity numeric(12,2) not null, notes text, created_at timestamptz not null default now())`,
`create table if not exists invoices (id bigserial primary key, quote_id bigint references quotes(id), customer_id bigint references customers(id), status text not null default 'draft', subtotal numeric(12,2) not null default 0, tax numeric(12,2) not null default 0, total numeric(12,2) not null default 0, due_at date, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`,
`create table if not exists payments (id bigserial primary key, invoice_id bigint references invoices(id), amount numeric(12,2) not null, provider text not null default 'manual', status text not null default 'recorded', external_id text, paid_at timestamptz not null default now())`,
`create table if not exists uploaded_files (id bigserial primary key, owner_user_id bigint references app_users(id), file_name text not null, mime_type text not null, file_size bigint not null default 0, category text not null default 'general', storage_kind text not null default 'database', data_base64 text, created_at timestamptz not null default now())`,
`create table if not exists ai_runs (id bigserial primary key, run_type text not null, provider text not null default 'openai', status text not null, input jsonb not null default '{}'::jsonb, output jsonb not null default '{}'::jsonb, created_at timestamptz not null default now())`,
`create table if not exists workflow_events (id bigserial primary key, entity_type text not null, entity_id bigint not null, from_status text, to_status text not null, actor_user_id bigint references app_users(id), metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now())`,
`create table if not exists magic_tokens (id bigserial primary key, user_id bigint references app_users(id) on delete cascade, token_hash text not null unique, expires_at timestamptz not null, used_at timestamptz, created_at timestamptz not null default now())`,
`create table if not exists platform_secret_settings (id bigserial primary key, key text not null unique, encrypted_value text not null, safe_hint text, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`,
`create table if not exists audit_logs (id bigserial primary key, actor_user_id bigint references app_users(id), action text not null, entity_type text, entity_id text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now())`,
`create table if not exists system_health_events (id bigserial primary key, component text not null, status text not null, message text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now())`
];
const requiredTableNames = ddl.map((statement) => statement.match(/create table if not exists ([a-z_]+)/i)?.[1]).filter(Boolean);
const indexes = [
`create index if not exists idx_app_users_email on app_users(lower(email))`,
`create index if not exists idx_job_requests_status on job_requests(status)`,
`create index if not exists idx_work_orders_status on work_orders(status)`,
`create index if not exists idx_schedule_events_start on schedule_events(starts_at)`,
`create index if not exists idx_uploaded_files_category on uploaded_files(category)`,
`create index if not exists idx_audit_logs_action on audit_logs(action)`,
`create index if not exists idx_workflow_events_entity on workflow_events(entity_type, entity_id)`
];

export async function bootstrapSchema() {
  const detected = detectedDatabaseUrl();
  console.warn('[install-bootstrap] Database connection detection', {
    DATABASE_URLExists: detected.databaseUrlDetected,
    NETLIFY_DATABASE_URLExists: detected.netlifyDatabaseUrlDetected,
    getConnectionStringAvailable: detected.getConnectionStringAvailable,
    selectedSource: detected.source || 'none'
  });
  if (!detected.value) {
    return databaseBaseStatus({
      ok: false,
      code: 'NETLIFY_DATABASE_CONNECTION_STRING_FAILED',
      databaseConnected: false,
      connected: false,
      schemaReady: false,
      writeTestPassed: false,
      canBootstrapSchema: false,
      connectionAttempt: 'Not Run',
      message: noConnectionMessage,
      safeDetails: detected.helperError || 'No supported database connection source was found.'
    });
  }
  try {
    await query('select now() as now');
  } catch (error) {
    return databaseBaseStatus({ ok: false, code: 'DATABASE_CONNECTION_FAILED', connected: false, databaseConnected: false, schemaReady: false, writeTestPassed: false, canBootstrapSchema: false, connectionAttempt: 'Failed', selectNowSucceeded: false, message: connectionFoundButFailedMessage, safeDetails: safeErrorMessage(error), connectionError: safeErrorMessage(error) });
  }
  try {
    for (const statement of ddl) await query(statement);
    for (const statement of indexes) await query(statement);
    await seedRequiredRecords();
    const writeTestPassed = await verifyWrites();
    const { tablesReady, missingTables, tableCount } = await requiredTableStatus();
    await query(`insert into platform_installation (id, schema_ready, write_test_passed, metadata) values (1, $1, $2, $3::jsonb) on conflict (id) do update set schema_ready = excluded.schema_ready, write_test_passed = excluded.write_test_passed, updated_at = now(), metadata = excluded.metadata`, [tablesReady, writeTestPassed, JSON.stringify({ bootstrap: 'automatic', selectedConnectionSource: detected.source })]);
    await query(`insert into system_health_events(component,status,message,metadata) values('database',$1,$2,$3::jsonb)`, [tablesReady && writeTestPassed ? 'ready' : 'not_ready', tablesReady && writeTestPassed ? 'Automatic schema bootstrap completed' : 'Automatic schema bootstrap did not pass all checks', JSON.stringify({ tablesReady, writeTestPassed })]);
    return databaseBaseStatus({
      ok: Boolean(tablesReady && writeTestPassed),
      code: tablesReady && writeTestPassed ? 'SCHEMA_READY' : (writeTestPassed ? 'SCHEMA_NOT_READY' : 'WRITE_TEST_FAILED'),
      connected: true,
      databaseConnected: true,
      schemaReady: tablesReady,
      writeTestPassed,
      canBootstrapSchema: !tablesReady,
      connectionAttempt: 'Succeeded',
      selectNowSucceeded: true,
      tablesCreated: ddl.length,
      indexesCreated: indexes.length,
      tableCount,
      missingTables,
      message: tablesReady && writeTestPassed ? 'Database schema is ready.' : 'Database bootstrap ran, but one or more verification checks failed.'
    });
  } catch (error) {
    return databaseBaseStatus({ ok: false, code: 'SCHEMA_BOOTSTRAP_FAILED', connected: true, databaseConnected: true, schemaReady: false, writeTestPassed: false, canBootstrapSchema: true, connectionAttempt: 'Succeeded', selectNowSucceeded: true, message: safeErrorMessage(error), safeDetails: safeErrorMessage(error) });
  }
}

export async function seedRequiredRecords() {
  for (const slug of defaultRoles) await query(`insert into roles(slug,name,description) values($1,$2,$3) on conflict(slug) do update set name=excluded.name`, [slug, slug[0].toUpperCase()+slug.slice(1), `${slug} default role`]);
  for (const slug of permissions) await query(`insert into permissions(slug,description) values($1,$2) on conflict(slug) do nothing`, [slug, `Allows ${slug}`]);
  for (const [role, perms] of Object.entries(rolePermissions)) for (const perm of perms) await query(`insert into role_permissions(role_id, permission_id) select r.id,p.id from roles r, permissions p where r.slug=$1 and p.slug=$2 on conflict do nothing`, [role, perm]);
  for (const [id,label,group] of coreModules) {
    await query(`insert into module_registry(id,label,nav_group,enabled,manifest) values($1,$2,$3,true,$4::jsonb) on conflict(id) do update set label=excluded.label, nav_group=excluded.nav_group, enabled=true, updated_at=now()`, [id,label,group,JSON.stringify({id,label,group,dropIn:true})]);
    await query(`insert into module_settings(module_id,settings) values($1,'{}'::jsonb) on conflict(module_id) do nothing`, [id]);
  }
  for (let i=0;i<defaultServices.length;i++) await query(`insert into service_categories(name,sort_order) values($1,$2) on conflict(name) do update set active=true`, [defaultServices[i], i+1]);
}
export async function verifyWrites() {
  await query(`create table if not exists bootstrap_write_tests (id text primary key, marker text not null, created_at timestamptz not null default now())`);
  const id = `write-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await query(`insert into bootstrap_write_tests(id, marker) values($1, $2)`, [id, 'ok']);
  const read = await query(`select marker from bootstrap_write_tests where id=$1`, [id]);
  await query(`delete from bootstrap_write_tests where id=$1`, [id]);
  const after = await query(`select marker from bootstrap_write_tests where id=$1`, [id]);
  return read?.[0]?.marker === 'ok' && after.length === 0;
}
export async function getDraft() {
  await bootstrapSchema();
  const rows = await query(`select draft, updated_at from installer_drafts where id='current'`);
  return rows[0] || { draft: {}, updated_at: null };
}
export async function saveDraft(draft) {
  await bootstrapSchema();
  await query(`insert into installer_drafts(id,draft,updated_at) values('current',$1::jsonb,now()) on conflict(id) do update set draft=excluded.draft, updated_at=now()`, [JSON.stringify(draft || {})]);
  return await getDraft();
}
export async function finishInstall(payload) {
  const boot = await bootstrapSchema();
  if (!boot.connected || !boot.schemaReady || !boot.writeTestPassed) throw new Error('Installation cannot finish until database is connected, schema ready, and write test passed.');
  const draft = payload?.draft || payload || {};
  const company = draft.company || {}; const owner = draft.owner || {}; const theme = draft.theme || {}; const home = draft.homepage || {};
  const ownerEmail = String(owner.email || 'owner@example.com').trim().toLowerCase();
  await query(`insert into app_users(full_name,email,phone,active) values($1,$2,$3,true) on conflict(email) do update set full_name=excluded.full_name, phone=excluded.phone, active=true, updated_at=now()`, [owner.fullName || owner.full_name || 'Platform Owner', ownerEmail, owner.phone || null]);
  await query(`insert into user_roles(user_id, role_id) select u.id,r.id from app_users u, roles r where u.email=$1 and r.slug='owner' on conflict do nothing`, [ownerEmail]);
  await query(`insert into workspace_access(user_id,workspace,access_level) select id,'primary','owner' from app_users where email=$1 on conflict(user_id,workspace) do update set access_level='owner'`, [ownerEmail]);
  await query(`insert into company_settings(id,company_name,email,phone,website,address) values(1,$1,$2,$3,$4,$5) on conflict(id) do update set company_name=excluded.company_name,email=excluded.email,phone=excluded.phone,website=excluded.website,address=excluded.address,updated_at=now()`, [company.name || 'Your Contractor Company', company.email || ownerEmail, company.phone || null, company.website || null, company.address || null]);
  await query(`insert into theme_settings(id,mode,primary_color,accent_color,background_color,surface_color,text_color,sidebar_color,mobile_nav_color,custom) values(1,$1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) on conflict(id) do update set mode=excluded.mode, primary_color=excluded.primary_color, accent_color=excluded.accent_color, background_color=excluded.background_color, surface_color=excluded.surface_color, text_color=excluded.text_color, sidebar_color=excluded.sidebar_color, mobile_nav_color=excluded.mobile_nav_color, custom=excluded.custom, updated_at=now()`, [theme.mode || 'system', theme.primary || '#2563eb', theme.accent || '#f59e0b', theme.background || '#f8fafc', theme.surface || '#ffffff', theme.text || '#0f172a', theme.sidebar || '#0f172a', theme.mobileNav || '#111827', JSON.stringify(theme)]);
  await query(`insert into homepage_settings(id,hero_title,hero_subtitle,cta_label,sections) values(1,$1,$2,$3,$4::jsonb) on conflict(id) do update set hero_title=excluded.hero_title,hero_subtitle=excluded.hero_subtitle,cta_label=excluded.cta_label,sections=excluded.sections,updated_at=now()`, [home.heroTitle || `Welcome to ${company.name || 'Your Contractor Company'}`, home.heroSubtitle || 'Fast estimates, trusted service, and transparent project updates.', home.ctaLabel || 'Request an Estimate', JSON.stringify(home.sections || [])]);
  await seedRequiredRecords();
  await query(`insert into audit_logs(action,entity_type,entity_id,metadata) values('install.finish','platform','1',$1::jsonb)`, [JSON.stringify({ ownerEmail, completed: true })]);
  await query(`insert into platform_installation(id,installation_complete,schema_ready,write_test_passed,installed_at,metadata) values(1,true,true,true,now(),$1::jsonb) on conflict(id) do update set installation_complete=true,schema_ready=true,write_test_passed=true,installed_at=coalesce(platform_installation.installed_at, now()),updated_at=now(),metadata=excluded.metadata`, [JSON.stringify({ ownerEmail })]);
  const validation = await validateInstall(ownerEmail);
  if (!validation.ready) throw new Error(`Install validation failed: ${validation.missing.join(', ')}`);
  return { installationComplete: true, ownerEmail, validation };
}
export async function validateInstall(ownerEmail) {
  const checks = {
    owner: (await query(`select id from app_users where email=$1`, [ownerEmail])).length > 0,
    ownerRole: (await query(`select id from roles where slug='owner'`)).length > 0,
    ownerUserRole: (await query(`select 1 from app_users u join user_roles ur on ur.user_id=u.id join roles r on r.id=ur.role_id where u.email=$1 and r.slug='owner'`, [ownerEmail])).length > 0,
    roles: (await query(`select count(*)::int as c from roles where slug = any($1)`, [defaultRoles])).at(0)?.c >= defaultRoles.length,
    permissions: (await query(`select count(*)::int as c from permissions`)).at(0)?.c >= permissions.length,
    rolePermissions: (await query(`select count(*)::int as c from role_permissions`)).at(0)?.c > 0,
    modules: (await query(`select count(*)::int as c from module_registry`)).at(0)?.c >= coreModules.length,
    company: (await query(`select id from company_settings where id=1`)).length > 0,
    theme: (await query(`select id from theme_settings where id=1`)).length > 0,
    homepage: (await query(`select id from homepage_settings where id=1`)).length > 0,
    installation: (await query(`select installation_complete from platform_installation where id=1`)).at(0)?.installation_complete === true
  };
  const missing = Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
  return { ready: missing.length === 0, checks, missing };
}
export async function dashboardBootstrap() {
  const status = await databaseStatus();
  if (!status.connected || !status.schemaReady) return { status, company:null, theme:null, modules:[] };
  const [company] = await query(`select * from company_settings where id=1`);
  const [theme] = await query(`select * from theme_settings where id=1`);
  const modules = await query(`select id,label,nav_group,enabled,manifest from module_registry where enabled=true order by nav_group,label`);
  return { status, company, theme, modules };
}
