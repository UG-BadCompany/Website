insert into quote_catalog_items (job_type_key, item_key, item_name, default_unit_cost_cents, default_quantity, aliases)
values
  -- HVAC new install
  ('hvac_new_install', 'return_air_grille_filter_base', 'Return air grille + MERV filter starter set', 7900, 1, 'return grille,return filter,merv filter'),
  ('hvac_new_install', 'line_hide_cover_kit', 'Mini-split line hide cover kit', 12900, 1, 'line hide,lineset cover'),

  -- HVAC troubleshoot/repair
  ('hvac_troubleshoot_repair', 'condenser_fan_capacitor_kit', 'Condenser fan motor + capacitor repair kit', 26900, 1, 'condenser fan motor,fan capacitor'),
  ('hvac_troubleshoot_repair', 'low_voltage_control_fuse_pack', 'Low-voltage control fuse pack', 1800, 1, '3 amp fuse,control fuse'),

  -- Electrical new install
  ('electrical_new_install', 'whole_home_surge_device', 'Whole-home surge protective device', 28900, 1, 'whole home surge,spd'),
  ('electrical_new_install', 'exterior_weatherproof_box_kit', 'Exterior weatherproof box + gasket kit', 5200, 2, 'weatherproof box,bell box'),

  -- Electrical replace existing
  ('electrical_replace_existing', 'gfci_combo_upgrade_pack', 'GFCI receptacle + plate replacement pack', 3900, 3, 'gfci replacement,plate combo'),
  ('electrical_replace_existing', 'bath_fan_replacement_kit', 'Bathroom exhaust fan replacement kit', 16900, 1, 'bath fan replacement,exhaust fan kit'),

  -- Plumbing new install
  ('plumbing_new_install', 'tankless_isolation_valve_kit', 'Tankless heater isolation valve kit', 14900, 1, 'tankless isolation,valve kit'),
  ('plumbing_new_install', 'ice_maker_box_kit', 'Refrigerator ice maker outlet box kit', 7200, 1, 'ice maker box,fridge water box'),

  -- Plumbing troubleshoot/repair
  ('plumbing_troubleshoot_repair', 'cartridge_rebuild_kit', 'Single-handle faucet cartridge rebuild kit', 6900, 1, 'faucet cartridge,stem kit'),
  ('plumbing_troubleshoot_repair', 'pressure_balance_cartridge', 'Shower pressure-balance cartridge', 9900, 1, 'shower cartridge,pressure balance'),

  -- Plumbing replace existing
  ('plumbing_replace_existing', 'main_shutoff_ball_valve', 'Main water shutoff ball valve replacement', 12900, 1, 'main shutoff,ball valve'),
  ('plumbing_replace_existing', 'garbage_disposal_premium_1hp', 'Premium 1 HP garbage disposal replacement', 31900, 1, '1hp disposal,premium disposal')
on conflict (job_type_key, item_key) do update
  set item_name = excluded.item_name,
      default_unit_cost_cents = excluded.default_unit_cost_cents,
      default_quantity = excluded.default_quantity,
      aliases = excluded.aliases,
      is_active = true,
      updated_at = now();
