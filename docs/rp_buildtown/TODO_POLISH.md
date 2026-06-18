# Manual Hammer Polish To-Do

## Geometry and terrain

- Sculpt the island coastline into an irregular shape matching the concept image instead of the rectangular blockout base.
- Convert mountain, farmland, beach, and park pads into blended displacement terrain.
- Cut or model real tunnel interiors through the mountain rather than using portal indicators.
- Add curbs, sidewalks, crosswalks, road markings, and intersections.

## District detail

- Spawn / Plaza: add fountain, benches, signage, streetlights, and a finished city hall facade.
- Downtown: split blockout buildings into individual shops with readable storefronts.
- Apartments: add stair/elevator cores, rooftops, balconies, and interiors if budget allows.
- Hospital: add ambulance bay, emergency entrance, helipad marker, and signage.
- Park: add gazebo, playground, pond, paths, trees, and lighting.
- Beach: add pier, lighthouse vista, rocks, lifeguard props, beach huts, and shoreline detail.
- Farmland: add fences, crop rows, silo, windmill, barn interior, and equipment props.
- Build Zones A/B: add plot number signs, utility hookups, parking strips, and clear no-build road buffers.
- Industrial / Construction: add cranes, containers, scaffolds, smokestacks, and job signage.
- Mountain / Forest: add tree clusters, trails, lookout points, rock outcrops, and tunnel signage.

## Gameplay and admin

- Replace placeholder `info_player_start` cluster with finalized spawn logic for your gamemode.
- Add admin-only bunker doors, access control, cameras, and observation rooms.
- Add vehicle spawn pads at dealership, police, hospital, farm, and construction yard.
- Add job NPC placement markers or scripted entity positions for the BuildRP gamemode.
- Validate BuildRP plot boundaries and prevent overlap with public roads.

## Optimization and QA

- Run leak checks after every major terrain edit.
- Add areaportals/hint brushes after building interiors are finalized.
- Use prop fade distances and func_detail for non-sealing detail geometry.
- Compile with full VIS/RAD before release candidate testing.
- Test with multiple players and common Garry's Mod tools/props to confirm BuildRP usability.
