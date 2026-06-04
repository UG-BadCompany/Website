-- Model-specific troubleshooting cache populated by successful research-backed AI runs.
create table if not exists ai_error_code_cache (
  id uuid primary key default gen_random_uuid(),
  manufacturer text not null,
  model_family text not null,
  equipment_type text,
  error_code text not null,
  meaning text not null,
  diagnostic_flow jsonb not null default '[]'::jsonb,
  repair_flow jsonb not null default '[]'::jsonb,
  common_parts jsonb not null default '[]'::jsonb,
  safety_notes jsonb not null default '[]'::jsonb,
  research_sources jsonb not null default '[]'::jsonb,
  confidence numeric not null default 0.7,
  successful_lookup_count integer not null default 1,
  source_payload jsonb not null default '{}'::jsonb,
  review_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_error_code_cache_confidence_check check (confidence >= 0 and confidence <= 1),
  constraint ai_error_code_cache_unique unique (manufacturer, model_family, error_code)
);

create index if not exists ai_error_code_cache_lookup_idx
  on ai_error_code_cache (lower(manufacturer), upper(error_code), lower(model_family));

insert into ai_error_code_cache (
  manufacturer,
  model_family,
  equipment_type,
  error_code,
  meaning,
  diagnostic_flow,
  repair_flow,
  common_parts,
  safety_notes,
  research_sources,
  confidence,
  source_payload
) values (
  'Daikin',
  'RXC / CTX ductless mini split',
  'Mini Split Heat Pump',
  'E3',
  'High Pressure Protection',
  '["Confirm the displayed fault is E3 and record indoor and outdoor model numbers before resetting power.","Verify outdoor fan operation and condenser coil airflow; high head pressure is commonly caused by airflow restriction or fan failure.","Check for blocked/dirty outdoor coil, recirculating discharge air, incorrect clearances, or outdoor ambient/load conditions outside the operating envelope.","Verify service valves are fully open and the refrigerant circuit is not restricted/kinked.","If airflow and valves are correct, connect approved gauges/temperature probes and compare high-side pressure, saturation temperature, superheat/subcooling, and discharge temperature to Daikin service data.","Evaluate overcharge, non-condensables, restriction, high-pressure switch/pressure sensor wiring, and outdoor PCB logic only after airflow/installation causes are eliminated."]'::jsonb,
  '["Clean condenser coil and correct airflow/clearance/recirculation issues.","Repair or replace failed outdoor fan motor, fan capacitor/module, blade, or outdoor fan wiring after confirmed readings.","Correct refrigerant charge/restriction/non-condensables using EPA-compliant recovery/evacuation/charging practices when measurements support sealed-system work.","Replace pressure switch/sensor harness or outdoor PCB only after confirming the pressure condition and wiring/sensor signal."]'::jsonb,
  '["Outdoor fan motor or fan module","Outdoor fan blade","Pressure switch/sensor or harness","Outdoor PCB","Filter drier/refrigerant circuit repair materials if restriction is confirmed"]'::jsonb,
  '["High-pressure faults can involve hot discharge lines and high refrigerant pressure. Use EPA-compliant refrigerant procedures and do not vent refrigerant.","Use lockout/tagout before opening panels; perform live measurements only by qualified technicians with proper PPE and meters."]'::jsonb,
  '[{"title":"Seeded Daikin RXC/CTX field error database","url":"internal://seeded-error-database/daikin-rxc-e3","snippet":"Daikin RXC/CTX AXVJU E3 fault is high pressure protection; verify against the current Daikin service manual for the exact matched indoor/outdoor pair."}]'::jsonb,
  0.94,
  '{"seeded":true,"reason":"Success-test coverage for Daikin RXC12AXVJU E3 model-specific diagnostics."}'::jsonb
) on conflict (manufacturer, model_family, error_code) do update set
  meaning = excluded.meaning,
  diagnostic_flow = excluded.diagnostic_flow,
  repair_flow = excluded.repair_flow,
  common_parts = excluded.common_parts,
  safety_notes = excluded.safety_notes,
  research_sources = excluded.research_sources,
  confidence = greatest(ai_error_code_cache.confidence, excluded.confidence),
  updated_at = now();
