-- Full inventory control extensions for materials, tools, trucks, workers, purchasing, counts, and job reservations.

alter table inventory_items add column if not exists trade_type text;
alter table inventory_items add column if not exists item_type text not null default 'material';
alter table inventory_items add column if not exists quantity_reserved numeric(12,2) not null default 0;
alter table inventory_items add column if not exists reorder_quantity numeric(12,2) not null default 0;
alter table inventory_items add column if not exists unit_cost numeric(12,2) not null default 0;
alter table inventory_items add column if not exists markup_percent numeric(8,2) not null default 0;
alter table inventory_items add column if not exists charge_price numeric(12,2) not null default 0;
alter table inventory_items add column if not exists supplier_part_number text;
alter table inventory_items add column if not exists location_type text not null default 'main_warehouse';
alter table inventory_items add column if not exists truck_assignment text;
alter table inventory_items add column if not exists worker_assignment uuid references app_users(id) on delete set null;
alter table inventory_items add column if not exists barcode_value text;
alter table inventory_items add column if not exists qr_value text;
alter table inventory_items add column if not exists reorder_status text not null default 'ok';
alter table inventory_items add column if not exists last_purchase_cost numeric(12,2) not null default 0;
alter table inventory_items add column if not exists ai_quote_catalog_key text;

create table if not exists inventory_locations (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  location_type text not null default 'warehouse',
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into inventory_locations (key, name, location_type, description)
values
  ('main_warehouse', 'Main warehouse / shop', 'warehouse', 'Primary stock room and shop shelves.'),
  ('truck_1', 'Truck 1', 'truck', 'Primary service truck stock.'),
  ('truck_2', 'Truck 2', 'truck', 'Secondary service truck stock.'),
  ('worker_assigned', 'Worker assigned', 'worker', 'Tools/materials checked out to a worker.'),
  ('job_site', 'Job site', 'job', 'Reserved or staged at an active job.'),
  ('supplier_ordered', 'Supplier ordered', 'supplier', 'Ordered but not received yet.'),
  ('returned_damaged', 'Returned / damaged', 'holding', 'Damaged, warranty, or return review.'),
  ('archived', 'Archived', 'archive', 'Inactive or retired inventory.')
on conflict (key) do update set
  name = excluded.name,
  location_type = excluded.location_type,
  description = excluded.description,
  updated_at = now();

create table if not exists inventory_suppliers (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  contact_name text,
  phone text,
  email text,
  website text,
  default_markup_percent numeric(8,2) not null default 0,
  lead_time_days integer not null default 0,
  preferred boolean not null default false,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references inventory_items(id) on delete cascade,
  movement_type text not null,
  quantity numeric(12,2) not null,
  from_location text,
  to_location text,
  job_request_id uuid references job_requests(id) on delete set null,
  worker_user_id uuid references app_users(id) on delete set null,
  notes text,
  actor_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references inventory_items(id) on delete cascade,
  job_request_id uuid references job_requests(id) on delete set null,
  reserved_quantity numeric(12,2) not null,
  used_quantity numeric(12,2) not null default 0,
  status text not null default 'reserved',
  notes text,
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists inventory_assets (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid references inventory_items(id) on delete set null,
  serial_number text,
  asset_tag text unique,
  assigned_worker uuid references app_users(id) on delete set null,
  assigned_vehicle text,
  condition text not null default 'good',
  last_checked_out_at timestamptz,
  last_returned_at timestamptz,
  service_due_at timestamptz,
  replacement_cost numeric(12,2) not null default 0,
  status text not null default 'available',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists inventory_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references inventory_suppliers(id) on delete set null,
  supplier_name text,
  status text not null default 'draft',
  order_needed_at timestamptz,
  ordered_at timestamptz,
  received_at timestamptz,
  notes text,
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists inventory_purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references inventory_purchase_orders(id) on delete cascade,
  inventory_item_id uuid references inventory_items(id) on delete set null,
  quantity_ordered numeric(12,2) not null default 0,
  quantity_received numeric(12,2) not null default 0,
  unit_cost numeric(12,2) not null default 0,
  supplier_part_number text,
  created_at timestamptz not null default now()
);

create table if not exists inventory_counts (
  id uuid primary key default gen_random_uuid(),
  location_key text,
  status text not null default 'open',
  adjustment_reason text,
  created_by uuid references app_users(id) on delete set null,
  completed_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists inventory_count_items (
  id uuid primary key default gen_random_uuid(),
  inventory_count_id uuid not null references inventory_counts(id) on delete cascade,
  inventory_item_id uuid not null references inventory_items(id) on delete cascade,
  system_quantity numeric(12,2) not null default 0,
  counted_quantity numeric(12,2) not null default 0,
  variance_quantity numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_items_sku on inventory_items (sku);
create index if not exists idx_inventory_items_barcode on inventory_items (barcode_value);
create index if not exists idx_inventory_items_location_type on inventory_items (location_type);
create index if not exists idx_inventory_movements_item_id on inventory_movements (inventory_item_id);
create index if not exists idx_inventory_movements_job_id on inventory_movements (job_request_id);
create index if not exists idx_inventory_reservations_job_id on inventory_reservations (job_request_id);
create index if not exists idx_inventory_assets_worker on inventory_assets (assigned_worker);
