insert into estimate_prompt_rules (trigger_terms, prompt_text, scope_filter, category_filter, priority)
values
  ('hvac,ac,air conditioner,heat pump,furnace', 'What is the equipment brand/model and approximate age?', 'troubleshooting / repair', 'hvac', 40),
  ('hvac,ac,air conditioner,heat pump,furnace', 'What exact symptom are you seeing (no cool, short cycling, noise, leak, odor, high bill)?', 'troubleshooting / repair', 'hvac', 41),
  ('hvac,ac,air conditioner,heat pump,furnace', 'When did the issue start, and is it constant or intermittent?', 'troubleshooting / repair', 'hvac', 42),
  ('hvac,ac,air conditioner,heat pump,furnace', 'Any recent breaker trips, thermostat battery changes, or filter replacements?', 'troubleshooting / repair', 'hvac', 43),
  ('water heater,hot water heater', 'Is there no hot water, limited hot water, leaking, or unusual noise?', 'troubleshooting / repair', 'water heater,plumbing', 50),
  ('water heater,hot water heater', 'Do you see an error code, pilot outage, or tripped reset?', 'troubleshooting / repair', 'water heater,plumbing', 51),
  ('water heater,hot water heater', 'Where is the leak visible (top fittings, relief valve, drain valve, tank body)?', 'troubleshooting / repair', 'water heater,plumbing', 52),
  ('sink,faucet,drain,garbage disposal', 'Is the issue a leak, clog, low flow, no power, or continuous running?', 'troubleshooting / repair', 'plumbing,appliance installation,general handyman', 60),
  ('sink,faucet,drain,garbage disposal', 'Please share photos of under-sink plumbing, shutoff valves, and disposal wiring/plug.', 'troubleshooting / repair', 'plumbing,appliance installation,general handyman', 61),
  ('electrical,outlet,switch,breaker,panel', 'Is any outlet/switch warm, sparking, buzzing, or dead?', 'troubleshooting / repair', 'electrical', 70),
  ('electrical,outlet,switch,breaker,panel', 'Which breaker controls the affected area, and is it tripping repeatedly?', 'troubleshooting / repair', 'electrical', 71),
  ('electrical,outlet,switch,breaker,panel', 'Is this isolated to one fixture/outlet or multiple rooms?', 'troubleshooting / repair', 'electrical', 72),
  ('door,window', 'Is the issue sticking, sagging, air leak, water intrusion, lock/latch failure, or broken glass?', 'troubleshooting / repair', 'doors / windows', 80),
  ('drywall,ceiling,wall,paint', 'Is there visible moisture damage, cracking pattern, or prior patch history?', 'troubleshooting / repair', 'drywall / framing,painting / finish work', 90),
  ('fence,gate,exterior', 'What material is involved (wood, chain-link, vinyl, metal) and what failed?', 'troubleshooting / repair', 'exterior / fencing', 100)
on conflict do nothing;

insert into quote_catalog_items (job_type_key, item_key, item_name, default_unit_cost_cents, default_quantity, aliases)
values
  ('hvac_troubleshoot_repair', 'hvac_capacitor', 'HVAC capacitor (common range)', 6900, 1, 'capacitor'),
  ('hvac_troubleshoot_repair', 'hvac_contactor', 'HVAC contactor', 7900, 1, 'contactor'),
  ('hvac_troubleshoot_repair', 'hvac_fuse_set', 'HVAC fuse set', 2400, 1, 'fuse'),
  ('hvac_troubleshoot_repair', 'hvac_thermostat', 'Thermostat replacement allowance', 12900, 1, 'thermostat'),
  ('water_heater_troubleshoot_repair', 'wh_element', 'Water heater element kit', 4900, 1, 'element'),
  ('water_heater_troubleshoot_repair', 'wh_thermostat', 'Water heater thermostat kit', 4200, 1, 'thermostat'),
  ('water_heater_troubleshoot_repair', 'wh_tpr', 'Temperature/pressure relief valve', 3500, 1, 'tpr valve,relief valve'),
  ('sink_troubleshoot_repair', 'sink_drain_kit', 'Sink drain repair kit', 2800, 1, 'drain,tailpiece'),
  ('sink_troubleshoot_repair', 'sink_supply_line', 'Braided supply line', 1600, 2, 'supply line'),
  ('sink_troubleshoot_repair', 'sink_shutoff_valve', 'Angle shutoff valve', 1700, 2, 'shutoff,valve'),
  ('electrical_troubleshoot_repair', 'elec_outlet_gfci', 'GFCI outlet', 2400, 1, 'gfci,outlet'),
  ('electrical_troubleshoot_repair', 'elec_switch', 'Standard switch', 800, 1, 'switch'),
  ('electrical_troubleshoot_repair', 'elec_breaker', 'Breaker replacement allowance', 2600, 1, 'breaker')
on conflict do nothing;
