# Art Direction — ارگ (Arg) (`src/assets/`)

This document describes the ACTUAL implementation (spec §4.6). All assets follow it.

## 1. Projection & camera
- Orthographic isometric 2:1. Tile 36×18 px (`CONFIG.TILE_W/H`), grid 32×32.
- Screen: `x = ox + (c−r)·hw`, `y = oy + (c+r)·hh`, `hw=18·zoom`, `hh=9·zoom`.
- Camera: pan + zoom (0.3–3, wheel 1.12 steps), auto-fit on resize until user pans/zooms.
- DPR capped at 2. Ground-contact positioning everywhere: no object drifts with camera/zoom
  (verified by coordinate round-trip test `t_render_roundtrip`).

## 2. Logical scale (reference @ zoom 1)
- Tile: 36×18. Human figure ≈ 22 px tall (head to feet), frame 32×32, anchor bottom-center (16,31).
- Hut 2×2 (walls 24) / woodcutter 2×2 (20) / farm 3×2 (soil, no walls) / tower 3×3 (shaft 54).
- Visual bounds may exceed footprint (tower height, tree crowns); logical `occ` grid unchanged.

## 3. Lighting (single direction)
- Light from ABOVE, slightly screen-right: top faces lightest, right faces mid
  (`shade(base,−22)`), left faces darkest (`def.dark`).
- Contact shadows: soft centered ellipses `rgba(0,0,0,0.16–0.34)` under buildings/units/boulders.
- No dynamic lights; water shimmer + flag wave are the only looping ambient animations.

## 4. Palettes (hex, actually used)
- Grass: `#4c7d44 #527f45 #46753e #4e8348` (+2 baked tile variants); tuft `rgba(30,60,26,.55)`;
  wildflowers `#e7c65a / #e8e6f0`.
- Water: `#2e6f8e / #2a657f`, highlight `rgba(150,210,235,.6)`, foam `rgba(220,240,248,.7)`.
- Rock: `#6e7278 / #676b71`, speckle `rgba(0,0,0,.28)`, edge `rgba(255,255,255,.16)`.
- Soil (farm): `#7a5a38`, furrow `rgba(40,24,12,.4)`, crops `#7fbf4a / #93d15c`.
- Timber: walls `#7a5c3e`, dark `#4e3a26`, top `#a88357`; logs `#a87f4e` ring `#4e3a26`.
- Thatch: `#e3c188` / shade −30; stone: base `#8d99a6`, dark `#59616b`, top `#ccd5dd`.
- Skin `#e8b98a`, cloth (soldier tunic `#4d9de0`), leather `#6b4f30`, steel `#c8ccd2`,
  enemy red `#e05c4d`, archer orange `#e09a4d`; player bowman blue `#4d9de0` + navy hood `#2e4a66`
  (same faction blue as soldier, bow/quiver + hood distinguish role); pennant `#c0392b`; gold icon `#f0c75e`.
- Unstaffed producer: full desaturation to `#6a6a6a/#454545/#9a9a9a` family + `!` badge `#f5f0dc`.

## 5. Outlines & detail
- 1–1.5 px dark outlines `rgba(0,0,0,.35–.65)` on buildings/units; tile grid `rgba(0,0,0,.10)`
  normal play, stronger in placement mode (ghost active).
- Micro-detail (tufts, speckles, thatch lines, fence posts) only at `zoom ≥ 0.55` (LOD rule).

## 6. Characters
- Readable silhouette: head + torso + arms + legs + gear; no thin-limb noise.
- Team + role read: tunic color + equipment (spear+shield / sword / bow), NOT color dots.
- 4 screen directions (E/S/W/N quantized from iso screen angle); states: idle, walkA/B,
  attack, dead. Walk toggles with distance moved; attack pose when an enemy is in range;
  damage flash (white ring, 3 ticks, from `flashTick`); death → dust puff at last position.
- No civilians exist in the world (workers are abstract numbers) → no civilian sprites.

## 7. What is vector vs file (and why)
- FILES (`src/assets/`): terrain tiles, boulders, reeds, unit sheets, resource icons.
- VECTOR (in `render.js`, documented as production kit in manifest): buildings.
  Reason: zoom 0.3–3 crispness + dynamic overlays (damage wash, gray-out, volumetric ghost)
  that baked PNGs would need variant files for. Same projection/anchor/palette rules apply.
- Particles (death puff, water shimmer) and indicators (hover, HP, order line): procedural.

## 8. Anchors
- Tiles: diamond corners from grid coords. Buildings: footprint corners A/B/C/D.
- Sprites: ground-contact bottom-center. Units: logical `(x,r)` floats → screen point.
- HUD icons: 24 px family, same lighting (top-light, dark outline).
