-- Inventory production UI support: item photo/image URLs and richer location notes.

alter table inventory_items add column if not exists image_url text;
alter table inventory_items add column if not exists location_bin text;

create index if not exists idx_inventory_items_supplier on inventory_items (supplier);
create index if not exists idx_inventory_items_worker_assignment on inventory_items (worker_assignment);
