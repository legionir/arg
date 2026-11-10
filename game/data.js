// لودر کاتالوگ داده (فاز ۰ بند ۳ — ۲۱.۳ داده‌محور).
//
// قرارداد:
// - تنها منبع حقیقت آمار ساختمان‌ها `../data/buildings.json` است؛ توازن با
//   ویرایش همان فایل ممکن است، بدون دست‌زدن به منطق (بدون کامپایل).
// - بارگذاری هم‌زمان با import (top-level await): همه مصرف‌کننده‌ها
//   (config/economy/combat/...) همان آبجکت نهایی را می‌بینند. مکانیزم سرو
//   فایل دقیقاً همان مکانیزم بارگذاری ماژول‌هاست، پس ریسک تازه‌ای ندارد.
// - نام نمایشی از `nameKey` با getter تنبل ساخته می‌شود تا چندزبانی (دینامیک)
//   مثل قبل کار کند — JSON فقط کلید را نگه می‌دارد، نه متن را.
// - اعتبارسنجی سبک اینجاست (آرایه/یکتایی id) و fail-fast با پیام روشن؛
//   اعتبارسنجی کامل شکل/ارجاع در schema.js است و در boot (main.js) و سوئیت
//   روی همین داده اجرا می‌شود.
import { t } from "./i18n.js";

export const BUILDING_CATEGORIES = ["castle", "industry", "farm", "food", "town", "weapon"];

// اعتبارسنجی خالص فایل (بدون fetch — تست‌پذیر): خالی = معتبر.
export function validateBuildingFile(doc) {
  const errs = [];
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return ["(ریشه): آبجکت لازم است"];
  if (!Array.isArray(doc.buildings) || doc.buildings.length === 0) {
    return ["buildings: آرایه ناتهی لازم است"];
  }
  const seen = new Set();
  doc.buildings.forEach((e, i) => {
    const p = `buildings[${i}]`;
    if (!e || typeof e !== "object" || Array.isArray(e)) { errs.push(`${p}: باید آبجکت باشد`); return; }
    if (typeof e.id !== "string" || e.id.length === 0) { errs.push(`${p}: id غیرتهی لازم است`); return; }
    if (seen.has(e.id)) errs.push(`${p}: شناسه تکراری «${e.id}»`);
    seen.add(e.id);
    if (typeof e.nameKey !== "string" || e.nameKey.length === 0) errs.push(`${p} (${e.id}): nameKey لازم است`);
    if (!BUILDING_CATEGORIES.includes(e.category)) {
      errs.push(`${p} (${e.id}): category باید یکی از ${BUILDING_CATEGORIES.join("/")} باشد`);
    }
    if (!e.cost || typeof e.cost !== "object" || Array.isArray(e.cost)) {
      errs.push(`${p} (${e.id}): cost باید آبجکت باشد`);
    }
    if (!("rules" in e)) errs.push(`${p} (${e.id}): rules لازم است (حتی null)`);
    if (typeof e.source !== "string" || e.source.length === 0) {
      errs.push(`${p} (${e.id}): source لازم است`);
    }
    if (!e.placement || typeof e.placement !== "object" || typeof e.placement.terrain !== "string") {
      errs.push(`${p} (${e.id}): placement.terrain لازم است`);
    }
    if (!Array.isArray(e.needs) || !e.needs.every((n) => typeof n === "string")) {
      errs.push(`${p} (${e.id}): needs باید آرایه‌ای از رشته‌ها باشد`);
    }
  });
  return errs;
}

function toDef(e) {
  const { id, nameKey, ...rest } = e;
  return {
    key: id,
    nameKey, // کلید نام چندزبانی روی تعریف می‌ماند (اسکیما + تست آن را می‌خواهد)
    ...rest,
    get name() { return t(nameKey); },
  };
}

const url = new URL("../data/buildings.json", import.meta.url);
let doc;
try {
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  doc = await res.json();
} catch (e) {
  throw new Error("data/buildings.json بارگذاری نشد (" + url + "): " + String((e && e.message) || e));
}
const fileErrs = validateBuildingFile(doc);
if (fileErrs.length) {
  throw new Error("data/buildings.json نامعتبر: " + fileErrs.slice(0, 3).join(" | "));
}

// ترتیب فایل = ترتیب کاتالوگ (هر دو مصرف‌کننده Object.entries همان را می‌بینند).
export const BUILDING_LIST = doc.buildings.map(toDef);
export const BUILDINGS = Object.fromEntries(BUILDING_LIST.map((d) => [d.key, d]));

// --- کاتالوگ واحدها (فاز ۰ بند ۴ — ۲۱.۳ داده‌محور، خط ۱۲۱۷) ---
//
// قرارداد مثل ساختمان‌ها: `../data/units.json` تنها منبع حقیقت آمار واحدهاست؛
// توازن با ویرایش همان فایل ممکن است، بدون دست‌زدن به منطق.
// نام نمایشی از `nameKey` با getter تنبل ساخته می‌شود تا چندزبانی مثل قبل کار کند.
// فیلدهای نمونه دفترچه (building/goldCost/equip/hp/speedClass/armorClass/
// canClimbLadder (تا آمدن مکانیک نردبان false — بندهای نردبان جدا) / canDigMoat
// (از جدول‌های مرجع 9.6/9.7 — 0.158.0/بند 277؛ مکانیک حفر با بند 275 می‌آید)
// hp در مقیاس پیاده‌شده (~۳۰–۱۵۰) است نه ۱۵۰۰۰ نمایشی مثال؛ speedClass/
// armorClass برچسب موقت از روی اعداد فعلی‌اند (نگاشت واقعی با بند ۵ و
// جدول‌های ۱۸.۲–۱۸.۸). حقیقت عددی sim همان فیلدهای عددی‌اند.
export const UNIT_SIDES = ["player", "enemy"];

// اعتبارسنجی خالص فایل (بدون fetch — تست‌پذیر): خالی = معتبر.
export function validateUnitFile(doc) {
  const errs = [];
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return ["(ریشه): آبجکت لازم است"];
  if (!Array.isArray(doc.units) || doc.units.length === 0) {
    return ["units: آرایه ناتهی لازم است"];
  }
  const seen = new Set();
  doc.units.forEach((e, i) => {
    const p = `units[${i}]`;
    if (!e || typeof e !== "object" || Array.isArray(e)) { errs.push(`${p}: باید آبجکت باشد`); return; }
    if (typeof e.id !== "string" || e.id.length === 0) { errs.push(`${p}: id غیرتهی لازم است`); return; }
    if (seen.has(e.id)) errs.push(`${p}: شناسه تکراری «${e.id}»`);
    seen.add(e.id);
    if (typeof e.nameKey !== "string" || e.nameKey.length === 0) errs.push(`${p} (${e.id}): nameKey لازم است`);
    if (!UNIT_SIDES.includes(e.side)) {
      errs.push(`${p} (${e.id}): side باید یکی از ${UNIT_SIDES.join("/")} باشد`);
    }
    if (e.building !== null && (typeof e.building !== "string" || e.building.length === 0)) {
      errs.push(`${p} (${e.id}): building باید رشته ناتهی یا null باشد`);
    }
    if (!(e.goldCost === null || (Number.isInteger(e.goldCost) && e.goldCost >= 0))) {
      errs.push(`${p} (${e.id}): goldCost باید صحیح نامنفی یا null باشد`);
    }
    if (!Array.isArray(e.equip) || !e.equip.every((x) => typeof x === "string")) {
      errs.push(`${p} (${e.id}): equip باید آرایه‌ای از رشته‌ها باشد`);
    }
    if (!(typeof e.hp === "number" && e.hp > 0)) {
      errs.push(`${p} (${e.id}): hp باید مثبت باشد`);
    }
    if (typeof e.speedClass !== "string" || e.speedClass.length === 0) {
      errs.push(`${p} (${e.id}): speedClass لازم است`);
    }
    if (typeof e.armorClass !== "string" || e.armorClass.length === 0) {
      errs.push(`${p} (${e.id}): armorClass لازم است`);
    }
    for (const f of ["canClimbLadder", "canDigMoat"]) {
      if (typeof e[f] !== "boolean") errs.push(`${p} (${e.id}): ${f} باید بولین باشد`);
    }
    if (typeof e.source !== "string" || e.source.length === 0) {
      errs.push(`${p} (${e.id}): source لازم است`);
    }
  });
  return errs;
}

function toUnitDef(e) {
  const { id, nameKey, ...rest } = e;
  return {
    id,
    nameKey, // کلید نام چندزبانی روی تعریف می‌ماند (اسکیما + تست آن را می‌خواهد)
    ...rest,
    get name() { return t(nameKey); },
  };
}

const unitsUrl = new URL("../data/units.json", import.meta.url);
let unitsDoc;
try {
  const res = await fetch(unitsUrl);
  if (!res.ok) throw new Error("HTTP " + res.status);
  unitsDoc = await res.json();
} catch (e) {
  throw new Error("data/units.json بارگذاری نشد (" + unitsUrl + "): " + String((e && e.message) || e));
}
const unitFileErrs = validateUnitFile(unitsDoc);
if (unitFileErrs.length) {
  throw new Error("data/units.json نامعتبر: " + unitFileErrs.slice(0, 3).join(" | "));
}

// ترتیب فایل = ترتیب کاتالوگ.
export const UNIT_LIST = unitsDoc.units.map(toUnitDef);
export const UNITS = Object.fromEntries(UNIT_LIST.map((d) => [d.id, d]));

// --- جدول‌های توازن ۱۸.۲–۱۸.۸ (فاز ۰ بند ۵ — ۲۱.۳ داده‌محور، خط ۱۲۲۲) ---
//
// قرارداد متفاوت با دو کاتالوگ بالا: `../data/balance.json` امروز فقط مرجع
// توازن است (status=reference) — sim هنوز از این جدول‌ها نمی‌خواند و اعداد
// پیاده‌شده سر جایشان‌اند؛ سیم‌کشی رفتاری هر جدول با بند خودش در فازهای
// بعدی و DoD بند ۷ می‌آید. فایده امروز: همه اعداد مرجع یک‌جا، نسخه‌دار،
// اعتبارسنجی‌شده و با تست پین‌شده‌اند تا توازن بدون کامپایل ممکن شود و
// واگرایی‌های امروز (مثل سرعت‌ها/قیمت‌ها) مستند و قابل‌رهگیری بمانند.
// داده خالص JSON است (بدون getter — نام نمایشی ندارد).
export const BALANCE_SECTIONS = ["unitCombat", "fortification", "siege", "economy", "soldierValue", "missionScore", "tacticalAid"];
export const BALANCE_SOURCES = ["manbook", "community", "verified", "fixup"];

// اعتبارسنجی خالص فایل (بدون fetch — تست‌پذیر): خالی = معتبر.
export function validateBalanceFile(doc) {
  const errs = [];
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return ["(ریشه): آبجکت لازم است"];
  if (!Number.isInteger(doc.version) || doc.version < 1) errs.push("version: باید صحیح مثبت باشد");
  if (!doc.tables || typeof doc.tables !== "object" || Array.isArray(doc.tables)) {
    return [...errs, "tables: آبجکت لازم است"];
  }
  for (const key of BALANCE_SECTIONS) {
    const sec = doc.tables[key];
    if (!sec || typeof sec !== "object" || Array.isArray(sec)) {
      errs.push(`tables.${key}: بخش لازم است`); continue;
    }
    if (typeof sec.section !== "string" || !/^18\.[2-8]/.test(sec.section)) {
      errs.push(`tables.${key}.section: باید ۱۸.۲–۱۸.۸ باشد`);
    }
    if (sec.status !== "reference" && sec.status !== "wired") {
      errs.push(`tables.${key}.status: باید reference یا wired باشد`);
    }
  }
  // گشت بازگشتی: هر برچسب منشأ باید مجاز باشد (حداکثر ۵ خطا).
  const walk = (node, path) => {
    if (errs.length >= 12 || !node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${path}[${i}]`)); return; }
    for (const [k, v] of Object.entries(node)) {
      if (errs.length >= 12) return;
      if ((k === "source" || k.endsWith("Source")) && typeof v === "string") {
        if (!BALANCE_SOURCES.includes(v)) errs.push(`${path}.${k}: منشأ نامعتبر «${v}»`);
      } else walk(v, `${path}.${k}`);
    }
  };
  walk(doc.tables, "tables");
  return errs;
}

const balanceUrl = new URL("../data/balance.json", import.meta.url);
let balanceDoc;
try {
  const res = await fetch(balanceUrl);
  if (!res.ok) throw new Error("HTTP " + res.status);
  balanceDoc = await res.json();
} catch (e) {
  throw new Error("data/balance.json بارگذاری نشد (" + balanceUrl + "): " + String((e && e.message) || e));
}
const balanceFileErrs = validateBalanceFile(balanceDoc);
if (balanceFileErrs.length) {
  throw new Error("data/balance.json نامعتبر: " + balanceFileErrs.slice(0, 3).join(" | "));
}

// جدول‌ها به همان شکل فایل (بدون getter).
export const BALANCE = balanceDoc.tables;

// --- تنظیمات پیاده‌شده sim (فاز ۰ بند ۷ — ۲۲.۱ داده‌محور، خط ۱۲۴۱) ---
//
// قرارداد مثل دو کاتالوگ: `../data/tuning.json` تنها منبع حقیقت اعداد تنظیم
// sim است (مالیات/جیره/میخانه/اثر موجودی/زمان‌بندی/مسکن/سقف‌ها/بازار/صف)؛
// توازن با ویرایش همان فایل ممکن است، بدون دست‌زدن به منطق. مقادیر = رفتار
// پیاده‌شده امروز (خروجی‌گرفته از کد زنده)؛ مقادیر مرجع دفترچه در balance.json
// اند و عمداً فرق دارند (ثبت در t_tuning_vs_reference). نام‌های نمایشی
// مالیات/جیره از `nameKey` با getter تنبل ساخته می‌شوند (الگوی ساختمان/واحد).
// sim با کلید مستقیم می‌خواند (TAX[ec.tax])، پس مجموعه شناسه‌ها دقیق است و
// کم/زیاد شدن سطح = خطای fail-fast (نه رفتار خاموش‌متفاوت).
export const TUNING_SECTIONS = ["tax", "rations", "foodVariety", "inn", "religion", "stockPop", "crowding", "events", "timing", "housing", "caps", "market", "train", "fear", "disease", "fire"];
export const TAX_IDS = ["generousBribe", "largeBribe", "smallBribe", "none", "low", "average", "high", "mean", "extortionate", "downrightCruel", "evenCrueler", "cruellerThanCruel"];
export const RATION_IDS = ["none", "half", "normal", "extra", "double"];

// اعتبارسنجی خالص فایل (بدون fetch — تست‌پذیر).
export function validateTuningFile(doc) {
  const errs = [];
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return ["(ریشه): آبجکت لازم است"];
  if (!Number.isInteger(doc.version) || doc.version < 1) errs.push("version: باید صحیح مثبت باشد");
  const tb = doc.tables;
  if (!tb || typeof tb !== "object" || Array.isArray(tb)) {
    return [...errs, "tables: آبجکت لازم است"];
  }
  for (const k of TUNING_SECTIONS) {
    if (!tb[k] || typeof tb[k] !== "object" || Array.isArray(tb[k])) {
      errs.push(`tables.${k}: بخش لازم است`);
    }
  }
  if (errs.length) return errs;
  const isStr = (v) => typeof v === "string" && v.length > 0;
  const isInt = (v) => Number.isInteger(v);
  // مالیات (فاز ۱ بند ۳۴): ۱۲ سطح جدول مرجع با شناسه‌های ثابت.
  if (!Array.isArray(tb.tax.levels) || tb.tax.levels.length !== TAX_IDS.length) {
    errs.push("tables.tax.levels: دقیقاً ۱۲ سطح لازم است");
  } else {
    const ids = tb.tax.levels.map((l) => l && l.id);
    for (const id of TAX_IDS) {
      if (!ids.includes(id)) errs.push(`tables.tax: سطح «${id}» لازم است`);
    }
    tb.tax.levels.forEach((l, i) => {
      const q = `tables.tax.levels[${i}]`;
      if (!l || typeof l !== "object") { errs.push(`${q}: باید آبجکت باشد`); return; }
      if (!isInt(l.goldPerWorker)) errs.push(`${q}.goldPerWorker: باید صحیح باشد`);
      if (!isInt(l.pop)) errs.push(`${q}.pop: باید صحیح باشد`);
      if (!isStr(l.nameKey)) errs.push(`${q}.nameKey: کلید نام لازم است`);
      if (!isStr(l.source)) errs.push(`${q}.source: منشأ لازم است`);
    });
  }
  if (!isStr(tb.tax.source)) errs.push("tables.tax.source: منشأ لازم است");
  // جیره: دقیقاً ۵ سطح با شناسه‌های ثابت (بند ۱۹).
  if (!Array.isArray(tb.rations.levels) || tb.rations.levels.length !== RATION_IDS.length) {
    errs.push("tables.rations.levels: دقیقاً ۵ سطح لازم است");
  } else {
    const ids = tb.rations.levels.map((l) => l && l.id);
    for (const id of RATION_IDS) {
      if (!ids.includes(id)) errs.push(`tables.rations: سطح «${id}» لازم است`);
    }
    tb.rations.levels.forEach((l, i) => {
      const q = `tables.rations.levels[${i}]`;
      if (!l || typeof l !== "object") { errs.push(`${q}: باید آبجکت باشد`); return; }
      if (!isInt(l.foodNum) || l.foodNum < 0) errs.push(`${q}.foodNum: باید صحیح نامنفی باشد`);
      if (!isInt(l.pop)) errs.push(`${q}.pop: باید صحیح باشد`);
      if (!isStr(l.nameKey)) errs.push(`${q}.nameKey: کلید نام لازم است`);
      if (!isStr(l.source)) errs.push(`${q}.source: منشأ لازم است`);
    });
  }
  if (!isStr(tb.rations.source)) errs.push("tables.rations.source: منشأ لازم است");
  // تنوع غذا (بند ۱۸): فهرست کالاهای خوردنی + ۴ پاداش شمار انواع.
  if (!Array.isArray(tb.foodVariety.types) || tb.foodVariety.types.length === 0 ||
      !tb.foodVariety.types.every((x) => typeof x === "string" && x.length > 0)) {
    errs.push("tables.foodVariety.types: فهرست ناتهی از رشته‌ها لازم است");
  }
  if (!Array.isArray(tb.foodVariety.bonus) || tb.foodVariety.bonus.length !== 4 ||
      !tb.foodVariety.bonus.every((x) => isInt(x))) {
    errs.push("tables.foodVariety.bonus: ۴ پاداش صحیح لازم است");
  }
  // میخانه / اثر موجودی / زمان‌بندی / مسکن.
  if (!isInt(tb.inn.beerEveryTicks) || tb.inn.beerEveryTicks <= 0) {
    errs.push("tables.inn.beerEveryTicks: باید صحیح مثبت باشد");
  }
  if (!isInt(tb.inn.fullBonus) || tb.inn.fullBonus <= 0) errs.push("tables.inn.fullBonus: باید صحیح مثبت باشد");
  if (!isInt(tb.inn.perInn) || tb.inn.perInn <= 0) errs.push("tables.inn.perInn: باید صحیح مثبت باشد");
  if (!isInt(tb.inn.drunkardsPerInn) || tb.inn.drunkardsPerInn < 0) {
    errs.push("tables.inn.drunkardsPerInn: باید صحیح نامنفی باشد");
  }
  if (!isInt(tb.inn.keepers) || tb.inn.keepers < 0) {
    errs.push("tables.inn.keepers: باید صحیح نامنفی باشد");
  }
  // مذهب (فاز ۱ بند ۷۲): ظرفیت تبرک هر ساختمان دینی + کشیش لازم (هر دو مثبت).
  if (!isInt(tb.religion.chapel) || tb.religion.chapel <= 0) {
    errs.push("tables.religion.chapel: باید صحیح مثبت باشد");
  }
  if (!isInt(tb.religion.church) || tb.religion.church <= 0) {
    errs.push("tables.religion.church: باید صحیح مثبت باشد");
  }
  if (!isInt(tb.religion.cathedral) || tb.religion.cathedral <= 0) {
    errs.push("tables.religion.cathedral: باید صحیح مثبت باشد");
  }
  if (!isInt(tb.religion.priests) || tb.religion.priests <= 0) {
    errs.push("tables.religion.priests: باید صحیح مثبت باشد");
  }
  // فرسایش تبرک (فاز ۱ بند ۷۳): چرخه تبرک/انقضا (مدت < چرخه تا شکاف فرسایش باشد).
  if (!isInt(tb.religion.blessEveryTicks) || tb.religion.blessEveryTicks <= 0) {
    errs.push("tables.religion.blessEveryTicks: باید صحیح مثبت باشد");
  }
  if (!isInt(tb.religion.blessDurationTicks) || tb.religion.blessDurationTicks <= 0 ||
      tb.religion.blessDurationTicks >= tb.religion.blessEveryTicks) {
    errs.push("tables.religion.blessDurationTicks: باید مثبت و کوچک‌تر از چرخه باشد");
  }
  // پاداش مذهب (فاز ۱ بند ۷۵): ۴ پله پوشش + پاداش ۴تایی + ثابت کلیسا/کلیسای جامع.
  if (!Array.isArray(tb.religion.steps) || tb.religion.steps.length !== 4 ||
      !tb.religion.steps.every((x) => isInt(x) && x > 0 && x <= 100)) {
    errs.push("tables.religion.steps: ۴ پله صحیح ۱..۱۰۰ لازم است");
  }
  if (!Array.isArray(tb.religion.stepBonus) || tb.religion.stepBonus.length !== 4 ||
      !tb.religion.stepBonus.every((x) => isInt(x) && x >= 0)) {
    errs.push("tables.religion.stepBonus: ۴ پاداش صحیح نامنفی لازم است");
  }
  if (!isInt(tb.religion.churchBonus) || tb.religion.churchBonus < 0) {
    errs.push("tables.religion.churchBonus: باید صحیح نامنفی باشد");
  }
  if (!isInt(tb.religion.cathedralBonus) || tb.religion.cathedralBonus < 0) {
    errs.push("tables.religion.cathedralBonus: باید صحیح نامنفی باشد");
  }
  if (!isInt(tb.stockPop.famineAt)) errs.push("tables.stockPop.famineAt: باید صحیح باشد");
  if (!isInt(tb.stockPop.lowBelow) || tb.stockPop.lowBelow <= 0) {
    errs.push("tables.stockPop.lowBelow: باید صحیح مثبت باشد");
  }
  for (const f of ["faminePop", "lowPop", "fullPop"]) {
    if (!isInt(tb.stockPop[f])) errs.push(`tables.stockPop.${f}: باید صحیح باشد`);
  }
  // ازدحام (فاز ۱ بند ۶۹): جریمه محبوبیت وقتی جمعیت > مسکن.
  if (!isInt(tb.crowding.pop)) errs.push("tables.crowding.pop: باید صحیح باشد");
  if (!isInt(tb.fear.min) || !isInt(tb.fear.max) || !(tb.fear.min < 0 && tb.fear.max > 0)) errs.push("tables.fear.min/max: باید بازه منفی..مثبت باشند");
  if (!isInt(tb.fear.workPct) || tb.fear.workPct <= 0) errs.push("tables.fear.workPct: باید صحیح مثبت باشد");
  if (!isInt(tb.fear.attackPct) || tb.fear.attackPct <= 0) errs.push("tables.fear.attackPct: باید صحیح مثبت باشد");
  if (!isInt(tb.fear.popPer)) errs.push("tables.fear.popPer: باید صحیح باشد");
  // رویدادهای §۵.۴ (فاز ۱ بندهای ۷۰/۷۱): پنجره دوره‌ای + اثر موقت محبوبیت.
  for (const k of ["fair", "lion", "disease"]) {
    const ev = tb.events && tb.events[k];
    if (!ev || typeof ev !== "object" || !isInt(ev.everyTicks) || ev.everyTicks <= 0 ||
        !isInt(ev.offsetTicks) || ev.offsetTicks < 0 || !isInt(ev.durationTicks) || ev.durationTicks <= 0 ||
        !isInt(ev.pop)) errs.push(`tables.events.${k}: باید {everyTicks/offsetTicks/durationTicks/pop} معتبر باشد`);
  }
  for (const f of ["eatThreshold", "popPeriod", "migPeriod", "popStep"]) {
    if (!isInt(tb.timing[f]) || tb.timing[f] <= 0) {
      errs.push(`tables.timing.${f}: باید صحیح مثبت باشد`);
    }
  }
  for (const f of ["immIn", "immOut"]) {
    if (!isInt(tb.timing[f])) errs.push(`tables.timing.${f}: باید صحیح باشد`);
  }
  for (const f of ["base", "hut", "keep"]) {
    if (!isInt(tb.housing[f]) || tb.housing[f] < 0) {
      errs.push(`tables.housing.${f}: باید صحیح نامنفی باشد`);
    }
  }
  // سقف‌ها: پایه + سه گروه (عضویت در منابع در schema.js بررسی می‌شود).
  if (!tb.caps.base || typeof tb.caps.base !== "object" || Array.isArray(tb.caps.base) ||
      Object.keys(tb.caps.base).length === 0) {
    errs.push("tables.caps.base: آبجکت ناتهی لازم است");
  } else {
    for (const [k, v] of Object.entries(tb.caps.base)) {
      if (typeof v !== "number" || !(v >= 0)) errs.push(`tables.caps.base.${k}: باید عدد نامنفی باشد`);
    }
  }
  for (const g of ["store", "granary", "armoury"]) {
    const grp = tb.caps[g];
    if (!grp || typeof grp !== "object" ||
        !Array.isArray(grp.res) || grp.res.length === 0 ||
        !grp.res.every((x) => typeof x === "string" && x.length > 0)) {
      errs.push(`tables.caps.${g}.res: فهرست ناتهی از رشته‌ها لازم است`);
    }
    if (!isInt(grp && grp.bonus) || grp.bonus <= 0) {
      errs.push(`tables.caps.${g}.bonus: باید صحیح مثبت باشد`);
    }
  }
  // بازار: بسته + نرخ‌ها (ضد آربیتراژ: sell ≤ buy).
  if (!isInt(tb.market.lot) || tb.market.lot <= 0) {
    errs.push("tables.market.lot: باید صحیح مثبت باشد");
  }
  // تب‌های پنل trade (فاز ۱ بند ۳۶): دقیقاً سه تب food/resources/military که
  // افراز کلیدهای rates باشند (هر کالا دقیقاً یک تب، بدون اضافه/کمبود).
  const mTabs = tb.market.tabs;
  const TAB_IDS = ["food", "resources", "military"];
  if (!mTabs || typeof mTabs !== "object" || Array.isArray(mTabs) ||
      JSON.stringify(Object.keys(mTabs)) !== JSON.stringify(TAB_IDS)) {
    errs.push("tables.market.tabs: باید دقیقاً سه تب food/resources/military باشد");
  } else {
    const seen = [];
    for (const id of TAB_IDS) {
      const list = mTabs[id];
      if (!Array.isArray(list) || list.length === 0 ||
          !list.every((x) => typeof x === "string" && x.length > 0)) {
        errs.push(`tables.market.tabs.${id}: فهرست ناتهی از رشته‌ها لازم است`);
      } else seen.push(...list);
    }
    const rateKeys = (tb.market.rates && typeof tb.market.rates === "object") ? Object.keys(tb.market.rates) : [];
    const extra = seen.filter((x) => !rateKeys.includes(x));
    const missing = rateKeys.filter((x) => !seen.includes(x));
    const dup = seen.filter((x, i) => seen.indexOf(x) !== i);
    if (extra.length) errs.push(`tables.market.tabs: کالای بدون نرخ «${extra[0]}»`);
    if (missing.length) errs.push(`tables.market.tabs: کالای بدون تب «${missing[0]}»`);
    if (dup.length) errs.push(`tables.market.tabs: کالای تکراری «${dup[0]}»`);
  }
  if (!tb.market.rates || typeof tb.market.rates !== "object" || Array.isArray(tb.market.rates) ||
      Object.keys(tb.market.rates).length === 0) {
    errs.push("tables.market.rates: آبجکت ناتهی لازم است");
  } else {
    for (const [k, r] of Object.entries(tb.market.rates)) {
      if (!r || typeof r !== "object" || !isInt(r.buy) || r.buy <= 0 || !isInt(r.sell) || r.sell <= 0) {
        errs.push(`tables.market.rates.${k}: باید {buy صحیح مثبت, sell صحیح مثبت} باشد`);
      } else if (r.sell > r.buy) {
        errs.push(`tables.market.rates.${k}: فروش نباید از خرید بیشتر باشد (آربیتراژ)`);
      } else if (r.minStage !== undefined && !["early", "mid", "late"].includes(r.minStage)) {
        errs.push(`tables.market.rates.${k}.minStage: مرحله نامعتبر «${r.minStage}» (باید early/mid/late باشد)`);
      }
    }
  }
  // قفل مرحلهای بازار (فاز ۱ بند ۸۹): نگاشت مرحله→بنای-milestone؛ غایب = پیش‌فرض کد.
  if (tb.market.stages !== undefined) {
    const st = tb.market.stages;
    if (!st || typeof st !== "object" || Array.isArray(st)) {
      errs.push("tables.market.stages: باید آبجکت مرحله→بنا باشد");
    } else {
      for (const [stage, btype] of Object.entries(st)) {
        if (!["mid", "late"].includes(stage)) errs.push(`tables.market.stages: مرحله نامعتبر «${stage}» (باید mid/late باشد)`);
        if (typeof btype !== "string" || btype.length === 0) errs.push(`tables.market.stages.${stage}: نام بنای غیرتهی لازم است`);
      }
    }
  }
  // صف آموزش.
  if (!isInt(tb.train.queueCap) || tb.train.queueCap <= 0) {
    errs.push("tables.train.queueCap: باید صحیح مثبت باشد");
  }
  if (!isInt(tb.disease.radius) || tb.disease.radius <= 0) {
    errs.push("tables.disease.radius");
  }
  if (!isInt(tb.disease.ticks) || tb.disease.ticks <= 0) {
    errs.push("tables.disease.ticks");
  }
  if (!isInt(tb.disease.dmgEvery) || tb.disease.dmgEvery <= 0) {
    errs.push("tables.disease.dmgEvery");
  }
  if (!isInt(tb.disease.dmg) || tb.disease.dmg <= 0) {
    errs.push("tables.disease.dmg");
  }
  // آتش (0.148.0 — §۱۸.۴/#۲۱۵): شانس اشتعال/درصد سوختن/شعاع و شانس گسترش.
  if (typeof tb.fire.ignite !== "number" || !(tb.fire.ignite >= 0) || tb.fire.ignite > 1) {
    errs.push("tables.fire.ignite: باید عدد ۰..۱ باشد");
  }
  if (typeof tb.fire.dmgPct !== "number" || !(tb.fire.dmgPct > 0)) {
    errs.push("tables.fire.dmgPct: باید عدد مثبت باشد");
  }
  if (typeof tb.fire.spreadRadius !== "number" || !(tb.fire.spreadRadius > 0)) {
    errs.push("tables.fire.spreadRadius: باید عدد مثبت باشد");
  }
  if (typeof tb.fire.spreadChance !== "number" || !(tb.fire.spreadChance >= 0) || tb.fire.spreadChance > 1) {
    errs.push("tables.fire.spreadChance: باید عدد ۰..۱ باشد");
  }
  for (const s of TUNING_SECTIONS) {
    if (!isStr(tb[s].source)) errs.push(`tables.${s}.source: منشأ لازم است`);
  }
  return errs;
}

const tuningUrl = new URL("../data/tuning.json", import.meta.url);
let tuningDoc;
try {
  const res = await fetch(tuningUrl);
  if (!res.ok) throw new Error("HTTP " + res.status);
  tuningDoc = await res.json();
} catch (e) {
  throw new Error("data/tuning.json بارگذاری نشد (" + tuningUrl + "): " + String((e && e.message) || e));
}
const tuningFileErrs = validateTuningFile(tuningDoc);
if (tuningFileErrs.length) {
  throw new Error("data/tuning.json نامعتبر: " + tuningFileErrs.slice(0, 3).join(" | "));
}

// جدول‌ها به همان شکل فایل (نام‌های مالیات/جیره را مصرف‌کننده با getter می‌سازد).
export const TUNING = tuningDoc.tables;
export const TUNING_VERSION = tuningDoc.version;
