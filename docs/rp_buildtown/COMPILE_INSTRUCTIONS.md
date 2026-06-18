# Hammer Compile Instructions for `rp_buildtown_blockout.vmf`

## Prerequisites

1. Install Garry's Mod and Source SDK / Hammer through Steam.
2. Configure Hammer for Garry's Mod with the active game configuration pointing at the Garry's Mod `gameinfo.txt`.
3. Confirm the VMF is stored or copied to your Hammer maps source folder.

## Open and inspect

1. Open Hammer.
2. Choose **File > Open** and select `maps/rp_buildtown_blockout.vmf` from this repository.
3. Enable the visgroups for district-by-district review:
   - `01 Spawn Plaza`
   - `02 Shops Downtown`
   - `03 Apartments`
   - `04 Hospital`
   - `05 Park Recreation`
   - `06 Beach Waterfront`
   - `07 Farmland`
   - `08 Build Zone A`
   - `09 Build Zone B`
   - `10 Industrial Construction`
   - `11 Mountain Forest`
   - `Admin Bunker`
   - `Tunnel System`
   - `Roads`
   - `Build Plots`

## Fast blockout compile

Use Hammer's **Run Map** dialog with these starter settings:

- **BSP:** Normal
- **VIS:** Fast
- **RAD:** Fast
- **HDR:** Optional / off for fastest blockout iteration
- **Don't run the game after compiling:** off if you want immediate in-game review

For command-line workflows, adapt the paths to your Steam library:

```bat
vbsp.exe -game "C:\Program Files (x86)\Steam\steamapps\common\GarrysMod\garrysmod" rp_buildtown_blockout.vmf
vvis.exe -fast -game "C:\Program Files (x86)\Steam\steamapps\common\GarrysMod\garrysmod" rp_buildtown_blockout.bsp
vrad.exe -fast -game "C:\Program Files (x86)\Steam\steamapps\common\GarrysMod\garrysmod" rp_buildtown_blockout.bsp
```

## Optimization notes

- Keep the first playable test as a blockout: avoid detailed props until scale and routes feel correct.
- Replace large flat district pads with displacements only after the road network is approved.
- Convert decorative off-route terrain and ocean boundaries to non-solid or optimized detail work during polish.
- Add area portals, hints, fades, and occluders only after finalizing building footprints and tunnel routes.
