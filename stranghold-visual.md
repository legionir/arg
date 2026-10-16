# Task: Upgrade the Game's Visual Rendering System to Classic Stronghold-Style Isometric RTS Graphics

## 1. Objective

Upgrade the existing game's graphics from its current implementation to a significantly more detailed, polished, coherent, and visually readable isometric 2D strategy game aesthetic inspired by the classic Stronghold: Crusader.

The attached screenshot represents the CURRENT GRAPHICAL IMPLEMENTATION. Treat it as the visual baseline and inspect the actual project implementation before making changes.

The goal is to improve the existing game's visual quality without unnecessarily changing its gameplay mechanics, simulation rules, world coordinates, economic systems, combat logic, or AI behavior.

This is a graphics implementation task, not a game redesign.

Do not replace the existing game with a mockup, static illustration, pre-rendered scene, or unrelated graphics framework.

The final result must remain a functional, interactive, real-time strategy game rendered by the existing application.

Preserve the recognizable visual identity of classic isometric RTS games:
- Detailed terrain and environmental elements.
- Distinctive medieval buildings.
- Recognizable human characters and military units.
- Strong architectural silhouettes.
- Readable defensive structures.
- Visually differentiated resources.
- Cohesive color palettes and materials.
- Smooth, meaningful animations.
- Clear depth ordering and isometric perspective.

Use original or properly licensed graphical assets. Reproduce the general visual style and level of detail without copying proprietary game assets.

## 2. Mandatory Initial Analysis

Before modifying any code, inspect the existing rendering implementation.

Identify:

1. The rendering engine and its version.
2. The main rendering entry points.
3. The world-coordinate and isometric-coordinate systems.
4. The tile dimensions and map rendering algorithm.
5. The existing terrain representation.
6. How buildings, units, resources, and environmental objects are represented.
7. The existing sprite, texture, and animation systems.
8. The current depth-sorting algorithm.
9. The camera, zoom, viewport, and input systems.
10. The existing asset-loading and caching mechanisms.
11. The current rendering performance characteristics.
12. The actual separation between game simulation and visual rendering.

Inspect the real source files rather than inferring architecture from filenames alone.

Identify which visual elements are currently:
- Rendered using primitive geometric shapes.
- Generated procedurally.
- Loaded from image assets.
- Animated.
- Represented by incomplete placeholders.
- Missing entirely.

Create a concise implementation plan based on the actual codebase.

Do not rewrite functioning systems merely to make the architecture conform to a preferred design.

If the existing architecture is suitable, extend it incrementally.

## 3. Visual Direction and Art Style

Adopt a polished, hand-crafted, classic isometric RTS visual style inspired by Stronghold: Crusader.

The art direction should combine:

- An orthographic isometric viewpoint.
- Readable silhouettes.
- Detailed but restrained textures.
- Carefully designed pixel-art or raster-style sprites.
- Layered architectural geometry.
- Consistent outlines and edge treatment.
- Subtle ambient shading.
- Clear material differentiation.
- A cohesive desert-medieval color palette.
- Enough environmental detail to make the world feel inhabited.

Avoid the appearance of:
- Generic flat geometric placeholders.
- A wireframe or developer-debug visualization.
- Oversimplified emoji-like characters.
- Randomly scattered decorative pixels.
- Excessive outlines around every object.
- Inconsistent sprite proportions.
- Flat, textureless buildings.
- Inconsistent lighting directions.
- Excessive visual noise.

The current map already establishes an isometric grid, a green terrain palette, water, a stone castle, a small number of buildings, and simplified character representations.

Preserve these recognizable foundations while substantially improving their visual quality.

Do not force the entire game into a desert-only palette if the existing terrain system supports multiple terrain types.

The art direction must support coherent visual variations for grassland, desert, stone, water, cultivated land, and other terrain types already supported by the game.

## 4. Core Rendering Architecture

Implement or improve the rendering architecture according to the actual project structure.

Separate the visual representation of game objects from their logical simulation state.

Where appropriate, establish reusable rendering components for:

- Terrain tiles.
- Environmental decorations.
- Buildings.
- Walls and towers.
- Human characters.
- Military units.
- Resource objects.
- Construction states.
- Destruction states.
- Particle effects.
- Shadows.
- Selection indicators.
- Health bars.
- Interaction previews.

Each visual component should consume existing game-state data instead of maintaining an independent and potentially conflicting simulation.

For example, a military unit's rendering component should read its logical position, movement state, direction, health, and animation state from the existing unit system.

Do not implement movement, combat, resource consumption, or construction rules inside the rendering layer.

Use the existing rendering framework wherever practical.

If the project uses Canvas 2D, improve its rendering pipeline rather than introducing WebGL unnecessarily.

If the project already uses Phaser, PixiJS, or another rendering engine, use the capabilities of that engine appropriately.

Do not introduce a second rendering engine unless there is a demonstrated technical requirement.

## 5. Terrain Rendering

Upgrade the terrain system first because terrain occupies most of the visible game area.

### 5.1. Tile Appearance

Each terrain tile should have:

- A consistent isometric diamond shape.
- Correct dimensions and alignment.
- A visually coherent base color.
- Subtle material texture.
- Natural color variation.
- Consistent edge treatment.
- Appropriate shading.
- A clear relationship with neighboring tiles.

Eliminate the appearance of a uniformly colored grid.

Tile boundaries should remain useful for gameplay and placement without dominating the entire image.

Make grid lines subtle during normal gameplay while preserving stronger grid visibility when the player enters construction or placement mode.

### 5.2. Grass and Vegetation

Improve grass tiles with carefully controlled variation.

Introduce reusable visual variations such as:

- Short grass.
- Sparse dry grass.
- Small vegetation clusters.
- Bare soil.
- Tiny stones.
- Slight color variations.
- Occasional patches of denser vegetation.

Decorations must be positioned consistently and should not look randomly generated on every frame.

Use deterministic placement based on map coordinates, tile identity, or an existing world seed.

The same map should preserve its environmental decoration layout between renders and after loading a saved game.

Do not cover every tile with decorative details.

Maintain visual clarity and leave sufficient open ground for observing movement, buildings, and military formations.

### 5.3. Desert Terrain

If desert terrain is supported, create a coherent visual family including:

- Sand variations.
- Subtle dune patterns.
- Dry soil.
- Small stones.
- Sparse desert vegetation.
- Rocky patches.

Terrain transitions must appear natural rather than like arbitrary colored diamonds.

### 5.4. Rocky Terrain and Ground Deposits

Improve rocky areas with:
- Irregular stone clusters.
- Multiple stone sizes.
- Subtle height variation.
- Broken ground edges.
- Appropriate shading.
- Distinctive rock material colors.

If the existing game supports deposits such as iron or stone, distinguish the actual resource deposit from ordinary decorative rocks.

Resource deposits must remain identifiable and consistent with the game's gameplay rules.

### 5.5. Water

Upgrade water from flat blue tiles into a cohesive isometric water surface.

Introduce:
- Multiple blue and teal shades.
- Subtle wave patterns.
- Directionally consistent highlights.
- Shallow-water variations where appropriate.
- Clear shoreline transitions.
- Natural-looking boundaries between land and water.

Optional water animation must be subtle and inexpensive.

Do not allow water decorations or animation to obscure the shoreline or alter logical movement and terrain accessibility.

### 5.6. Terrain Transitions

Implement proper transitions between supported terrain types.

Examples include:
- Grass to water.
- Grass to rocky ground.
- Grass to cultivated soil.
- Sand to rock.
- Sand to water.

Use edge tiles, transition sprites, or layered terrain rendering as appropriate.

Avoid visible gaps, inconsistent borders, and incorrectly aligned transitions.

## 6. Environmental Objects and World Details

The world should contain a controlled amount of environmental detail that reinforces the medieval setting.

Implement visual support for existing or planned object types such as:

- Trees.
- Bushes.
- Rocks.
- Small plants.
- Grass patches.
- Resource deposits.
- Cultivated fields.
- Farms.
- Roads.
- Paths.
- Shoreline details.
- Fallen debris.
- Other terrain-specific objects.

Each object must have a clear visual footprint and a consistent anchor point.

Environmental decorations must respect the existing collision and placement rules.

A purely decorative object must not unexpectedly block movement.

A gameplay obstacle must not appear traversable merely because its sprite has transparent pixels.

Separate logical collision and occupancy from the visual sprite.

Use multiple variations for frequently repeated objects to avoid obvious visual repetition.

Ensure that the same object maintains the same visual identity across different zoom levels.

## 7. Human Characters and Villagers

The current character representations are simplified colored circles.

Replace these placeholders with recognizable, detailed, animated human sprites.

Characters should visually communicate that they are inhabitants of a medieval settlement rather than abstract tokens.

### 7.1. Character Design

Use a consistent character scale and recognizable anatomy.

Characters should include:
- A visible head.
- Torso.
- Arms.
- Legs.
- Medieval clothing.
- Appropriate footwear.
- Distinctive color accents.
- A readable silhouette.

Use shading and highlights to distinguish clothing, skin, leather, and fabric.

Maintain proportions suitable for an isometric strategy game viewed from a relatively distant camera.

Do not create overly realistic, high-detail characters that become unreadable at the game's normal zoom level.

### 7.2. Villager Variations

Support visual variations appropriate to existing gameplay roles.

Examples:
- Ordinary villagers.
- Farmers.
- Woodcutters.
- Miners.
- Builders.
- Transport workers.
- Other existing civilian professions.

Different professions should be distinguishable through clothing, tools, carried objects, or work animations.

Do not create visual profession differences for roles that do not exist in the game unless the change is explicitly limited to harmless decoration.

### 7.3. Character Animations

Implement a reusable animation system supporting, where appropriate:

- Idle.
- Walking.
- Working.
- Carrying resources.
- Construction.
- Combat.
- Taking damage.
- Death.

Animations should have consistent timing and directional orientation.

Characters should visually face their movement direction.

Use sprite sheets or another appropriate animation representation supported by the existing rendering engine.

If complete directional sprite sets are unavailable, use a practical fallback that preserves visual quality without producing obvious directional errors.

### 7.4. Character Movement

Synchronize character animation with logical movement.

Walking animations should stop when a unit stops moving.

Working animations should reflect the character's actual work state.

A character must not continue playing a walking animation while standing still or appear to work at a building it is not assigned to.

Avoid changing the game's actual movement speeds solely to compensate for animation timing.

## 8. Military Units

Military units must be visually distinguishable from civilians and from one another.

Each unit type should have an appropriate silhouette, clothing, equipment, and animation style.

Depending on the unit types supported by the game, provide visual designs for:
- Light infantry.
- Armored infantry.
- Spearmen.
- Archers.
- Crossbowmen.
- Mounted units.
- Other existing military unit types.

Do not assume that every listed type is already implemented. First inspect the game's actual unit definitions.

### 8.1. Visual Differentiation

Differentiate units through:
- Armor.
- Helmets.
- Shields.
- Weapons.
- Clothing.
- Mounts.
- Color accents.
- Stance.
- Animation.

Unit identity should remain recognizable at the default gameplay zoom.

### 8.2. Directional Animation

Implement or improve directional rendering for moving and fighting units.

Use the existing direction model if available.

Avoid rotating sprites in ways that make weapons, shields, armor, or mounted units appear physically incorrect.

### 8.3. Weapons and Equipment

Weapons should be visually attached to the appropriate character or equipment anchor.

Examples include:
- Spears.
- Swords.
- Bows.
- Crossbows.
- Shields.
- Other supported weapons.

Equipment should move consistently with the character's animation.

### 8.4. Unit Readability

Preserve the ability to distinguish individual units during large battles.

Selection indicators, team colors, health bars, and command markers should remain readable without overwhelming the character sprites.

Do not use oversized colored circles as the primary representation of a character.

Simple indicators may remain available as supplementary UI elements.

## 9. Buildings and Architectural Structures

Buildings must become visually recognizable medieval structures rather than simple colored geometric blocks.

Create a consistent architectural language using:
- Stone.
- Timber.
- Plaster.
- Sandstone.
- Roof tiles.
- Wood beams.
- Doors.
- Windows.
- Architectural shadows.
- Edge highlights.
- Material-specific textures.

Building silhouettes should be distinctive enough to identify the building category without opening an information panel.

### 9.1. Building Geometry

Buildings must preserve their existing logical footprints and placement coordinates.

Improve their visual height and depth without allowing decorative geometry to alter the underlying construction rules.

Use consistent perspective and a common lighting direction.

Add visible front, side, and roof surfaces as appropriate.

Avoid inconsistent wall angles and mismatched isometric projections.

### 9.2. Economic Buildings

Provide suitable visual designs for supported economic buildings.

Examples include:
- Houses.
- Farms.
- Mills.
- Bakeries.
- Woodcutters' buildings.
- Mines.
- Workshops.
- Storage buildings.

Distinguish these structures through their shapes, materials, roofs, tools, and surrounding details.

If a building has an active production state, use subtle visual cues to communicate activity where appropriate.

Examples:
- Smoke from a working furnace.
- Movement around a production building.
- Animated machinery.
- Activity within a farm.

These visual cues must reflect actual building state where such information exists.

Do not create decorative activity that falsely suggests production is occurring.

### 9.3. Building Footprints and Anchors

Each building must define a reliable rendering anchor.

Ensure that:
- Buildings align correctly with the isometric grid.
- Large structures occupy their correct visual space.
- Sprites do not drift when the camera moves.
- Buildings remain aligned at different zoom levels.
- Overlapping buildings are rendered in the correct order.

The visual dimensions of a building may exceed its logical footprint, but its logical occupancy must remain unchanged unless a separate gameplay change is explicitly requested.

## 10. Castles, Walls, Towers, and Gates

Defensive architecture deserves special attention because it is central to the Stronghold experience.

### 10.1. Castle Structures

Improve the appearance of castles using:
- Stone block patterns.
- Visible wall thickness.
- Battlements.
- Parapets.
- Windows and arrow slits.
- Corner details.
- Distinct roof or platform surfaces.
- Consistent architectural shadows.

The castle should look like a coherent structure rather than an isolated rectangular block.

### 10.2. Walls

Implement or improve visual support for:
- Straight wall segments.
- Connected wall sections.
- Corners.
- Junctions.
- Openings.
- Damaged walls.
- Destroyed wall sections.

Wall segments must connect seamlessly.

Avoid visible gaps, incorrect overlaps, and inconsistent heights.

Wall visuals must correspond to the actual logical wall configuration.

### 10.3. Towers

Towers should have distinctive silhouettes and believable architectural details.

Depending on the supported building definitions, include:
- Stone foundations.
- Vertical wall surfaces.
- Battlements.
- Platforms.
- Openings.
- Defensive details.
- Appropriate roof structures where applicable.

The tower's upper surface must be visually distinct from its side walls.

### 10.4. Gates

Gates should be visually distinguishable from ordinary wall segments.

If the game supports opening and closing gates, their visual states must correspond to their actual logical state.

Gate animations must not change collision behavior independently of the game simulation.

### 10.5. Construction and Destruction

Where supported, provide visual states for:
- Planned construction.
- Construction in progress.
- Completed structures.
- Damaged structures.
- Burning structures.
- Destroyed structures.

The rendering layer should display the state supplied by the building system.

Do not introduce additional building health rules or destruction mechanics as part of this graphics task.

## 11. Resource Visuals

Resources must be recognizable in the world and visually consistent with their gameplay purpose.

Support existing resource types such as:
- Wood.
- Stone.
- Iron.
- Food.
- Wheat.
- Flour.
- Bread.
- Other implemented resources.

Do not assume that every inventory resource must exist as a physical world object.

Distinguish between:
1. Natural resource deposits.
2. Harvestable objects.
3. Transported goods.
4. Stored inventory.
5. UI resource icons.

### 11.1. Natural Deposits

Examples include:
- Stone deposits.
- Iron deposits.
- Trees.
- Other harvestable objects.

Natural deposits should have distinctive shapes and materials.

A resource deposit should not look identical to a decorative environmental object of the same general material.

### 11.2. Transported Goods

Where the game visually represents workers carrying goods, provide appropriate carried-object sprites.

Examples:
- Logs.
- Stone blocks.
- Food baskets.
- Sacks.
- Other supported goods.

Carried objects must remain attached to the correct character anchor during movement and animation.

### 11.3. Resource Icons

Create a consistent family of resource icons for the HUD and building panels.

Icons should use consistent dimensions, outlines, lighting, and visual complexity.

Each resource must remain identifiable at small sizes.

Avoid using generic text symbols or emoji as final resource icons.

## 12. Siege Equipment and Military Machinery

If siege equipment exists in the current game or is part of the planned game specification, improve its visual representation.

Examples may include:
- Catapults.
- Trebuchets.
- Battering rams.
- Siege towers.
- Other supported siege equipment.

Each machine should have:
- Recognizable construction.
- Appropriate wood and metal materials.
- Correct proportions.
- Visible wheels or supporting structures where applicable.
- Directional orientation.
- Movement animation.
- Attack animation.
- Appropriate visual effects.

Animations must correspond to actual attack and movement states.

Do not implement new siege mechanics or alter combat calculations in this task.

## 13. Visual Effects

Introduce restrained visual effects that improve feedback and atmosphere.

Where appropriate, implement:
- Dust during movement.
- Small construction particles.
- Smoke.
- Fire.
- Impact effects.
- Resource collection effects.
- Projectile trails.
- Water highlights.
- Destruction debris.

Effects must be triggered by actual gameplay events whenever possible.

Use pooling or another suitable allocation strategy for frequently spawned effects.

Particles should not create excessive memory pressure or unnecessary draw calls.

Avoid exaggerated effects that conflict with the restrained visual language of a classic RTS.

## 14. Shadows, Lighting, and Depth

Establish a consistent lighting direction across the entire game.

Apply compatible shading to:
- Terrain.
- Buildings.
- Walls.
- Towers.
- Characters.
- Trees.
- Resource deposits.
- Siege equipment.

Shadows should reinforce depth without obscuring important gameplay information.

Where appropriate, use:
- Soft ground shadows.
- Contact shadows.
- Architectural side shading.
- Roof highlights.
- Subtle ambient occlusion effects.

Do not introduce expensive real-time lighting if equivalent visual quality can be achieved with precomputed sprite shading or inexpensive rendering techniques.

Depth must be communicated through both sprite layering and consistent material shading.

## 15. Isometric Depth Sorting and Occlusion

Depth sorting is a critical requirement.

Implement or improve the system responsible for determining which visual elements appear in front of or behind other elements.

The system must account for:
- Terrain.
- Buildings.
- Characters.
- Trees.
- Walls.
- Towers.
- Resource objects.
- Large environmental objects.
- Objects with multiple visual layers.

Do not blindly sort every object by its top-left coordinate or arbitrary creation order.

Use appropriate ground anchors, depth keys, footprint information, or separate rendering layers.

For large buildings and structures, use a suitable strategy for rendering objects whose visual bounds overlap multiple tiles.

The following situations must be tested explicitly:
- A unit walking behind a building.
- A unit walking in front of a building.
- A unit moving around a tower.
- A character passing near a wall.
- A tree overlapping a moving character.
- A large building overlapping terrain decorations.
- Multiple units crossing paths.

Avoid depth-order flickering and sudden changes in visibility.

Preserve a clear distinction between logical occupancy, collision, and visual occlusion.

## 16. Camera, Zoom, and Screen Scaling

Preserve the existing camera behavior unless a specific issue requires improvement.

Ensure that:
- Camera movement remains smooth.
- Zoom does not break sprite alignment.
- Characters remain readable at normal zoom.
- Buildings do not disappear unexpectedly at intermediate zoom levels.
- Selection indicators remain aligned with logical objects.
- The terrain grid remains coherent.
- Rendering remains clipped to the visible viewport where appropriate.

If multiple zoom levels are supported, use level-of-detail strategies when beneficial.

Do not introduce a complex level-of-detail system unless the actual performance profile justifies it.

The game's visual assets should be designed around a clearly defined reference resolution and logical world scale.

## 17. Asset Pipeline

Inspect the existing asset pipeline before introducing new assets.

Establish a consistent approach for:
- Asset organization.
- Asset identifiers.
- Texture loading.
- Sprite sheets.
- Animation definitions.
- Asset caching.
- Missing-asset handling.
- Asset licensing and provenance.

Prefer reusable assets and data-driven definitions over hardcoded drawing instructions scattered throughout unrelated systems.

Procedural drawing may remain appropriate for selected effects, debug overlays, simple indicators, or generated terrain details.

However, the final visual representation of people, buildings, and major environmental objects should not remain limited to generic primitive shapes if the goal is a polished classic RTS appearance.

Do not create one enormous sprite sheet or one giant image containing the entire game world.

Assets must remain independently reusable and maintainable.

If new image assets are needed, define their required dimensions, orientation, animation frames, transparency, visual anchors, and intended rendering scale.

Use original or properly licensed assets.

## 18. User Interface Visual Integration

Update the game's visual presentation so the terrain, characters, buildings, and interface feel like parts of the same product.

Where the existing interface supports them, improve:
- Resource icons.
- Building icons.
- Unit portraits.
- Selection panels.
- Construction previews.
- Health bars.
- Team indicators.
- Command icons.
- Tooltips.
- Minimap markers.

Use a consistent visual language across the interface.

Ensure that interface elements do not interfere with world-space interaction.

Do not redesign unrelated application screens or replace the existing UI framework unless necessary for the requested visual improvements.

## 19. Rendering Performance

Maintain acceptable performance for an RTS game containing many moving units, buildings, terrain tiles, and environmental decorations.

Measure before making major optimization decisions.

Inspect:
- Frame time.
- Draw calls.
- Sprite count.
- Texture memory.
- Allocation frequency.
- Sorting costs.
- Animation update costs.
- Particle update costs.

Use suitable techniques such as:
- Asset caching.
- Sprite reuse.
- Texture atlases where beneficial.
- Viewport culling.
- Object pooling.
- Batched rendering where supported.
- Efficient depth sorting.
- Reduced update frequency for distant or inactive visual elements.

Do not optimize by removing essential game content or lowering visual quality indiscriminately.

Avoid introducing dependencies that are disproportionate to the project's needs.

## 20. Visual Acceptance Criteria

The implementation is complete only when the actual running game demonstrates the following:

### Terrain
- Terrain tiles have coherent textures and natural visual variation.
- Terrain transitions appear intentional.
- Water has depth and readable boundaries.
- Environmental decorations are visually consistent.
- Grid lines no longer dominate the scene.

### People and Military Units
- Human characters are recognizable as people.
- Civilian and military roles are visually distinguishable.
- Units have appropriate directional orientation.
- Movement animations correspond to actual movement.
- Unit selection remains clear.

### Buildings
- Buildings have coherent architecture and visible material differentiation.
- Buildings align with the isometric grid.
- Building silhouettes are recognizable.
- Large structures render at the correct depth.
- Construction and destruction visuals correspond to actual states.

### Defensive Structures
- Walls connect correctly.
- Towers have distinct silhouettes.
- Gates align with wall segments.
- Structures do not exhibit visual gaps or incorrect overlap.

### Resources
- Resource deposits are visually distinguishable.
- Resource objects align with the world grid.
- Carried goods, if implemented, remain attached to workers.
- HUD resource icons are consistent and recognizable.

### Rendering
- Camera movement does not cause visual drift.
- Zoom does not break alignment.
- Occlusion is correct in representative scenarios.
- No major flickering, clipping, or missing sprites remain.
- Performance remains acceptable in representative gameplay scenes.

### Gameplay Preservation
- Existing game mechanics continue to work.
- Logical coordinates and building footprints remain valid.
- Unit movement and combat rules remain unchanged.
- Economy and resource calculations remain unchanged.
- Saving and loading continue to work.
- Existing tests continue to pass.

## 21. Required Implementation Workflow

Follow this sequence:

Phase 1: Inspect the current implementation and identify the rendering architecture.

Phase 2: Establish a visual inventory of all existing object categories and missing assets.

Phase 3: Define the visual style, logical scale, sprite dimensions, anchor conventions, and rendering layers.

Phase 4: Improve terrain rendering and environmental objects.

Phase 5: Implement reusable character and military-unit rendering.

Phase 6: Upgrade buildings, castle structures, walls, towers, and gates.

Phase 7: Improve resource visuals, siege equipment, and effects.

Phase 8: Fix depth sorting, occlusion, and sprite alignment.

Phase 9: Integrate animations and UI assets.

Phase 10: Profile performance and optimize verified bottlenecks.

Phase 11: Run existing tests and relevant visual regression checks.

Phase 12: Inspect the actual running game and correct visual defects.

Work incrementally and keep the application runnable throughout development.

Do not stop after writing a plan. Implement the changes.

Do not claim that a visual improvement is complete unless it is present in the actual running application.

If the environment supports browser automation or screenshots, capture the initial state and the updated result at the same viewport dimensions and comparable zoom levels.

Compare the screenshots and inspect:
- Character readability.
- Building detail.
- Terrain quality.
- Depth ordering.
- Visual consistency.
- Overall scene composition.

If browser automation is unavailable, use the available project tooling and report which visual validations could not be performed.

## 22. Restrictions

- Do not replace the game with a static mockup.
- Do not replace the existing game world with a pre-rendered image.
- Do not remove existing gameplay systems.
- Do not change economic or combat rules.
- Do not change logical map coordinates unnecessarily.
- Do not introduce a second rendering engine without justification.
- Do not scatter hardcoded drawing logic throughout unrelated modules.
- Do not use emoji as final game assets.
- Do not introduce random visual changes every frame.
- Do not generate arbitrary decorative objects that conflict with gameplay occupancy.
- Do not break existing input, selection, camera, or construction interactions.
- Do not claim completion without validating the actual implementation.

## 23. Final Report

After implementation, provide a concise but concrete report containing:

1. The rendering architecture discovered.
2. The visual deficiencies identified.
3. The systems and assets actually implemented.
4. The source files changed.
5. The rendering and animation techniques used.
6. Any new dependencies and the reason for each.
7. Performance changes and measured results, if available.
8. Tests executed and their results.
9. Visual validation results.
10. Remaining visual limitations.
11. Recommended next steps.

Distinguish implemented features from planned features.

Do not report placeholders as completed production-quality assets.

The final objective is a functional, visually coherent, significantly upgraded isometric RTS game whose graphical quality, character design, architecture, environmental detail, and visual feedback are substantially closer to the classic Stronghold: Crusader experience while preserving the existing game's actual mechanics and technical foundations.


# Mandatory Module: Complete Game Asset Production, Art Direction, and Integration

## 1. Mission

Implement a complete, coherent, production-oriented graphical asset pipeline for the existing isometric real-time strategy game.

The current game screenshot is the visual baseline. The target visual direction is a polished, classic medieval isometric RTS inspired by Stronghold: Crusader.

This task goes beyond modifying rendering code.

You must identify, create or obtain, prepare, organize, integrate, animate, and validate the actual graphical assets required to replace the current primitive visual representations.

The final game must use recognizable graphical assets for terrain, environmental objects, civilians, military units, buildings, defensive structures, resources, and other supported game objects.

Do not consider the task complete merely because:
- Rendering functions have been refactored.
- Colors have been changed.
- Geometric shapes have been made more complicated.
- Asset manifests have been created.
- Placeholder sprites have been generated.
- A list of recommended assets has been written.
- A visual mockup has been produced.

Actual assets must be present in the project and rendered in the running game.

Use original assets or assets whose licenses permit the intended use. Reproduce the general visual language of classic isometric medieval RTS games without copying proprietary artwork.

Preserve existing game mechanics, world coordinates, building footprints, economic rules, combat calculations, unit movement rules, and AI behavior.

This task concerns visual representation and asset infrastructure unless a separate implementation requirement explicitly states otherwise.

## 2. Mandatory Inspection Before Asset Production

Before generating or integrating assets, inspect the actual project.

Identify:

1. The rendering engine and version.
2. The logical tile dimensions.
3. The isometric projection.
4. The current world-coordinate system.
5. The camera and zoom behavior.
6. The rendering resolution and device-pixel-ratio handling.
7. The logical scale of characters, buildings, and environmental objects.
8. Existing image assets and their formats.
9. Existing sprite sheets and animation definitions.
10. Current rendering layers and depth sorting.
11. Existing collision and occupancy models.
12. Existing asset-loading, caching, and error-handling mechanisms.
13. The actual game object definitions.
14. Which asset-generation, image-editing, or graphics tools are available in the environment.
15. Whether the project already has a procedural asset-generation or image-processing pipeline.

Inspect actual source code and assets rather than assuming how the application works.

Build an inventory of the existing graphical content.

Classify each asset as:
- Production-ready.
- Reusable with modifications.
- Incomplete.
- Placeholder.
- Missing.
- Technically incompatible.
- Unclear licensing status.

Preserve useful existing assets when they meet the required quality standards.

Do not recreate valid assets unnecessarily.

## 3. Asset Production Strategy

Use the most appropriate available production method for each asset category.

Possible methods include:

- Image generation through an available image-generation tool.
- Hand-authored pixel art.
- Original raster illustrations.
- Procedurally generated terrain textures.
- Programmatically assembled terrain tiles.
- Sprite-sheet generation from individual frames.
- Image-processing tools for transparency, cropping, and normalization.
- Original vector illustrations rasterized to the required output dimensions.
- Properly licensed external assets.

Choose the method based on the visual and technical requirements of the particular asset.

Do not force every asset through the same production method.

For example:

- Characters require consistent anatomy, equipment, scale, and animation.
- Buildings require coherent architecture, reliable ground anchors, and predictable footprints.
- Terrain tiles require exact geometric alignment and seamless transitions.
- Resource icons require readability at small sizes.
- Water and fire effects may benefit from controlled procedural animation.
- Walls and gates require modular construction and reliable connections.

### 3.1. Real Asset Requirement

For every major visual category, produce actual graphical files or improve existing production-ready files.

Do not substitute:
- Text descriptions.
- Unimplemented asset specifications.
- Colored circles for people.
- Rectangles for buildings.
- Emoji for military units.
- Arbitrary polygons for detailed architectural objects.
- A single pre-rendered image for an interactive game world.

Procedural drawing may still be used for appropriate purposes, including selection indicators, simple particles, debugging overlays, and certain terrain details.

Major visual objects must receive proper graphical representations.

### 3.2. Tool Availability

If an image-generation or image-editing tool is available, use it where appropriate.

If a suitable asset already exists in the project, reuse it when possible.

If external assets are needed, verify their licensing and technical suitability before integration.

If a required tool is unavailable, choose the best available alternative and document the resulting limitation.

Never claim to have generated, downloaded, converted, or integrated an asset unless the corresponding operation actually succeeded.

## 4. Establish a Visual Design System

Before producing large numbers of assets, define a consistent visual specification.

The objective is to make every object look like it belongs to the same game.

Create an asset style guide covering the following.

### 4.1. Projection and Viewpoint

Use the existing game's isometric projection and camera orientation.

Maintain a consistent visual relationship between:
- Terrain diamonds.
- Building surfaces.
- Character orientation.
- Ground-level objects.
- Shadows.
- Elevated structures.
- Roads and shorelines.

Do not introduce perspective views, arbitrary camera angles, or inconsistent projection conventions.

The ground-contact position of each object must remain consistent with the world-coordinate system.

### 4.2. Logical Scale

Derive the reference scale from the current project.

Record:
- Tile width and height.
- Typical character height relative to a tile.
- Typical building dimensions.
- Tower height.
- Tree dimensions.
- Resource-object dimensions.
- Ground-anchor conventions.
- Recommended texture resolution.

Define a reference character scale and use it consistently.

Buildings, towers, vegetation, resource deposits, and siege equipment must have believable relative dimensions.

Do not independently choose arbitrary image dimensions for every asset.

The visual bounds of an object may exceed its logical footprint when necessary, but its game logic and occupancy must remain unchanged.

### 4.3. Art Style

Use a coherent classic medieval RTS aesthetic characterized by:

- Readable silhouettes.
- Carefully controlled detail.
- Distinct material textures.
- Hand-crafted visual character.
- Consistent edge treatment.
- Restrained highlights.
- Cohesive shading.
- A coherent palette.
- Strong small-scale readability.

The visual approach may combine pixel-art techniques and detailed raster sprites where appropriate, but the overall result must be visually consistent.

Do not mix unrelated styles such as realistic 3D renders, cartoon emoji, flat corporate icons, and low-resolution pixel characters.

### 4.4. Color Palette

Define controlled palettes for the major materials:

- Grass.
- Dry grass.
- Sand.
- Soil.
- Water.
- Stone.
- Sandstone.
- Wood.
- Metal.
- Roof materials.
- Clothing.
- Skin.
- Armor.
- Vegetation.

Use these palettes to maintain consistency across asset families.

Color variation should communicate material differences and environmental diversity rather than appearing arbitrary.

### 4.5. Lighting

Define one common lighting direction.

Apply consistent highlights and shadows to:
- Buildings.
- Characters.
- Trees.
- Rocks.
- Walls.
- Towers.
- Siege equipment.
- Resource objects.

The direction of highlights and cast shadows must not change randomly between assets.

Ground shadows must be visually compatible with the game's terrain and camera.

### 4.6. Reference Specification

Create a concise visual specification file, such as:

assets/art-direction.md

Document the art style, projection, reference scale, palettes, lighting direction, asset conventions, animation rules, and technical requirements.

This document must describe the actual chosen implementation, not an aspirational design that the produced assets fail to follow.

## 5. Define Exact Asset Specifications

Create an asset manifest that records every required graphical object.

Each entry must identify:

- Stable asset identifier.
- Display name.
- Category.
- Current implementation status.
- Source file path.
- Output file path.
- Visual description.
- Intended in-game use.
- Reference dimensions.
- Logical footprint, where applicable.
- Ground-anchor convention.
- Animation states.
- Supported directions.
- Frame dimensions.
- Transparency requirements.
- Loading or atlas configuration.
- Dependencies.
- Completion status.
- Validation results.

Use a structured format that suits the project, such as JSON or TypeScript definitions.

Example:

{
  "id": "unit.spearman",
  "category": "military_unit",
  "status": "planned",
  "source": null,
  "texture": "assets/units/spearman/spearman.png",
  "animations": {
    "idle": true,
    "walk": true,
    "attack": true,
    "takeDamage": true,
    "death": true
  },
  "directions": "project-defined",
  "anchor": "ground_contact",
  "transparency": "alpha",
  "validation": {
    "fileExists": false,
    "dimensionsValid": false,
    "integrated": false,
    "visualReviewPassed": false
  }
}

The example is illustrative. Adapt the schema to the actual rendering engine and asset pipeline.

Do not create a manifest containing fabricated completion statuses.

A file that exists is not automatically a valid or integrated game asset.

## 6. Terrain Asset Production

Terrain is the foundation of the visual experience and must be treated as a complete asset family.

Produce or improve the terrain assets required by the actual game.

### 6.1. Ground Tile Families

Inspect which terrain types already exist and implement the corresponding visual variants.

Potential categories include:

- Healthy grass.
- Sparse grass.
- Dry grass.
- Bare earth.
- Desert sand.
- Rocky soil.
- Stone ground.
- Cultivated soil.
- Shallow water.
- Deep water.
- Shoreline.
- Other supported terrain types.

Each family must have a consistent base material and a controlled set of visual variations.

Avoid repeating one identical texture across the entire map.

### 6.2. Isometric Tile Geometry

Every terrain tile must conform to the existing projection.

If the game uses diamond-shaped isometric tiles:
- Preserve the exact logical width-to-height relationship.
- Ensure edges meet neighboring tiles.
- Avoid transparent gaps between adjacent tiles.
- Ensure textures do not drift relative to the world grid.
- Maintain consistent texture orientation.

Produce edge and corner variants where necessary.

### 6.3. Terrain Transitions

Create the required transition assets between supported terrain categories.

Include appropriate:
- Land-to-water edges.
- Shoreline corners.
- Grass-to-rock transitions.
- Grass-to-soil transitions.
- Sand-to-rock transitions.
- Other transitions required by the current terrain model.

Do not create a separate arbitrary transition for every pair unless needed.

Use reusable transition rules where appropriate.

Visually inspect transition combinations rather than validating every tile in isolation.

### 6.4. Terrain Variations

Create controlled variants of repetitive ground textures.

Use deterministic selection based on stable map or tile data.

The same world must not receive a different terrain texture arrangement every time it renders.

Avoid excessive contrast between neighboring variants.

### 6.5. Water Assets

Create water textures that communicate depth and movement without disrupting gameplay readability.

Support:
- Base water textures.
- Subtle surface variations.
- Shoreline edges.
- Shoreline corners.
- Optional looping animation frames.
- Suitable highlights.

If animated, water must loop smoothly.

Its animation must not alter terrain accessibility or the logical map.

### 6.6. Terrain Acceptance Criteria

Terrain assets must:
- Align correctly.
- Tile without unintended gaps.
- Use consistent projection.
- Preserve visual readability.
- Avoid distracting repetition.
- Integrate correctly with zoom and camera movement.
- Render without visible seams.

## 7. Environmental Asset Production

Create an original, reusable library of environmental objects.

Produce the types required by the game, such as:

- Trees.
- Tree stumps.
- Bushes.
- Grass clumps.
- Small flowers.
- Rocks.
- Large boulders.
- Stone deposits.
- Iron deposits.
- Crops.
- Fields.
- Paths.
- Debris.
- Shoreline objects.
- Other supported natural objects.

### 7.1. Object Variants

Frequently repeated objects should have multiple visual variants.

For example, tree assets may have variations in:
- Crown shape.
- Height.
- Foliage density.
- Branch arrangement.
- Color.
- Trunk shape.

Rock assets may vary in size, shape, and material appearance.

These variants must belong to the same art style.

Avoid simply applying arbitrary color changes to otherwise identical objects.

### 7.2. Ground Anchors

Every environmental sprite must define a reliable ground-contact anchor.

Trees and large rocks should be positioned based on their ground-contact point rather than the upper-left corner of their images.

Their visual dimensions must not incorrectly determine logical occupancy.

### 7.3. Gameplay Compatibility

Separate visual appearance from gameplay collision and occupancy.

Decorative vegetation should not block movement unless the existing game rules designate it as an obstacle.

A large rock used as a blocking object must remain logically blocked even if its sprite contains transparent pixels.

Environmental assets must not silently modify the map's gameplay properties.

## 8. Human Character Production

Replace abstract character placeholders with actual human sprites.

Create a consistent character family suitable for an isometric medieval settlement.

### 8.1. Common Character Design

Define common visual conventions for all characters.

Characters should have:
- Recognizable anatomy.
- Consistent proportions.
- A readable head and torso.
- Clearly defined arms and legs.
- Suitable clothing.
- Distinctive silhouettes.
- Ground-contact anchors.
- Consistent shading.
- Appropriate small-scale detail.

The design must remain recognizable at the game's normal gameplay zoom.

Avoid excessively thin limbs, disconnected body parts, unrealistic proportions, and details that become visual noise.

### 8.2. Civilian Roles

Inspect the current game's actual civilian and worker definitions.

Create suitable visual representations for supported roles, such as:
- Ordinary villagers.
- Farmers.
- Woodcutters.
- Miners.
- Builders.
- Transport workers.
- Other implemented professions.

Differentiate professions through a combination of:
- Clothing.
- Tools.
- Carried objects.
- Headwear.
- Color accents.
- Work animations.

Do not create gameplay roles that do not exist simply because their graphics would be attractive.

### 8.3. Character Asset Requirements

For every character type, document:

- Character identifier.
- Base sprite dimensions.
- Reference height.
- Ground anchor.
- Animation states.
- Supported directions.
- Frames per animation.
- Frame duration.
- Intended movement speed range.
- Equipment anchors.
- Texture source.
- Integration status.

These values must be based on the actual game scale.

Do not force every character type to use an identical sprite size if their physical dimensions should differ.

### 8.4. Character Variations

Where useful, produce visual variants for repeated civilian characters.

Variations may include:
- Clothing colors.
- Clothing details.
- Hairstyles or headwear.
- Minor body-proportion differences.
- Profession-specific equipment.

Keep these variants coherent.

Avoid excessive randomization that makes characters appear to come from different games.

## 9. Military Unit Asset Production

Military units require more detailed and distinctive silhouettes than ordinary civilians.

First inspect the implemented unit catalog.

Create assets for actual supported unit types.

Potential categories include:
- Light infantry.
- Armored infantry.
- Spearmen.
- Archers.
- Crossbowmen.
- Mounted units.
- Other implemented military classes.

### 9.1. Distinctive Equipment

Where appropriate, military sprites should include:
- Helmets.
- Tunics.
- Chainmail or armor.
- Shields.
- Swords.
- Spears.
- Bows.
- Crossbows.
- Quivers.
- Other supported weapons.

The equipment must be visually attached to the character.

Avoid floating weapons, inconsistent hand positions, and accessories that change position arbitrarily between animation frames.

### 9.2. Unit Readability

Units must be distinguishable from civilians and from other military classes.

Use silhouette, equipment, clothing, and restrained color accents.

Do not depend exclusively on a small color dot or label to distinguish unit types.

The game's normal zoom must preserve enough visual information to understand the type of unit.

### 9.3. Team Identification

If the game supports multiple factions, use compatible team-specific variations where appropriate.

Team colors may be applied to selected clothing details, shields, banners, or other suitable elements.

Do not recolor an entire character so aggressively that material identity and shading are lost.

## 10. Building Asset Production

Create a coherent architectural asset library for the game's supported buildings.

Inspect existing building definitions and their logical footprints.

Produce actual graphical assets for the implemented building catalog.

Potential categories include:
- Houses.
- Granaries.
- Stockpiles.
- Farms.
- Mills.
- Bakeries.
- Workshops.
- Mines.
- Barracks.
- Other economic or military structures.
- Special structures already supported by the game.

### 10.1. Architectural Specification

Each building must have a recognizable architectural identity.

Use appropriate combinations of:
- Stone foundations.
- Timber frames.
- Plaster walls.
- Sandstone.
- Wooden doors.
- Shutters.
- Roof tiles.
- Thatched roofs.
- Chimneys.
- Windows.
- Structural beams.
- Surface wear.

Do not apply every material to every building.

The architectural design must reflect the intended building category and its role.

### 10.2. Isometric Geometry

Buildings must be designed for the existing isometric projection.

Specify:
- Reference dimensions.
- Logical footprint.
- Ground anchor.
- Visual bounds.
- Height convention.
- Roof visibility.
- Front and side surfaces.
- Shadow direction.
- Occlusion requirements.

The visual footprint may be larger than the logical footprint, but the game logic must remain unchanged.

### 10.3. Production Activity

Where the game already exposes production states, create suitable visual variations or effects for active and inactive buildings.

Possible examples:
- Smoke from working production buildings.
- Visible crop activity.
- Animated machinery.
- Construction effects.
- Workers operating near their assigned buildings.

Effects must correspond to actual game state.

Do not imply that a building is producing goods when it is inactive.

### 10.4. Construction and Damage

Where supported by the current game, provide appropriate visual states for:
- Placement preview.
- Construction in progress.
- Completed construction.
- Damage.
- Fire.
- Destruction.

Use the existing game-state representation.

Do not invent additional construction or damage rules as part of asset production.

## 11. Walls, Towers, Gates, and Castle Components

Defensive architecture must be treated as a modular asset system rather than a collection of unrelated illustrations.

### 11.1. Wall Segment Library

Create the wall components required by the current construction rules.

Potential components include:
- Straight horizontal logical segments.
- Straight vertical logical segments.
- Corner segments.
- Junction segments.
- End segments.
- Gate openings.
- Damaged segments.
- Destroyed segments.

The visual names refer to logical directions in the world, not necessarily horizontal and vertical directions on the screen.

Each segment must align with neighboring pieces under the actual isometric projection.

### 11.2. Towers

Create appropriate tower assets based on supported tower definitions.

Tower designs may include:
- Stone bases.
- Vertical wall surfaces.
- Battlements.
- Defensive platforms.
- Openings.
- Roof structures where appropriate.
- Platform or upper-deck details.

Maintain consistent scale and materials across all tower types.

### 11.3. Gates

Provide coherent gate assets compatible with the existing wall system.

Where gates can open and close, the corresponding visual states must reflect the actual logical state.

Gate sprites must not independently change unit collision or movement behavior.

### 11.4. Castle Components

If the game supports larger castle structures, create modular components that can coexist visually:
- Walls.
- Towers.
- Gatehouses.
- Defensive platforms.
- Parapets.
- Other implemented castle elements.

Ensure that overlapping components render correctly.

A wall must not visibly pass through the middle of a tower unless that is the intended construction design.

Do not change logical building occupancy while constructing a visual modular system.

## 12. Resource Asset Production

Create consistent visual representations for resources that appear directly in the world.

Inspect the actual resource model before creating resource sprites.

Potential categories include:
- Trees and wood sources.
- Logs.
- Stone deposits.
- Iron deposits.
- Wheat and crops.
- Sacks and baskets.
- Flour.
- Bread.
- Other supported physical goods.

### 12.1. World Objects Versus Inventory Items

Distinguish clearly between:
1. Natural resource deposits.
2. Harvestable objects.
3. Goods carried by workers.
4. Goods displayed in the world.
5. Inventory-only resources.
6. Interface icons.

Not every inventory resource requires a world-space sprite.

Create world assets only where the game's actual mechanics and presentation require them.

### 12.2. Carried Goods

If workers carry resources in the current game, create suitable sprites and equipment anchors for carried objects.

Examples:
- Logs carried on a shoulder.
- Stone blocks.
- Baskets.
- Sacks.
- Other supported goods.

Objects must remain visually attached during movement and animation.

### 12.3. Resource Icons

Create a consistent family of icons for the interface.

Use:
- Consistent dimensions.
- Consistent lighting.
- Readable silhouettes.
- Distinct materials.
- Appropriate transparency.
- Small-scale legibility.

Avoid emoji, arbitrary text symbols, and inconsistent icon sources.

## 13. Siege Equipment

Inspect the actual siege equipment definitions before producing assets.

For supported machines, create recognizable structures such as:
- Catapults.
- Trebuchets.
- Battering rams.
- Siege towers.
- Other implemented equipment.

Each asset must define:
- Logical footprint.
- Ground anchor.
- Visual bounds.
- Moving parts.
- Supported movement states.
- Attack states.
- Directional rendering.
- Shadow treatment.
- Relevant effects.

Where needed, animate moving components independently.

The visual animation must follow existing gameplay events without changing movement, targeting, firing, damage, or collision calculations.

## 14. Animation Production Pipeline

Animations must be produced and integrated as actual animation assets.

Do not treat a single static image as a complete animation system.

### 14.1. Required Animation Inventory

Based on the actual object catalog, determine which of the following states are required for each asset.

Characters:
- Idle.
- Walk.
- Work.
- Carry.
- Attack.
- Take damage.
- Death.

Buildings:
- Idle.
- Active production.
- Construction.
- Damaged state.
- Burning state.
- Destruction.

Military equipment:
- Idle.
- Movement.
- Attack preparation.
- Attack execution.
- Recovery.

Environment:
- Water animation.
- Fire.
- Smoke.
- Other relevant animated effects.

Not all asset types require every state.

For each asset, implement the states appropriate to its actual role.

### 14.2. Frame Consistency

Animation frames must preserve:
- Character proportions.
- Ground anchor.
- Relative object dimensions.
- Lighting direction.
- Equipment placement.
- Consistent outlines.
- Consistent frame alignment.

Do not allow sprites to jump between positions because frames have inconsistent transparent padding or different reference points.

### 14.3. Directional Animations

Inspect which directions the current game requires.

Implement the required directional states without assuming every object needs eight directions.

Where necessary, define a practical direction mapping supported by the game's movement model.

Do not rotate sprites in ways that create obviously incorrect weapon positions, facial orientations, or architectural geometry.

### 14.4. Animation Metadata

Define animation metadata in a reusable structure.

Example:

{
  "id": "unit.villager.walk",
  "assetId": "unit.villager",
  "source": "assets/units/villager/villager-walk.png",
  "frameWidth": 0,
  "frameHeight": 0,
  "frameCount": 0,
  "frameDurationMs": 0,
  "loop": true,
  "anchor": "ground_contact",
  "status": "planned"
}

The numeric values are deliberately unspecified in this example.

Derive the actual values from the produced files and the game's logical scale.

Do not leave placeholder values in production metadata.

### 14.5. Animation Validation

Validate each animation for:
- Frame consistency.
- Correct sequence.
- Correct direction.
- Stable ground contact.
- Appropriate playback speed.
- Correct state transitions.
- Correct relationship with logical movement.
- Correct behavior when the game is paused.

## 15. Sprite Sheets, Texture Atlases, and File Formats

Choose a file organization and texture strategy appropriate to the existing engine.

Possible approaches include:
- Individual PNG files.
- Sprite sheets.
- Texture atlases.
- Separate animation-frame sequences.

Use the simplest strategy that meets the actual performance and maintainability requirements.

### 15.1. Transparency

Use genuine alpha transparency for objects that must be drawn over the world.

Ensure that:
- Transparent backgrounds are actually transparent.
- No unwanted solid background remains.
- Edges are clean.
- The correct alpha mode is used.
- Semi-transparent edge pixels do not introduce visible halos.

Do not assume that a visually white background is transparent.

### 15.2. Dimensions

Derive asset dimensions from the game's tile scale and display requirements.

Maintain a documented relationship between source resolution and normal in-game display size.

Do not impose an arbitrary universal size across terrain, characters, buildings, and interface icons.

Different asset categories require different dimensions.

### 15.3. Sprite Sheets

If sprite sheets are used:
- Document frame dimensions.
- Keep frames aligned.
- Avoid accidental frame overlap.
- Use a deterministic frame order.
- Generate or maintain corresponding metadata.
- Validate the sheet against the actual animation loader.

Do not include labels, unrelated objects, sample backgrounds, or decorative presentation elements in production sprite sheets.

A sprite sheet must contain only the intended game assets and required transparent padding.

### 15.4. File Organization

Adapt the paths to the existing project's conventions.

A possible organization is:

assets/
  art-direction.md
  manifest.json

  terrain/
    grass/
    soil/
    sand/
    rock/
    water/
    transitions/

  environment/
    trees/
    bushes/
    rocks/
    deposits/
    crops/
    paths/

  characters/
    villagers/
    workers/

  units/
    infantry/
    archers/
    cavalry/
    siege/

  buildings/
    economic/
    military/
    storage/
    special/

  fortress/
    walls/
    towers/
    gates/
    castle-components/

  resources/
    world-objects/
    carried-goods/
    icons/

  effects/
    smoke/
    fire/
    dust/
    impacts/
    destruction/

  ui/
    icons/
    portraits/
    indicators/

  atlases/
    metadata/

Do not create empty directories merely to imitate this structure.

Use only categories that make sense for the real game.

Maintain a single authoritative location for each asset and avoid unnecessary duplicate copies.

## 16. Asset Integration with the Rendering Engine

Creating files is not sufficient.

Connect the new assets to the actual game rendering system.

### 16.1. Asset Registry

Create or extend a central asset registry where appropriate.

The registry must map logical game object identifiers to their visual assets.

For example:
- Building definitions to building textures.
- Unit definitions to unit sprites and animations.
- Terrain types to tile assets.
- Resource definitions to resource sprites and UI icons.

Do not scatter arbitrary asset paths across unrelated rendering functions.

### 16.2. Fallback Behavior

Define safe handling for missing or invalid assets.

During development, missing assets should produce a visible and informative error.

A placeholder may be used temporarily to keep development running, but it must not silently pass production-quality validation.

### 16.3. Loading and Caching

Use the existing engine's resource-loading mechanisms where appropriate.

Avoid repeatedly loading identical textures.

Handle:
- Loading failures.
- Duplicate asset requests.
- Texture reuse.
- Cache lifecycle.
- Asset disposal where needed.
- Large texture memory consumption.

### 16.4. Logical State Integration

Rendering must read the actual logical state of the game.

For example:
- Unit position determines sprite placement.
- Unit movement state determines walking animation.
- Unit combat state determines attack animation.
- Building health or state determines its visual condition.
- Gate state determines its visual configuration.
- Terrain type determines the selected tile assets.

Do not duplicate game rules within the asset pipeline.

Do not allow visual animation to change gameplay state.

## 17. Depth Sorting, Anchors, and Occlusion

Every world-space asset must provide the information required for correct rendering.

Depending on the object, this may include:
- Ground anchor.
- Visual bounds.
- Logical footprint.
- Depth anchor.
- Height layer.
- Occlusion configuration.
- Render layer.

Do not sort objects solely by their image's top-left coordinate.

Large buildings, walls, towers, trees, and siege equipment may need specialized depth handling.

Inspect the existing renderer and implement the smallest reliable improvement that solves the actual ordering problems.

Validate at least these situations:
- A villager walking behind a building.
- A villager walking in front of a building.
- A soldier passing around a tower.
- A unit moving behind a tree.
- Multiple units crossing paths.
- Wall segments connecting to towers.
- Buildings with overlapping visual bounds.

The final result must not exhibit obvious depth flickering or incorrect foreground/background ordering.

## 18. Automated Asset Validation

Implement a repeatable asset-validation procedure.

Where practical, validation should automatically check:

- Required asset files exist.
- Asset identifiers are unique.
- Manifest paths resolve correctly.
- Image dimensions are valid.
- File formats are supported.
- Sprite-sheet metadata matches actual image dimensions.
- Animation frames are within valid bounds.
- Required animation states are present.
- Transparency exists where required.
- Atlas references are valid.
- No manifest entries point to missing files.
- No production asset relies on an unresolved placeholder.

Do not treat automated validation as a replacement for visual inspection.

An image may pass all technical checks and still look wrong.

### 18.1. Visual Inspection

Inspect the actual assets using suitable image-viewing tools.

For representative assets, check:
- Silhouette.
- Perspective.
- Scale.
- Material appearance.
- Edge quality.
- Transparency.
- Anchor placement.
- Lighting.
- Style consistency.

Where assets are generated in batches, inspect representative samples from every meaningful category and direction.

Inspect every final animation sufficiently to detect obvious frame inconsistencies.

### 18.2. Composition Tests

Create test scenes or test maps containing representative objects.

Examples:
- Several terrain types connected together.
- A group of civilian characters.
- A mixed military formation.
- Multiple adjacent buildings.
- Connected walls and towers.
- Resource deposits beside workers.
- A tree in front of and behind a moving unit.
- Several buildings overlapping the same visual area.
- Moving units near water and terrain boundaries.

Use the test scenes to detect asset and rendering issues before accepting the assets as complete.

## 19. Actual Game Visual Validation

Validate the upgraded implementation in the running application.

Use the available browser automation, screenshots, test scenes, and rendering tools.

Capture the original state and the upgraded state at comparable viewport dimensions and camera zoom levels.

Inspect the difference in:
- Terrain quality.
- Environmental detail.
- Character readability.
- Military-unit differentiation.
- Architectural quality.
- Wall and tower appearance.
- Resource representation.
- Animation.
- Depth ordering.
- Visual consistency.
- Overall scene composition.

Verify that all major categories are represented by their intended production assets.

Do not accept an improvement based solely on a single attractive screenshot if the underlying application remains unchanged or noninteractive.

The actual game must continue to respond correctly to existing player interactions.

## 20. Asset Production Prioritization

Prioritize assets according to their visibility, frequency of use, and importance to gameplay.

Use the following sequence as an initial guideline.

### Priority 1: Foundational Assets

- Terrain tile families.
- Terrain transitions.
- Water and shorelines.
- Trees and major environmental objects.
- Civilian character sprites.
- Basic military unit sprites.
- Existing castle and primary building assets.

These assets establish the visual baseline and should be completed first.

### Priority 2: Gameplay-Critical Asset Families

- Remaining supported building categories.
- Wall segments.
- Towers.
- Gates.
- Resource deposits.
- Construction previews.
- Selection and health indicators.

### Priority 3: Animation

- Character movement.
- Worker activity.
- Military movement.
- Combat.
- Construction and destruction.
- Relevant environmental animation.

### Priority 4: Expanded Visual Detail

- Additional character variants.
- Additional terrain variants.
- Building-state variations.
- Siege equipment.
- Improved effects.
- Additional resource and interface assets.

This priority order must not be interpreted as permission to leave a required major asset category permanently unimplemented.

If development constraints prevent completing the full asset inventory, report precisely what remains incomplete.

## 21. Asset Completion Criteria

An asset may be marked production-ready only when the applicable conditions are satisfied.

### Technical Completion

- The file exists.
- The image format is supported.
- Dimensions are valid.
- Transparency is correct.
- Metadata is valid.
- The asset is registered.
- The asset loads successfully.
- The asset is displayed by the actual game.
- No unresolved placeholder remains.

### Visual Completion

- The asset matches the art direction.
- The silhouette is readable.
- Materials are visually distinguishable.
- Lighting is consistent.
- Scale is correct.
- The anchor is correct.
- The asset is visually compatible with related assets.
- The asset remains readable at normal gameplay zoom.

### Animation Completion

Where applicable:
- Required frames exist.
- Frame order is correct.
- Directional states are valid.
- Animations loop or terminate correctly.
- The ground anchor remains stable.
- Animation matches the logical game state.

### Gameplay Compatibility

- Existing world coordinates remain valid.
- Existing logical footprints remain valid.
- Collision behavior is unchanged.
- Unit movement is unchanged.
- Economic calculations are unchanged.
- Combat calculations are unchanged.
- Save/load behavior remains functional.
- Existing input interactions continue working.

## 22. Required Implementation Workflow

Execute this workflow in order, adapting it to the actual project.

Phase 1: Inspect the existing renderer, asset library, and gameplay object definitions.

Phase 2: Build a complete asset inventory and identify placeholders and missing categories.

Phase 3: Measure the existing tile scale, logical object scale, projection, and rendering conventions.

Phase 4: Define the art direction and technical asset standards.

Phase 5: Create the asset manifest and establish the actual file organization.

Phase 6: Produce or improve foundational terrain and environmental assets.

Phase 7: Produce or improve civilian characters and their required animations.

Phase 8: Produce or improve military units, equipment, and animations.

Phase 9: Produce or improve buildings, castle components, walls, towers, and gates.

Phase 10: Produce resource objects, carried goods, icons, and supported siege equipment.

Phase 11: Integrate the assets into the existing engine and registry.

Phase 12: Implement or correct animation playback, anchors, depth ordering, and occlusion.

Phase 13: Build automated asset validation.

Phase 14: Inspect representative assets and animation sequences.

Phase 15: Run visual and gameplay compatibility tests.

Phase 16: Capture and inspect the actual running game.

Phase 17: Correct the discovered issues.

Phase 18: Update the asset manifest and report the verified results.

Do not stop after writing specifications or creating directories.

Complete actual implementation work incrementally.

Keep the game runnable throughout development whenever practical.

## 23. Completion Report

At the end, report:

1. The rendering architecture discovered.
2. The original asset categories inspected.
3. The actual assets created.
4. The existing assets reused or modified.
5. The assets still missing.
6. The file paths of the produced assets.
7. The animation states actually implemented.
8. The asset registry and loading changes.
9. The depth-sorting or anchor improvements.
10. The validation tools and checks executed.
11. The visual tests performed.
12. The compatibility tests performed.
13. Any performance changes measured.
14. Known visual limitations.
15. Any licensing uncertainties.
16. The recommended next implementation steps.

Distinguish clearly between:
- Planned assets.
- Generated assets.
- Integrated assets.
- Validated assets.
- Production-ready assets.

Do not claim that a category is complete when only a few representative sprites exist.

Do not claim that an asset is integrated merely because its file is present.

Do not claim that the final visual result has been validated without inspecting the actual running game.

## Final Objective

Transform the current primitive isometric graphics into a visually coherent, detailed, animated, and maintainable classic RTS presentation.

The result must contain actual, reusable graphical assets for people, military units, buildings, fortifications, terrain, environmental objects, and supported resources.

These assets must follow a unified art direction, integrate with the existing rendering architecture, preserve game mechanics, and be validated in the running application.

Asset production, asset integration, animation, and visual validation are all mandatory parts of this task.