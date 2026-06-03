-- Normalize service defaults safely on fresh and existing Netlify databases.
-- Mini-split work stays supported through HVAC, not as a standalone service category.

create table if not exists service_categories (
  id uuid primary key default gen_random_uuid(),
  category_key text unique not null,
  name text not null unique,
  description text,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table service_categories add column if not exists category_key text;
alter table service_categories add column if not exists description text;
alter table service_categories add column if not exists enabled boolean not null default true;
alter table service_categories add column if not exists sort_order integer not null default 0;
alter table service_categories add column if not exists created_at timestamptz not null default now();
alter table service_categories add column if not exists updated_at timestamptz not null default now();

update service_categories
set category_key = lower(regexp_replace(trim(name), '[^a-z0-9]+', '_', 'g')),
    updated_at = now()
where category_key is null or category_key = '';

delete from service_categories
where lower(name) in (
  concat('commercial', ' plumbing'),
  concat('commercial', ' electrical'),
  concat('roof', 'ing'),
  concat('floor', 'ing'),
  concat('mini', ' splits')
)
or category_key in (
  concat('commercial', '_plumbing'),
  concat('commercial', '_electrical'),
  concat('roof', 'ing'),
  concat('floor', 'ing'),
  concat('mini', '_splits')
);

with desired_categories(category_key, name, description, sort_order) as (
  values
    ('hvac', 'HVAC', 'Heating, cooling, ventilation, ductwork, controls, maintenance, repairs, replacement, installation, and mini split / ductless workflows.', 10),
    ('water_heaters', 'Water Heaters', 'Water heater repair, replacement, installation, and related diagnostics.', 20),
    ('plumbing', 'Plumbing', 'Residential and commercial plumbing service, repairs, fixture work, and maintenance.', 30),
    ('electrical', 'Electrical', 'Residential and commercial electrical service, repairs, controls, circuits, and maintenance.', 40),
    ('drywall', 'Drywall', 'Drywall patching, repair, texture, and finish work.', 50),
    ('painting', 'Painting', 'Interior and exterior painting, prep, touch-up, and finish work.', 60),
    ('doors', 'Doors', 'Door repair, replacement, hardware, and adjustment work.', 70),
    ('windows', 'Windows', 'Window repair, replacement, sealing, and related work.', 80),
    ('appliances', 'Appliances', 'Appliance installation, repair coordination, and replacement support.', 90),
    ('handyman', 'Handyman', 'General handyman repairs, punch-list tasks, and small projects.', 100),
    ('facilities_maintenance', 'Facilities Maintenance', 'Facility service, recurring maintenance, and operational support.', 110),
    ('property_maintenance', 'Property Maintenance', 'Property repairs, tenant-turn support, and maintenance requests.', 120),
    ('commercial_maintenance', 'Commercial Maintenance', 'Commercial maintenance, repair coordination, and service workflows.', 130),
    ('general_contracting', 'General Contracting', 'General contracting, improvements, project coordination, and larger scopes.', 140),
    ('tenant_improvements', 'Tenant Improvements', 'Tenant improvement scopes, build-outs, finishes, and coordination.', 150)
)
update service_categories existing
set name = desired.name,
    description = desired.description,
    enabled = true,
    sort_order = desired.sort_order,
    updated_at = now()
from desired_categories desired
where existing.category_key = desired.category_key
   or lower(existing.name) = lower(desired.name);

with desired_categories(category_key, name, description, sort_order) as (
  values
    ('hvac', 'HVAC', 'Heating, cooling, ventilation, ductwork, controls, maintenance, repairs, replacement, installation, and mini split / ductless workflows.', 10),
    ('water_heaters', 'Water Heaters', 'Water heater repair, replacement, installation, and related diagnostics.', 20),
    ('plumbing', 'Plumbing', 'Residential and commercial plumbing service, repairs, fixture work, and maintenance.', 30),
    ('electrical', 'Electrical', 'Residential and commercial electrical service, repairs, controls, circuits, and maintenance.', 40),
    ('drywall', 'Drywall', 'Drywall patching, repair, texture, and finish work.', 50),
    ('painting', 'Painting', 'Interior and exterior painting, prep, touch-up, and finish work.', 60),
    ('doors', 'Doors', 'Door repair, replacement, hardware, and adjustment work.', 70),
    ('windows', 'Windows', 'Window repair, replacement, sealing, and related work.', 80),
    ('appliances', 'Appliances', 'Appliance installation, repair coordination, and replacement support.', 90),
    ('handyman', 'Handyman', 'General handyman repairs, punch-list tasks, and small projects.', 100),
    ('facilities_maintenance', 'Facilities Maintenance', 'Facility service, recurring maintenance, and operational support.', 110),
    ('property_maintenance', 'Property Maintenance', 'Property repairs, tenant-turn support, and maintenance requests.', 120),
    ('commercial_maintenance', 'Commercial Maintenance', 'Commercial maintenance, repair coordination, and service workflows.', 130),
    ('general_contracting', 'General Contracting', 'General contracting, improvements, project coordination, and larger scopes.', 140),
    ('tenant_improvements', 'Tenant Improvements', 'Tenant improvement scopes, build-outs, finishes, and coordination.', 150)
)
insert into service_categories (category_key, name, description, enabled, sort_order)
select desired.category_key, desired.name, desired.description, true, desired.sort_order
from desired_categories desired
where not exists (
  select 1
  from service_categories existing
  where existing.category_key = desired.category_key
     or lower(existing.name) = lower(desired.name)
);


do $$
begin
  if to_regclass('public.trade_intelligence_library') is not null then
    delete from trade_intelligence_library source
    where source.trade_key = concat('mini', '_splits')
      and exists (
        select 1 from trade_intelligence_library target
        where target.trade_key = 'hvac'
          and target.entry_type = source.entry_type
          and target.label = source.label
      );

    delete from trade_intelligence_library source
    where source.trade_key = concat('commercial', '_plumbing')
      and exists (
        select 1 from trade_intelligence_library target
        where target.trade_key = 'plumbing'
          and target.entry_type = source.entry_type
          and target.label = source.label
      );

    delete from trade_intelligence_library source
    where source.trade_key = concat('commercial', '_electrical')
      and exists (
        select 1 from trade_intelligence_library target
        where target.trade_key = 'electrical'
          and target.entry_type = source.entry_type
          and target.label = source.label
      );

    update trade_intelligence_library
    set trade_key = 'hvac',
        trade_name = 'HVAC',
        prompt = trim(coalesce(prompt, '') || ' Mini splits are handled under HVAC.')
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
  end if;
end $$;
