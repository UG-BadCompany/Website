-- Phase 15: smart customer information collection and AI estimate intake.
-- Customer submissions are never blocked by missing technical information.

alter table job_requests
  add column if not exists estimate_intake jsonb not null default '{}'::jsonb,
  add column if not exists information_completeness_score integer not null default 25,
  add column if not exists confidence_scores jsonb not null default '{}'::jsonb,
  add column if not exists missing_information jsonb not null default '[]'::jsonb,
  add column if not exists optional_customer_questions jsonb not null default '[]'::jsonb,
  add column if not exists customer_preferences jsonb not null default '{}'::jsonb,
  add column if not exists photo_intelligence jsonb not null default '{}'::jsonb;

alter table quotes
  add column if not exists estimate_intake jsonb not null default '{}'::jsonb,
  add column if not exists information_completeness_score integer,
  add column if not exists confidence_scores jsonb not null default '{}'::jsonb,
  add column if not exists missing_information jsonb not null default '[]'::jsonb,
  add column if not exists optional_customer_questions jsonb not null default '[]'::jsonb,
  add column if not exists customer_preferences jsonb not null default '{}'::jsonb,
  add column if not exists photo_intelligence jsonb not null default '{}'::jsonb;

create table if not exists trade_intelligence_library (
  id uuid primary key default gen_random_uuid(),
  trade_key text not null,
  trade_name text not null,
  entry_type text not null check (entry_type in ('question', 'material', 'labor_rule', 'permit_requirement', 'inspection_requirement', 'equipment_requirement', 'safety_requirement')),
  label text not null,
  prompt text,
  metadata jsonb not null default '{}'::jsonb,
  is_optional boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (trade_key, entry_type, label)
);

create index if not exists trade_intelligence_library_trade_idx
  on trade_intelligence_library (trade_key, entry_type, is_active);

insert into trade_intelligence_library (trade_key, trade_name, entry_type, label, prompt, metadata)
select trade_key, trade_name, entry_type, label, prompt, metadata
from (
  values
    ('hvac','HVAC','question','Equipment make/model','Equipment make or model if visible; skip if unsure.','{}'::jsonb),
    ('hvac','HVAC','question','Desired BTU','Desired BTU size for ductless or split-system equipment if known; skip if unsure.','{}'::jsonb),
    ('commercial_hvac','Commercial HVAC','equipment_requirement','Roof access','Document roof access, lift, crane, and safety requirements.','{}'::jsonb),
    ('water_heaters','Water Heaters','question','Gas or Electric','Gas or electric if known; skip if unsure.','{}'::jsonb),
    ('plumbing','Plumbing','safety_requirement','Shutoff access','Confirm safe water shutoff before final work.','{}'::jsonb),
    ('plumbing','Plumbing','inspection_requirement','Backflow inspection','Check backflow and local inspection requirements when applicable.','{}'::jsonb),
    ('electrical','Electrical','permit_requirement','Circuit permit review','Review permit/inspection needs for new circuits or panel work.','{}'::jsonb),
    ('electrical','Electrical','safety_requirement','Shutdown window','Coordinate shutdown and lockout/tagout requirements when applicable.','{}'::jsonb),
    ('drywall','Drywall','material','Texture and patch material','Match drywall thickness, tape, compound, texture, primer, and paint.','{}'::jsonb),
    ('painting','Painting','labor_rule','Prep level','Labor depends on cleaning, masking, repairs, primer, coats, and occupied access.','{}'::jsonb),
    ('doors','Doors','equipment_requirement','Door sizing','Confirm slab/prehung, swing, jamb, hardware, and fire-rating requirements.','{}'::jsonb),
    ('windows','Windows','inspection_requirement','Tempered glass review','Check tempered/egress requirements and exterior access.','{}'::jsonb),
    ('appliances','Appliances','material','Install kit','Confirm appliance install kit, connection type, and haul-away need.','{}'::jsonb),
    ('handyman','Handyman','question','Task list','List each task in plain language; photos help but are optional.','{}'::jsonb),
    ('general_contracting','General Contracting','permit_requirement','Permit status','Plans, permits, inspections, and finish selections drive final pricing.','{}'::jsonb),
    ('facilities_maintenance','Facilities Maintenance','labor_rule','NTE and priority','Capture NTE amount, priority, access protocol, and reporting requirements.','{}'::jsonb),
    ('property_maintenance','Property Maintenance','question','Tenant access','Tenant access notes, deadline, photos, and owner approvals are helpful.','{}'::jsonb),
    ('tenant_improvements','Tenant Improvements','inspection_requirement','Milestone inspections','Track plans, permit status, landlord requirements, and inspection milestones.','{}'::jsonb)
) as seed(trade_key, trade_name, entry_type, label, prompt, metadata)
on conflict (trade_key, entry_type, label) do update set
  trade_name = excluded.trade_name,
  prompt = excluded.prompt,
  metadata = excluded.metadata,
  is_active = true;
