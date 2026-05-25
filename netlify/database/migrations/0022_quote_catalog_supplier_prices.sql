create table if not exists quote_catalog_items (
  id bigint generated always as identity primary key,
  job_type_key text not null,
  item_key text not null,
  item_name text not null,
  default_unit_cost_cents integer not null default 0,
  default_quantity numeric(10,2) not null default 1,
  aliases text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_type_key, item_key)
);

create table if not exists supplier_prices (
  id bigint generated always as identity primary key,
  item_key text not null,
  supplier_name text not null,
  unit_cost_cents integer not null,
  source_url text,
  fetched_at timestamptz not null default now()
);

create index if not exists quote_catalog_items_job_type_idx on quote_catalog_items (job_type_key, is_active);
create index if not exists supplier_prices_item_key_recent_idx on supplier_prices (item_key, fetched_at desc);

insert into quote_catalog_items (job_type_key, item_key, item_name, default_unit_cost_cents, default_quantity, aliases)
values
  ('sink_new_install', 'kitchen_sink_basin', 'Kitchen sink basin', 22900, 1, 'sink,basin,kitchen sink'),
  ('sink_new_install', 'sink_faucet', 'Kitchen faucet', 15900, 1, 'faucet,tap'),
  ('sink_new_install', 'sink_strainer', 'Basket strainer/drain assembly', 2900, 1, 'strainer,drain basket'),
  ('sink_new_install', 'supply_lines', 'Supply line set', 2600, 2, 'supply line,braided line'),
  ('sink_new_install', 'p_trap_kit', 'P-trap kit', 2200, 1, 'p-trap,trap,drain pipe'),
  ('sink_new_install', 'plumbers_putty', 'Plumber putty/sealant', 900, 1, 'putty,sealant,caulk')
on conflict do nothing;
