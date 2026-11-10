// فایل‌های داده و نرخ‌های داده‌محور (0.239.0 — C-CLN-13): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
import { CONFIG } from "../config.js";
import { createState } from "../state.js";
import { spawnUnit, dmgVs, effectiveDmg, unitArmor, soldierValue, UNITS } from "../combat.js";
import {
  ARMOURY_BONUS, ARMOURY_RES, BASE_HOUSING, CAMP_IDLE_MAX, CAPS, CROWD_POP, EAT_THRESHOLD,
  FEAR, FIRE, FOOD_BONUS, FOOD_TYPES, GRANARY_BONUS, GRANARY_RES, HUT_HOUSING, IMM_IN, IMM_OUT,
  INN, KEEP_HOUSING, MIG_PERIOD, POP_CAP, POP_CAP_EXTREME, POP_PERIOD, POP_STEP, RATES, RATIONS,
  RELIGION, STOCK_POP, STORE_BONUS, STORE_RES, TAX, eventBonus, foodVariety,
} from "../economy.js";
import {
  BUILDING_CATEGORIES, RATION_IDS, TAX_IDS, BALANCE, BALANCE_SECTIONS, TUNING, TUNING_VERSION,
  TUNING_SECTIONS, validateBuildingFile, validateUnitFile, validateBalanceFile, validateTuningFile,
} from "../data.js";
import { withLang } from "../i18n.js";
import { must, fresh } from "./fixtures.js";

// --- فایل داده ساختمان‌ها (0.73.0 — فاز ۰ بند ۳) ---
export function dataCases() {
  return [t_data_buildings_file, t_data_buildings_reject, t_data_driven_rates,
    t_data_units_file, t_data_units_reject, t_data_driven_units,
    t_balance_file, t_balance_reject, t_balance_reference_not_wired,
    t_tuning_file, t_tuning_reject, t_data_driven_tuning, t_tuning_vs_reference];
}

// کاتالوگ از data/buildings.json: ۴۴ بنا با فیلدهای نمونه دفترچه.
function t_data_buildings_file() {
  const keys = Object.keys(CONFIG.BUILDINGS);
  must(keys.length === 51, `باید ۵۰ بنا باشد، هست ${keys.length}`);
  must(new Set(keys).size === keys.length, "شناسه‌ها باید یکتا باشند");
  for (const k of keys) {
    const def = CONFIG.BUILDINGS[k];
    must(def.key === k, `key بنا باید «${k}» باشد`);
    must(typeof def.nameKey === "string" && def.nameKey.length > 0, `nameKey ${k}`);
    must(typeof def.name === "string" && def.name.length > 0 && def.name !== def.nameKey,
      `نام ${k} باید از واژگان حل شود (نه خود کلید)`);
    must(BUILDING_CATEGORIES.includes(def.category), `دسته ${k} باید معتبر باشد`);
    must(def.placement && typeof def.placement.terrain === "string", `placement ${k}`);
    must(Array.isArray(def.needs), `needs ${k} باید آرایه باشد`);
  }
  // نام‌ها در هر دو زبان از واژگان حل شوند (getter تنبل لودر).
  withLang("en", () => {
    for (const k of keys) {
      const n = CONFIG.BUILDINGS[k].name;
      must(typeof n === "string" && n.length > 0 && n !== CONFIG.BUILDINGS[k].nameKey, `نام en ${k}`);
    }
  });
  // وفاداری به نمونه دفترچه (شکل/دسته؛ اعداد پیاده‌شده ۱۵ چوب و ۱ کارگرند نه
  // ۲۰/۳ نمایشی مثال — توازن موجود با تست‌های هزینه پین شده و اینجا عوض نمی‌شود).
  const q = CONFIG.BUILDINGS.quarry;
  must(q.category === "industry", "دسته quarry باید industry باشد");
  must(q.cost && q.cost.wood === 15, "هزینه quarry باید ۱۵ چوب (مقدار پیاده‌شده) باشد");
  must(q.econ && q.econ.workers === 1, "کارگر quarry باید ۱ (مقدار پیاده‌شده) باشد");
  // بناهای دینی (فاز ۱ بند ۷۲؛ هزینه مرجع 0.147.0 — §۸.۵): ۳ بنا + نام هر دو زبان.
  for (const k of ["chapel", "church", "cathedral"]) {
    must(CONFIG.BUILDINGS[k] && CONFIG.BUILDINGS[k].category === "town", `دسته ${k} باید town باشد`);
    must(!RATES[k], `${k} نباید نرخ تولید داشته باشد`);
  }
  must(CONFIG.BUILDINGS.chapel.cost.gold === 250, "هزینه chapel باید ۲۵۰ طلا باشد");
  must(CONFIG.BUILDINGS.church.cost.gold === 500, "هزینه church باید ۵۰۰ طلا باشد");
  must(CONFIG.BUILDINGS.cathedral.cost.gold === 1000, "هزینه cathedral باید ۱۰۰۰ طلا باشد");
  must(CONFIG.BUILDINGS.cathedral.buildTime === 180, "زمان cathedral باید ۱۸۰ باشد");
  // هزینه مرجع §۸.۱ (0.169.0 — ردیف‌های 414/415): زرادخانه ۵ چوب + سربازخانه ۱۵ سنگ.
  must(CONFIG.BUILDINGS.armoury.cost && CONFIG.BUILDINGS.armoury.cost.wood === 5 && !("stone" in CONFIG.BUILDINGS.armoury.cost), "هزینه armoury باید ۵ چوب مرجع (دفترچه §۸.۱) باشد");
  must(CONFIG.BUILDINGS.barracks.cost && CONFIG.BUILDINGS.barracks.cost.stone === 15 && !("wood" in CONFIG.BUILDINGS.barracks.cost) && !("gold" in CONFIG.BUILDINGS.barracks.cost), "هزینه barracks باید ۱۵ سنگ مرجع (دفترچه §۸.۱) باشد");
  // هزینه مرجع §8.2 (0.170.0 — ردیف‌های 428 تا 432): ۵ مزرعه.
  // هزینه/کارگر/ورودی مرجع §8.3-§8.6 (0.172.0 — ردیف‌های 440/468): آسیاب ۲۰ چوب + ۳ کارگر؛ کمان‌سازی ۲۰ چوب + ۱۰۰ طلا + ورودی چوب.
  must(CONFIG.BUILDINGS.mill.cost && CONFIG.BUILDINGS.mill.cost.wood === 20 && !("stone" in CONFIG.BUILDINGS.mill.cost) && !("gold" in CONFIG.BUILDINGS.mill.cost), "هزینه mill باید ۲۰ چوب مرجع (دفترچه §8.3) باشد");
  must(CONFIG.BUILDINGS.mill.econ && CONFIG.BUILDINGS.mill.econ.workers === 3, "کارگر mill باید ۳ مرجع (دفترچه §8.3) باشد");
  must(CONFIG.BUILDINGS.fletcher.cost && CONFIG.BUILDINGS.fletcher.cost.wood === 20 && CONFIG.BUILDINGS.fletcher.cost.gold === 100 && !("stone" in CONFIG.BUILDINGS.fletcher.cost), "هزینه fletcher باید ۲۰ چوب + ۱۰۰ طلا مرجع (دفترچه §8.6) باشد");
  must(CONFIG.BUILDINGS.fletcher.econ && CONFIG.BUILDINGS.fletcher.econ.consumes.wood === 2 && !("iron" in CONFIG.BUILDINGS.fletcher.econ.consumes), "ورودی fletcher باید ۲ چوب مرجع (دفترچه §8.6) باشد، نه آهن");
  must(CONFIG.BUILDINGS.hunterpost.cost && CONFIG.BUILDINGS.hunterpost.cost.wood === 5 && !("stone" in CONFIG.BUILDINGS.hunterpost.cost) && !("gold" in CONFIG.BUILDINGS.hunterpost.cost), "هزینه hunterpost باید ۵ چوب مرجع (دفترچه §8.2) باشد");
  must(CONFIG.BUILDINGS.dairy.cost && CONFIG.BUILDINGS.dairy.cost.wood === 10 && !("stone" in CONFIG.BUILDINGS.dairy.cost) && !("gold" in CONFIG.BUILDINGS.dairy.cost), "هزینه dairy باید ۱۰ چوب مرجع (دفترچه §8.2) باشد");
  must(CONFIG.BUILDINGS.orchard.cost && CONFIG.BUILDINGS.orchard.cost.wood === 5 && !("stone" in CONFIG.BUILDINGS.orchard.cost) && !("gold" in CONFIG.BUILDINGS.orchard.cost), "هزینه orchard باید ۵ چوب مرجع (دفترچه §8.2) باشد");
  must(CONFIG.BUILDINGS.wheatfarm.cost && CONFIG.BUILDINGS.wheatfarm.cost.wood === 15 && !("stone" in CONFIG.BUILDINGS.wheatfarm.cost) && !("gold" in CONFIG.BUILDINGS.wheatfarm.cost), "هزینه wheatfarm باید ۱۵ چوب مرجع (دفترچه §8.2) باشد");
  must(CONFIG.BUILDINGS.hopsfarm.cost && CONFIG.BUILDINGS.hopsfarm.cost.wood === 15 && !("stone" in CONFIG.BUILDINGS.hopsfarm.cost) && !("gold" in CONFIG.BUILDINGS.hopsfarm.cost), "هزینه hopsfarm باید ۱۵ چوب مرجع (دفترچه §8.2) باشد");
  // هزینه مرجع §8.3 (0.171.0 — ردیف‌های 436 تا 439): ۴ بنای فرآوری غذا.
  must(CONFIG.BUILDINGS.bakery.cost && CONFIG.BUILDINGS.bakery.cost.wood === 10 && !("stone" in CONFIG.BUILDINGS.bakery.cost) && !("gold" in CONFIG.BUILDINGS.bakery.cost), "هزینه bakery باید ۱۰ چوب مرجع (دفترچه §8.3) باشد");
  must(CONFIG.BUILDINGS.brewery.cost && CONFIG.BUILDINGS.brewery.cost.wood === 10 && !("stone" in CONFIG.BUILDINGS.brewery.cost) && !("gold" in CONFIG.BUILDINGS.brewery.cost), "هزینه brewery باید ۱۰ چوب مرجع (دفترچه §8.3) باشد");
  must(CONFIG.BUILDINGS.granary.cost && CONFIG.BUILDINGS.granary.cost.wood === 5 && !("stone" in CONFIG.BUILDINGS.granary.cost) && !("gold" in CONFIG.BUILDINGS.granary.cost), "هزینه granary باید ۵ چوب مرجع (دفترچه §8.3) باشد");
  must(CONFIG.BUILDINGS.inn.cost && CONFIG.BUILDINGS.inn.cost.wood === 20 && CONFIG.BUILDINGS.inn.cost.gold === 100 && !("stone" in CONFIG.BUILDINGS.inn.cost), "هزینه inn باید ۲۰ چوب + ۱۰۰ طلا مرجع (دفترچه §8.3) باشد");
  // چیزهای خوب (فاز ۱ بند ۸۰): باغ و تندیس town با هزینه طلا و بار ترس.
  for (const k of ["garden", "statue"]) {
    must(CONFIG.BUILDINGS[k] && CONFIG.BUILDINGS[k].category === "town", `دسته ${k} باید town باشد`);
    must(!RATES[k], `${k} نباید نرخ تولید داشته باشد`);
  }
  must(CONFIG.BUILDINGS.garden.cost.gold === 20 && CONFIG.BUILDINGS.statue.cost.gold === 30, "هزینه باید ۲۰/۳۰ طلا (مرجع §۵.۷) باشد");
  must(CONFIG.BUILDINGS.garden.fearGood === 2 && CONFIG.BUILDINGS.statue.fearGood === 1, "بار ترس باید ۲/۱ باشد");
  // چیزهای بد (فاز ۱ بند ۸۱): چوبه دار و سیاه‌چال town با هزینه طلا و بار منفی.
  for (const k of ["gallows", "dungeon"]) {
    must(CONFIG.BUILDINGS[k] && CONFIG.BUILDINGS[k].category === "town", `دسته ${k} باید town باشد`);
    must(!RATES[k], `${k} نباید نرخ تولید داشته باشد`);
  }
  must(CONFIG.BUILDINGS.gallows.cost.gold === 50 && CONFIG.BUILDINGS.dungeon.cost.gold === 40, "هزینه باید ۵۰/۴۰ طلا (مرجع §۵.۷) باشد");
  must(CONFIG.BUILDINGS.gallows.fearBad === 1 && CONFIG.BUILDINGS.dungeon.fearBad === 2, "بار منفی باید ۱/۲ باشد");
  // آغل گاو (فاز ۱ بند ۸۴ — §۶.۲): تأسیسات industry بدون econ/worker (مثل بازار: همیشه staffed).
  const ox = CONFIG.BUILDINGS.oxtether;
  must(ox && ox.category === "industry", "دسته oxtether باید industry باشد");
  must(!RATES.oxtether, "oxtether نباید نرخ تولید داشته باشد");
  must(ox.cost && ox.cost.wood === 5, "هزینه oxtether باید ۵ چوب (دفترچه §۶.۲) باشد");
  must(ox.w === 2 && ox.h === 2 && ox.buildTime === 30, "ابعاد/زمان oxtether باید ۲×۲/۳۰ باشد");
  return { name: "کاتالوگ ساختمان از فایل داده", pass: true, detail: "۱۵ بنا + نمونه quarry + بناهای دینی + چیزهای خوب/بد + آغل + انجمن" };
}

// اعتبارسنج خالص لودر: شناسه تکراری/کاستی/دسته نامعتبر گرفته می‌شوند.
function t_data_buildings_reject() {
  const one = { id: "hut", nameKey: "game.building.hut.name", category: "town",
    cost: { wood: 10 }, rules: null, source: "guess",
    placement: { terrain: "grass" }, needs: [] };
  must(validateBuildingFile({ buildings: [one] }).length === 0, "سند پاک باید بی‌خطا باشد");
  must(validateBuildingFile({ buildings: [one, { ...one }] }).some((e) => e.includes("تکراری")),
    "شناسه تکراری باید گرفته شود");
  must(validateBuildingFile({ buildings: [{ ...one, id: "x", cost: null }] }).length > 0,
    "cost ناقص باید گرفته شود");
  must(validateBuildingFile({ buildings: [{ ...one, id: "y", category: "space" }] }).some((e) => e.includes("category")),
    "دسته نامعتبر باید گرفته شود");
  must(validateBuildingFile(null).length > 0 && validateBuildingFile({}).length > 0,
    "ریشه خراب باید گرفته شود");
  return { name: "اعتبارسنج فایل داده", pass: true, detail: "تکراری/کاستی/دسته/ریشه" };
}

// رفتار از داده می‌آید: RATES آینه بلوک‌های econ کاتالوگ است.
function t_data_driven_rates() {
  for (const [k, def] of Object.entries(CONFIG.BUILDINGS)) {
    if (!def.econ) {
      must(RATES[k] === undefined, `بدون econ نباید نرخ باشد: ${k}`);
      continue;
    }
    const r = RATES[k];
    must(r, `نرخ ${k} باید از کاتالوگ ساخته شده باشد`);
    for (const f of ["produces", "amount", "everyTicks", "workers"]) {
      must(r[f] === def.econ[f], `نرخ ${k}.${f} باید آینه داده باشد`);
    }
  }
  return { name: "نرخ‌ها آینه داده", pass: true, detail: `${Object.keys(RATES).length} نرخ از کاتالوگ` };
}

// کاتالوگ از data/units.json: ۱۷ یگان با فیلدهای نمونه دفترچه (خط ۱۲۱۹ + راهب بند ۷۶ + شفادهنده 0.146.0).
function t_data_units_file() {
  const keys = Object.keys(UNITS);
  must(keys.length === 28, `باید ۲۸ یگان باشد، هست ${keys.length}`);
  must(new Set(keys).size === keys.length, "شناسه‌ها باید یکتا باشند");
  for (const k of keys) {
    const def = UNITS[k];
    must(def.id === k, `id یگان باید «${k}» باشد`);
    must(typeof def.nameKey === "string" && def.nameKey === `game.unit.${k}.name`, `nameKey ${k}`);
    must(typeof def.name === "string" && def.name.length > 0 && def.name !== def.nameKey,
      `نام ${k} باید از واژگان حل شود (نه خود کلید)`);
    must(def.side === "player" || def.side === "enemy", `side ${k} باید معتبر باشد`);
    must(def.building === null || typeof def.building === "string", `building ${k}`);
    must(def.goldCost === null || (Number.isInteger(def.goldCost) && def.goldCost >= 0), `goldCost ${k}`);
    must(Array.isArray(def.equip), `equip ${k} باید آرایه باشد`);
    must(typeof def.speedClass === "string" && def.speedClass.length > 0, `speedClass ${k}`);
    must(typeof def.armorClass === "string" && def.armorClass.length > 0, `armorClass ${k}`);
    must(typeof def.canClimbLadder === "boolean" && typeof def.canDigMoat === "boolean",
      `پرچم‌های نردبان/خندق ${k} باید بولین باشند`);
  }
  // نام‌ها در هر دو زبان از واژگان حل شوند (getter تنبل لودر).
  withLang("en", () => {
    for (const k of keys) {
      const n = UNITS[k].name;
      must(typeof n === "string" && n.length > 0 && n !== UNITS[k].nameKey, `نام en ${k}`);
    }
  });
  // وفاداری به نمونه دفترچه (شکل؛ اعداد پیاده‌شده نه نمایشی مثال — hp زوبین‌دار
  // ۴۵ است نه ۱۵۰۰۰؛ مقیاس HP پیاده‌شده ~۳۰–۱۵۰ است و با تست‌های نبرد پین شده).
  const x = UNITS.crossbowman;
  must(x.building === "barracks", "ساختمان crossbowman باید barracks باشد");
  must(x.goldCost === 30, "هزینه crossbowman باید ۳۰ طلا (مقدار پیاده‌شده) باشد");
  must(JSON.stringify(x.equip) === '["bows"]', "تجهیز crossbowman باید [bows] باشد");
  must(x.hp === 45, "hp crossbowman باید ۴۵ (مقدار پیاده‌شده) باشد");
  must(x.speedClass === "slow", "رده سرعت crossbowman باید slow باشد");
  must(x.armorClass === "leather", "رده زره crossbowman باید leather باشد");
  must(x.canClimbLadder === false && x.canDigMoat === false,
    "نردبان/خندق امروز false است (مکانیک محاصره هنوز نیامده)");
  return { name: "کاتالوگ واحد از فایل داده", pass: true, detail: "۲۸ یگان + نمونه crossbowman" };
}

// اعتبارسنج خالص لودر واحد: شناسه تکراری/side/equip/پرچم/ریشه گرفته می‌شوند.
function t_data_units_reject() {
  const one = { id: "u", nameKey: "game.unit.u.name", side: "player", building: "barracks",
    goldCost: 20, equip: ["bows"], hp: 40, speedClass: "fast", armorClass: "none",
    canClimbLadder: false, canDigMoat: false, source: "guess" };
  must(validateUnitFile({ units: [one] }).length === 0, "سند پاک باید بی‌خطا باشد");
  must(validateUnitFile({ units: [one, { ...one }] }).some((e) => e.includes("تکراری")),
    "شناسه تکراری باید گرفته شود");
  must(validateUnitFile({ units: [{ ...one, id: "x", side: "alien" }] }).some((e) => e.includes("side")),
    "side نامعتبر باید گرفته شود");
  must(validateUnitFile({ units: [{ ...one, id: "y", equip: "bows" }] }).some((e) => e.includes("equip")),
    "equip ناقص باید گرفته شود");
  must(validateUnitFile({ units: [{ ...one, id: "z", canDigMoat: 0 }] }).some((e) => e.includes("canDigMoat")),
    "پرچم نابولین باید گرفته شود");
  must(validateUnitFile(null).length > 0 && validateUnitFile({}).length > 0,
    "ریشه خراب باید گرفته شود");
  return { name: "اعتبارسنج فایل داده واحد", pass: true, detail: "تکراری/side/equip/پرچم/ریشه" };
}

// رفتار از داده می‌آید: زره/خسارت/ضریب محاصره/جان spawn از UNITS خوانده می‌شوند.
function t_data_driven_units() {
  const { state } = fresh();
  for (const [k, def] of Object.entries(UNITS)) {
    must(unitArmor({ type: k }) === (def.armor || 0), `زره ${k} باید از داده بیاید`);
    must(effectiveDmg(def.dmg, 2) === Math.max(1, def.dmg - 2), `خسارت ${k} باید از داده بیاید`);
    must(dmgVs(def, "bld") === def.dmg * (def.bonusVsBld || 1) * (def.weakVsBld || 1), `ضریب ضدساختمان ${k} باید از داده بیاید`);
    must(dmgVs(def, "unit") === (def.halfVsUnit ? def.dmg / 2 : def.dmg), `ضریب ضدیگان ${k} باید از داده بیاید`);
    const u = spawnUnit(state, k, 10.5, 10.5);
    must(u.hp === def.hp && u.maxHp === def.hp, `جان spawn ${k} باید ${def.hp} باشد`);
  }
  return { name: "نبرد آینه داده واحد", pass: true, detail: `${Object.keys(UNITS).length} یگان × زره/خسارت/spawn` };
}
// جدول‌های ۱۸.۲–۱۸.۸ از data/balance.json (فاز ۰ بند ۵): وفاداری به متن چک‌لیست.
function t_balance_file() {
  must(JSON.stringify(BALANCE_SECTIONS) === JSON.stringify(["unitCombat", "fortification", "siege", "economy", "soldierValue", "missionScore", "tacticalAid"]),
    "باید ۷ بخش ۱۸.۲–۱۸.۸ باشد");
  must(validateBalanceFile({ version: 1, tables: BALANCE }).length === 0,
    "فایل لودشده باید از اعتبارسنج خودش بگذرد");
  // وفاداری نقطه‌ای به متن چک‌لیست (۱۸.۲):
  must(BALANCE.unitCombat.hp.lord.hp === 150000, "HP lord باید ۱۵۰٬۰۰۰ باشد");
  must(BALANCE.unitCombat.hp.swordsman.hp === 25000, "HP swordsman باید ۲۵٬۰۰۰ باشد");
  must(BALANCE.unitCombat.hitsToKillArcher.rows.swordsman === 168, "تیر archer تا swordsman باید ۱۶۸ باشد");
  must(BALANCE.unitCombat.hitsToKillCrossbow.rows.swordsman === 12, "تیر xbow تا swordsman باید ۱۲ باشد");
  must(BALANCE.unitCombat.meleeHits.rows.maceman.sword === 30, "ضربه maceman تا sword باید ۳۰ باشد");
  must(BALANCE.unitCombat.speedRanks.ranks.length === 5, "باید ۵ رتبه سرعت باشد");
  must(BALANCE.unitCombat.speedRanks.ranks[0].tilesPerSec === 1.0, "کندترین رتبه باید ۱٫۰ باشد");
  must(BALANCE.unitCombat.weapons.rows.length === 10, "باید ۱۰ سلاح برد/بارگذاری باشد");
  // ۱۸.۳/۱۸.۴:
  const wall = BALANCE.fortification.costs.find((c) => c.id === "highWall");
  must(wall && wall.stone === 1 && wall.tiles === 2, "دیوار بلند باید ۱ سنگ/۲ خانه باشد");
  const sq = BALANCE.fortification.hp.find((c) => c.id === "square");
  must(sq && sq.capacity === 36, "ظرفیت square باید ۳۶ باشد");
  const ram = BALANCE.siege.machines.find((m) => m.id === "ram");
  must(ram && ram.gold === 150 && ram.hp === 150000 && ram.engineers === 4, "رم باید ۱۵۰ طلا/۱۵۰٬۰۰۰ HP/۴ مهندس باشد");
  // ۱۸.۵:
  must(BALANCE.economy.tax.rows.length === 12, "جدول مالیات باید ۱۲ سطر باشد");
  const cruel = BALANCE.economy.tax.rows.find((r) => r.id === "cruellerThanCruel");
  must(cruel && cruel.pop === -24 && cruel.gold === 2.6, "سنگین‌ترین مالیات باید −۲۴/۲٫۶ باشد");
  const wood = BALANCE.economy.market.rows.find((r) => r.good === "wood");
  must(wood && wood.buy === 4 && wood.sell === 2, "قیمت چوب باید ۴/۲ باشد");
  must(BALANCE.economy.wheatChain.rule.includes("8 bread"), "زنجیره گندم باید ۱→۱→۸ باشد");
  // ۱۸.۶–۱۸.۸:
  must(BALANCE.soldierValue.example.unit === "crossbowman", "مثال ارزش سرباز باید crossbowman باشد");
  must(BALANCE.missionScore.weights.alpha === 100 && BALANCE.missionScore.weights.beta === 0.5 && BALANCE.missionScore.weights.gamma === 50,
    "وزن‌های امتیاز باید ۱۰۰/۰٫۵/۵۰ باشند");
  must(BALANCE.tacticalAid.barPoints.value === 7000, "نوار TA باید ۷٬۰۰۰ باشد");
  must(BALANCE.tacticalAid.costs.rockVolley === 5088, "هزینه rock باید ۵٬۰۸۸ باشد");
  return { name: "جدول‌های توازن از فایل داده", pass: true, detail: "۷ بخش + نمونه‌های ۱۸.۲–۱۸.۸" };
}

// اعتبارسنج خالص فایل توازن: ریشه/بخش/وضعیت/منشأ گرفته می‌شوند.
function t_balance_reject() {
  const doc = { version: 1, tables: Object.fromEntries(BALANCE_SECTIONS.map((k) => [k, BALANCE[k]])) };
  must(validateBalanceFile(doc).length === 0, "سند پاک باید بی‌خطا باشد");
  const noSec = { version: 1, tables: { ...doc.tables } };
  delete noSec.tables.siege;
  must(validateBalanceFile(noSec).some((e) => e.includes("siege")), "بخش جاافتاده باید گرفته شود");
  const badStatus = { version: 1, tables: { ...doc.tables, economy: { ...BALANCE.economy, status: "maybe" } } };
  must(validateBalanceFile(badStatus).some((e) => e.includes("status")), "وضعیت نامعتبر باید گرفته شود");
  const badSrc = { version: 1, tables: { ...doc.tables,
    missionScore: { ...BALANCE.missionScore, source: "rumor" } } };
  must(validateBalanceFile(badSrc).some((e) => e.includes("منشأ")), "منشأ نامعتبر باید گرفته شود");
  must(validateBalanceFile(null).length > 0 && validateBalanceFile({ version: 0, tables: {} }).length > 0,
    "ریشه خراب باید گرفته شود");
  return { name: "اعتبارسنج فایل توازن", pass: true, detail: "بخش/وضعیت/منشأ/ریشه" };
}

// صداقت وضعیت: همه جدول‌ها reference اند (سیم‌کشی با فازهای بعدی) — sim امروز
// اعداد پیاده‌شده را نگه می‌دارد؛ این تست واگرایی‌های نمونه را پین می‌کند تا
// سیم‌کشی آینده با آگاهی و به‌روزرسانی همین تست انجام شود (مثل بازپین هش‌ها).
function t_balance_reference_not_wired() {
  for (const k of BALANCE_SECTIONS) {
    must(BALANCE[k].status === "reference", `وضعیت ${k} امروز باید reference باشد`);
  }
  must(UNITS.swordsman.speed !== BALANCE.unitCombat.speedRanks.ranks[0].tilesPerSec,
    "سرعت swordsman پیاده‌شده (۲٫۲) باید با baseline جدول (۱٫۰) فرق داشته باشد");
  must(CONFIG.MARKET.rates.wood.buy !== BALANCE.economy.market.rows.find((r) => r.good === "wood").buy,
    "قیمت خرید چوب زنده (۵) باید با جدول (۴) فرق داشته باشد");
  must(Object.keys(TAX).length === BALANCE.economy.tax.rows.length,
    "سطوح مالیات زنده (۱۲) باید با جدول (۱۲) برابر باشند (بند ۳۴)");
  return { name: "توازن مرجع است، نه سیم‌کشی‌شده", pass: true, detail: "۷ بخش reference + ۲ واگرایی پین‌شده" };
}

// --- تنظیمات پیاده‌شده از data/tuning.json (0.77.0 — فاز ۰ بند ۷) ---
// کاتالوگ از data/tuning.json: ۱۵ بخش با مقادیر پیاده‌شده امروز.
function t_tuning_file() {
  must(JSON.stringify(TUNING_SECTIONS) === JSON.stringify(["tax", "rations", "foodVariety", "inn", "religion", "stockPop", "crowding", "events", "timing", "housing", "caps", "market", "train", "fear", "disease", "fire"]),
    "باید ۱۶ بخش تنظیم باشد");
  must(TUNING_VERSION === 1, "نسخه سند تنظیم باید ۱ باشد");
  must(validateTuningFile({ version: 1, tables: TUNING }).length === 0,
    "سند لودشده باید از اعتبارسنج خودش بگذرد");
  // مالیات (بند ۳۴): ۱۲ سطح جدول مرجع با شناسه‌های ثابت + نمونه‌های پیاده‌شده.
  must(JSON.stringify(TAX_IDS) === JSON.stringify(["generousBribe", "largeBribe", "smallBribe", "none", "low", "average", "high", "mean", "extortionate", "downrightCruel", "evenCrueler", "cruellerThanCruel"]),
    "شناسه‌های مالیات باید ۱۲تای ثابت باشند");
  must(TAX.generousBribe.goldPerWorker === -1 && TAX.generousBribe.pop === 7, "سخاوتمندانه باید −۱/+۷ باشد");
  must(TAX.largeBribe.goldPerWorker === -1 && TAX.largeBribe.pop === 5, "رشوه بزرگ باید −۱/+۵ باشد");
  must(TAX.smallBribe.goldPerWorker === 0 && TAX.smallBribe.pop === 3, "رشوه کوچک باید ۰/+۳ باشد");
  must(TAX.none.pop === 1 && TAX.low.pop === -2, "بدون‌مالیات +۱ و کم −۲ (مرجع §۵.۲)");
  must(TAX.high.goldPerWorker === 1 && TAX.high.pop === -6, "زیاد باید +۱/−۶ باشد");
  must(TAX.cruellerThanCruel.goldPerWorker === 3 && TAX.cruellerThanCruel.pop === -24, "بی‌رحم‌ترین باید +۳/−۲۴ باشد");
  // جیره/میخانه/زمان‌بندی/مسکن/سقف‌ها/بازار/صف (مقادیر پیاده‌شده).
  must(JSON.stringify(RATION_IDS) === JSON.stringify(["none", "half", "normal", "extra", "double"]),
    "شناسه‌های جیره باید ۵تای ثابت باشند");
  must(RATIONS.double.foodNum === 4 && RATIONS.double.pop === 8, "جیره مضاعف باید ۴/۸ باشد");
  must(RATIONS.extra.foodNum === 3 && RATIONS.extra.pop === 4, "جیره اضافه باید ۳/+۴ باشد");
  must(RATIONS.none.pop === -8 && RATIONS.half.pop === -4 && RATIONS.normal.pop === 0, "زیر Full منفی و Full صفر");
  must(JSON.stringify(FOOD_TYPES) === '["food","meat","cheese","apples"]' && JSON.stringify(FOOD_BONUS) === "[0,1,2,3]",
    "تنوع غذا باید ۴ نوع + جدول ۰/۱/۲/۳ باشد");
  must(INN.beerEveryTicks === 50 && INN.fullBonus === 8 && INN.perInn === 30 && INN.keepers === 1 && INN.drunkardsPerInn === 2, "میخانه باید ۵۰تیک/سقف+۸/۳۰نفر/۱مهماندار/۲مست باشد");
  must(RELIGION.chapel === 20 && RELIGION.church === 50 && RELIGION.cathedral === 100 && RELIGION.priests === 1, "مذهب باید ۲۰/۵۰/۱۰۰/۱کشیش باشد");
  must(RELIGION.blessEveryTicks === 1200 && RELIGION.blessDurationTicks === 600, "چرخه تبرک باید ۱۲۰۰/۶۰۰ باشد");
  must(JSON.stringify(RELIGION.steps) === "[25,50,75,100]" && JSON.stringify(RELIGION.stepBonus) === "[2,4,6,8]" &&
    RELIGION.churchBonus === 1 && RELIGION.cathedralBonus === 2, "پاداش مذهب باید پله ۲۵/۵۰/۷۵/۱۰۰→۲/۴/۶/۸ + ثابت ۱/۲ باشد");
  must(EAT_THRESHOLD === 400 && POP_PERIOD === 50 && MIG_PERIOD === 100 && POP_STEP === 2,
    "آستانه/دوره‌ها باید ۴۰۰/۵۰/۱۰۰/۲ باشند");
  must(IMM_IN === 55 && IMM_OUT === 40, "مهاجرت باید ۵۵/۴۰ باشد");
  must(BASE_HOUSING === 4 && HUT_HOUSING === 8 && KEEP_HOUSING === 8, "مسکن باید ۴/۸/۸ باشد");
  must(CAPS.wood === 500 && CAPS.gold === 9999 && CAPS.meat === 500 && CAPS.cheese === 500 && CAPS.apples === 500 && CAPS.leather === 500 && Object.keys(CAPS).length === 15,
    "سقف‌ها باید ۱۵ کلید با گوشت/پنیر/سیب/چرم ۵۰۰ باشند");
  must(JSON.stringify(STORE_RES) === '["wood","stone","gold","leather"]', "فهرست انبار");
  must(JSON.stringify(GRANARY_RES) === '["food","meat","cheese","apples","wheat","flour","hops","beer"]', "فهرست انبار غذا");
  must(JSON.stringify(ARMOURY_RES) === '["iron","swords","bows"]', "فهرست سلاح");
  must(STORE_BONUS === 500 && GRANARY_BONUS === 500 && ARMOURY_BONUS === 500,
    "پله‌های سقف باید ۵۰۰ باشند");
  must(CONFIG.MARKET.lot === 5 && Object.keys(CONFIG.MARKET.rates).length === 11,
    "بازار باید بسته ۵ با ۱۱ نرخ باشد");
  must(JSON.stringify(Object.keys(TUNING.market.tabs)) === '["food","resources","military"]' &&
    TUNING.market.tabs.food.length === 5 && TUNING.market.tabs.resources.length === 4 &&
    TUNING.market.tabs.military.length === 2, "تب‌های بازار باید ۳ تب با ۵/۴/۲ کالا باشند");
  must(CONFIG.MARKET.rates.iron.buy === 10 && CONFIG.MARKET.rates.iron.sell === 4,
    "نرخ آهن باید ۱۰/۴ باشد");
  must(CONFIG.MARKET.rates.leather.buy === 12 && CONFIG.MARKET.rates.leather.sell === 5,
    "نرخ چرم باید ۱۲/۵ باشد (میان آهن و شمشیر)");
  must(CONFIG.TRAIN.queueCap === 5, "سقف صف باید ۵ باشد");
  must(TUNING.disease.radius === 4 && TUNING.disease.ticks === 300 &&
    TUNING.disease.dmgEvery === 6 && TUNING.disease.dmg === 1, "بیماری باید ۴/۳۰۰/۶/۱ از داده باشد");
  must(TUNING.fire.ignite === 0.1 && TUNING.fire.dmgPct === 2 &&
    TUNING.fire.spreadRadius === 2 && TUNING.fire.spreadChance === 0.2, "آتش باید ۰٫۱/۲٪/۲/۰٫۲ از داده باشد");
  must(FEAR.min === -5 && FEAR.max === 5 && FEAR.workPct === 5 && FEAR.attackPct === 5 && FEAR.popPer === 1, "ترس باید ∓۵/کار ۵٪/حمله ۵٪/محبوبیت ۱ از داده باشد");  // نام‌ها در هر دو زبان از واژگان حل شوند (getter تنبل).
  const checkNames = () => {
    for (const id of TAX_IDS) {
      must(TAX[id].nameKey === `game.tax.${id}`, `nameKey مالیات ${id}`);
      must(typeof TAX[id].name === "string" && TAX[id].name.length > 0 && TAX[id].name !== TAX[id].nameKey,
        `نام مالیات ${id} باید حل شود`);
    }
    for (const id of RATION_IDS) {
      must(RATIONS[id].nameKey === `game.ration.${id}`, `nameKey جیره ${id}`);
      must(typeof RATIONS[id].name === "string" && RATIONS[id].name.length > 0 && RATIONS[id].name !== RATIONS[id].nameKey,
        `نام جیره ${id} باید حل شود`);
    }
  };
  checkNames();
  withLang("en", checkNames);
  return { name: "تنظیمات sim از فایل داده", pass: true, detail: "۱۴ بخش + نمونه‌های پیاده‌شده + نام fa/en" };
}

// اعتبارسنج خالص فایل تنظیم: سطح جاافتاده/تکراری/عدد خراب/آربیتراژ گرفته می‌شوند.
function t_tuning_reject() {
  const doc = () => ({ version: 1, tables: JSON.parse(JSON.stringify(TUNING)) });
  must(validateTuningFile(doc()).length === 0, "سند پاک باید بی‌خطا باشد");
  const dup = doc();
  dup.tables.tax.levels[1] = { ...dup.tables.tax.levels[0] };
  must(validateTuningFile(dup).some((e) => e.includes("largeBribe")), "سطح تکراری (حذف largeBribe) باید گرفته شود");
  const short = doc();
  short.tables.rations.levels.pop();
  must(validateTuningFile(short).some((e) => e.includes("۵ سطح")), "جیره ۴سطحی باید گرفته شود");
  const badFood = doc();
  badFood.tables.rations.levels[0].foodNum = -1;
  must(validateTuningFile(badFood).some((e) => e.includes("foodNum")), "foodNum منفی باید گرفته شود");
  const arb = doc();
  arb.tables.market.rates.wood.sell = 99;
  must(validateTuningFile(arb).some((e) => e.includes("آربیتراژ")), "فروش گران‌تر از خرید باید گرفته شود");
  const badStage = doc();
  badStage.tables.market.rates.swords.minStage = "endgame";
  must(validateTuningFile(badStage).some((e) => e.includes("minStage")), "minStage نامعتبر باید گرفته شود");
  const badStages = doc();
  badStages.tables.market.stages = { mid: 42 };
  must(validateTuningFile(badStages).some((e) => e.includes("stages")), "stages خراب باید گرفته شود");
  const empty = doc();
  empty.tables.market.rates = {};
  must(validateTuningFile(empty).some((e) => e.includes("ناتهی")), "نرخ تهی باید گرفته شود");
  const noTab = doc();
  delete noTab.tables.market.tabs.military;
  must(validateTuningFile(noTab).some((e) => e.includes("tabs")), "تب جاافتاده باید گرفته شود");
  const dupTab = doc();
  dupTab.tables.market.tabs.food.push("wood");
  must(validateTuningFile(dupTab).some((e) => e.includes("تکراری")), "کالای دوتبه باید گرفته شود");
  const strayTab = doc();
  strayTab.tables.market.tabs.resources.push("nope");
  must(validateTuningFile(strayTab).some((e) => e.includes("بدون نرخ")), "کالای بدون نرخ باید گرفته شود");
  const badInn = doc();
  badInn.tables.inn.beerEveryTicks = 0;
  must(validateTuningFile(badInn).some((e) => e.includes("beerEveryTicks")), "چرخه صفر میخانه باید گرفته شود");
  const badKeep = doc();
  badKeep.tables.inn.keepers = -1;
  must(validateTuningFile(badKeep).some((e) => e.includes("keepers")), "مهماندار منفی باید گرفته شود");
  const badFull = doc();
  badFull.tables.inn.fullBonus = 0;
  must(validateTuningFile(badFull).some((e) => e.includes("fullBonus")), "سقف صفر پاداش باید گرفته شود");
  const badRel = doc();
  badRel.tables.religion.chapel = 0;
  must(validateTuningFile(badRel).some((e) => e.includes("religion")), "ظرفیت صفر تبرک باید گرفته شود");
  const badPriest = doc();
  badPriest.tables.religion.priests = -1;
  must(validateTuningFile(badPriest).some((e) => e.includes("priests")), "کشیش منفی باید گرفته شود");
  const badBless = doc();
  badBless.tables.religion.blessDurationTicks = 1200;
  must(validateTuningFile(badBless).some((e) => e.includes("blessDurationTicks")), "مدتِ برابر چرخه باید گرفته شود");
  const badSteps = doc();
  badSteps.tables.religion.steps = [25, 50];
  must(validateTuningFile(badSteps).some((e) => e.includes("steps")), "پله ناقص باید گرفته شود");
  const badFlat = doc();
  badFlat.tables.religion.cathedralBonus = -1;
  must(validateTuningFile(badFlat).some((e) => e.includes("cathedralBonus")), "ثابت منفی باید گرفته شود");
  const badPer = doc();
  badPer.tables.inn.perInn = -2;
  must(validateTuningFile(badPer).some((e) => e.includes("perInn")), "پوشش منفی باید گرفته شود");
  const badDrunk = doc();
  badDrunk.tables.inn.drunkardsPerInn = -1;
  must(validateTuningFile(badDrunk).some((e) => e.includes("drunkardsPerInn")), "مست منفی باید گرفته شود");
  const badFearRange = doc();
  badFearRange.tables.fear.min = 0;
  must(validateTuningFile(badFearRange).some((e) => e.includes("fear.min/max")), "بازه نامثبت ترس باید گرفته شود");
  const badFearStep = doc();
  badFearStep.tables.fear.workPct = 0;
  must(validateTuningFile(badFearStep).some((e) => e.includes("fear.workPct")), "گام صفر کار باید گرفته شود");
  const badFearAtk = doc();
  badFearAtk.tables.fear.attackPct = -1;
  must(validateTuningFile(badFearAtk).some((e) => e.includes("fear.attackPct")), "گام منفی حمله باید گرفته شود");
  const badFearPop = doc();
  badFearPop.tables.fear.popPer = "lots";
  must(validateTuningFile(badFearPop).some((e) => e.includes("fear.popPer")), "اثر ناعدد ترس باید گرفته شود");
  const badDisR = doc();
  badDisR.tables.disease.radius = 0;
  must(validateTuningFile(badDisR).some((e) => e.includes("disease.radius")), "شعاع صفر بیماری باید گرفته شود");
  const badDisC = doc();
  badDisC.tables.disease.dmgEvery = -1;
  must(validateTuningFile(badDisC).some((e) => e.includes("disease.dmgEvery")), "آهنگ منفی بیماری باید گرفته شود");
  const badFireI = doc();
  badFireI.tables.fire.ignite = 2;
  must(validateTuningFile(badFireI).some((e) => e.includes("fire.ignite")), "اشتعال بالای ۱ باید گرفته شود");
  const badFireD = doc();
  badFireD.tables.fire.dmgPct = 0;
  must(validateTuningFile(badFireD).some((e) => e.includes("fire.dmgPct")), "سوختن صفر باید گرفته شود");
  const badFireS = doc();
  badFireS.tables.fire.spreadChance = -0.5;
  must(validateTuningFile(badFireS).some((e) => e.includes("fire.spreadChance")), "گسترش منفی باید گرفته شود");
  const badVar = doc();
  badVar.tables.foodVariety.types = [];
  must(validateTuningFile(badVar).some((e) => e.includes("foodVariety")), "فهرست تهی تنوع باید گرفته شود");
  const badBonus = doc();
  badBonus.tables.foodVariety.bonus = [0, 1];
  must(validateTuningFile(badBonus).some((e) => e.includes("foodVariety")), "پاداش ناقص تنوع باید گرفته شود");
  const badTrain = doc();
  badTrain.tables.train.queueCap = 0;
  must(validateTuningFile(badTrain).some((e) => e.includes("queueCap")), "سقف صفر صف باید گرفته شود");
  const badTime = doc();
  badTime.tables.timing.popPeriod = -5;
  must(validateTuningFile(badTime).some((e) => e.includes("timing")), "دوره منفی باید گرفته شود");
  const badCrowd = doc();
  badCrowd.tables.crowding.pop = "lots";
  must(validateTuningFile(badCrowd).some((e) => e.includes("crowding")), "جریمه ناعدد ازدحام باید گرفته شود");
  const badEv = doc();
  badEv.tables.events.fair.durationTicks = 0;
  must(validateTuningFile(badEv).some((e) => e.includes("events")), "مدت صفر رویداد باید گرفته شود");
  const badCaps = doc();
  badCaps.tables.caps.base = {};
  must(validateTuningFile(badCaps).some((e) => e.includes("caps.base")), "سقف تهی باید گرفته شود");
  must(validateTuningFile(null).length > 0 && validateTuningFile({ version: 0, tables: {} }).length > 0,
    "ریشه خراب باید گرفته شود");
  return { name: "اعتبارسنج فایل تنظیم", pass: true, detail: "سطح/عدد/آربیتراژ/ریشه" };
}

// رفتار از داده می‌آید: هر عدد زنده sim آینه سند تنظیم است (بدون لیترال موازی).
function t_data_driven_tuning() {
  for (const lv of TUNING.tax.levels) {
    const live = TAX[lv.id];
    must(live, `سطح مالیات ${lv.id} باید ساخته شده باشد`);
    must(live.goldPerWorker === lv.goldPerWorker && live.pop === lv.pop &&
      live.source === lv.source && live.nameKey === lv.nameKey,
      `مالیات ${lv.id} باید آینه داده باشد`);
  }
  must(Object.keys(TAX).length === TUNING.tax.levels.length, "مالیات نباید سطح اضافه داشته باشد");
  for (const lv of TUNING.rations.levels) {
    const live = RATIONS[lv.id];
    must(live, `سطح جیره ${lv.id} باید ساخته شده باشد`);
    must(live.foodNum === lv.foodNum && live.pop === lv.pop &&
      live.source === lv.source && live.nameKey === lv.nameKey,
      `جیره ${lv.id} باید آینه داده باشد`);
  }
  must(Object.keys(RATIONS).length === TUNING.rations.levels.length, "جیره نباید سطح اضافه داشته باشد");
  must(INN.beerEveryTicks === TUNING.inn.beerEveryTicks && INN.fullBonus === TUNING.inn.fullBonus &&
    INN.perInn === TUNING.inn.perInn && INN.keepers === TUNING.inn.keepers && INN.drunkardsPerInn === TUNING.inn.drunkardsPerInn && INN.source === TUNING.inn.source,
    "میخانه باید آینه داده باشد");
  must(RELIGION.chapel === TUNING.religion.chapel && RELIGION.church === TUNING.religion.church &&
    RELIGION.cathedral === TUNING.religion.cathedral && RELIGION.priests === TUNING.religion.priests &&
    RELIGION.blessEveryTicks === TUNING.religion.blessEveryTicks &&
    RELIGION.blessDurationTicks === TUNING.religion.blessDurationTicks &&
    JSON.stringify(RELIGION.steps) === JSON.stringify(TUNING.religion.steps) &&
    JSON.stringify(RELIGION.stepBonus) === JSON.stringify(TUNING.religion.stepBonus) &&
    RELIGION.churchBonus === TUNING.religion.churchBonus &&
    RELIGION.cathedralBonus === TUNING.religion.cathedralBonus &&
    RELIGION.source === TUNING.religion.source, "مذهب باید آینه داده باشد");
  must(STOCK_POP.famineAt === TUNING.stockPop.famineAt && STOCK_POP.lowBelow === TUNING.stockPop.lowBelow &&
    STOCK_POP.faminePop === TUNING.stockPop.faminePop && STOCK_POP.lowPop === TUNING.stockPop.lowPop &&
    STOCK_POP.fullPop === TUNING.stockPop.fullPop, "اثر موجودی باید آینه داده باشد");
  must(EAT_THRESHOLD === TUNING.timing.eatThreshold && POP_PERIOD === TUNING.timing.popPeriod &&
    MIG_PERIOD === TUNING.timing.migPeriod && POP_STEP === TUNING.timing.popStep &&
    IMM_IN === TUNING.timing.immIn && IMM_OUT === TUNING.timing.immOut, "زمان‌بندی باید آینه داده باشد");
  must(BASE_HOUSING === TUNING.housing.base && HUT_HOUSING === TUNING.housing.hut &&
    KEEP_HOUSING === TUNING.housing.keep, "مسکن باید آینه داده باشد");
  must(CROWD_POP === TUNING.crowding.pop, "جریمه ازدحام باید آینه داده باشد");
  must(eventBonus({ tick: 1600 }) === TUNING.events.fair.pop && eventBonus({ tick: 0 }) === 0, "پاداش رویداد باید آینه داده باشد");
  must(CROWD_POP === -2 && CROWD_POP === TUNING.crowding.pop, "جریمه ازدحام باید −۲ از داده باشد");
  must(TUNING.events.fair.pop === 4 && TUNING.events.lion.pop === -3 && TUNING.events.disease.pop === -3,
    "اثر رویدادها باید +۴/−۳/−۳ از داده باشد");
  must(TUNING.events.fair.everyTicks === 2000 && TUNING.events.fair.offsetTicks === 1500 && TUNING.events.fair.durationTicks === 300, "پنجره نمایشگاه از داده باشد");
  must(JSON.stringify(FOOD_TYPES) === JSON.stringify(TUNING.foodVariety.types) &&
    JSON.stringify(FOOD_BONUS) === JSON.stringify(TUNING.foodVariety.bonus),
    "تنوع غذا باید آینه داده باشد");
  must(JSON.stringify(CAPS) === JSON.stringify(TUNING.caps.base), "سقف‌ها باید آینه داده باشند");
  must(JSON.stringify(STORE_RES) === JSON.stringify(TUNING.caps.store.res) &&
    JSON.stringify(GRANARY_RES) === JSON.stringify(TUNING.caps.granary.res) &&
    JSON.stringify(ARMOURY_RES) === JSON.stringify(TUNING.caps.armoury.res) &&
    STORE_BONUS === TUNING.caps.store.bonus && GRANARY_BONUS === TUNING.caps.granary.bonus &&
    ARMOURY_BONUS === TUNING.caps.armoury.bonus, "گروه‌های سقف باید آینه داده باشند");
  must(CONFIG.MARKET.lot === TUNING.market.lot && CONFIG.MARKET.source === TUNING.market.source,
    "بسته/منشأ بازار باید آینه داده باشد");
  must(JSON.stringify(CONFIG.MARKET.rates) === JSON.stringify(TUNING.market.rates),
    "نرخ‌های بازار باید آینه داده باشند");
  must(JSON.stringify(CONFIG.MARKET.tabs) === JSON.stringify(TUNING.market.tabs),
    "تب‌های بازار باید آینه داده باشند");
  must(CONFIG.TRAIN.queueCap === TUNING.train.queueCap && CONFIG.TRAIN.source === TUNING.train.source,
    "صف آموزش باید آینه داده باشد");
  must(FEAR.min === TUNING.fear.min && FEAR.max === TUNING.fear.max && FEAR.workPct === TUNING.fear.workPct &&
    FEAR.attackPct === TUNING.fear.attackPct && FEAR.popPer === TUNING.fear.popPer && FEAR.source === TUNING.fear.source,
    "ترس باید آینه داده باشد");
  must(FEAR.ptsPerLevel === 4 && FEAR.ptsPerLevel === TUNING.fear.ptsPerLevel, "هر ۴ امتیاز = ۱ سطح (بند ۹۷) از داده باشد");
  must(FIRE.ignite === TUNING.fire.ignite && FIRE.dmgPct === TUNING.fire.dmgPct &&
    FIRE.spreadRadius === TUNING.fire.spreadRadius && FIRE.spreadChance === TUNING.fire.spreadChance &&
    FIRE.source === TUNING.fire.source, "آتش باید آینه داده باشد");
  must(POP_CAP === 2000 && POP_CAP_EXTREME === 10000 && CAMP_IDLE_MAX === 24, "سقف جمعیت/بیکار باید ۲۰۰۰/۱۰٬۰۰۰/۲۴ باشد (بند ۱۰۱/۶۷)");
  must(POP_CAP === TUNING.population.crusader && POP_CAP_EXTREME === TUNING.population.extreme &&
    CAMP_IDLE_MAX === TUNING.population.campIdleMax, "سقف جمعیت/بیکار باید آینه داده باشند");
  must(CONFIG.TUNING === TUNING, "سند خام CONFIG باید همان مرجع لودر باشد");
  return { name: "تنظیم sim آینه داده", pass: true, detail: "مالیات/جیره/میخانه/سقف/بازار/صف" };
}

// ثبت واگرایی‌ها: مقادیر پیاده‌شده (tuning) در برابر مرجع دفترچه (balance) —
// هر ردیف مالک فازی دارد؛ سیم‌کشی هر جدول با بند خودش می‌آید و همین تست را
// به‌روز می‌کند (الگوی بازپین هش‌ها). سه نمونه قبلی در t_balance_reference_not_wired
// می‌مانند (سرعت swordsman، خرید چوب). شمار سطوح مالیات در بند ۳۴ سیم‌کشی شد.
function t_tuning_vs_reference() {
  // [فاز ۱ #20 مالیات — حل شد در 0.90.0]: اثر بدون‌مالیات +۱ = +۱ مرجع.
  must(TAX.none.pop === 1 &&
    BALANCE.economy.tax.rows.find((r) => r.id === "none").pop === 1,
    "[فاز ۱ #20] اثر none باید ۱ برابر مرجع باشد");
  // [فاز ۱ #19 جیره — حل شد در 0.89.0]: ۵ سطح با اثرهای مرجع (−۸/−۴/۰/+۴/+۸).
  must(RATION_IDS.includes("extra") && RATIONS.none.pop === -8 && RATIONS.half.pop === -4 &&
    RATIONS.normal.pop === 0 && RATIONS.extra.pop === 4 && RATIONS.double.pop === 8,
    "[فاز ۱ #19] اثرهای جیره باید عین جدول مرجع باشند");
  // [فاز ۱ #43 مصرف]: مقیاس انباشت (۲) در برابر فرمول ماهانه (۱) — مال بند ۴۳.
  must(RATIONS.normal.foodNum === 2 && BALANCE.economy.rationCoef.full === 1,
    "[فاز ۱ #43] مدل مصرف (۲ در برابر ۱) باید فرق داشته باشد");
  // [فاز ۱ #market — بسته حل شد در 0.108.0]: بسته ۵ = ۵ مرجع (manbook)؛ خرید سنگ ۸ در برابر ۲۰ مال بند قیمت‌گذاری است.
  must(CONFIG.MARKET.lot === 5 && BALANCE.economy.marketRules.lot === 5,
    "[فاز ۱ #market] بسته باید ۵ برابر مرجع باشد");
  must(CONFIG.MARKET.rates.stone.buy === 8 &&
    BALANCE.economy.market.rows.find((r) => r.good === "stone").buy === 20,
    "[فاز ۱ #market] خرید سنگ باید ۸ در برابر ۲۰ باشد");
  // [فاز ۱ #51 — حل شد در 0.109.0]: پاداش پوششی (هر کارا ۳۰ نفر، سقف +۸ مرجع ✅).
  must(INN.perInn === 30 && INN.fullBonus === 8 &&
    BALANCE.economy.inn.perInn === 30,
    "[فاز ۱ #51] پوشش/سقف میخانه باید ۳۰/+۸ برابر مرجع باشد");
  // [فاز ۱ #72 مذهب — حل شد در 0.123.0]: ظرفیت‌های تبرک ۲۰/۵۰/۱۰۰ = ۲۰/۵۰/۱۰۰ مرجع.
  must(RELIGION.chapel === 20 && RELIGION.church === 50 && RELIGION.cathedral === 100 &&
    BALANCE.economy.religion.chapel === 20 && BALANCE.economy.religion.church === 50 &&
    BALANCE.economy.religion.cathedral === 100,
    "[فاز ۱ #72] ظرفیت تبرک باید ۲۰/۵۰/۱۰۰ برابر مرجع باشد");
  // [فاز ۱ #73 فرسایش — حل شد در 0.124.0]: مدت ۶۰۰ تیک = ۶۰ ثانیه مرجع (۱۰Hz)؛ طول چرخه حدس است.
  must(RELIGION.blessDurationTicks === 600 && RELIGION.blessDurationTicks / 10 === BALANCE.economy.religion.blessExpirySec,
    "[فاز ۱ #73] مدت تبرک باید ۶۰۰ تیک = ۶۰ ثانیه مرجع باشد");
  // [فاز ۱ #75 پاداش — حل شد در 0.126.0]: پله‌های پوشش عین جدول §۵.۵؛ ثابت
  // کلیسا/جامع عین متن §۳.۵ (⚠️ جدول ساختمان‌ها هر دو را +۲ می‌گوید — متن ملاک شد).
  for (const [pct, bonus] of [[25, 2], [50, 4], [75, 6], [100, 8]]) {
    const i = RELIGION.steps.indexOf(pct);
    must(i >= 0 && RELIGION.stepBonus[i] === bonus, `[فاز ۱ #75] پله ${pct}٪ باید +${bonus} برابر مرجع باشد`);
  }
  must(RELIGION.churchBonus === 1 && RELIGION.cathedralBonus === 2,
    "[فاز ۱ #75] ثابت کلیسا/جامع باید ۱/۲ برابر متن §۳.۵ باشد");
  // [فاز ۱ #month]: ماه ۵۰تیکی (≈۵ ثانیه) در برابر ۶۰ ثانیه مرجع.
  must(POP_PERIOD === 50 && BALANCE.economy.month.seconds === 60,
    "[فاز ۱ #month] طول ماه باید ۵۰ تیک در برابر ۶۰ ثانیه باشد");
  // [فاز ۱ #granary]: سقف غذای ۵۰۰ در برابر ۲۵۰ مرجع.
  must(CAPS.food === 500 && BALANCE.economy.granaryCap.value === 250,
    "[فاز ۱ #granary] سقف غذا باید ۵۰۰ در برابر ۲۵۰ باشد");
  // [فاز ۱ #bread-chain + #46 — حل شد در 0.103.0]: نانوایی ۱آرد→۸غذا = ۱→۱→۸ مرجع.
  must(CONFIG.BUILDINGS.mill.econ.consumes.wheat === 2 &&
    CONFIG.BUILDINGS.mill.econ.amount === 2 &&
    CONFIG.BUILDINGS.bakery.econ.consumes.flour === 1 &&
    CONFIG.BUILDINGS.bakery.econ.amount === 8 &&
    BALANCE.economy.wheatChain.rule.includes("8 bread"),
    "[فاز ۱ #bread-chain/#46] زنجیره باید ۱→۱→۸ برابر مرجع باشد");
  // [فاز ۱ #starting]: شروع ۱۲۰/۱۲۰/۶۰ در برابر ۱۰۰/۴۰ مرجع (چوب/غذا/طلا).
  const s0 = createState();
  must(s0.resources.wood === 120 && s0.resources.food === 120 && s0.resources.gold === 60 &&
    BALANCE.economy.starting.resources.wood === 100 &&
    BALANCE.economy.starting.resources.food === 40,
    "[فاز ۱ #starting] شروع باید ۱۲۰/۱۲۰/۶۰ در برابر ۱۰۰/۴۰ مرجع باشد");
  // [فاز ۱ #16 مسکن — حل شد در 0.86.0]: کلبه +۸ پیاده‌شده = +۸ دفترچه (§۴).
  must(HUT_HOUSING === 8, "[فاز ۱ #16] مسکن کلبه باید ۸ باشد (برابر دفترچه)");
  // [فاز ۱ #34 مقیاس مالیات — حل شد در 0.104.0]: ۱۲ سطح با اثرهای مرجع؛ طلا
  // نزدیک‌ترین صحیح به مرجع است (کسرها مال بند ۸۸).
  must(TAX_IDS.length === 12 && BALANCE.economy.tax.rows.length === 12,
    "[فاز ۱ #34] شمار سطوح باید ۱۲ برابر جدول باشد");
  for (const row of BALANCE.economy.tax.rows) {
    must(TAX[row.id] && TAX[row.id].pop === row.pop,
      `[فاز ۱ #34] اثر ${row.id} باید ${row.pop} برابر مرجع باشد`);
  }
  return { name: "واگرایی پیاده‌شده/مرجع", pass: true, detail: "۸ ردیف با مالک فاز ۱ + مقیاس ۱۲سطحی" };
}