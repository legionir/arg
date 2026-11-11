// Unified building-sprite prompts. ONE fixed STYLE block (word for word) + a per-building SUBJECT + footprint/height cues.
// Consistency levers: identical style text, limited palette, fixed camera + light direction, recorded seeds, N candidates
// scored for fit, human review of contact sheets.
export const STYLE = [
  "Hand-painted stylized isometric game building sprite, polished mobile strategy game art.",
  "Soft gouache shading with gentle gradients and thin dark-brown outlines, consistent across the whole set.",
  "Strict isometric 2:1 projection, camera looking down about 30 degrees, building seen from the front-right with two walls visible.",
  "Warm sunlight from the upper left, soft shadow on the right-hand walls.",
  "Limited palette: sun-baked ochre and sand adobe, terracotta, dark brown timber, turquoise glazed tile, small gold accents, muted olive green plants.",
  "Materials: mud-brick, plaster, clay tile, wood.",
  "The building is a single object, fully inside the frame with generous margin, centered.",
  "Flat solid pure magenta #FF00FF background, no ground plane, no cast shadow, no text, no people.",
].join(" ");

const H = (h) => h <= 10 ? "very low profile, nearly flat, mostly at ground level"
  : h <= 20 ? "low single storey" : h <= 34 ? "single storey with a roof feature" : h <= 56 ? "tall" : "very tall, tower-like";

// key, footprint w×h (tiles), height (game px), subject
export const BUILDINGS = [
  ["hut", 2, 2, 24, "a small adobe mud-brick house with a flat roof and low parapet, a wooden door and one arched window"],
  ["tower", 3, 3, 54, "a mud-brick watchtower with a crenellated top platform and arrow slits"],
  ["lookout", 2, 2, 70, "a tall slender mud-brick lookout tower with an open timber observation platform under a small tiled roof"],
  ["perimeter", 2, 2, 46, "a sturdy square mud-brick perimeter tower with battlements and a wooden door at the base"],
  ["defence", 3, 3, 60, "a squat fortified defence turret with thick sloped adobe walls, battlements and an iron-bound door"],
  ["squaretower", 3, 3, 66, "a tall square stone-and-adobe tower with corner buttresses, crenellated parapet and a turquoise banner"],
  ["roundtower", 3, 3, 66, "a tall round stone tower with a conical turquoise-tiled roof and arrow slits"],
  ["barracks", 4, 3, 30, "a long fortified adobe barracks hall with a wide arched entrance, a crossed-swords emblem above the door and a red banner"],
  ["mercpost", 3, 2, 28, "a mercenary lodge with a large blue canopy awning, weapon racks and a gold coin sign"],
  ["market", 2, 2, 20, "an open bazaar market stall with striped teal and cream awnings, wooden crates and sacks of goods"],
  ["woodcutter", 2, 2, 20, "a woodcutter's workshop, a small timber-and-adobe hut with stacked logs, a chopping block with an axe"],
  ["hunterpost", 2, 2, 7, "a hunter's camp with a hide tent, a drying rack with pelts and a small fire pit"],
  ["dairy", 3, 2, 8, "a dairy farm, a low open adobe cowshed with a wooden fence pen, milk churns and a cow"],
  ["tannery", 2, 2, 10, "a tannery, a low adobe workshop with leather hides stretched on wooden frames and tanning vats"],
  ["orchard", 3, 3, 7, "an apple orchard, a small walled garden plot with rows of apple trees full of red fruit"],
  ["farm", 3, 2, 8, "a vegetable farm, tilled soil rows with green crops, a small scarecrow and a low mud fence"],
  ["wheatfarm", 3, 2, 8, "a wheat field with golden wheat rows, a sheaf pile and a low mud fence"],
  ["mill", 2, 2, 34, "a mill, a round adobe tower with large wooden windmill sails and a millstone at the door"],
  ["bakery", 2, 2, 22, "a bakery with a big clay dome oven, a wind-catcher tower on the roof and baskets of bread"],
  ["armoury", 2, 2, 22, "an armoury workshop, a stout adobe building with weapon racks, swords and shields and a forge chimney"],
  ["fletcher", 2, 2, 22, "a fletcher's workshop, a timber-and-adobe hut with bows and bundles of arrows on racks"],
  ["hopsfarm", 3, 2, 8, "a pomegranate orchard, small trees full of red pomegranates inside a low mud wall"],
  ["brewery", 2, 2, 22, "a sharbat house, an adobe shop with large clay jugs, a wind-catcher and a striped awning"],
  ["inn", 2, 2, 26, "a caravanserai, a two-storey adobe inn with an arched gateway, a wind-catcher and hanging lanterns"],
  ["chapel", 2, 2, 22, "a small shrine with a turquoise tiled dome and an arched iwan entrance"],
  ["church", 2, 2, 30, "a temple with a large turquoise-tiled dome, an ornate iwan portal and a slender minaret"],
  ["cathedral", 2, 2, 38, "a grand temple with a huge ribbed blue-turquoise dome, two minarets and a tiled iwan"],
  ["apothecary", 2, 2, 16, "an apothecary herbalist shop with hanging herbs, clay jars and a green awning"],
  ["quarry", 2, 2, 14, "a stone quarry, a cut rock face with stacked stone blocks, a wooden crane and tools"],
  ["oxtether", 2, 2, 6, "an ox pen, a wooden fenced yard with hay, a feeding trough and two oxen"],
  ["ironmine", 2, 2, 14, "an iron mine entrance, a timber-framed tunnel mouth in a rocky mound with a mine cart and ore piles"],
  ["keep", 4, 4, 64, "a mud-brick citadel keep with a central turquoise dome, crenellated walls, corner towers and a flag"],
  ["stonekeep", 4, 4, 72, "a mighty grey-ochre stone citadel with tall corner towers, a deep-blue dome and banners"],
  ["garden", 2, 2, 8, "a small Persian garden with a turquoise pool, cypress trees and flower beds inside a low wall"],
  ["statue", 1, 1, 16, "a stone statue of a king on a carved plinth with a golden crown"],
  ["gallows", 1, 1, 18, "a wooden gallows with a hanging rope on a small wooden platform"],
  ["dungeon", 2, 2, 12, "a low stone dungeon block with an iron-barred door and a barred roof hatch"],
  ["signpost", 1, 1, 20, "a wooden signpost with two arrow-shaped boards"],
  ["well", 1, 1, 14, "a round stone well with a small wooden roof frame and a bucket"],
  ["waterpot", 2, 2, 12, "a water point with large clay water pots on a small stone platform"],
  ["engineerguild", 3, 2, 26, "an engineers' guild hall, an adobe building with gears, a crane and a workbench with blueprints"],
  ["tunnelerguild", 3, 2, 26, "a tunnelers' guild, an adobe building with a mine-shaft entrance, pickaxes and timber supports"],
  ["stable", 3, 2, 26, "a long adobe stable with open stalls, a hay loft and two horses"],
].map(([key, w, h, height, subject]) => ({ key, w, h, height, subject }));

export function promptFor(b) {
  const shape = b.w === b.h ? "square footprint" : `rectangular footprint with ${b.w}:${b.h} proportions`;
  return `${b.subject}. ${shape}, ${H(b.height)}. ${STYLE}`;
}
// width / height of the painted sprite we expect after cut-out (footprint diamond width vs diamond + wall height)
export function expectedAspect(b) {
  const width = (b.w + b.h) * 14, height = (b.w + b.h) * 7 + b.height * 1.1;
  return width / height;
}
export const seedFor = (key, i) => ([...key].reduce((a, c) => (a * 131 + c.charCodeAt(0)) % 99991, 7) * 10 + i);
