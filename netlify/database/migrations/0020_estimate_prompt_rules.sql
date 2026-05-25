create table if not exists estimate_prompt_rules (
  id bigint generated always as identity primary key,
  trigger_terms text not null default '',
  prompt_text text not null,
  service_filter text not null default '',
  scope_filter text not null default '',
  category_filter text not null default '',
  priority integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists estimate_prompt_rules_active_priority_idx
  on estimate_prompt_rules (is_active, priority, id);

insert into estimate_prompt_rules (trigger_terms, prompt_text, scope_filter, category_filter, priority)
values
  ('mini split,minisplit,mini-split', 'About how many feet of electrical will need to be run for the mini split install?', 'new install,installation,install', 'hvac,electrical', 10),
  ('mini split,minisplit,mini-split', 'What voltage is needed (for example 120V or 240V)?', 'new install,installation,install', 'hvac,electrical', 11),
  ('mini split,minisplit,mini-split', 'What breaker size is expected, and is new panel space needed?', 'new install,installation,install', 'hvac,electrical', 12),
  ('mini split,minisplit,mini-split', 'What is the estimated line-set/drain route distance between indoor and outdoor units?', 'new install,installation,install', 'hvac,electrical', 13),
  ('water heater,hot water heater', 'What tank size is being replaced (example: 40 or 50 gallon)?', 'replace,replacement', 'water heater,plumbing', 20),
  ('water heater,hot water heater', 'Is the unit gas or electric?', 'replace,replacement', 'water heater,plumbing', 21),
  ('water heater,hot water heater', 'Should venting, drain pan, or drain line updates be included?', 'replace,replacement', 'water heater,plumbing', 22),
  ('paint,painting', 'Is this interior or exterior, and which surfaces are included?', '', 'painting / finish work', 30),
  ('paint,painting', 'Do you have color/finish preferences already selected?', '', 'painting / finish work', 31),
  ('paint,painting', 'Does this scope include prep work (patching, sanding, priming, caulking)?', '', 'painting / finish work', 32)
on conflict do nothing;
