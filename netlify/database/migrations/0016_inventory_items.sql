-- Admin inventory tracking for materials, tools, and stock levels.

create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text,
  category text,
  unit text not null default 'each',
  quantity_on_hand numeric(12,2) not null default 0,
  reorder_point numeric(12,2) not null default 0,
  supplier text,
  storage_location text,
  notes text,
  is_active boolean not null default true,
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references inventory_items(id) on delete cascade,
  adjustment_type text not null default 'manual' check (adjustment_type in ('manual', 'received', 'used', 'correction')),
  quantity_delta numeric(12,2) not null,
  note text,
  job_request_id uuid references job_requests(id) on delete set null,
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

with permission_defaults(role_key, permission_key) as (
  values ('admin', 'admin.inventory.manage')
)
insert into role_permissions (role_id, permission_key, enabled)
select roles.id, permission_defaults.permission_key, true
from permission_defaults
join roles on roles.key = permission_defaults.role_key
on conflict (role_id, permission_key) do update set
  enabled = true,
  updated_at = now();

create index if not exists idx_inventory_items_active on inventory_items (is_active);
create index if not exists idx_inventory_items_category on inventory_items (category);
create index if not exists idx_inventory_adjustments_item_id on inventory_adjustments (inventory_item_id);
