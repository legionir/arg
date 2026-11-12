// Asset sets for the DesignArena runner. Each set: a fixed STYLE block (word for word) + per-item subject.
//   kind "sprite": single object on flat magenta (scored for key-out fit);  kind "art": full-bleed picture (scored for detail/shape).
import { BUILDINGS, STYLE as BSTYLE, promptFor as bPrompt, expectedAspect } from "./buildings.mjs";

// ---------- units: static character/machine concepts (cards, panels; in-map sheets stay procedural) ----------
const USTYLE = [
  "Hand-painted stylized game unit concept for a Persian desert fantasy strategy game, polished mobile game art.",
  "Soft gouache shading with gentle gradients and thin dark-brown outlines, same look as the matching isometric building set.",
  "Full body, single figure standing, three-quarter view from the front-right, camera slightly above, weapon clearly visible.",
  "Warm sunlight from the upper left, soft shadow on the right.",
  "Limited palette: sun-baked ochre and sand cloth, terracotta, dark brown leather and timber, turquoise accents, small gold details, steel grey metal.",
  "The subject is fully inside the frame with generous margin, centered.",
  "Flat solid pure magenta #FF00FF background, no ground plane, no cast shadow, no text, no other characters.",
].join(" ");
const UNITS = [
  ["soldier", "a basic infantry soldier with a round shield and short sword, quilted tunic and a simple pointed steel cap"],
  ["bowman", "a lightly armoured bowman with a recurve bow and a quiver, leather vest and head wrap"],
  ["spearman", "a spearman with a long spear and a round wooden shield, padded coat and conical helmet"],
  ["slave", "an irregular fighter in ragged clothes with a wooden club and a rag headband"],
  ["maceman", "a heavy maceman with a flanged mace, chainmail and a round shield"],
  ["knight", "a cataphract, a fully armoured heavy horseman on an armoured horse holding a lance"],
  ["crusader", "a guard swordsman in lamellar armour with a great sword and a tall plumed helmet"],
  ["crossbowman", "a javelineer skirmisher holding several javelins and a small shield, light armour"],
  ["pikeman", "an armoured pikeman with a very long pike, scale armour and a visored helmet"],
  ["arabian", "a desert swordsman in flowing robes with a curved scimitar and a turban"],
  ["arabianBow", "a desert bowman in robes and a turban with a short composite bow"],
  ["slinger", "a slinger swinging a leather sling, simple tunic and head wrap"],
  ["assassin", "a nightblade assassin in dark hooded clothing with twin daggers and a face mask"],
  ["firethrower", "a fire thrower carrying a clay pot of burning oil and a torch, leather apron"],
  ["horseArcher", "a horse archer on a swift horse drawing a composite bow"],
  ["ram", "a wooden battering ram with an iron-capped log under a roofed frame on wheels"],
  ["catapult", "a wooden catapult siege engine with a throwing arm and a stone in the bucket"],
  ["trebuchet", "a heavy counterweight trebuchet, a large timber frame siege engine"],
  ["ballista", "a bolt thrower ballista on a wheeled wooden stand with a large bolt loaded"],
  ["swordsman", "a veteran swordsman with a straight sword and kite shield, mail shirt"],
  ["archer", "an archer with a longbow and an arrow quiver, hooded leather armour"],
  ["blackmonk", "a warrior dervish in dark robes with a long staff and a prayer-bead chain"],
  ["lord", "a noble commander lord in ornate turquoise and gold armour with a crowned helm and a cape"],
  ["healer", "a healer in white robes with a satchel of herbs and a small clay jar"],
  ["wardog", "a fierce war dog with a spiked collar, standing"],
  ["engineer", "an engineer carrying a hammer and a coil of rope, leather apron and goggles"],
  ["ladderman", "a ladderman carrying a long wooden siege ladder on his shoulder"],
  ["tunneler", "a tunneler sapper with a pickaxe and a lantern, dusty clothes, helmet with a candle"],
].map(([key, subject]) => ({ key, subject }));

// ---------- portraits: 29 lords (index order = game/profile.js PROFILE_LORDS) ----------
const PSTYLE = "Painted fantasy character portrait, head and shoulders, three-quarter view, rich oil-painting look, ornate Persian-inspired clothing and armor with turquoise and gold details, dramatic warm rim light, dark muted teal background, highly detailed face, square composition, no text, no frame, no signature.";
const LORDS = [
  ["artan", "a calm middle-aged border warden with a trimmed grey beard, conical steel helmet with a turquoise gem, blue-and-gold lamellar coat, wise measured expression"],
  ["kahbod", "an elderly cautious strategist lord with a long white beard, heavy dark patterned robes and a small scroll, wary eyes"],
  ["tirazheh", "a young fierce archer commander with a hooded cloak, braided hair, a quiver strap across the chest, leather and bronze armor, confident smirk"],
  ["farrokhan", "a wealthy gilded lord with a gold-embroidered turban, rings, a neat dark beard, rich brocade and a shrewd smile"],
  ["sepehrdad", "an imperial elite warlord with a tall jeweled crown, ornate ceremonial armor, stern commanding gaze"],
  ["hamun", "a weathered desert rider with a face-wrap scarf, sun-burnt skin, light leather and cloth, squinting eyes"],
  ["azarm", "a dark night-raider with kohl-lined eyes, a dark blue hooded cloak and a silver crescent pendant"],
  ["mehrak", "a young man lord with short black hair and a faint beard, simple turquoise tunic and a bronze shoulder guard"],
  ["golnar", "a young woman noble with a flower-patterned headscarf and gold earrings, warm smile, embroidered green coat"],
  ["borzin", "a burly bearded lord with a scarred cheek, iron cap and a thick fur-trimmed cloak"],
  ["niusha", "a woman commander with her hair in a high braid, polished steel shoulder plates and a red sash"],
  ["kiana", "a regal woman with a delicate gold diadem, long dark hair and a deep blue silk robe"],
  ["bardia", "a middle-aged lord with a trimmed mustache, a white turban with a ruby, and a green embroidered vest"],
  ["homa", "an elegant woman with a winged-bird gold headpiece and a turquoise veil, confident eyes"],
  ["delaram", "a gentle woman noble with a soft smile, a pale rose headscarf and pearl jewelry"],
  ["zarvan", "an old wise lord with a bald head and long white mustache, plain brown robe and a bronze pendant"],
  ["parvaneh", "a young woman scholar with round copper spectacles, an ink-stained sleeve and a small cap"],
  ["ramin", "a cheerful young lord with tousled hair, a light cotton tunic and a leather strap across the chest"],
  ["mahyar", "a stern man with a square jaw, a dark beard, a steel helmet with a plume and a red cloak"],
  ["sanam", "a woman with a decorated silver headchain, black braided hair and a royal-blue tunic"],
  ["roham", "a rugged veteran with a grey short beard, a battered iron helmet and a worn leather coat"],
  ["tara", "a young woman with short hair, a bright orange scarf and a light bronze breastplate"],
  ["arvand", "a tall noble man with a long dark ponytail, a falcon on his shoulder and a blue cloak"],
  ["nahal", "a calm woman with a green-leaf pattern headscarf, freckles and a plain linen tunic"],
  ["hirbod", "a priest-like man with a high white cap, a neat white beard and a gold-trimmed white robe"],
  ["yasna", "a woman with a long black braid decorated with turquoise beads and an embroidered vest"],
  ["farnaz", "a proud woman with an elaborate golden crown-turban, bold eyebrows and a crimson cloak"],
  ["shahin", "a lean falcon-eyed young man with a feathered cap and a light leather hunter's jacket"],
  ["dana", "a kind older woman with silver-streaked hair under a patterned shawl and gentle wise eyes"],
].map(([key, subject]) => ({ key, subject }));

// ---------- extras ----------
const EXTRAS = [
  ["menu-backdrop", "A wide cinematic panoramic illustration of a mud-brick desert citadel with a turquoise dome and minarets at dusk, a crescent moon over sand dunes, an oasis with palms in the foreground, painterly, atmospheric haze, wide 16:9 composition, no text."],
  ["share-card", "A promotional key art for a Persian desert citadel-building strategy game: a grand turquoise-domed adobe citadel with banners and towers on a rocky plateau above an oasis, warm golden light, epic painterly illustration, wide landscape composition, no text, no logo."],
  ["app-icon", "A game app icon: a bold simple emblem of a turquoise dome citadel with a golden flag inside a gold ring on a deep navy background, centered, clean vector-like painted style, square, no text."],
  ["loading-art", "A painterly wide illustration of a caravan of camels approaching a distant turquoise-domed citadel across golden desert dunes at sunrise, atmospheric, cinematic, no text."],
].map(([key, prompt]) => ({ key, prompt }));

// aspect = value of the site's ratio menu ("1:1", "3:2", "2:3", "16:9", "9:16"); a per-item aspect overrides the set's.
const WIDE = new Set(["ram", "catapult", "trebuchet", "ballista", "knight", "horseArcher", "wardog"]);
export const SETS = {
  buildings: { dir: "buildings", kind: "sprite", aspect: "1:1", items: BUILDINGS.map((b) => ({ key: b.key, prompt: bPrompt(b), expected: expectedAspect(b), b })) },
  units: { dir: "units", kind: "sprite", aspect: "2:3", items: UNITS.map((u) => ({ key: u.key, prompt: `${u.subject}. ${USTYLE}`, expected: WIDE.has(u.key) ? 1 : 0.55, aspect: WIDE.has(u.key) ? "1:1" : "2:3" })) },
  portraits: { dir: "portraits", kind: "art", aspect: "1:1", items: LORDS.map((l) => ({ key: l.key, prompt: `${l.subject}. ${PSTYLE}`, expected: 1 })) },
  extras: { dir: "extras", kind: "art", aspect: "1:1", items: EXTRAS.map((e) => ({ key: e.key, prompt: e.prompt, expected: e.key === "app-icon" ? 1 : 1.78, aspect: e.key === "app-icon" ? "1:1" : "16:9" })) },
};
export const SET_ORDER = ["buildings", "units", "portraits", "extras"];
