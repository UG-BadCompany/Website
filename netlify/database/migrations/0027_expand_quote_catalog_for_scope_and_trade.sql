insert into quote_catalog_items (job_type_key, item_key, item_name, default_unit_cost_cents, default_quantity, aliases)
values
  -- HVAC: new installs (package-first mindset)
  ('hvac_new_install', 'mini_split_system_18k', 'Mini-split package system (outdoor condenser + indoor air handler, 18k BTU)', 289900, 1, 'mini split package,ductless package,condenser and air handler'),
  ('hvac_new_install', 'line_set_25ft', 'Insulated copper line set (25 ft)', 23900, 1, 'line set,refrigerant line set'),
  ('hvac_new_install', 'disconnect_box_whip', 'AC disconnect box + whip kit', 9900, 1, 'disconnect,whip,ac disconnect'),
  ('hvac_new_install', 'surge_protector_hvac', 'HVAC surge protector', 11900, 1, 'hvac surge protector,surge'),
  ('hvac_new_install', 'condensate_pump_kit', 'Condensate pump and drain kit', 13900, 1, 'condensate pump,drain kit'),

  -- HVAC: troubleshooting / repair
  ('hvac_troubleshoot_repair', 'run_capacitor_premium', 'Premium run capacitor', 8400, 1, 'run capacitor,dual run capacitor'),
  ('hvac_troubleshoot_repair', 'contactor_premium', 'Premium contactor', 9800, 1, 'contactor'),
  ('hvac_troubleshoot_repair', 'hard_start_kit', 'Compressor hard-start kit', 8900, 1, 'hard start kit,start assist'),
  ('hvac_troubleshoot_repair', 'condensate_switch', 'Condensate safety float switch', 3600, 1, 'float switch,safety switch'),

  -- HVAC: replace existing
  ('hvac_replace_existing', 'smart_thermostat', 'Smart thermostat replacement', 21900, 1, 'thermostat replacement,smart thermostat'),
  ('hvac_replace_existing', 'condenser_fan_motor', 'Condenser fan motor replacement', 22900, 1, 'fan motor,condenser motor'),
  ('hvac_replace_existing', 'blower_motor_ecm', 'Indoor blower motor (ECM) replacement', 38900, 1, 'blower motor,ecm motor'),

  -- Electrical: new install
  ('electrical_new_install', 'led_wafer_light_6in', '6-in LED wafer/canless light kit', 3200, 8, 'wafer light,recessed led,canless'),
  ('electrical_new_install', 'single_pole_switch_commercial', 'Commercial-grade single-pole switch', 1200, 4, 'single pole switch,switch'),
  ('electrical_new_install', 'gfci_receptacle_tr', 'Tamper-resistant GFCI receptacle', 2600, 2, 'gfci,gfci outlet,receptacle'),
  ('electrical_new_install', 'emt_conduit_bundle', 'EMT conduit sticks bundle (10x 10ft)', 13900, 1, 'emt conduit,conduit bundle'),
  ('electrical_new_install', 'conduit_fittings_mixed_pack', 'Conduit fittings mixed pack (90s/couplings/connectors)', 7400, 2, 'conduit fittings,90 elbow,coupling,connector'),

  -- Electrical: troubleshooting / repair
  ('electrical_troubleshoot_repair', 'arc_fault_breaker', 'AFCI breaker replacement', 5900, 1, 'afci breaker,breaker'),
  ('electrical_troubleshoot_repair', 'tamper_receptacle', 'Tamper-resistant duplex receptacle', 700, 2, 'duplex outlet,receptacle'),
  ('electrical_troubleshoot_repair', 'wire_nut_assortment', 'Wire connector assortment', 1200, 1, 'wire nuts,connectors'),

  -- Electrical: replace existing
  ('electrical_replace_existing', 'light_fixture_flush_mount', 'Flush-mount LED fixture replacement', 8900, 2, 'light fixture replacement,flush mount'),
  ('electrical_replace_existing', 'ceiling_fan_with_remote', 'Ceiling fan with remote replacement', 18900, 1, 'ceiling fan replacement,fan'),
  ('electrical_replace_existing', 'weatherproof_gfci_cover', 'Weatherproof in-use GFCI cover', 1600, 2, 'bubble cover,in-use cover'),

  -- Plumbing: new install
  ('plumbing_new_install', 'toilet_chair_height', 'Chair-height elongated toilet package', 32900, 1, 'toilet package,toilet install'),
  ('plumbing_new_install', 'toilet_wax_bolts_kit', 'Wax ring + closet bolt kit', 1400, 1, 'wax ring,closet bolts'),
  ('plumbing_new_install', 'faucet_pull_down', 'Pull-down kitchen faucet', 16900, 1, 'kitchen faucet,pull-down faucet'),
  ('plumbing_new_install', 'disposal_3_4hp', '3/4 HP garbage disposal', 20900, 1, 'garbage disposal,disposer'),

  -- Plumbing: troubleshooting / repair
  ('plumbing_troubleshoot_repair', 'angle_stop_valve', 'Angle stop valve replacement', 1800, 2, 'angle stop,shutoff valve'),
  ('plumbing_troubleshoot_repair', 'fill_valve_kit', 'Toilet fill valve/flapper repair kit', 2200, 1, 'fill valve,flapper'),
  ('plumbing_troubleshoot_repair', 'drain_snake_allowance', 'Drain clearing consumables allowance', 4900, 1, 'drain snake,drain cleaning'),

  -- Plumbing: replace existing
  ('plumbing_replace_existing', 'water_heater_50g', '50-gallon water heater replacement package', 149900, 1, 'water heater replacement,50 gallon water heater'),
  ('plumbing_replace_existing', 'expansion_tank', 'Thermal expansion tank', 6900, 1, 'expansion tank'),
  ('plumbing_replace_existing', 'pressure_regulator_valve', 'Pressure reducing valve replacement', 19900, 1, 'prv,pressure regulator')
on conflict (job_type_key, item_key) do update
  set item_name = excluded.item_name,
      default_unit_cost_cents = excluded.default_unit_cost_cents,
      default_quantity = excluded.default_quantity,
      aliases = excluded.aliases,
      is_active = true,
      updated_at = now();
