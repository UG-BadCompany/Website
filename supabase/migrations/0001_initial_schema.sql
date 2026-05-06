-- T&A Contracting production schema for Supabase/PostgreSQL.
-- Apply with the Supabase CLI or Dashboard SQL editor before deploying.

create extension if not exists pgcrypto;

create type public.app_role as enum ('client', 'admin', 'worker');
create type public.job_status as enum (
  'New request', 'Needs review', 'Quote in progress', 'Quote sent', 'Awaiting client response',
  'Quote accepted', 'Deposit paid', 'Scheduled', 'In progress', 'Waiting on materials',
  'Waiting on client', 'Completed', 'Invoiced', 'Paid', 'Closed', 'Canceled'
);
create type public.quote_status as enum ('Draft', 'Sent', 'Accepted', 'Declined', 'Changes requested');
create type public.invoice_status as enum ('Draft', 'Sent', 'Partially paid', 'Paid', 'Refunded', 'Canceled');
create type public.payment_status as enum ('Pending', 'Paid', 'Failed', 'Refunded');
create type public.schedule_status as enum ('Scheduled', 'Rescheduled', 'Completed', 'Canceled');
create type public.notification_status as enum ('queued', 'sent', 'skipped', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'client',
  name text not null,
  email text,
  phone text,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.profiles(id) on delete cascade,
  label text not null default 'Property',
  street text not null,
  city text not null,
  zip text not null,
  access_notes text,
  created_at timestamptz not null default now()
);

create table public.job_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.profiles(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  name text not null,
  email text,
  phone text,
  property_address text not null,
  service_category text not null,
  desired_timeframe text not null,
  priority text not null default 'Standard',
  description text not null,
  preferred_contact_method text not null default 'Portal',
  access_notes text,
  special_instructions text,
  status public.job_status not null default 'New request',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  job_request_id uuid references public.job_requests(id) on delete cascade,
  original_name text not null,
  stored_name text not null,
  content_type text not null,
  size bigint not null,
  url text not null,
  created_at timestamptz not null default now()
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number text not null unique,
  job_request_id uuid references public.job_requests(id) on delete set null,
  client_name text not null,
  client_email text,
  property_address text not null,
  scope_of_work text not null,
  included_work text not null,
  excluded_work text not null,
  terms text not null,
  subtotal numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  deposit_required numeric(12,2) not null default 0,
  expires_at date not null,
  status public.quote_status not null default 'Draft',
  version integer not null default 1,
  accepted_at timestamptz,
  declined_at timestamptz,
  decline_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  type text not null check (type in ('Labor', 'Materials', 'Fee', 'Discount')),
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  quote_id uuid references public.quotes(id) on delete set null,
  client_name text not null,
  client_email text,
  amount_due numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  due_at date not null,
  status public.invoice_status not null default 'Draft',
  stripe_checkout_session_id text,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete cascade,
  provider text not null default 'Stripe',
  provider_session_id text,
  payment_intent_id text,
  amount numeric(12,2) not null default 0,
  status public.payment_status not null default 'Pending',
  receipt_url text,
  created_at timestamptz not null default now()
);

create table public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  job_request_id uuid references public.job_requests(id) on delete cascade,
  worker_id uuid references public.profiles(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status public.schedule_status not null default 'Scheduled',
  notes text,
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  job_request_id uuid references public.job_requests(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_role public.app_role not null default 'client',
  author_name text not null,
  body text not null,
  internal_only boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  recipient text not null,
  subject text not null,
  body text not null,
  status public.notification_status not null default 'queued',
  provider_id text,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  details text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.job_requests enable row level security;
alter table public.files enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_line_items enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.schedule_items enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.current_role()
returns public.app_role language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'client'::public.app_role)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_role() = 'admin'::public.app_role
$$;

create or replace function public.is_worker_or_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_role() in ('worker'::public.app_role, 'admin'::public.app_role)
$$;

create policy profiles_self_or_admin on public.profiles for all using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy properties_owner_or_admin on public.properties for all using (client_id = auth.uid() or public.is_admin()) with check (client_id = auth.uid() or public.is_admin());
create policy job_requests_select_owner_staff on public.job_requests for select using (client_id = auth.uid() or public.is_worker_or_admin());
create policy job_requests_insert_public_or_owner on public.job_requests for insert with check (client_id = auth.uid() or client_id is null or public.is_worker_or_admin());
create policy job_requests_update_owner_staff on public.job_requests for update using (client_id = auth.uid() or public.is_worker_or_admin()) with check (client_id = auth.uid() or public.is_worker_or_admin());
create policy files_related_owner_staff on public.files for all using (public.is_worker_or_admin() or exists (select 1 from public.job_requests jr where jr.id = job_request_id and jr.client_id = auth.uid())) with check (public.is_worker_or_admin() or exists (select 1 from public.job_requests jr where jr.id = job_request_id and jr.client_id = auth.uid()));
create policy quotes_client_or_staff on public.quotes for select using (public.is_worker_or_admin() or client_email = auth.jwt() ->> 'email');
create policy quotes_admin_write on public.quotes for all using (public.is_admin()) with check (public.is_admin());
create policy quote_line_items_client_or_staff on public.quote_line_items for select using (public.is_worker_or_admin() or exists (select 1 from public.quotes q where q.id = quote_id and q.client_email = auth.jwt() ->> 'email'));
create policy quote_line_items_admin_write on public.quote_line_items for all using (public.is_admin()) with check (public.is_admin());
create policy invoices_client_or_staff on public.invoices for select using (public.is_worker_or_admin() or client_email = auth.jwt() ->> 'email');
create policy invoices_admin_write on public.invoices for all using (public.is_admin()) with check (public.is_admin());
create policy payments_client_or_staff on public.payments for select using (public.is_worker_or_admin() or exists (select 1 from public.invoices i where i.id = invoice_id and i.client_email = auth.jwt() ->> 'email'));
create policy payments_service_write on public.payments for all using (public.is_admin()) with check (public.is_admin());
create policy schedule_staff on public.schedule_items for all using (public.is_worker_or_admin()) with check (public.is_worker_or_admin());
create policy messages_related_or_staff on public.messages for all using (public.is_worker_or_admin() or internal_only = false) with check (public.is_worker_or_admin() or internal_only = false);
create policy notifications_admin_only on public.notifications for all using (public.is_admin()) with check (public.is_admin());
create policy audit_admin_only on public.audit_logs for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('job-files', 'job-files', false), ('generated-documents', 'generated-documents', false)
on conflict (id) do nothing;


create policy job_files_staff_read on storage.objects for select using (bucket_id in ('job-files', 'generated-documents') and public.is_worker_or_admin());
create policy job_files_client_read on storage.objects for select using (bucket_id = 'job-files' and owner = auth.uid());
create policy job_files_authenticated_upload on storage.objects for insert with check (bucket_id = 'job-files' and auth.role() = 'authenticated');
create policy generated_documents_admin_upload on storage.objects for insert with check (bucket_id = 'generated-documents' and public.is_admin());
