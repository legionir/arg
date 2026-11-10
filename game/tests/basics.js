// سوئیت‌های پایه (0.237.0 — C-CLN-7): استخراج مکانیکی از game/tests.js — بدون تغییر منطق.
import { CONFIG } from "../config.js";
import { UNITS } from "../combat.js";
import { TUNING } from "../data.js";
import { validateConfig } from "../schema.js";
import { GROUP_SLOTS, freshGroups, groupIndex, saveGroup, recallGroup } from "../groups.js";
import { groupCentroid } from "../selection.js";
import { BANNED_NAMES, scanBanned, scanContent } from "../legal.js";
import { runFirstTenScenario } from "../firstten.js";
import { must } from "./fixtures.js";

export function groupCases() {
  return [t_group_save_recall, t_group_prune, t_group_guards, t_group_centroid];
}

// ذخیره و فراخوانی: ترتیب حفظ می‌شود، شکاف‌ها مستقل‌اند.
function t_group_save_recall() {
  must(GROUP_SLOTS === 10, "ده شکاف ۱..۱۰ (۰ = ۱۰)");
  let g = freshGroups();
  g = saveGroup(g, 1, [7, 3, 5]);
  g = saveGroup(g, 2, [9]);
  const units = [3, 5, 7, 9].map((id) => ({ id, dead: false }));
  must(JSON.stringify(recallGroup(g, 1, units)) === "[7,3,5]", "فراخوانی ۱ با ترتیب ذخیره");
  must(JSON.stringify(recallGroup(g, 2, units)) === "[9]", "فراخوانی ۲ مستقل است");
  must(recallGroup(g, 3, units).length === 0, "شکاف خالی = []");
  return { name: "ذخیره و فراخوانی گروه", pass: true, detail: "ترتیب + استقلال شکاف‌ها" };
}

// مرده/رفته در فراخوانی ساکت حذف می‌شود؛ ذخیره رونوشت است نه ارجاع.
function t_group_prune() {
  const ids = [1, 2, 3];
  let g = saveGroup(freshGroups(), 1, ids);
  ids.push(4);
  const units = [{ id: 1, dead: false }, { id: 2, dead: true }, { id: 4, dead: false }];
  must(JSON.stringify(recallGroup(g, 1, units)) === "[1]", "فقط زنده ذخیره‌شده (۱)؛ مرده و جدید حذف");
  return { name: "هرس گروه در فراخوانی", pass: true, detail: "۲ مرده + ۴ تازه حذف" };
}

// نگهبان‌ها: شکاف نامعتبر، یگان نامعتبر، ورودی خراب.
function t_group_guards() {
  must(groupIndex(0) === -1 && groupIndex(11) === -1, "شکاف ۰ و ۱۱ نامعتبر");
  must(groupIndex(2) === 1, "شکاف ۲ = اندیس ۱");
  const g = freshGroups();
  must(saveGroup(g, 11, [1]) === g, "ذخیره در شکاف نامعتبر = نادیده");
  must(recallGroup(g, 0, []).length === 0, "فراخوانی نامعتبر = []");
  must(recallGroup(null, 1, []).length === 0, "شکاف خراب = []");
  const g2 = saveGroup(g, 1, [1, "x", 2.5, null, 3]);
  must(JSON.stringify(g2[0]) === "[1,3]", "فقط شناسه صحیح ذخیره می‌شود");
  return { name: "نگهبان‌های گروه", pass: true, detail: "شکاف/شناسه نامعتبر" };
}
// مرکز ثقل گروه زنده (0.173.0 — رفتن به محل گروه، بند 554): میانگین مختصات زنده‌ها.
function t_group_centroid() {
  const units = [{ id: 1, x: 10, r: 20 }, { id: 2, x: 20, r: 40 }, { id: 3, dead: true, x: 0, r: 0 }];
  const c = groupCentroid(units, [1, 2, 3, 9]);
  must(c && c.x === 15 && c.r === 30, "میانگین ۱و۲ باید (۱۵،۳۰) باشد");
  must(groupCentroid(units, []) === null, "خالی = null");
  must(groupCentroid(units, [3, 9]) === null, "مرده/رفته = null");
  must(groupCentroid(null, [1]) === null, "یگان خراب = null");
  return { name: "مرکز ثقل گروه", pass: true, detail: "میانگین زنده‌ها + null" };
}

// --- اسکن حقوقی (0.60.0 — رتبه ۲ SOURCE-REVIEW) ---
export function legalCases() {
  return [t_legal_scanner, t_legal_content];
}

// اسکنر: هر ۸ شناسه (با حروف بزرگ هم) گرفته می‌شوند؛ موارد مجاز رد می‌شوند.
// توجه: فیکسچرهای مثبت این تست عمداً حاوی شناسه‌ها هستند و از اسکن مستثنایند
// (همان قرارداد legal.js؛ اسکن کامل فضای کاری در VER ایستاست).
function t_legal_scanner() {
  must(BANNED_NAMES.length === 8, "فهرست باید ۸ شناسه باشد");
  must(scanBanned("Made by Firefly Studios Ltd").length === 1, "حروف بزرگ هم گرفته می‌شود");
  must(scanBanned("a STRONGHOLD CRUSADER clone")[0] === "stronghold crusader", "عنوان دقیق");
  must(scanBanned("Stronghold 2 and stronghold 3")[0] === "stronghold 2", "دنباله‌ها");
  must(scanBanned("my stronghold stands").length === 0, "stronghold تنها مجاز است");
  must(scanBanned("crusader swordsman attacks").length === 0, "crusader عام مجاز است");
  must(scanBanned("reference: stronghold-wiki/archer").length === 0, "ارجاع ویکی مجاز است");
  must(scanBanned("built with phaser on perchance").length === 0, "ابزارها مجازند");
  must(scanBanned("").length === 0 && scanBanned(null).length === 0, "ورودی خالی/خراب = []");
  return { name: "اسکنر حقوقی", pass: true, detail: "۸ مثبت + ۵ منفی" };
}

// محتوای واقعی بازی (نام‌ها/توضیحات CONFIG + UNITS) باید پاک باشد.
function t_legal_content() {
  const r = scanContent(CONFIG, UNITS);
  must(r.checked > 30, `باید ده‌ها رشته خوانده شود، شد ${r.checked}`);
  must(r.hits.length === 0, `محتوا باید پاک باشد: ${r.hits.join(",")}`);
  return { name: "پاکی محتوای بازی", pass: true, detail: `${r.checked} رشته، صفر برخورد` };
}

// --- سناریوی ۱۰ دقیقه اول (0.61.0 — تصمیم کاربر ۳-ب) ---
export function firstTenCases() {
  return [t_firstten_smoke];
}

// دود سریع (۶۰۰ تیک ×۲): بدون throw، قطعی (دو هش یکسان)، ستاد زنده + ساخت‌وساز.
function t_firstten_smoke() {
  const a = runFirstTenScenario(1337, 600);
  const b = runFirstTenScenario(1337, 600);
  must(a.hash === b.hash, "دو اجرای هم‌سید باید یک هش بدهند");
  must(a.outcome === "open", `در ۶۰۰ تیک نباید پایان باشد، شد ${a.outcome}`);
  must(a.playerBuildings >= 2, `ستاد + دست‌کم یک بنا، شد ${a.playerBuildings}`);
  must(a.ticks === 600 && b.ticks === 600, "شمار تیک‌ها");
  return { name: "دود ۱۰ دقیقه اول", pass: true, detail: `هش ${a.hash.slice(0, 12)}… + ${a.playerBuildings} بنا` };
}

// --- اسکیمای داده (0.54.0 — #۱۳ از FEATURES) ---
export function schemaCases() {
  return [t_schema_valid, t_schema_catches, t_schema_config_guard];
}

// کانفیگ واقعی بازی باید بی‌خطا باشد (همان چیزی که boot می‌بیند).
function t_schema_valid() {
  const errs = validateConfig(CONFIG, UNITS);
  must(errs.length === 0, `اسکیمای واقعی باید پاک باشد: ${errs.slice(0, 3).join(" | ")}`);
  return { name: "اعتبار اسکیمای واقعی", pass: true, detail: `${Object.keys(CONFIG.BUILDINGS).length} بنا + ${Object.keys(UNITS).length} یگان پاک` };
}

// ده خرابی عمدی در ده گوشه کاتالوگ‌ها — هر ده باید با مسیر درست گرفته شوند.
function t_schema_catches() {
  const bad = JSON.parse(JSON.stringify(CONFIG));
  const badU = JSON.parse(JSON.stringify(UNITS));
  bad.BUILDINGS.mill.econ.consumes.nope = 2; // منبع ناموجود در consumes
  bad.BUILDINGS.hut.hp = -5; // hp منفی
  bad.RESOURCES.push({ key: "wood", name: "چوب تکراری" }); // کلید تکراری
  bad.AI.buildList.push("castle"); // ساختمان ناموجود در فهرست AI
  bad.MAPS[1].seed = 1337; // سید تکراری نقشه
  badU.soldier.dmg = 0; // خسارت صفر
  badU.catapult.minRange = 99; // حداقل برد بزرگ‌تر از برد
  bad.MARKET.rates.wood.sell = 99; // فروش گران‌تر از خرید (آربیتراژ)
  bad.MARKET.tabs.food = []; // تب تهی (افراز خراب)
  bad.TUNING.tax.levels.pop(); // سطح مالیات جاافتاده
  const errs = validateConfig(bad, badU);
  must(errs.length >= 9, `دست‌کم ۹ خطا باید گرفته شود، شد ${errs.length}`);
  for (const needle of ["mill", "hut", "RESOURCES", "buildList", "MAPS", "soldier", "catapult", "MARKET", "TUNING"]) {
    must(errs.some((e) => e.includes(needle)), `خطای «${needle}» باید با مسیر باشد`);
  }
  return { name: "گرفتن خطای اسکیما", pass: true, detail: `${errs.length} خطا با مسیر` };
}

// ورودی نامعتبر به validator نباید throw بدهد — خطا برمی‌گرداند.
function t_schema_config_guard() {
  must(validateConfig(null, UNITS).length > 0, "کانفیگ null باید خطا بدهد");
  must(validateConfig(CONFIG, null).length > 0, "یگان null باید خطا بدهد");
  must(validateConfig({}, {}).length > 0, "آبجکت تهی باید خطا بدهد");
  return { name: "نگهبان ورودی اسکیما", pass: true, detail: "بدون throw" };
}