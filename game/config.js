// برش اول — پیکربندی مرکزی. اعداد نسخه اول‌اند (placeholder) نه قوانین مرجع.
import { t } from "./i18n.js";
import { lazyTable } from "./lazytext.js";
export const CONFIG = {
  GRID_W: 64,
  GRID_H: 64,
  TILE_W: 28,
  TILE_H: 14,
  TICK_HZ: 10,
  MAX_TICKS_PER_FRAME: 5,
  MAP_SEED: 1337,
  SPEEDS: [1, 2, 4],
  // نقشه‌های نام‌دار (0.52.0 — #۱۸ از FEATURES): سیدهای ثابت دست‌چین با
  // نام فارسی؛ هر سه متقارن و قابل‌بازی‌اند (تست t_named_maps). «سفارشی»
  // یعنی سید دستی/تصادفی از ورودی (رفتار قبلی).
  MAPS: [
    { key: "meadow", get name() { return t("game.map.meadow"); }, seed: 1337 },
    { key: "highlands", get name() { return t("game.map.highlands"); }, seed: 424242 },
    { key: "riverford", get name() { return t("game.map.riverford"); }, seed: 987654 },
  ],
  // صف آموزش (0.65.0 — انتخاب ۱-الف کاربر): استخدام بازیکن فوری نیست؛
  // فرمان hire هزینه را اتمی می‌پردازد و سفارش ته صف سربازخانه خودی می‌رود
  // (queueCap سفارش به‌ازای هر سربازخانه). مدت هر نوع = UNITS.*.trainTicks.
  // همه guess تا استخراج مرجع.
  TRAIN: {
    source: "guess",
    queueCap: 5,
  },
  // بازار (0.64.0 — ب-۳ بک‌لاگ): خرید و فروش منابع با واسطه طلا.
  // buy = بهای خرید ۱ واحد (پرداخت طلا)، sell = دریافتی فروش ۱ واحد؛ همیشه
  // sell ≤ buy تا آربیتراژ ناممکن باشد (اسکیما چک می‌کند). طلا خودش ارز است
  // و قابل‌معامله نیست. lot = بسته ثابت هر معامله. همه guess.
  MARKET: {    source: "guess",
    lot: 10,
    rates: {
      wood:   { buy: 5,  sell: 2 },
      stone:  { buy: 8,  sell: 3 },
      food:   { buy: 4,  sell: 2 },
      wheat:  { buy: 3,  sell: 1 },
      flour:  { buy: 5,  sell: 2 },
      hops:   { buy: 4,  sell: 2 },
      beer:   { buy: 8,  sell: 3 },
      iron:   { buy: 10, sell: 4 },
      swords: { buy: 20, sell: 8 },
      bows:   { buy: 20, sell: 8 },
    },
  },
  // حریف AI سولو (0.42.0 — #۱۱ از FEATURES، فاز ۱: پایگاه + یورش‌های متناهی).
  // owner=9 (بیرون اسلات‌های MP ۰..۳)؛ فقط سولو؛ همه guess تا استخراج مرجع.
  AI: {
    owner: 9,
    thinkEvery: 50, // لایه‌ها هر ۵۰ تیک می‌اندیشند (هم‌فاز مالیات/محبوبیت)
    startRes: { wood: 120, food: 120, gold: 60, stone: 40, wheat: 0, flour: 0, hops: 0, beer: 0, iron: 0, swords: 0, bows: 0 },
    startWorkers: 4,
    workerEvery: 800, // هر ۸۰۰ تیک ۱ کارگر تا سقف مسکن (بدون مهاجرت/محبوبیت)
    goldPerWorker: 1, // درآمد طلا/۵۰تیک به‌ازای هر کارگر (مثل مالیات کم، بدون سیاست)
    buildList: ["woodcutter", "woodcutter", "quarry", "farm", "hut", "barracks", "farm", "tower"],
    raids: [{ at: 1500, n: 3 }, { at: 2600, n: 4 }, { at: 3800, n: 5 }], // زمان‌بندی قطعی یورش‌ها
    // درجه سختی (0.50.0 — #۱۸ از FEATURES): مقادیر normal دقیقاً رفتار 0.42 است
    // (سازگاری ذخیره/ری‌پلی قدیمی)؛ فقط ضرب‌کننده/جمع‌کننده روی همان جدول.
    difficulties: {
      easy:   { raidAtMul: 1.5, raidSizeAdd: -1, goldMul: 0.5, workerEveryMul: 2 },
      normal: { raidAtMul: 1, raidSizeAdd: 0, goldMul: 1, workerEveryMul: 1 },
      hard:   { raidAtMul: 0.7, raidSizeAdd: 2, goldMul: 2, workerEveryMul: 0.5 },
    },
    diffNames: lazyTable("game.diff", ["easy", "normal", "hard"]),
    // شخصیت حریف (0.56.0 — #۱۸ از FEATURES): ۵ پروفایل سبک بازی به الگوی
    // ارباب‌های مرجع. ضرب‌کننده‌ها روی درجه سختی سوار می‌شوند (متعامد)؛ گرگ
    // دقیقاً خنثی است (همان رفتار 0.42 — سازگاری ذخیره/ری‌پلی قدیمی).
    defaultPersonality: "wolf",
    personalities: {
      wolf:  { get name() { return t("game.personality.wolf.name"); }, get desc() { return t("game.personality.wolf.desc"); },
        buildList: ["woodcutter", "woodcutter", "quarry", "farm", "hut", "barracks", "farm", "tower"],
        raidAtMul: 1, raidSizeAdd: 0, archerP: 0.34, goldMul: 1, workerEveryMul: 1 },
      rat:   { get name() { return t("game.personality.rat.name"); }, get desc() { return t("game.personality.rat.desc"); },
        buildList: ["woodcutter", "farm", "hut", "farm", "quarry"],
        raidAtMul: 1.4, raidSizeAdd: -1, archerP: 0.2, goldMul: 0.7, workerEveryMul: 1.5 },
      snake: { get name() { return t("game.personality.snake.name"); }, get desc() { return t("game.personality.snake.desc"); },
        buildList: ["woodcutter", "barracks", "farm", "tower", "farm", "quarry"],
        raidAtMul: 0.8, raidSizeAdd: 0, archerP: 0.55, goldMul: 0.9, workerEveryMul: 1 },
      pig:   { get name() { return t("game.personality.pig.name"); }, get desc() { return t("game.personality.pig.desc"); },
        buildList: ["woodcutter", "woodcutter", "farm", "quarry", "hut", "farm", "mill", "barracks"],
        raidAtMul: 1.2, raidSizeAdd: 1, archerP: 0.3, goldMul: 1.5, workerEveryMul: 0.7 },
      lion:  { get name() { return t("game.personality.lion.name"); }, get desc() { return t("game.personality.lion.desc"); },
        buildList: ["woodcutter", "quarry", "farm", "barracks", "hut", "farm", "tower", "armoury", "tower"],
        raidAtMul: 0.8, raidSizeAdd: 2, archerP: 0.4, goldMul: 1.5, workerEveryMul: 0.7 },
    },
    source: "guess",
  },
  RESOURCES: [
    { key: "wood", get name() { return t("game.resource.wood"); } },
    { key: "food", get name() { return t("game.resource.food"); } },
    { key: "gold", get name() { return t("game.resource.gold"); } },
    { key: "stone", get name() { return t("game.resource.stone"); } },
    { key: "wheat", get name() { return t("game.resource.wheat"); } },
    { key: "flour", get name() { return t("game.resource.flour"); } },
    { key: "hops", get name() { return t("game.resource.hops"); } },
    { key: "beer", get name() { return t("game.resource.beer"); } },
    { key: "iron", get name() { return t("game.resource.iron"); } },
    { key: "swords", get name() { return t("game.resource.swords"); } },
    { key: "bows", get name() { return t("game.resource.bows"); } },
  ],
  BUILDINGS: {
    // cost: هزینه ساخت (کسر در tryPlace، فقط پس از پذیرش) — همه guess تا استخراج مرجع.
    // rules: قانون خاص هر ساختمان (null = ندارد، ثبت‌شده)؛ spacingFromSame = کمترین
    // فاصله خالی (چبی‌شف) تا ساختمان هم‌نوع.
    hut:   { key: "hut", get name() { return t("game.building.hut.name"); }, w: 2, h: 2, height: 24, base: "#a8894f", dark: "#6f5a33", top: "#e3c188", hp: 100,
             cost: { wood: 10 },
              buildTime: 30, source: "guess", rules: null }, // قانون خاصی ندارد
    tower: { key: "tower", get name() { return t("game.building.tower.name"); },  w: 3, h: 3, height: 54, base: "#8d99a6", dark: "#59616b", top: "#ccd5dd", hp: 250,
             cost: { wood: 20, gold: 10, stone: 10 },
              buildTime: 100, source: "reference: stronghold-wiki/tower", rules: { spacingFromSame: 2 },
             weapon: { dmg: 6, cd: 10, range: 7, source: "guess" } },
    // سربازخانه (0.29.0؛ 0.34.0 یکتا شد): پیش‌نیاز استخدام سرباز و کماندار
    // (UNITS.*.requires). فقط یکی — مثل ستاد. بدون تولید/کارگر. همه guess.
    barracks: { key: "barracks", get name() { return t("game.building.barracks.name"); }, w: 4, h: 3, height: 30, base: "#8d7a5c", dark: "#57492f", top: "#a03a3a", hp: 200,
             cost: { wood: 30, stone: 10 },
              buildTime: 80, source: "guess", rules: { unique: true } },
    // انبار (0.34.0): هر انبار سالم +۵۰۰ به سقف چوب/سنگ/طلا (capFor در economy.js).
    // انبار غذا (0.34.0): هر انبار غذا سالم +۵۰۰ به سقف غذا/گندم/رازک/آبجو.
    // بدون کارگر/تولید؛ هرچه بیشتر، سقف بیشتر. همه guess.
    stockpile: { key: "stockpile", get name() { return t("game.building.stockpile.name"); }, w: 2, h: 2, height: 14, base: "#8d7a5c", dark: "#57492f", top: "#c2a152", hp: 100,
             cost: { wood: 20 },
              buildTime: 30, source: "guess", rules: null },
    granary: { key: "granary", get name() { return t("game.building.granary.name"); }, w: 2, h: 2, height: 18, base: "#a8894f", dark: "#6f5a33", top: "#9fbf5a", hp: 100,
             cost: { wood: 20 },
              buildTime: 30, source: "guess", rules: null },
    // بازار (0.64.0 — ب-۳ بک‌لاگ): پیش‌نیاز معامله (کلیک خنثی روی بازار خودی =
    // پنل خرید/فروش)؛ بدون کارگر/تولید؛ مثل سربازخانه دروازه معامله است.
    // همه guess تا استخراج مرجع.
    market: { key: "market", get name() { return t("game.building.market.name"); }, w: 2, h: 2, height: 20, base: "#9a8a6a", dark: "#5f5340", top: "#3f7a4e", hp: 120,
             cost: { wood: 20, stone: 10 },
              buildTime: 60, source: "guess", rules: null },
    woodcutter: { key: "woodcutter", get name() { return t("game.building.woodcutter.name"); }, w: 2, h: 2, height: 20, base: "#7a5c3e", dark: "#4e3a26", top: "#a88357", prod: "wood", hp: 80,
             cost: { wood: 15 },
              buildTime: 40, source: "guess", rules: { spacingFromSame: 1 },
              econ: { produces: "wood", amount: 1, everyTicks: 20, workers: 1 } }, // رقابت بر سر منبع
    farm:  { key: "farm", get name() { return t("game.building.farm.name"); }, w: 3, h: 2, height: 8, base: "#6f8f3f", dark: "#4a6128", top: "#9fbf5a", prod: "food", hp: 60,
             cost: { wood: 20 },
              buildTime: 30, source: "guess", rules: null,
              econ: { produces: "food", amount: 1, everyTicks: 15, workers: 1 } }, // قانون خاصی ندارد
    // مزرعه گندم (0.20.0): مثل مزرعه ولی خروجی گندم (ورودی آسیاب). همه guess.
    // آسیاب (0.38.0): حلقه میانی زنجیره نان مرجع (Farm→Mill→Bakery) — ۲ گندم
    // ← ۲ آرد هر ۱۵ تیک تا دقیقاً یک نانوایی را تغذیه کند (≈۲٫۷ مزرعه به ازای
    // هر آسیاب، مثل نسبت قبلی مزرعه→نانوایی). سنگ آسیاب سنگی است پس کمی سنگ
    // هم می‌خواهد. همه guess تا استخراج مرجع.
    wheatfarm: { key: "wheatfarm", get name() { return t("game.building.wheatfarm.name"); }, w: 3, h: 2, height: 8, base: "#7a6534", dark: "#4f4220", top: "#c2a152", prod: "wheat", hp: 60,
             cost: { wood: 20 },
              buildTime: 30, source: "guess", rules: null,
              econ: { produces: "wheat", amount: 1, everyTicks: 20, workers: 1 } },
    // نانوایی (0.20.0): مصرف‌کننده دوم (0.38.0: ورودی‌اش از گندم به آرد رفت) — ۲ آرد می‌خورد و ۱ غذا می‌دهد (هر ۱۵ تیک).
    // کوره سنگی است، پس کمی سنگ هم می‌خواهد. همه guess تا استخراج مرجع.
    mill:  { key: "mill", get name() { return t("game.building.mill.name"); }, w: 2, h: 2, height: 34, base: "#9a8a6a", dark: "#5f5340", top: "#7a4a2e", prod: "flour", hp: 100,
             cost: { wood: 10, stone: 5 },
              buildTime: 60, source: "guess", rules: null,
              econ: { produces: "flour", amount: 2, everyTicks: 15, workers: 1, consumes: { wheat: 2 } } },
    bakery: { key: "bakery", get name() { return t("game.building.bakery.name"); }, w: 2, h: 2, height: 22, base: "#b09a72", dark: "#6e5c40", top: "#7a4a2e", prod: "food", hp: 100,
             cost: { wood: 10, stone: 5 },
              buildTime: 60, source: "guess", rules: null,
              econ: { produces: "food", amount: 1, everyTicks: 15, workers: 1, consumes: { flour: 2 } } },
    // زرادخانه + کمان‌سازی (0.44.0): ۲ آهن ← ۱ شمشیر/کمان هر ۳۰ تیک (کُندتر از
    // نانوایی چون سلاح دیر-بازی است). دو ساختمان جدا چون RATES تک‌خروجی است
    // (الگوی آسیاب/نانوایی 0.38.0). سقف خانواده سلاح را هم خودشان می‌دهند.
    // همه guess تا استخراج مرجع.
    armoury: { key: "armoury", get name() { return t("game.building.armoury.name"); }, w: 2, h: 2, height: 22, base: "#8d7a6a", dark: "#54463a", top: "#6e6e78", prod: "swords", hp: 120,
             cost: { wood: 20, stone: 10 },
              buildTime: 60, source: "guess", rules: null,
              econ: { produces: "swords", amount: 1, everyTicks: 30, workers: 1, consumes: { iron: 2 } } },
    fletcher: { key: "fletcher", get name() { return t("game.building.fletcher.name"); }, w: 2, h: 2, height: 22, base: "#7a5c3e", dark: "#4e3a26", top: "#a88357", prod: "bows", hp: 100,
             cost: { wood: 20, stone: 10 },
              buildTime: 60, source: "guess", rules: null,
              econ: { produces: "bows", amount: 1, everyTicks: 30, workers: 1, consumes: { iron: 2 } } },
    // زنجیره آبجو (0.21.0): مزرعه رازک (ورودی آبجوسازی) + آبجوسازی (۲ رازک ← ۱
    // آبجو) + میخانه (۱ آبجو/۵۰تیک ← +۳ محبوبیت). همه guess تا استخراج مرجع.
    hopsfarm: { key: "hopsfarm", get name() { return t("game.building.hopsfarm.name"); }, w: 3, h: 2, height: 8, base: "#5e7038", dark: "#3c4a22", top: "#7fa050", prod: "hops", hp: 60,
             cost: { wood: 20 },
              buildTime: 30, source: "guess", rules: null,
              econ: { produces: "hops", amount: 1, everyTicks: 20, workers: 1 } },
    brewery: { key: "brewery", get name() { return t("game.building.brewery.name"); }, w: 2, h: 2, height: 22, base: "#8d7a5c", dark: "#57492f", top: "#5e3a26", prod: "beer", hp: 100,
             cost: { wood: 10, stone: 5 },
              buildTime: 60, source: "guess", rules: null,
              econ: { produces: "beer", amount: 1, everyTicks: 20, workers: 1, consumes: { hops: 2 } } },
    inn:     { key: "inn", get name() { return t("game.building.inn.name"); }, w: 2, h: 2, height: 26, base: "#a8894f", dark: "#6f5a33", top: "#4e3a5e", hp: 120,
             cost: { wood: 15 },
              buildTime: 60, source: "guess", rules: null },
    // معدن سنگ (0.18.0): تولیدکننده سنگ با سهمیه ۱ کارگر؛ مثل چوب‌بری قانون
    // فاصله از هم‌نوع دارد (رقابت بر سر منبع). ساده‌سازی ثبت‌شده: روی چمن
    // ساخته می‌شود (نه روی توده سنگ غیرقابل‌ساخت).
    quarry: { key: "quarry", get name() { return t("game.building.quarry.name"); }, w: 2, h: 2, height: 14, base: "#8d949c", dark: "#565c63", top: "#b9c0c8", prod: "stone", hp: 80,
             cost: { wood: 15 },
              buildTime: 40, source: "guess", rules: { spacingFromSame: 1 },
              econ: { produces: "stone", amount: 1, everyTicks: 25, workers: 1 } },
    // معدن آهن (0.44.0 — #۹ از FEATURES، شماره ۲ از NEXT-5): سر زنجیره سلاح
    // مرجع (معدن آهن ← زرادخانه/کمان‌سازی ← شمشیر/کمان ← استخدام). مثل معدن سنگ:
    // روی چمن ساخته می‌شود (نه روی توده سنگ)، فاصله از هم‌نوع، ۱ کارگر.
    // همه guess تا استخراج مرجع.
    ironmine: { key: "ironmine", get name() { return t("game.building.ironmine.name"); }, w: 2, h: 2, height: 14, base: "#7a6f63", dark: "#4a4239", top: "#a89a86", prod: "iron", hp: 80,
             cost: { wood: 15 },
              buildTime: 40, source: "guess", rules: { spacingFromSame: 1 },
              econ: { produces: "iron", amount: 1, everyTicks: 20, workers: 1 } },
    // دیوار سنگی: قطعه ۱×۱ ارزان که فقط چسبیده به بنا/دیوار ساخته می‌شود (قانون anchor)؛
    // اشغالش مسیر A* را می‌بندد و دشمن نزدیک‌ترین بنا (از جمله دیوار) را می‌زند — بدون تغییر نبرد/مسیریابی.
    wall:  { key: "wall", get name() { return t("game.building.wall.name"); }, w: 1, h: 1, height: 14, base: "#939ca6", dark: "#5c636c", top: "#c9d1d9", hp: 60,
             cost: { wood: 2 },
              buildTime: 15, source: "guess", rules: { anchorToAny: true } },
    // دروازه: طاق همیشه‌باز روی خط دیوار — برای واحد خودی گذرگاه است، برای دشمن
    // مسدود (و مثل هر بنا هدف حمله است). بدون حالت باز/بسته: صفر فیلد جدید، صفر تغییر ذخیره.
    gate:  { key: "gate", get name() { return t("game.building.gate.name"); }, w: 1, h: 1, height: 18, base: "#7a6a4f", dark: "#4e4230", top: "#a89468", hp: 80,
             cost: { wood: 4 },
              buildTime: 15, source: "guess", rules: { anchorToAny: true } },
    // ستاد (0.19.0): قلب قلعه، یکتا و ازپیش‌ساخته (رایگان، نزدیک مرکز)؛ در پالت
    // نیست و cost تهی دارد. +۸ مسکن می‌دهد و سقوطش = شکست (پرچم defeated).
    // همه guess تا استخراج مرجع.
    keep:  { key: "keep", get name() { return t("game.building.keep.name"); }, w: 4, h: 4, height: 64, base: "#9aa3ad", dark: "#5f6770", top: "#b04a3a", hp: 600,
             cost: {},
              buildTime: 0, source: "guess", rules: { unique: true } },
  },
};
