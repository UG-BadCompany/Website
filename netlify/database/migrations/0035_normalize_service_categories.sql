-- Normalize first-run service defaults so mini-split work lives under HVAC and removed categories are not listed as standalone services.

update trade_intelligence_library
set trade_key = 'hvac',
    trade_name = 'HVAC',
    prompt = coalesce(prompt, '') || ' Mini splits are handled under HVAC.'
where trade_key = concat('mini', '_splits');

update trade_intelligence_library
set trade_key = 'plumbing',
    trade_name = 'Plumbing'
where trade_key = concat('commercial', '_plumbing');

update trade_intelligence_library
set trade_key = 'electrical',
    trade_name = 'Electrical'
where trade_key = concat('commercial', '_electrical');

delete from trade_intelligence_library
where trade_key in (concat('roof', 'ing'), concat('floor', 'ing'));

delete from service_categories
where lower(name) in (concat('commercial', ' plumbing'), concat('commercial', ' electrical'), concat('roof', 'ing'), concat('floor', 'ing'), concat('mini', ' splits'));

insert into service_categories (name, enabled)
values
  ('HVAC', true),
  ('Water Heaters', true),
  ('Plumbing', true),
  ('Electrical', true),
  ('Drywall', true),
  ('Painting', true),
  ('Doors', true),
  ('Windows', true),
  ('Appliances', true),
  ('Handyman', true),
  ('Facilities Maintenance', true),
  ('Property Maintenance', true),
  ('Commercial Maintenance', true),
  ('General Contracting', true),
  ('Tenant Improvements', true)
on conflict (name) do update set enabled = true, updated_at = now();
