import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

let client;
let pgModule;
let netlifyDatabaseModule;
const moduleFilename=typeof import.meta.url==='string'&&import.meta.url ? fileURLToPath(import.meta.url) : `${process.cwd()}/netlify/functions/shared/db.mjs`;
const require=createRequire(moduleFilename);

export const databaseEnvKeys=['NETLIFY_DATABASE_URL','DATABASE_URL','POSTGRES_URL','POSTGRES_PRISMA_URL','POSTGRES_URL_NON_POOLING','NEON_DATABASE_URL'];
export const databaseClientPackage='@netlify/database';
export const databaseDriverPackage='pg';

function safeMessage(error){ return error?.message ? String(error.message) : 'Unknown database loader error.'; }

export function configuredDatabaseUrl(){
  for(const key of databaseEnvKeys){
    const value=process.env[key];
    if(typeof value==='string' && value.trim()) return {key,value:value.trim()};
  }
  return null;
}
export function getDatabaseUrl(){ return resolveDatabaseConnection()?.value; }
export function databaseEnvStatus(){ return databaseEnvKeys.map((key)=>({key,configured:typeof process.env[key]==='string'&&process.env[key].trim().length>0})); }

export function loadNetlifyDatabaseClientResult(){
  if(netlifyDatabaseModule) return {ok:true,client:netlifyDatabaseModule,packageName:databaseClientPackage};
  if(!databaseClientPackage) return {ok:false,code:'DATABASE_CLIENT_MISSING',message:'Database client package is missing from package.json.',details:'Database client package name is not configured.',packageName:databaseClientPackage};
  try{
    netlifyDatabaseModule=require(databaseClientPackage);
    return {ok:true,client:netlifyDatabaseModule,packageName:databaseClientPackage};
  }catch(error){
    return {ok:false,code:'DATABASE_CLIENT_MISSING',message:'Database client package is missing from package.json.',details:safeMessage(error),packageName:databaseClientPackage};
  }
}

export function resolveDatabaseConnection(){
  const configured=configuredDatabaseUrl();
  if(configured) return {...configured,source:'environment'};
  return null;
}

export function loadDatabaseDriverResult(){
  if(pgModule) return {ok:true,driver:pgModule,packageName:databaseDriverPackage};
  if(!databaseDriverPackage) return {ok:false,code:'DATABASE_DRIVER_LOAD_FAILED',message:'Database driver could not be loaded.',details:'Database driver package name is not configured.'};
  try{
    pgModule=require(databaseDriverPackage);
    return {ok:true,driver:pgModule,packageName:databaseDriverPackage};
  }catch(error){
    return {ok:false,code:'DATABASE_DRIVER_LOAD_FAILED',message:'Database driver could not be loaded.',details:safeMessage(error),packageName:databaseDriverPackage};
  }
}

export function loadDatabaseDriver(){
  const result=loadDatabaseDriverResult();
  if(result.ok) return result.driver;
  throw Object.assign(new Error(`${result.message} ${result.details||''}`.trim()),{code:result.code,statusCode:200,details:result.details});
}

function shouldUseSsl(url){
  if(process.env.PGSSLMODE==='disable') return false;
  if(/localhost|127\.0\.0\.1|\[::1\]/.test(url)) return false;
  return true;
}

function parameterize(strings, values){
  let text=strings[0];
  for(let i=0;i<values.length;i++) text += `$${i+1}` + strings[i+1];
  return { text, values };
}

function createDb(queryable, release){
  async function db(strings, ...values){
    const query=Array.isArray(strings?.raw) ? parameterize(strings, values) : { text:String(strings), values };
    const result=await queryable.query(query.text, query.values);
    return result.rows;
  }
  db.unsafe=async(query, values=[])=>{
    const result=await queryable.query(query, values);
    return result.rows;
  };
  db.json=(value)=>JSON.stringify(value ?? null);
  db.begin=async(fn)=>{
    const pool=getPool();
    const connection=await pool.connect();
    const tx=createDb(connection, ()=>connection.release());
    try{
      await connection.query('begin');
      const result=await fn(tx);
      await connection.query('commit');
      return result;
    }catch(error){
      try{ await connection.query('rollback'); }catch{}
      throw error;
    }finally{
      tx.release?.();
    }
  };
  if(release) db.release=release;
  return db;
}

function getPool(){
  const configured=resolveDatabaseConnection();
  if(!configured) throw Object.assign(new Error(`Database URL is not configured. Checked ${databaseEnvKeys.join(', ')}.`),{code:'NO_DATABASE_URL',statusCode:200,manualDatabaseLinkRequired:true,manualSetupRequired:true,canBootstrapSchema:false});
  const { Pool }=loadDatabaseDriver();
  if(!client) client=new Pool({connectionString:configured.value, max:5, ssl:shouldUseSsl(configured.value)?{rejectUnauthorized:false}:false});
  return client;
}

export function sql(){ return createDb(getPool()); }
const coreSchemaSql=`create extension if not exists pgcrypto;
  create table if not exists platform_installation(id text primary key default 'default', installation_complete boolean not null default false, installer_draft jsonb not null default '{}'::jsonb, completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
  create table if not exists company_settings(id text primary key default 'default', company_name text not null default 'Contractor Platform', logo_url text, phone text, email text, address text, theme jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
  create table if not exists homepage_settings(id text primary key default 'default', content jsonb not null default '{}'::jsonb, published boolean not null default true, updated_at timestamptz not null default now());
  create table if not exists theme_settings(id text primary key default 'default', theme jsonb not null default '{}'::jsonb, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
  create table if not exists app_users(id uuid primary key default gen_random_uuid(), full_name text not null, email text not null unique, normalized_email text not null unique, phone text, active boolean not null default true, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
  create table if not exists roles(id uuid primary key default gen_random_uuid(), key text not null unique, label text not null, description text, created_at timestamptz not null default now());
  create table if not exists permissions(id uuid primary key default gen_random_uuid(), key text not null unique, label text not null, created_at timestamptz not null default now());
  create table if not exists role_permissions(role_key text not null references roles(key) on delete cascade, permission_key text not null references permissions(key) on delete cascade, primary key(role_key, permission_key));
  create table if not exists user_roles(user_id uuid not null references app_users(id) on delete cascade, role_key text not null references roles(key) on delete cascade, primary key(user_id, role_key));
  create table if not exists workspace_access(user_id uuid not null references app_users(id) on delete cascade, workspace text not null, role_key text not null, primary key(user_id, workspace));
  create table if not exists module_registry(id text primary key, label text not null, group_name text not null, icon text, route text not null, permission_key text, enabled boolean not null default true, manifest jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
  create table if not exists module_settings(module_id text primary key references module_registry(id) on delete cascade, settings jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
  create table if not exists service_categories(id uuid primary key default gen_random_uuid(), name text not null unique, active boolean not null default true, created_at timestamptz not null default now());
  create table if not exists customers(id uuid primary key default gen_random_uuid(), name text not null, email text, phone text, status text not null default 'active', notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
  create table if not exists customer_properties(id uuid primary key default gen_random_uuid(), customer_id uuid references customers(id) on delete cascade, label text not null default 'Primary', address text not null, created_at timestamptz not null default now());
  create table if not exists estimate_requests(id uuid primary key default gen_random_uuid(), customer_id uuid references customers(id), service_category text, address text, priority text not null default 'normal', notes text, status text not null default 'request.new', photos jsonb not null default '[]'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
  create table if not exists quotes(id uuid primary key default gen_random_uuid(), request_id uuid references estimate_requests(id), customer_id uuid references customers(id), title text not null, status text not null default 'quote.draft', line_items jsonb not null default '[]'::jsonb, subtotal numeric not null default 0, tax numeric not null default 0, total numeric not null default 0, share_token text unique default encode(gen_random_bytes(16),'hex'), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
  create table if not exists quote_line_items(id uuid primary key default gen_random_uuid(), quote_id uuid references quotes(id) on delete cascade, description text not null, quantity numeric not null default 1, unit_price numeric not null default 0, total numeric not null default 0, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
  create table if not exists work_orders(id uuid primary key default gen_random_uuid(), quote_id uuid references quotes(id), customer_id uuid references customers(id), assigned_user_id uuid references app_users(id), title text not null, status text not null default 'work_order.ready_to_assign', priority text not null default 'normal', scheduled_start timestamptz, scheduled_end timestamptz, notes text, materials_used jsonb not null default '[]'::jsonb, photos jsonb not null default '[]'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
  create table if not exists work_order_assignments(id uuid primary key default gen_random_uuid(), work_order_id uuid references work_orders(id) on delete cascade, user_id uuid references app_users(id), role text not null default 'worker', status text not null default 'assigned', created_at timestamptz not null default now());
  create table if not exists schedule_events(id uuid primary key default gen_random_uuid(), work_order_id uuid references work_orders(id) on delete cascade, title text not null, starts_at timestamptz, ends_at timestamptz, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
  create table if not exists inventory_items(id uuid primary key default gen_random_uuid(), sku text, name text not null, quantity numeric not null default 0, reorder_level numeric not null default 0, location text, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
  create table if not exists inventory_transactions(id uuid primary key default gen_random_uuid(), item_id uuid references inventory_items(id), work_order_id uuid references work_orders(id), type text not null, quantity numeric not null, notes text, created_at timestamptz not null default now());
  create table if not exists invoices(id uuid primary key default gen_random_uuid(), work_order_id uuid references work_orders(id), customer_id uuid references customers(id), title text not null, status text not null default 'invoice.draft', line_items jsonb not null default '[]'::jsonb, subtotal numeric not null default 0, tax numeric not null default 0, total numeric not null default 0, paid_total numeric not null default 0, due_at date, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
  create table if not exists payments(id uuid primary key default gen_random_uuid(), invoice_id uuid references invoices(id), amount numeric not null, method text not null default 'manual', status text not null default 'payment.verified', reference text, created_at timestamptz not null default now());
  create table if not exists uploaded_files(id uuid primary key default gen_random_uuid(), owner_type text not null, owner_id uuid, file_name text not null, content_type text, url text, visibility text not null default 'private', metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
  create table if not exists ai_runs(id uuid primary key default gen_random_uuid(), run_type text not null, status text not null default 'queued', input jsonb not null default '{}'::jsonb, output jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
  create table if not exists workflow_events(id uuid primary key default gen_random_uuid(), entity_type text not null, entity_id uuid not null, from_status text, to_status text not null, actor_id uuid, notes text, created_at timestamptz not null default now());
  create table if not exists audit_logs(id uuid primary key default gen_random_uuid(), actor_id uuid, action text not null, entity_type text, entity_id text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
  create table if not exists magic_tokens(id uuid primary key default gen_random_uuid(), normalized_email text not null, token_hash text not null unique, expires_at timestamptz not null, used_at timestamptz, created_at timestamptz not null default now());
  create table if not exists installer_drafts(id text primary key default 'default', draft jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
  create table if not exists job_requests (like estimate_requests including all);
  create table if not exists files (like uploaded_files including all);
  create table if not exists magic_link_tokens (like magic_tokens including all);
  create table if not exists platform_secret_settings(id uuid primary key default gen_random_uuid(), key text not null unique, encrypted_value text not null, provider text not null default 'encrypted_db', last_four text, status text not null default 'configured', last_tested_at timestamptz, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());`;


const bootstrapRepairSchemaSql=`create table if not exists installer_drafts(id text primary key default 'default', draft jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
  create table if not exists quote_line_items(id uuid primary key default gen_random_uuid(), quote_id uuid references quotes(id) on delete cascade, description text not null, quantity numeric not null default 1, unit_price numeric not null default 0, total numeric not null default 0, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
  create table if not exists work_order_assignments(id uuid primary key default gen_random_uuid(), work_order_id uuid references work_orders(id) on delete cascade, user_id uuid references app_users(id), role text not null default 'worker', status text not null default 'assigned', created_at timestamptz not null default now());
  create table if not exists schedule_events(id uuid primary key default gen_random_uuid(), work_order_id uuid references work_orders(id) on delete cascade, title text not null, starts_at timestamptz, ends_at timestamptz, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
  create table if not exists uploaded_files(id uuid primary key default gen_random_uuid(), owner_type text not null, owner_id uuid, file_name text not null, content_type text, url text, visibility text not null default 'private', metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
  create table if not exists ai_runs(id uuid primary key default gen_random_uuid(), run_type text not null, status text not null default 'queued', input jsonb not null default '{}'::jsonb, output jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
  create table if not exists magic_tokens(id uuid primary key default gen_random_uuid(), normalized_email text not null, token_hash text not null unique, expires_at timestamptz not null, used_at timestamptz, created_at timestamptz not null default now());
  create table if not exists job_requests (like estimate_requests including all);
  create table if not exists files (like uploaded_files including all);
  create table if not exists magic_link_tokens (like magic_tokens including all);`;

export const migrations=[
  {id:'001_core_platform',name:'Core platform schema',sql:coreSchemaSql},
  {id:'002_theme_settings',name:'Theme settings table',sql:`create table if not exists theme_settings(id text primary key default 'default', theme jsonb not null default '{}'::jsonb, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());`},
  {id:'003_installer_bootstrap_tables',name:'Installer bootstrap required tables',sql:bootstrapRepairSchemaSql}
];

export async function runMigrations(db=sql()){
  await db.unsafe(`create table if not exists schema_migrations(id text primary key, name text not null, applied_at timestamptz not null default now());`);
  const applied=[];
  for(const migration of migrations){
    const exists=await db`select id from schema_migrations where id=${migration.id}`;
    if(exists.length) continue;
    await db.begin(async tx=>{
      await tx.unsafe(migration.sql);
      await tx`insert into schema_migrations(id,name) values(${migration.id},${migration.name}) on conflict(id) do nothing`;
    });
    applied.push(migration.id);
  }
  return {applied,total:migrations.length};
}

export async function ensureSchema(db=sql()){
  const migrations=await runMigrations(db);
  await db`insert into platform_installation(id) values('default') on conflict(id) do nothing`;
  await db`insert into installer_drafts(id,draft) values('default','{}'::jsonb) on conflict(id) do nothing`;
  return migrations;
}
export async function audit(action, metadata={}, entityType=null, entityId=null){ try { const db=sql(); await db`insert into audit_logs(action, entity_type, entity_id, metadata) values(${action},${entityType},${entityId},${db.json(metadata)})`; } catch {} }
