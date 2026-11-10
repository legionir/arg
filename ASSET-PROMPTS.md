# پک پرامپت تولید تصاویر ارگ (بدون پرتره پادشاه)

## سبک سراسری (به ابتدای همه پرامپت‌ها اضافه شود)

```
hand-painted Persian-plateau strategy game asset, isometric oblique view,
muted medieval palette (wood #a8894f, wood-light #e3c188, stone #8d99a6,
stone-dark #59616b), clean readable silhouette at small size,
transparent background, no ground shadow, no text, no watermark,
centered composition with padding, game-ready sprite
```

## ابعاد

| گروه | اندازه نمایشی | رزولوشن پیشنهادی تولید | توضیح |
|---|---|---|---|
| کاشی زمین | ۷۲×۳۶ لوزی | ۲۸۸×۱۴۴ | باید تا لبه‌ها بافت داشته باشد تا با همسایه‌ها بند بخورد |
| دکور | ۴۴×۴۰ / ۲۴×۴۰ | ۱۷۶×۱۶۰ / ۹۶×۱۶۰ | تک‌شیء وسط بوم شفاف |
| ساختمان | متناسب با ردپا (۱×۱ تا ۴×۴) | ۵۱۲×۵۱۲ شفاف | موتور کوچک‌نمایی می‌کند |
| شیت یگان | ۱۲۸×۱۶۰ (خانه ۳۲×۳۲) | ۵۱۲×۶۴۰ | جدول ۴ ستون × ۵ ردیف (سطرها: شرق/جنوب/غرب/شمال + مرگ؛ ستون‌ها: ایست/قدم۱/قدم۲/حمله) |
| ماشین محاصره | تک‌اسپرایت | ۲۵۶×۲۵۶ شفاف | تک‌فریم (کد لودر جدا می‌خواهد) |
| آیکون منبع | ۲۴×۲۴ | ۲۵۶×۲۵۶ شفاف | فلت، خوانا در اندازه کوچک |

---

## ۱) ساختمان‌های بدون آرت اختصاصی (۱۱ عدد — اولویت تولید)

### `hunterpost` — کلبه شکارچی (۲×۲)
```
small wooden hunter hut with a slanted plank roof, antler rack mounted above
the door, two hanging pelts on the side wall, a chopping stump with an axe
beside it, hand-painted Persian-plateau strategy game asset, isometric
oblique view, muted medieval palette, transparent background, no text,
game-ready sprite
```

### `dairy` — گاوداری (۳×۲)
```
low cowshed: open-front wooden barn with hay roof, small fenced paddock
attached, one brown-white cow, stacked hay bales and two milk churns by
the door, hand-painted Persian-plateau strategy game asset, isometric
oblique view, muted medieval palette, transparent background, no text,
game-ready sprite
```

### `orchard` — باغ سیب (۳×۳)
```
3x3 grid of small round apple trees with red apple dots, dark soil mounds
at trunks, low wooden picket fence around the plot, Arg-style
hand-painted strategy game asset, isometric oblique view, muted medieval
palette, transparent background, no text, game-ready sprite
```

### `chapel` — نمازخانه (۲×۲)
```
tiny stone prayer chapel, single arched wooden door, one narrow arched
window with warm glow, small stone bell-arch on the roof, mossy slate roof,
hand-painted Persian-plateau strategy game asset, isometric oblique view,
muted medieval palette, transparent background, no text, game-ready sprite
```

### `church` — کلیسا (۲×۲)
```
small stone church with a steep slate nave roof and a short square bell
tower with arched openings and a simple iron cross, arched stained-glass
door window, hand-painted Persian-plateau strategy game asset, isometric
oblique view, muted medieval palette, transparent background, no text,
game-ready sprite
```

### `cathedral` — کلیسای جامع (۲×۲)
```
grand miniature cathedral: twin slim spires with crosses, central rose
window, flying-buttress hints on the sides, tall arched portal, pale stone
walls with slate roofs, hand-painted Persian-plateau strategy game asset,
isometric oblique view, muted medieval palette, transparent background,
no text, game-ready sprite
```

### `garden` — باغ (۲×۲)
```
ornamental garden: trimmed green hedge borders, two flower beds with red
and yellow blooms, gravel cross path, small round shrub in the center,
hand-painted Persian-plateau strategy game asset, isometric oblique view,
muted medieval palette, transparent background, no text, game-ready sprite
```

### `statue` — تندیس (۱×۱)
```
weathered gray stone statue of an armored lord holding a sword point-down,
standing on a square inscribed pedestal, moss patches, Arg-style
hand-painted strategy game asset, isometric oblique view, muted medieval
palette, transparent background, no text, game-ready sprite
```

### `gallows` — چوبه دار (۱×۱)
```
wooden gallows: two posts with crossbeam, hanging rope noose, small
platform with steps, weathered timber, hand-painted Persian-plateau
strategy game asset, isometric oblique view, muted medieval palette,
transparent background, no text, game-ready sprite
```

### `dungeon` — سیاه‌چال (۲×۲)
```
gloomy square stone prison block, flat heavy roof, iron-studded door,
two small barred windows with faint orange glow, chains hanging by the
door, hand-painted Persian-plateau strategy game asset, isometric oblique
view, muted medieval palette, transparent background, no text,
game-ready sprite
```

### `stonekeep` — ستاد سنگی (۴×۴)
```
massive square stone keep, four corner turrets with battlements, central
tall tower with war banner, large arched gate with portcullis, arrow slits,
pale ashlar stone, imposing fortress silhouette, Arg-style
hand-painted strategy game asset, isometric oblique view, muted medieval
palette, transparent background, no text, game-ready sprite
```

---

## ۲) یگان‌های بدون شیت (۱۴ عدد — اولویت تولید)

مشخصات شیت (به انتهای هر پرامپت انسانی اضافه شود):
```
character sprite sheet, 128x160 pixels, 32x32 grid, 4 rows facing
East/South/West/North plus one bottom row death-corpse frame, columns
idle/walk/walk/attack, identical outfit in every frame, transparent
background, no text, game-ready sprite sheet
```

### `slave` — برده
```
exhausted ragged laborer, torn brown tunic, rope belt, barefoot, weary pose
```

### `pikeman` — نیزه‌دار
```
foot soldier with a very long pike held upright, steel skullcap, blue tunic,
leather bracers, round shield on back
```

### `arabianBow` — کماندار عرب
```
arabian bowman with white turban, flowing sand-colored robe, curved composite
bow, quiver of arrows on back
```

### `slinger` — فلاخن‌انداز
```
lightly clothed desert skirmisher, leather sling staff with pouch, headscarf,
bare arms, agile stance
```

### `firethrower` — آتش‌انداز
```
hooded figure in dark oil-stained robe carrying clay naphtha pots and a short
siphon tube, faint ember glow on hands
```

### `healer` — شفا‌دهنده
```
hooded monk in undyed wool robe with red-cross satchel, wooden staff,
calm stance
```

### `wardog` — سگ جنگی
```
single sprite, no sheet: muscular mastiff war dog, dark brindle coat, spiked
iron collar, snarling, isometric oblique view, transparent background
```

### `engineer` — مهندس
```
sturdy worker in leather apron over gray tunic, tool roll and hammer at belt,
rolled plans under arm
```

### `ladderman` — نردبان‌دار
```
soldier in padded gambeson shouldering a long wooden siege ladder, iron helmet
```

### `tunneler` — حفار
```
miner with pickaxe over shoulder, leather helmet with candle lamp, dirt-smudged
tunic, heavy boots
```

### ماشین‌های محاصره — تک‌اسپرایت (کد لودر جدا می‌خواهد)
```
single sprite, no sheet, isometric oblique view, transparent background,
hand-painted Persian-plateau, no text:
```
- `ram`: wooden battering ram with stitched-hide roof canopy on four iron-bound wheels, iron-tipped log slung on chains
- `catapult`: wooden stone-thrower with twisted rope skein, throwing arm with spoon, timber frame on wheels
- `trebuchet`: tall timber trebuchet with long throwing arm, counterweight box, sling rope
- `ballista`: large wooden crossbow engine on stand, iron bolt loaded in groove, winch handles

---

## ۳) کاشی‌های زمین (۱۱ فایل — بازتولید اختیاری هم‌سبک)

```
seamless tileable ground texture filling the whole diamond tile edge to edge,
top-down, hand-painted, muted natural tones, no objects, no text:
```
- `grass-0..5`: six subtle variants of dry meadow grass, slightly different patch density
- `water-0`, `water-1`: calm pond water, two frames differing only by ripple position
- `rock-0..2`: gray-brown rocky barren ground, three density variants

## ۴) دکور نقشه (۴ فایل — بازتولید اختیاری هم‌سبک)

- `boulder-0`, `boulder-1` (۴۴×۴۰): single gray lichen-spotted rock, two shape variants
- `reeds-0`, `reeds-1` (۲۴×۴۰): small cluster of green shoreline reeds with cattails, two variants

## ۵) آیکون‌های منابع (۱۵ عدد، ۲۴×۲۴ فلت)

```
flat game resource icon, bold silhouette readable at 24 pixels, slight
hand-painted shading, transparent background, no text:
```
`wood` bundle of cut logs با طناب؛ `food` قرص نان؛ `gold` مشت سکه طلا؛ `meat` ران گوشت؛
`cheese` گوه پنیر؛ `apples` سیب قرمز با برگ؛ `stone` تخته‌سنگ خاکستری؛ `wheat` بافه گندم؛
`flour` کیسه آرد؛ `hops` مخروط رازک؛ `beer` لیوان آبجو؛ `iron` شمش آهن؛ `swords` دو شمشیر
ضربدری؛ `bows` کمان چوبی؛ `leather` پوست چرم آویزان.
