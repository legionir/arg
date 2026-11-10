// برش اول — پیکربندی مرکزی. اعداد نسخه اول‌اند (placeholder) نه قوانین مرجع.
import { t } from "./i18n.js";
import { lazyTable } from "./lazytext.js";
import { BUILDINGS, TUNING } from "./data.js";
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
  // (فاز ۰ بند ۷: تک‌منبع data/tuning.json — train.)
  TRAIN: {
    source: TUNING.train.source,
    queueCap: TUNING.train.queueCap,
  },
  // بازار (0.64.0 — ب-۳ بک‌لاگ): خرید و فروش منابع با واسطه طلا.
  // buy = بهای خرید ۱ واحد (پرداخت طلا)، sell = دریافتی فروش ۱ واحد؛ همیشه
  // sell ≤ buy تا آربیتراژ ناممکن باشد (اسکیما چک می‌کند). طلا خودش ارز است
  // و قابل‌معامله نیست. lot = بسته ثابت هر معامله.
  // (فاز ۰ بند ۷: تک‌منبع data/tuning.json — market.)
  MARKET: {
    source: TUNING.market.source,
    lot: TUNING.market.lot,
    tabs: {
      food: [...TUNING.market.tabs.food],
      resources: [...TUNING.market.tabs.resources],
      military: [...TUNING.market.tabs.military],
    },
    rates: Object.fromEntries(
      Object.entries(TUNING.market.rates).map(([k, r]) => [k, { buy: r.buy, sell: r.sell, ...(r.minStage ? { minStage: r.minStage } : {}) }])
    ),
    // قفل مرحله‌ای (فاز ۱ بند ۸۹): نگاشت مرحله→بنای-milestone + minStage هر نرخ — آینه داده.
    stages: TUNING.market.stages ? { ...TUNING.market.stages } : undefined,
  },
  // حریف AI سولو (0.42.0 — #۱۱ از FEATURES، فاز ۱: پایگاه + یورش‌های متناهی).
  // owner=9 (بیرون اسلات‌های MP ۰..۳)؛ فقط سولو؛ همه guess تا استخراج مرجع.
  AI: {
    owner: 9,
    thinkEvery: 50, // لایه‌ها هر ۵۰ تیک می‌اندیشند (هم‌فاز مالیات/محبوبیت)
    startRes: { wood: 120, food: 120, gold: 60, stone: 40, wheat: 0, flour: 0, hops: 0, beer: 0, iron: 0, swords: 0, bows: 0, meat: 0, cheese: 0, apples: 0, leather: 0 },
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
    // شخصیت حریف (0.56.0 — #۱۸ از FEATURES؛ 0.150.0 ارباب عرب؛ 0.151.0 صلاح‌الدین): ۷ پروفایل سبک بازی به الگوی
    // ارباب‌های مرجع. ضرب‌کننده‌ها روی درجه سختی سوار می‌شوند (متعامد)؛ گرگ
    // دقیقاً خنثی است (همان رفتار 0.42 — سازگاری ذخیره/ری‌پلی قدیمی).
    defaultPersonality: "wolf",
    personalities: {
      wolf:  { get name() { return t("game.personality.wolf.name"); }, get desc() { return t("game.personality.wolf.desc"); },
        buildList: ["woodcutter", "woodcutter", "quarry", "farm", "hut", "barracks", "farm", "tower"],
        raidAtMul: 1, raidSizeAdd: 0, archerP: 0.34, goldMul: 1, workerEveryMul: 1 },
      rat:   { get name() { return t("game.personality.rat.name"); }, get desc() { return t("game.personality.rat.desc"); },
        buildList: ["woodcutter", "farm", "hut", "farm", "quarry", "barracks"], // 0.228.0 — C-BAL-4: سربازخانه آخر تا موش واقعاً یورش ببرد (پیش از این هیچ یورشی نمی‌رفت: aiRaid بی‌سربازخانه برمی‌گردد)
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
      arabLord:  { get name() { return t("game.personality.arabLord.name"); }, get desc() { return t("game.personality.arabLord.desc"); },
        buildList: ["woodcutter", "farm", "hut", "quarry", "barracks", "farm", "tower"],
        raidAtMul: 1, raidSizeAdd: 0, archerP: 0.42, goldMul: 1, workerEveryMul: 1,
        troops: { ranged: "arabianBow", melee: "slave", rangedP: 5 / 12 } },
      saladin:   { get name() { return t("game.personality.saladin.name"); }, get desc() { return t("game.personality.saladin.desc"); },
        buildList: ["woodcutter", "woodcutter", "farm", "quarry", "hut", "barracks", "farm", "tower"],
        raidAtMul: 0.9, raidSizeAdd: 1, archerP: 0.42, goldMul: 1.2, workerEveryMul: 0.9,
        troops: { ranged: "arabianBow", melee: "slinger", rangedP: 1 / 2 } },
    },
    source: "guess",
  },
  RESOURCES: [
    { key: "wood", get name() { return t("game.resource.wood"); } },
    { key: "food", get name() { return t("game.resource.food"); } },
    { key: "meat", get name() { return t("game.resource.meat"); } },
    { key: "cheese", get name() { return t("game.resource.cheese"); } },
    { key: "apples", get name() { return t("game.resource.apples"); } },
    { key: "gold", get name() { return t("game.resource.gold"); } },
    { key: "stone", get name() { return t("game.resource.stone"); } },
    { key: "wheat", get name() { return t("game.resource.wheat"); } },
    { key: "flour", get name() { return t("game.resource.flour"); } },
    { key: "hops", get name() { return t("game.resource.hops"); } },
    { key: "beer", get name() { return t("game.resource.beer"); } },
    { key: "iron", get name() { return t("game.resource.iron"); } },
    { key: "swords", get name() { return t("game.resource.swords"); } },
    { key: "bows", get name() { return t("game.resource.bows"); } },
    { key: "leather", get name() { return t("game.resource.leather"); } },
  ],
  // تنظیمات پیاده‌شده sim (فاز ۰ بند ۷): سند خام data/tuning.json — اسکیما
  // (validateConfig) همین را اعتبارسنجی می‌کند؛ رفتار از همین‌جا می‌آید.
  TUNING,
  // کاتالوگ ساختمان‌ها (فاز ۰ بند ۳): تنها منبع حقیقت `data/buildings.json`
  // است (لودر game/data.js) — توازن را همان‌جا ویرایش کنید، نه اینجا.
  // cost پس از پذیرش در tryPlace کسر می‌شود؛ rules=null یعنی قانون خاص ندارد.
  BUILDINGS,
};
