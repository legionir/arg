// نبرد پایه (MIL-001) + مسیریابی A* (CORE-001، برش ششم).
// حرکت: A* چهارجهته قطعی روی گرید؛ لغزش خطی فقط fallback است وقتی
// هدف هیچ همسایه walkable ندارد یا مسیر ناممکن است. برخورد واحد-واحد نداریم.
import { t as tr } from "./i18n.js";
import { lazyTable } from "./lazytext.js";
import { CONFIG } from "./config.js";
import { T_GRASS } from "./terrain.js";
import { underConstruction } from "./construction.js";
import { capFor } from "./economy.js";
import { findPath, nearestWalkable, isCellWalkable } from "./pathfind.js";

const HZ = 10; // گام منطق بر ثانیه

// جدول اعداد — سرعت/HP/هزینه واحدهای مرجع‌دار از Stronghold Wiki پذیرفته شد
// (0.14.0)؛ بقیه guess تا استخراج. ترتیب سرعت مرجع: شمشیرزن زرهی کندِ تانک،
// کماندارها تندِ شکننده، سرباز مزدور میانه.
// زره رسمی (0.41.0 — #۵ از FEATURES): هر واحد `armor` دارد؛ خسارت وارده =
// max(1, حمله − زره) در strike. همه armorها guess اند (زره‌پوش‌ها ۳،
// پیاده متوسط ۱، سبک/دوربرد ۰؛ شمشیرزن دشمن ۱ تا TTK برج سر جایش بماند).
export const UNITS = {
  soldier:   { side: "player", get name() { return tr("game.unit.soldier.name"); }, hp: 60, armor: 1, dmg: 6, cd: 10, range: 1.3, speed: 3.0, aggro: 10,
               cost: { food: 40, gold: 25 }, trainTicks: 50, color: "#4d9de0", source: "guess",
               requires: "barracks", requiresWeapon: "swords" }, // پیش‌نیاز: سربازخانه سالم خودی (0.29.0)
  // کماندار خودی (0.11.0): دوربرد جناح بازیکن؛ مکانیک برد/aggro موجود بدون تغییر جواب می‌دهد.
  // اسمش با کماندار دشمن یکی است، ولی هاور رنگ جناح را نشان می‌دهد (ok/bad) + نوار HP سبز/قرمز.
  // (0.14.0): تند (Fast) و ارزان مثل Archer مرجع (۱۲ط + کمان؛ سربار غذا = نگهداری وب).
  bowman:    { side: "player", get name() { return tr("game.unit.bowman.name"); }, hp: 40, armor: 0, dmg: 5, cd: 12, range: 5.5, speed: 3.4, aggro: 8,
               cost: { food: 20, gold: 15 }, trainTicks: 40, color: "#4d9de0", source: "reference: stronghold-wiki/archer",
               requires: "barracks", requiresWeapon: "bows" }, // پیش‌نیاز: سربازخانه سالم خودی (0.30.0) — مثل سرباز
  // نیزه‌دار (0.35.0): پیاده ارزان با برد نیزه — نگه‌دار خط. همه guess.
  spearman:   { side: "player", get name() { return tr("game.unit.spearman.name"); }, hp: 50, armor: 1, dmg: 4, cd: 10, range: 1.6, speed: 2.8, aggro: 10,
               cost: { food: 25, gold: 10 }, trainTicks: 30, color: "#4d9de0", source: "guess",
               requires: "barracks", requiresWeapon: "swords" },
  // گرزدار (0.35.0): سبک و تند با ضربه محکم نزدیک‌برد. همه guess.
  maceman:    { side: "player", get name() { return tr("game.unit.maceman.name"); }, hp: 45, armor: 0, dmg: 7, cd: 9, range: 1.2, speed: 3.6, aggro: 10,
               cost: { food: 30, gold: 20 }, trainTicks: 30, color: "#4d9de0", source: "guess",
               requires: "barracks", requiresWeapon: "swords" },
  // شوالیه (0.35.0): زرهی نخبه — تنومند و گران. همه guess.
  knight:     { side: "player", get name() { return tr("game.unit.knight.name"); }, hp: 100, armor: 3, dmg: 10, cd: 10, range: 1.3, speed: 3.2, aggro: 10,
               cost: { food: 60, gold: 50 }, trainTicks: 80, color: "#4d9de0", source: "guess",
               requires: "barracks", requiresWeapon: "swords" },
  // موج دوم مزدورها (0.36.0) — از فهرست tier کاربر: A/B/S پیاده‌رو؛
  // ماشین‌های محاصره (منجنیق/دژکوب/برج) مکانیک جدا می‌خواهند و فعلاً بیرون‌اند. همه guess.
  // شمشیرزن صلیبی (A): لنگر دفاعی کُند — نگه‌دار خط و محافظ ارباب.
  crusader:   { side: "player", get name() { return tr("game.unit.crusader.name"); }, hp: 110, armor: 3, dmg: 11, cd: 11, range: 1.3, speed: 2.4, aggro: 10,
               cost: { food: 55, gold: 45 }, trainTicks: 80, color: "#4d9de0", source: "guess",
               requires: "barracks", requiresWeapon: "swords" },
  // زوبین‌دار (B): دورزن پرآسیب مراحل پایانی — ریلود کُند (cd بالا).
  crossbowman:{ side: "player", get name() { return tr("game.unit.crossbowman.name"); }, hp: 45, armor: 1, dmg: 11, cd: 18, range: 6.5, speed: 2.5, aggro: 8,
               cost: { food: 35, gold: 30 }, trainTicks: 70, color: "#4d9de0", source: "guess",
               requires: "barracks", requiresWeapon: "bows" },
  // شمشیرزن عرب (B): خط مقدم تند.
  arabian:    { side: "player", get name() { return tr("game.unit.arabian.name"); }, hp: 70, armor: 1, dmg: 8, cd: 9, range: 1.3, speed: 4.0, aggro: 10,
               cost: { food: 40, gold: 30 }, trainTicks: 50, color: "#4d9de0", source: "guess",
               requires: "barracks", requiresWeapon: "swords" },
  // قاتل (A): تند و شکننده و کُشنده — پنهان‌کاری در این موتور ساده شده به سرعت+آسیب بالا.
  assassin:   { side: "player", get name() { return tr("game.unit.assassin.name"); }, hp: 35, armor: 0, dmg: 13, cd: 8, range: 1.2, speed: 4.6, aggro: 10,
               cost: { food: 30, gold: 40 }, trainTicks: 60, color: "#4d9de0", source: "guess",
               requires: "barracks", requiresWeapon: "swords" },
  // کماندار سواره (S): سواره‌نظام تند و گران — ورق‌برگردان جنگ.
  horseArcher:{ side: "player", get name() { return tr("game.unit.horseArcher.name"); }, hp: 60, armor: 1, dmg: 9, cd: 12, range: 5.0, speed: 5.0, aggro: 8,
               cost: { food: 70, gold: 80 }, trainTicks: 100, color: "#4d9de0", source: "guess",
               requires: "barracks", requiresWeapon: "bows" },
  // تجهیزات محاصره (0.46.0 — #۱۷ از FEATURES، شماره ۴ از NEXT-5): ماشین‌های
  // پشت سربازخانه با هزینه سنگین. دژکوب کُند و زرهی، فقط ساختمان را هدف
  // می‌گیرد (×۳ ضد ساختمان، نصف ضد یگان)؛ منجنیق دوربرد با حداقل برد ۳ و
  // استقرار اجباری (سیار = حرکتِ بی‌شلیک؛ مستقر = سرعت ۰ + شلیک آزاد).
  // همه guess تا استخراج مرجع.
  ram:      { side: "player", get name() { return tr("game.unit.ram.name"); }, hp: 150, armor: 2, dmg: 8, cd: 15, range: 1.2, speed: 1.0, aggro: 10,
               cost: { food: 40, gold: 40 }, trainTicks: 120, color: "#8d7a5c", source: "guess",
               requires: "barracks", siege: true, bonusVsBld: 3, halfVsUnit: true },
  catapult: { side: "player", get name() { return tr("game.unit.catapult.name"); }, hp: 120, armor: 1, dmg: 5, cd: 40, range: 10, minRange: 3, speed: 1.0, aggro: 10,
               cost: { food: 60, gold: 100 }, trainTicks: 150, color: "#7a5c3e", source: "guess",
               requires: "barracks", siege: true, bonusVsBld: 2, needsDeploy: true },
 // (0.14.0): تانک زرهی Very slow با HP بالا و آسیب High مثل Swordsman مرجع
  // (۴۰ط + شمشیر + زره؛ موج دشمن هزینه ندارد؛ cost فقط استخدام AI است در 0.42.0).
  swordsman: { side: "enemy", get name() { return tr("game.unit.swordsman.name"); }, hp: 60, armor: 1, dmg: 7, cd: 10, range: 1.3, speed: 2.2, aggro: 99,
               cost: { food: 40, gold: 25 }, // فقط استخدام AI (0.42.0) — موج رایگان است
               color: "#e05c4d", source: "reference: stronghold-wiki/swordsman" },
  // (0.14.0): تند (Fast) و شکننده (Low) مثل Archer مرجع.
  archer:    { side: "enemy", get name() { return tr("game.unit.archer.name"); }, hp: 30, armor: 0, dmg: 4, cd: 15, range: 6.0, speed: 3.4, aggro: 99,
               cost: { food: 20, gold: 15 }, // فقط استخدام AI (0.42.0) — موج رایگان است
               color: "#e09a4d", source: "reference: stronghold-wiki/archer" },
  // ارباب (0.22.0): یکتای جناح بازیکن — کنار ستاد می‌زید، مرگش = شکست.
  // تنومند ولی نه شکست‌ناپذیر (شمشیرزن‌وارِ تقویت‌شده)؛ استخدام ندارد (spawnLord).
  lord:      { side: "player", get name() { return tr("game.unit.lord.name"); }, hp: 150, armor: 2, dmg: 8, cd: 10, range: 1.3, speed: 2.6, aggro: 10,
               noHire: true, color: "#f0c75e", source: "guess" },
};

// آخرین موج (0.22.0): نابودی همه دشمنان موج FINAL_WAVE به بعد = پیروزی.
export const FINAL_WAVE = 5;

export const HIRE_FA = lazyTable("game.hire", ["OK", "OUT_OF_BOUNDS", "TERRAIN", "OCCUPIED", "NO_BARRACKS", "NEEDS_WEAPON", "INSUFFICIENT", "QUEUE_FULL"]);

// پیش‌نیاز استخدام (0.29.0): ساختمانِ requires سالمِ همان مالک.
// در سولو همه ساختمان‌ها خودی‌اند (owner ۰)؛ در MP فقط خودی شمرده می‌شود.
export function hasBarracks(state, owner) {
  owner = owner == null ? 0 : owner;
  // سربازخانه نیمه‌کاره استخدام نمی‌دهد (0.39.0).
  return state.buildings.some((b) => b.type === "barracks" && !b.destroyed && !underConstruction(b) && (b.owner == null ? 0 : b.owner) === owner);
}

export function spawnUnit(state, type, x, r, owner) {
  const def = UNITS[type];
  const u = {
    id: state.nextUnitId++, type, side: def.side,
    x, r, hp: def.hp, maxHp: def.hp, cooldown: 0,
    owner: owner == null ? 0 : owner,
    targetKind: null, targetId: null, flashTick: -99,
    // وضعیت مسیر (CORE-001): path آرایه [c,r] از findPath است؛ ذخیره نمی‌شود
    // و پس از load بازمحاسبه می‌شود (persist.js را ببین).
    path: null, pathGoal: null, pathIdx: 0, pathTick: -999, noPath: false,
    // مأموریت صریح (لایه ۱ قرارداد): order فعال یا null؛ mission آخرین وضعیت
    // ('idle' | 'active' | 'done' | 'failed') — همیشه قابل پرس‌وجوست.
    order: null, mission: "idle",
    stance: STANCES.ENGAGE, // موضع: engage (تعقیب) یا hold (پدافند درجا) یا guard (نگهبانی با guardBld)
    guardBld: null, // شناسه پاسگاه در موضع guard (وگرنه null)
    garrisonTower: null, // برج میزبان گاریسون (0.45.0) — null یعنی آزاد
    deployed: false, // استقرار منجنیق (0.46.0) — مستقر = سرعت ۰ + شلیک آزاد
  };
  state.units.push(u);
  return u;
}

// اعتبارسنجی خشک استخدام (بدون اثر جانبی) + اجرای آن.
export function validateHire(state, terrain, W, H, c, r, type, owner) {
  owner = owner == null ? 0 : owner;
  const mp = state.mp && state.mp.enabled;
  const def = UNITS[type];
  // استخدام AI از نوع دشمن مجاز است (0.42.0: یورش با شمشیرزن/کماندار موج)؛
  // بازیکن فقط مزدور خودی. موج با spawnUnit رایگان می‌ماند.
  if (!def || def.noHire || (def.side !== "player" && owner !== CONFIG.AI.owner)) {
    return { ok: false, reason: "INVALID" };
  }
  if (!Number.isInteger(c) || !Number.isInteger(r) || c < 0 || r < 0 || c >= W || r >= H) {
    return { ok: false, reason: "OUT_OF_BOUNDS" };
  }
  if (terrain[r * W + c] !== T_GRASS) return { ok: false, reason: "TERRAIN" };
  if (state.occ[r * W + c] === 1) return { ok: false, reason: "OCCUPIED" };
  // پیش‌نیاز ساختمانی (0.29.0 سرباز، 0.30.0 سرباز و کماندار): بدون سربازخانه سالم خودی نه.
  if (def.requires === "barracks" && !hasBarracks(state, owner)) {
    return { ok: false, reason: "NO_BARRACKS" };
  }
  const cost = def.cost || { food: 0, gold: 0 };
  // کانتینر هزینه: MP جدا، سولو خودی از state و AI از state.ai (0.42.0).
  const res = mp ? state.mpres[owner].resources
    : (owner === CONFIG.AI.owner && state.ai ? state.ai.resources : state.resources);
  // سلاح (0.44.0 — #۹): مزدورِ requiresWeaponدار ۱ واحد شمشیر/کمان هم می‌خواهد
  // (پس از قفل سربازخانه تا دلیل دقیق‌تر دیده شود). نوع دشمن requiresWeapon
  // ندارد پس موج/یورش AI دست‌نخورده می‌ماند.
  if (def.requiresWeapon && (res[def.requiresWeapon] || 0) < 1) {
    return { ok: false, reason: "NEEDS_WEAPON" };
  }
  if (res.food < cost.food || res.gold < cost.gold) {
    return { ok: false, reason: "INSUFFICIENT" };
  }
  return { ok: true, reason: "OK" };
}

// اجرای فوری استخدام — فقط مصرف داخلی (یورش AI، تست‌های رزمی، رگرسیون).
// استخدام بازیکن از 0.65.0 از صف آموزش می‌گذرد (train.js — فرمان hire).
export function hireUnit(state, terrain, W, H, c, r, type, owner) {
  owner = owner == null ? 0 : owner;
  const mp = state.mp && state.mp.enabled;
  const v = validateHire(state, terrain, W, H, c, r, type, owner);
  if (!v.ok) {
    state.rejected++;
    return v;
  }
  const cost = UNITS[type].cost;
  const res = mp ? state.mpres[owner].resources
    : (owner === CONFIG.AI.owner && state.ai ? state.ai.resources : state.resources);
  res.food -= cost.food;
  res.gold -= cost.gold;
  if (UNITS[type].requiresWeapon) res[UNITS[type].requiresWeapon]--; // ۱ سلاح (0.44.0)
  const unit = spawnUnit(state, type, c + 0.5, r + 0.5, owner);
  state.placed++;
  return { ok: true, reason: "OK", unit };
}

// موج دشمن: قطعی (بدون RNG) — ترکیب با شماره موج رشد می‌کند.
// (0.22.0): موج فقط وقتی شمرده می‌شود که دشمنی واقعاً وارد شود؛ وگرنه
// بررسی پیروزی روی موجِ هرگزنیامده فعال می‌شد (نقشه کاملاً دیوارکشیده).
export function spawnWave(state, terrain, W, H) {
  const edge = [];
  for (let c = 0; c < W; c++) {
    if (terrain[c] === T_GRASS && state.occ[c] !== 1) edge.push([c + 0.5, 0.5]);
    if (terrain[(H - 1) * W + c] === T_GRASS && state.occ[(H - 1) * W + c] !== 1) {
      edge.push([c + 0.5, H - 0.5]);
    }
  }
  for (let r = 1; r < H - 1; r++) {
    if (terrain[r * W] === T_GRASS && state.occ[r * W] !== 1) edge.push([0.5, r + 0.5]);
    if (terrain[r * W + W - 1] === T_GRASS && state.occ[r * W + W - 1] !== 1) {
      edge.push([W - 0.5, r + 0.5]);
    }
  }
  if (!edge.length) return 0;
  state.wave++;
  const n = 2 + state.wave;
  for (let i = 0; i < n; i++) {
    const [x, r] = edge[(i * 7 + state.wave * 3) % edge.length];
    spawnUnit(state, i % 3 === 2 ? "archer" : "swordsman", x, r);
  }
  pushEvent(state, tr("game.ev.wave", { wave: state.wave, n: n }));
  return n;
}

// ارباب آغازین (0.22.0): یکتا، رایگان، روی نزدیک‌ترین چمن آزاد به مرکز ستاد
// (نبودِ ستاد: مرکز نقشه). پیمایش مارپیچ قطعی — جای هر اجرا یکسان.
// در MP یکتا به‌ازای هر مالک و لنگر ستاد خودی است.
export function spawnLord(state, terrain, W, H, owner) {
  owner = owner == null ? 0 : owner;
  const mp = state.mp && state.mp.enabled;
  if (mp) {
    if (state.units.some((u) => u.type === "lord" && !u.dead && (u.owner == null ? 0 : u.owner) === owner)) {
      return { ok: false, reason: "UNIQUE" };
    }
  } else if (state.units.some((u) => u.type === "lord" && !u.dead)) {
    return { ok: false, reason: "UNIQUE" };
  }
  const keep = mp
    ? state.buildings.find((b) => b.type === "keep" && !b.destroyed && (b.owner == null ? 0 : b.owner) === owner)
    : state.buildings.find((b) => b.type === "keep" && !b.destroyed);
  const cx = keep ? keep.c + keep.w / 2 : W / 2;
  const cr = keep ? keep.r + keep.h / 2 : H / 2;
  for (let ring = 1; ring < Math.max(W, H); ring++) {
    for (let dr = -ring; dr <= ring; dr++) {
      for (let dc = -ring; dc <= ring; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== ring) continue;
        const c = Math.round(cx - 0.5) + dc, r = Math.round(cr - 0.5) + dr;
        if (c < 0 || r < 0 || c >= W || r >= H) continue;
        if (terrain[r * W + c] !== T_GRASS || state.occ[r * W + c] === 1) continue;
        const unit = spawnUnit(state, "lord", c + 0.5, r + 0.5, owner);
        return { ok: true, reason: "OK", unit };
      }
    }
  }
  return { ok: false, reason: "TERRAIN" };
}

export const ORDER_FA = lazyTable("game.order", ["OK", "OUT_OF_BOUNDS", "NO_PATH"]);

const ARRIVE_DIST = 0.4; // رسیدن به مرکز خانه هدف
const ORDER_RETRIES = 1; // یک تلاش جایگزین، بعد ثبت شکست

// موضع یگان (0.12.0): engage = رفتار فعلی (تعقیب در aggro)؛ hold = بدون حرکت
// داوطلبانه (فقط ضربه در برد)؛ guard = نگهبانی از ساختمان (0.15.0: درگیری
// فقط با مزاحمِ در شعاع پاسگاه، وگرنه بازگشت به خانه). دستورهای صریح در هر
// سه موضع اجرا می‌شوند.
export const STANCES = { ENGAGE: "engage", HOLD: "hold", GUARD: "guard" };
export const STANCE_FA = lazyTable("game.stance", ["engage", "hold", "guard"]);
export const ORDER_KINDS = ["move", "attackmove", "retreat"];
export const ORDER_KIND_FA = lazyTable("game.orderKind", ["move", "attackmove", "retreat"]);
// عقب‌نشینی: دور شدن از نزدیک‌ترین دشمن تا ۱۲ خانه یا ۶۰ تیک؛ با ضریب سرعت
// فرار ۱٫۲۵ (سپر انداخته، سریع‌تر از تعقیب‌کننده پیاده). همه guess تا مرجع.
const RETREAT_SIGHT = 12, RETREAT_TICKS = 60, RETREAT_MULT = 1.25;

export function setStance(unit, stance) {
  if (!unit || unit.dead) return { ok: false, reason: "INVALID" };
  if (stance !== STANCES.ENGAGE && stance !== STANCES.HOLD && stance !== STANCES.GUARD) {
    return { ok: false, reason: "INVALID" };
  }
  unit.stance = stance;
  if (stance !== STANCES.GUARD) unit.guardBld = null; // ترک پاسگاه
  unit.path = null; // موضع جدید ممکن است مسیر کش‌شده را باطل کند
  return { ok: true, reason: "OK" };
}

// نگهبانی (0.15.0): موضع guard با پاسگاه ساختمانی. شعاع درگیری ۶ خانه از
// مرکز پاسگاه (هم‌ارز برد کماندار — «دید پاسگاه»)؛ بیرون آن مزاحم نادیده
// گرفته می‌شود و نگهبان به خانه (۲ خانه از مرکز) برمی‌گردد. پاسگاه ویران
// شود → بازگشت خودکار به engage. همه guess/تصمیم تا مرجع.
const GUARD_RADIUS = 6, GUARD_HOME = 2.0;

// پاسگاه زنده نگهبان (null اگر ندارد/ویران شده/پاک شده).
export function guardPost(state, unit) {
  if (!unit || unit.guardBld == null) return null;
  return state.buildings.find((b) => b.id === unit.guardBld && !b.destroyed) || null;
}

export function setGuard(state, unit, building) {
  if (!unit || unit.dead) return { ok: false, reason: "INVALID" };
  if (unit.garrisonTower != null) ungarrisonUnit(state, unit); // نگهبانی جای تازه = ترک برج
  if (UNITS[unit.type].needsDeploy && unit.deployed) unit.deployed = false; // نگهبانی = جمع‌کردن منجنیق (0.46.0)
  const post = building && !building.destroyed
    ? state.buildings.find((b) => b.id === building.id && !b.destroyed)
    : null;
  if (!post) return { ok: false, reason: "INVALID" };
  // در MP نگهبانی فقط از بنای خودی.
  if (state.mp && state.mp.enabled) {
    const uow = unit.owner == null ? 0 : unit.owner;
    if ((post.owner == null ? 0 : post.owner) !== uow) return { ok: false, reason: "INVALID" };
  }
  unit.stance = STANCES.GUARD;
  unit.guardBld = post.id;
  unit.order = null;
  unit.mission = "idle";
  unit.targetKind = null;
  unit.targetId = null;
  unit.path = null;
  pushEvent(state, tr("game.ev.guard", { id: unit.id, building: CONFIG.BUILDINGS[post.type].name }));
  return { ok: true, reason: "OK" };
}

// گاریسون برج (0.45.0 — #۱۰ از FEATURES، شماره ۳ از NEXT-5): تا ۴ مدافع
// دوربرد خودی روی برج سالم خودی می‌ایستند و از مرکز برج با برد+۲ و خسارت
// خودشان می‌زنند (زره هدف طبق 0.41.0 در strike اعمال می‌شود؛ شلیک پایه برج
// سر جایش است). مستقر = غیرقابل‌هدف (acquire و resolveTarget و نگهبانی و
// عقب‌نشینی او را نادیده می‌گیرند) ولی با ویرانی/تخریب برج بیرون می‌پرد
// (hp حفظ، موضع engage). این تصمیم در qa-plan ثبت شده (C-MIL-9).
export const GARRISON_CAP = 4;
export const GARRISON_FA = lazyTable("game.garrison", ["OK", "INVALID", "NOT_OWNED", "NOT_TOWER", "NOT_RANGED", "UNDER_CONSTRUCTION", "FULL"]);
// دوربرد خودیِ قابل‌استقرار: جناح بازیکن، استخدام‌شونده، برد بالای ۲
// (کماندار ۵٫۵، زوبین‌دار ۶٫۵، کماندار سواره ۵٫۰؛ ارباب و پیاده و ماشین
// محاصره بیرون — منجنیق با برد ۱۰ ولی siege است).
export function canGarrisonType(type) {
  const def = UNITS[type];
  return !!def && def.side === "player" && !def.noHire && !def.siege && (def.range || 0) > 2;
}

export function garrisonUnit(state, unit, building) {
  if (!unit || unit.dead) return { ok: false, reason: "INVALID" };
  const post = building && !building.destroyed
    ? state.buildings.find((b) => b.id === building.id && !b.destroyed)
    : null;
  if (!post || post.type !== "tower") return { ok: false, reason: "NOT_TOWER" };
  const uow = unit.owner == null ? 0 : unit.owner;
  if (unit.side !== "player" || (post.owner == null ? 0 : post.owner) !== uow) {
    return { ok: false, reason: "NOT_OWNED" };
  }
  if (!canGarrisonType(unit.type)) return { ok: false, reason: "NOT_RANGED" };
  if (underConstruction(post)) return { ok: false, reason: "UNDER_CONSTRUCTION" };
  if (!Array.isArray(post.garrison)) post.garrison = [];
  if (unit.garrisonTower === post.id && post.garrison.includes(unit.id)) {
    return { ok: true, reason: "OK" }; // تکراریِ همان برج = موفقِ بی‌اثر
  }
  if (post.garrison.length >= GARRISON_CAP) return { ok: false, reason: "FULL" };
  if (unit.garrisonTower != null) ungarrisonUnit(state, unit); // جابه‌جایی به برج تازه
  const c = bldCenter(post);
  unit.x = c.x;
  unit.r = c.r;
  unit.garrisonTower = post.id;
  unit.order = null;
  unit.mission = "idle";
  unit.targetKind = null;
  unit.targetId = null;
  unit.path = null;
  post.garrison.push(unit.id);
  pushEvent(state, tr("game.ev.garrison", { id: unit.id, cur: post.garrison.length, cap: GARRISON_CAP }));
  return { ok: true, reason: "OK" };
}

// خروج از گاریسون (بدون جابه‌جایی — فراخواننده مقصد را تعیین می‌کند).
// دستور صریح (حرکت/حمله/عقب‌نشینی/نگهبانی) خودکار خارج می‌کند: زنگ خطر و
// فرمان جمعی مدافعان را از برج صدا می‌زند.
export function ungarrisonUnit(state, unit) {
  if (!unit || unit.garrisonTower == null) return { ok: false, reason: "INVALID" };
  const post = state.buildings.find((b) => b.id === unit.garrisonTower);
  if (post && Array.isArray(post.garrison)) {
    post.garrison = post.garrison.filter((id) => id !== unit.id);
  }
  unit.garrisonTower = null;
  return { ok: true, reason: "OK" };
}

// آزادی گاریسونِ برجِ ازدست‌رفته (ویرانی/تخریب): هر مدافع زنده روی یک خانه
// ردپای آزادشده برج می‌ایستد — hp حفظ، موضع engage، بدون دستور/هدف.
function releaseGarrison(state, b) {
  const ids = Array.isArray(b.garrison) ? b.garrison.slice() : [];
  b.garrison = [];
  if (!ids.length) return 0;
  let n = 0;
  for (const id of ids) {
    const u = state.units.find((x) => x.id === id && !x.dead);
    if (!u) continue;
    const k = n % (b.w * b.h);
    u.x = b.c + (k % b.w) + 0.5;
    u.r = b.r + Math.floor(k / b.w) + 0.5;
    u.garrisonTower = null;
    u.stance = STANCES.ENGAGE;
    u.order = null;
    u.mission = "idle";
    u.targetKind = null;
    u.targetId = null;
    u.path = null;
    n++;
  }
  if (n > 0) pushEvent(state, tr("game.ev.garrisonFree", { count: n }));
  return n;
}

// استقرار منجنیق (0.46.0 — #۱۷): جمع/باز کردن — مستقر = سرعت ۰ + شلیک
// آزاد، سیار = حرکتِ بی‌شلیک. دستور صریح (حرکت/عقب‌نشینی/نگهبانی/زنگ)
// خودکار جمع می‌کند (الگوی خروج گاریسون 0.45.0).
export const DEPLOY_FA = lazyTable("game.deploy", ["OK", "INVALID", "NOT_SIEGE"]);

export function deployUnit(state, unit) {
  if (!unit || unit.dead) return { ok: false, reason: "INVALID" };
  const def = UNITS[unit.type];
  if (!def || !def.needsDeploy) return { ok: false, reason: "NOT_SIEGE" };
  unit.deployed = !unit.deployed;
  unit.order = null;
  unit.mission = "idle";
  unit.targetKind = null;
  unit.targetId = null;
  unit.path = null;
  pushEvent(state, tr(unit.deployed ? "game.ev.deployOn" : "game.ev.deployOff"));
  return { ok: true, reason: "OK", deployed: unit.deployed };
}

// دستور حرکت صریح به خانه (c,r). مقصد روی آب/اشغال به نزدیک‌ترین همسایه باز
// حل می‌شود (آن‌وقت رسیدن به ساحل = done)؛ فقط خارج نقشه رد می‌شود.
export function orderMove(state, unit, c, r) {
  return issueOrder(state, unit, "move", c, r);
}

// حرکت تهاجمی (تعقیب): مثل move ولی در راه دشمنِ در aggro را می‌زند.
export function orderAttackMove(state, unit, c, r) {
  return issueOrder(state, unit, "attackmove", c, r);
}

function issueOrder(state, unit, kind, c, r) {
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  if (!unit || unit.dead) return { ok: false, reason: "INVALID" };
  if (unit.garrisonTower != null) ungarrisonUnit(state, unit); // دستور صریح = ترک برج
  if (UNITS[unit.type].needsDeploy && unit.deployed) unit.deployed = false; // فرمان = جمع‌کردن منجنیق (0.46.0)
  if (!Number.isInteger(c) || !Number.isInteger(r) || c < 0 || r < 0 || c >= W || r >= H) {
    return { ok: false, reason: "OUT_OF_BOUNDS" };
  }
  unit.order = { kind, c, r, status: "active", retries: 0, elapsed: 0 };
  unit.mission = "active";
  unit.path = null; // بازمحاسبه اجباری
  return { ok: true, reason: "OK" };
}

// عقب‌نشینی فوری: بدون مقصد (c/r = خانه فعلی، فقط برای اعتبار ذخیره)؛
export function orderRetreat(state, unit) {
  if (!unit || unit.dead) return { ok: false, reason: "INVALID" };
  if (unit.garrisonTower != null) ungarrisonUnit(state, unit); // عقب‌نشینی = ترک برج
  if (UNITS[unit.type].needsDeploy && unit.deployed) unit.deployed = false; // عقب‌نشینی = جمع‌کردن منجنیق (0.46.0)
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  unit.order = {
    kind: "retreat",
    c: Math.max(0, Math.min(W - 1, Math.floor(unit.x))),
    r: Math.max(0, Math.min(H - 1, Math.floor(unit.r))),
    status: "active", retries: 0, elapsed: 0,
  };
  unit.mission = "active";
  unit.path = null;
  return { ok: true, reason: "OK" };
}

// لغو همیشه واحد را به idle قابل تشخیص برمی‌گرداند (رفتار مورد انتظار CORE-001).
export function cancelOrder(unit) {
  if (!unit) return { ok: false, reason: "INVALID" };
  unit.order = null;
  unit.mission = "idle";
  unit.path = null;
  return { ok: true, reason: "OK" };
}

export function pushEvent(state, msg) {
  state.events.push(msg);
  if (state.events.length > 20) state.events.splice(0, state.events.length - 20);
}

function failOrder(state, u, reason) {
  u.order = null;
  u.mission = "failed";
  u.path = null;
  pushEvent(state, tr("game.ev.orderFail", { id: u.id, reason: ORDER_FA[reason] || reason }));
}

// --- دروازه (0.10.0): گذرگاه خودی، سد دشمن ---
// دروازه سالمِ باز برای واحد خودی مثل زمین باز است و برای دشمن مثل دیوار.
// دروازه بسته (0.13.0) برای هر دو جناح مثل دیوار است.
// occ دست نمی‌خورد (ساخت/استخدام همچنان اشغال می‌بینند)؛ فقط «دیدِ مسیریابی»
// واحد خودی از occForSide می‌گذرد. ویران‌شده گذرگاه نیست (آوار راه را می‌بندد
// تا پاک‌سازی؛ acquire هم ویران‌شده را هدف نمی‌گیرد، پس بن‌بست پیش نمی‌آید).
export function gateAt(state, c, r) {
  for (const b of state.buildings) {
    if (b.destroyed || b.type !== "gate") continue;
    if (c >= b.c && c < b.c + b.w && r >= b.r && r < b.r + b.h) return b;
  }
  return null;
}

// دروازه باز = گذرگاه؛ `open` نامشخص (ذخیره قدیمی) یعنی باز (تحمل‌پذیر).
export function gateOpen(b) {
  return !!b && b.type === "gate" && !b.destroyed && b.open !== false;
}

// باز/بسته کردن دروازه (0.13.0): کلیک روی دروازه سالم؛ مسیر واحدهای خودی
// بی‌اعتبار می‌شود تا گام بعد بازمحاسبه شود (وگرنه از دروازه بسته رد می‌شدند
// تا نوبت بازمحاسبه دوره‌ای). دشمن همیشه دروازه را سد می‌بیند (باز یا بسته)
// و مثل هر بنا به آن حمله می‌کند — بدون تغییر acquire.
// در MP فقط مسیر مالک دروازه بی‌اعتبار می‌شود.
export function toggleGate(state, b) {
  if (!b || b.type !== "gate" || b.destroyed) return { ok: false, reason: "INVALID" };
  b.open = !(b.open !== false);
  const ow = b.owner == null ? 0 : b.owner;
  for (const u of state.units) {
    if (u.side === "player" && !u.dead && (u.owner == null ? 0 : u.owner) === ow) u.path = null;
  }
  pushEvent(state, tr(b.open ? "game.ev.gateOpen" : "game.ev.gateClosed"));
  return { ok: true, open: b.open };
}

// نمای اشغال برای یک جناح: خودی دروازه‌های باز را باز می‌بیند، بقیه عین occ.
// کپی فقط وقتی دروازه بازِ سالمی هست (وگرنه همان مرجع — بدون هزینه).
// در MP فقط دروازه‌های هم‌مالک گذرگاه‌اند.
export function occForSide(state, side, owner) {
  if (side !== "player") return state.occ;
  owner = owner == null ? 0 : owner;
  const mp = state.mp && state.mp.enabled;
  let copy = null;
  for (const b of state.buildings) {
    if (b.destroyed || b.type !== "gate" || b.open === false) continue;
    if (mp && (b.owner == null ? 0 : b.owner) !== owner) continue;
    if (!copy) copy = new Uint8Array(state.occ);
    const W = CONFIG.GRID_W;
    for (let j = 0; j < b.h; j++) {
      for (let i = 0; i < b.w; i++) copy[(b.r + j) * W + (b.c + i)] = 0;
    }
  }
  return copy || state.occ;
}

// عقب‌نشینی: دور شدن از نزدیک‌ترین دشمن جناح مقابل (ضربه‌ای نمی‌زند) تا
// پاک شدن دید ۱۲ خانه‌ای یا سقف ۶۰ تیک → done.
function followRetreat(state, terrain, W, H, u, def) {
  const o = u.order;
  o.elapsed = (o.elapsed || 0) + 1;
  let ne = null, nd = RETREAT_SIGHT;
  const mpRt = state.mp && state.mp.enabled;
  const uowRt = u.owner == null ? 0 : u.owner;
  for (const e of state.units) {
    if (e.dead || e.garrisonTower != null) continue; // مستقر روی برج قابل‌هدف نیست (0.45.0)
    if (e.side === u.side && (!mpRt || (e.owner == null ? 0 : e.owner) === uowRt)) continue;
    if (mpRt && e.side === "player" && (e.owner == null ? 0 : e.owner) === uowRt) continue;
    const d = dist(u.x, u.r, e.x, e.r);
    if (d < nd) { nd = d; ne = e; }
  }
  if (!ne || o.elapsed > RETREAT_TICKS) {
    u.order = null;
    u.mission = "done";
    u.path = null;
    return;
  }
  let dx = u.x - ne.x, dr = u.r - ne.r;
  const d = Math.sqrt(dx * dx + dr * dr) || 1;
  moveSlide(state, terrain, W, H, u,
    u.x + (dx / d) * 3, u.r + (dr / d) * 3, (def.speed * RETREAT_MULT) / HZ);
}

function followOrder(state, terrain, W, H, u, def) {
  const o = u.order;
  const g = nearestWalkable(terrain, occForSide(state, u.side, u.owner), W, H, o.c, o.r, 8);
  if (!g) {
    failOrder(state, u, "NO_PATH");
    return;
  }
  const tx = g[0] + 0.5, tr = g[1] + 0.5;
  if (Math.sqrt((u.x - tx) * (u.x - tx) + (u.r - tr) * (u.r - tr)) <= ARRIVE_DIST) {
    u.x = tx; u.r = tr;
    u.order = null;
    u.mission = "done";
    u.path = null;
    return;
  }
  const path = ensurePath(state, terrain, W, H, u, g[0], g[1]);
  if (path && u.pathIdx < path.length) {
    o.retries = 0;
    followPath(u, def.speed / HZ);
  } else {
    o.retries = (o.retries || 0) + 1;
    if (o.retries > ORDER_RETRIES) {
      failOrder(state, u, "NO_PATH");
    } else {
      moveSlide(state, terrain, W, H, u, tx, tr, def.speed / HZ); // تلاش جایگزین
    }
  }
}

// --- موتور گام نبرد (قطعی: ترتیب id، بدون RNG) ---

const dist = (ax, ar, bx, br) => Math.sqrt((ax - bx) * (ax - bx) + (ar - br) * (ar - br));
const bldCenter = (b) => ({ x: b.c + b.w / 2, r: b.r + b.h / 2 });

function walkable(state, terrain, W, H, x, r, side, owner) {
  const c = Math.floor(x), rr = Math.floor(r);
  if (c < 0 || rr < 0 || c >= W || rr >= H) return false;
  if (terrain[rr * W + c] !== T_GRASS) return false;
  if (state.occ[rr * W + c] === 1) {
    if (side !== "player") return false;
    const g = gateAt(state, c, rr);
    if (!g || !gateOpen(g)) return false;
    const mp = state.mp && state.mp.enabled;
    if (mp && (g.owner == null ? 0 : g.owner) !== (owner == null ? 0 : owner)) return false;
    return true;
  }
  return true;
}

function findUnit(state, id) {
  return state.units.find((u) => u.id === id && !u.dead) || null;
}

function findBld(state, id) {
  return state.buildings.find((b) => b.id === id && !b.destroyed) || null;
}

function acquire(u, state) {
  const def = UNITS[u.type];
  const mp = state.mp && state.mp.enabled;
  const uow = u.owner == null ? 0 : u.owner;
  if (u.side === "enemy") {
    // نزدیک‌ترین میان ساختمان‌ها و سربازان بازیکن — ساختمان‌های AI (owner=9)
    // هدف موج نیستند (0.42.0: موج با حریف هم‌جبهه است).
    let best = null, bd = Infinity;
    for (const b of state.buildings) {
      if (b.destroyed) continue; // ویران‌شده قابل هدف نیست (وگرنه resolveTarget بی‌نهایت لوپ می‌زد)
      if ((b.owner == null ? 0 : b.owner) === CONFIG.AI.owner) continue;
      const p = bldCenter(b);
      const d = dist(u.x, u.r, p.x, p.r);
      if (d < bd) { bd = d; best = { kind: "bld", id: b.id }; }
    }
    for (const e of state.units) {
      if (e.dead || e.side !== "player" || e.garrisonTower != null) continue; // مستقر قابل‌هدف نیست (0.45.0)
      const d = dist(u.x, u.r, e.x, e.r);
      if (d < bd) { bd = d; best = { kind: "unit", id: e.id }; }
    }
    return best;
  }
  if (mp) {
    // رقابتی: نزدیک‌ترین بنای/یگانِ مالکِ دیگر (موج خنثی نداریم).
    let best = null, bd = Infinity;
    for (const b of state.buildings) {
      if (b.destroyed) continue;
      if ((b.owner == null ? 0 : b.owner) === uow) continue;
      const p = bldCenter(b);
      const d = dist(u.x, u.r, p.x, p.r);
      if (d < bd) { bd = d; best = { kind: "bld", id: b.id }; }
    }
    if (!def.siege) { // محاصره فقط ساختمان می‌زند (0.46.0)
      for (const e of state.units) {
        if (e.dead || e.side !== "player" || e.garrisonTower != null) continue; // مستقر قابل‌هدف نیست (0.45.0)
        if ((e.owner == null ? 0 : e.owner) === uow) continue;
        const d = dist(u.x, u.r, e.x, e.r);
        if (d < bd) { bd = d; best = { kind: "unit", id: e.id }; }
      }
    }
    return best;
  }
  if (def.siege) {
    // محاصره (0.46.0): فقط ساختمان دشمن — در سولو بنای حریف AI (موج ساختمانی ندارد).
    let sbest = null, sbd = def.aggro;
    for (const b of state.buildings) {
      if (b.destroyed || (b.owner == null ? 0 : b.owner) !== CONFIG.AI.owner) continue;
      const p = bldCenter(b);
      const d = dist(u.x, u.r, p.x, p.r);
      if (d <= sbd) { sbd = d; sbest = { kind: "bld", id: b.id }; }
    }
    return sbest;
  }
  let best = null, bd = def.aggro;
  for (const e of state.units) {
    if (e.dead || e.side !== "enemy") continue;
    const d = dist(u.x, u.r, e.x, e.r);
    if (d <= bd) { bd = d; best = { kind: "unit", id: e.id }; }
  }
  // بنای حریف AI هم هدف است (0.42.0: وگرنه ستاد حریف هرگز نمی‌افتاد) —
  // در همان برد aggro، نزدیک‌ترین می‌برد (یگان یا بنا).
  if (!mp) {
    for (const b of state.buildings) {
      if (b.destroyed || (b.owner == null ? 0 : b.owner) !== CONFIG.AI.owner) continue;
      const p = bldCenter(b);
      const d = dist(u.x, u.r, p.x, p.r);
      if (d <= bd) { bd = d; best = { kind: "bld", id: b.id }; }
    }
  }
  return best;
}

function resolveTarget(state, u) {
  // تکراریِ امن (سقف ۳ دور): اگر هدفِ کش‌شده مرده/ویران باشد، acquire فقط
  // هدف زنده برمی‌گرداند، پس حلقه همیشه تمام می‌شود (محافظت در برابر لوپ بی‌نهایت).
  for (let i = 0; i < 3; i++) {
    if (u.targetKind === "unit") {
      const e = findUnit(state, u.targetId);
      if (e && e.garrisonTower == null) return { kind: "unit", u: e }; // مستقر دیگر هدف نیست (0.45.0)
    } else if (u.targetKind === "bld") {
      const b = findBld(state, u.targetId);
      if (b) return { kind: "bld", b };
    }
    const a = acquire(u, state);
    u.targetKind = a ? a.kind : null;
    u.targetId = a ? a.id : null;
    if (!a) return null;
  }
  const b = u.targetKind === "bld" ? findBld(state, u.targetId) : null;
  const e = u.targetKind === "unit" ? findUnit(state, u.targetId) : null;
  if (b) return { kind: "bld", b };
  if (e) return { kind: "unit", u: e };
  u.targetKind = null; u.targetId = null;
  return null;
}

function targetPoint(t) {
  if (t.kind === "unit") return { x: t.u.x, r: t.u.r };
  return bldCenter(t.b);
}

function inRange(u, def, t) {
  const p = targetPoint(t);
  const d = dist(u.x, u.r, p.x, p.r);
  const bonus = t.kind === "bld" ? (t.b.w + t.b.h) / 4 : 0;
  if (d > def.range + bonus) return false;
  if (def.minRange && d < def.minRange) return false; // حداقل برد منجنیق (0.46.0)
  return true;
}

// زره هدف (پیش‌فرض ۰ — ساختمان‌ها و قدیمی‌ها) و خسارت مؤثر.
// فرمول رسمی نبرد (0.41.0): max(1, حمله − زره).
export function unitArmor(u) {
  const def = u && UNITS[u.type];
  return (def && def.armor) || 0;
}
export function effectiveDmg(atk, armor) {
  return Math.max(1, (atk || 0) - (armor || 0));
}

// خسارت محاصره (0.46.0): ضد ساختمان ×bonusVsBld (پیش‌فرض ۱ — رفتار فعلی
// بی‌تغییر)، ضد یگان نصف اگر halfVsUnit (دژکوب). زره ساختمان‌ها ۰ است.
export function dmgVs(def, targetKind) {
  const base = (def && def.dmg) || 0;
  if (targetKind === "bld") return base * ((def && def.bonusVsBld) || 1);
  return (def && def.halfVsUnit) ? base / 2 : base;
}

function strike(state, dmg, t) {
  const mp = state.mp && state.mp.enabled;
  if (t.kind === "unit") {
    if (t.u.dead) return;
    t.u.hp -= effectiveDmg(dmg, unitArmor(t.u)); // زره کم می‌کند، کف ۱
    t.u.flashTick = state.tick;
    if (t.u.hp <= 0) {
      t.u.hp = 0;
      t.u.dead = true;
      // مرگ ارباب = شکست (0.22.0) — آینه سقوط ستاد: توقف + رویداد.
      // در MP حذف سراسری نداریم؛ حذف بازیکن در updateMpAlive.
      if (t.u.type === "lord" && t.u.side === "player" && !mp && !state.defeated) {
        state.defeated = true;
        state.paused = true;
        pushEvent(state, tr("game.ev.lordDead"));
      } else if (mp && t.u.type === "lord") {
        pushEvent(state, tr("game.ev.lordDeadMp", { p: ((t.u.owner == null ? 0 : t.u.owner) + 1) }));
      }
    }
    return;
  }
  if (t.b.destroyed) return;
  t.b.hp -= dmg;
  if (t.b.hp <= 0) {
    t.b.hp = 0;
    destroyBuilding(state, t.b);
  }
}

function destroyBuilding(state, b) {
  const mp = state.mp && state.mp.enabled;
  b.destroyed = true;
  const W = CONFIG.GRID_W;
  for (let j = 0; j < b.h; j++) {
    for (let i = 0; i < b.w; i++) state.occ[(b.r + j) * W + (b.c + i)] = 0;
  }
  releaseGarrison(state, b); // مدافعان بیرون می‌پرند (0.45.0)
  pushEvent(state, tr("game.ev.destroyed", { building: CONFIG.BUILDINGS[b.type].name }));
  // سقوط ستاد = شکست (0.19.0): بازی متوقف می‌شود (بنر + شروع دوباره در main.js).
  // فقط ستاد خودی (0.42.0: ستاد AI شکست بازیکن نیست — خاموشی AI در ai.js است).
  // در MP حذف بازیکن در updateMpAlive است.
  if (b.type === "keep" && !mp && !state.defeated && (b.owner == null ? 0 : b.owner) === 0) {
    state.defeated = true;
    state.paused = true;
    pushEvent(state, tr("game.ev.keepFell"));
  } else if (mp && b.type === "keep") {
    pushEvent(state, tr("game.ev.keepFellMp", { p: ((b.owner == null ? 0 : b.owner) + 1) }));
  }
}

// تخریب دستی (0.39.0 — #۳ از FEATURES؛ 0.62.0 — ب-۱: بازگشت یک‌سوم هزینه):
// مثل ویرانی جنگی ولی بدون ماشه شکست (ستاد از ابتدا رد می‌شود)، با بازگشت
// floor(cost/3) به‌ازای هر منبع (کف، با سقف انبار) و رویداد جدا. ویرانی جنگی
// (destroyBuilding) غرامت نمی‌دهد — فقط تخریب دستی.
// پاسگاه‌های نگهبانیِ آن خودکار می‌افتند (guardPost ویران‌شده را null می‌کند)
// و هدف‌گیری‌ها آن را نادیده می‌گیرند.
export const DEMOLISH_FA = lazyTable("game.demolish", ["INVALID", "NOT_OWNED", "KEEP"]);

// غرامت تخریب (ب-۱، خالص و تست‌پذیر): یک‌سوم هزینه ساخت هر منبع، کف.
// هزینه ۲ (دیوار) → صفر؛ کلبه (۱۰چ) → ۳چ؛ برج (۲۰چ+۱۰ط+۱۰سنگ) → ۶چ+۳ط+۳سنگ.
export function demolishRefund(type) {
  const def = CONFIG.BUILDINGS[type];
  const out = {};
  if (!def || !def.cost) return out;
  for (const k of Object.keys(def.cost)) {
    const v = Math.floor((def.cost[k] || 0) / 3);
    if (v > 0) out[k] = v;
  }
  return out;
}

export function validateDemolish(state, bldId, owner) {
  owner = owner == null ? 0 : owner;
  const b = state.buildings.find((x) => x.id === bldId && !x.destroyed);
  if (!b) return { ok: false, reason: "INVALID" };
  if ((b.owner == null ? 0 : b.owner) !== owner) return { ok: false, reason: "NOT_OWNED" };
  if (b.type === "keep") return { ok: false, reason: "KEEP" };
  return { ok: true, reason: "OK", building: b };
}

export function demolishBuilding(state, b, owner) {
  const ow = owner == null ? (b.owner == null ? 0 : b.owner) : owner;
  b.destroyed = true;
  const W = CONFIG.GRID_W;
  for (let j = 0; j < b.h; j++) {
    for (let i = 0; i < b.w; i++) state.occ[(b.r + j) * W + (b.c + i)] = 0;
  }
  releaseGarrison(state, b); // تخریب برج هم گاریسون را آزاد می‌کند (0.45.0)
  // غرامت ب-۱: یک‌سوم هزینه به همان کیسه‌ای که پرداخت کرده (سولو/MP/AI)،
  // با سقف جاری (تخریب انبار اول سقف را می‌اندازد بعد غرامت تراشیده می‌شود).
  const ref = demolishRefund(b.type);
  const rkeys = Object.keys(ref);
  if (rkeys.length) {
    const mp = state.mp && state.mp.enabled;
    let res = null;
    if (mp) { if (state.mpres && state.mpres[ow]) res = state.mpres[ow].resources; }
    else if (ow === CONFIG.AI.owner && state.ai) res = state.ai.resources;
    else res = state.resources;
    if (res) {
      for (const k of rkeys) res[k] = Math.min(capFor(state, k, ow), (res[k] || 0) + ref[k]);
    }
  }
  pushEvent(state, tr("game.ev.demolished", { building: CONFIG.BUILDINGS[b.type].name }));
  return { ok: true, reason: "OK" };
}

function moveSlide(state, terrain, W, H, u, tx, tr, step) {
  const dx = tx - u.x, dr = tr - u.r;
  const d = Math.sqrt(dx * dx + dr * dr);
  if (d < 1e-6) return;
  const vx = (dx / d) * step, vr = (dr / d) * step;
  if (walkable(state, terrain, W, H, u.x + vx, u.r + vr, u.side, u.owner)) {
    u.x += vx; u.r += vr;
  } else if (walkable(state, terrain, W, H, u.x + vx, u.r, u.side, u.owner)) {
    u.x += vx;
  } else if (walkable(state, terrain, W, H, u.x, u.r + vr, u.side, u.owner)) {
    u.r += vr;
  }
  // وگرنه می‌ایستد (fallback — وقتی مسیر A* ناممکن است)
}

// --- مسیریابی A* (CORE-001) ---
// خانه هدف برای یک تارگت: اگر مرکز هدف walkable است همان، وگرنه نزدیک‌ترین
// همسایه walkable (برای ساختمان‌ها: کنار دیوار، نه داخل بنا).
function goalCell(state, terrain, W, H, t, side, owner) {
  const p = targetPoint(t);
  let gc = Math.floor(p.x), gr = Math.floor(p.r);
  if (gc < 0) gc = 0; else if (gc >= W) gc = W - 1;
  if (gr < 0) gr = 0; else if (gr >= H) gr = H - 1;
  const occ = occForSide(state, side, owner);
  if (isCellWalkable(terrain, occ, W, H, gc, gr)) return [gc, gr];
  return nearestWalkable(terrain, occ, W, H, gc, gr, 8);
}

// مسیر را تضمین می‌کند (بازمحاسبه وقتی: هدف عوض شده، نقطه بعدی مسدود شده،
// یا بیش از ۱۵ تیک از محاسبه گذشته برای تارگت‌های متحرک). برمی‌گرداند:
// آرایه مسیر، یا null اگر ناممکن.
function ensurePath(state, terrain, W, H, u, gc, gr) {
  const key = gc + "," + gr;
  const occ = occForSide(state, u.side, u.owner);
  const age = state.tick - (u.pathTick == null ? -9999 : u.pathTick);
  if (u.path && u.pathGoal === key && u.pathIdx < u.path.length && age <= 15) {
    const wp = u.path[u.pathIdx];
    // نقطه بعدی هنوز باز است؟ (هدف نهایی خودش walkable است)
    if (wp[0] === gc && wp[1] === gr) return u.path;
    if (isCellWalkable(terrain, occ, W, H, wp[0], wp[1])) return u.path;
    // وگرنه مسدود شده (ساختمان جدید) → بازمحاسبه در ادامه
  }
  let sc = Math.floor(u.x), sr = Math.floor(u.r);
  if (sc < 0) sc = 0; else if (sc >= W) sc = W - 1;
  if (sr < 0) sr = 0; else if (sr >= H) sr = H - 1;
  const p = findPath(terrain, occ, W, H, sc, sr, gc, gr);
  u.path = p;
  u.pathGoal = key;
  // نقطه اول خودِ خانه فعلی است (findPath هر دو سر را برمی‌گرداند) — رد شو تا
  // یک تیک برای «رسیدن به جایی که هستیم» هدر نرود.
  u.pathIdx = (p && p.length > 1 && p[0][0] === sc && p[0][1] === sr) ? 1 : 0;
  u.pathTick = state.tick;
  u.noPath = !p;
  return p;
}

function followPath(u, step) {
  const wp = u.path[u.pathIdx];
  const tx = wp[0] + 0.5, tr = wp[1] + 0.5;
  const dx = tx - u.x, dr = tr - u.r;
  const d = Math.sqrt(dx * dx + dr * dr);
  if (d <= step) {
    u.x = tx; u.r = tr;
    u.pathIdx++;
    return;
  }
  u.x += (dx / d) * step;
  u.r += (dr / d) * step;
}

function moveToward(state, terrain, W, H, u, def, t) {
  const p = targetPoint(t);
  const g = goalCell(state, terrain, W, H, t, u.side, u.owner);
  const step = def.speed / HZ;
  if (!g) {
    // هیچ همسایه بازی برای هدف نیست — لغزش مستقیم (بهترین تلاش)
    moveSlide(state, terrain, W, H, u, p.x, p.r, step);
    return;
  }
  const path = ensurePath(state, terrain, W, H, u, g[0], g[1]);
  if (path && u.pathIdx < path.length) {
    followPath(u, step);
  } else {
    // ناممکن یا انتهای مسیر ولی هنوز خارج برد — لغزش مستقیم
    moveSlide(state, terrain, W, H, u, p.x, p.r, step);
  }
}

function fightTarget(state, terrain, W, H, u, def, t) {
  if (def.needsDeploy && !u.deployed) {
    // منجنیق سیار: نزدیک می‌شود ولی شلیک نمی‌کند (0.46.0).
    if (!inRange(u, def, t)) moveToward(state, terrain, W, H, u, def, t);
    return;
  }
  if (inRange(u, def, t)) {
    if (u.cooldown <= 0) {
      strike(state, dmgVs(def, t.kind), t);
      if (def.needsDeploy) pushFx(state, u, t); // قوس پرتاب — نمایشی، خارج sim
      else if (t.kind === "unit") pushClash(state, u, t, def); // جرقه نبرد (ب-۲) — نمایشی، خارج sim
      u.cooldown = def.cd;
    }
  } else if (u.stance !== STANCES.HOLD && !(def.needsDeploy && u.deployed)) {
    moveToward(state, terrain, W, H, u, def, t);
  }
  // موضع hold: ضربه در برد آزاد است، ولی حرکت داوطلبانه نه.
  // منجنیق مستقرِ بیرون‌برد می‌ایستد (سرعت ۰).
}

// جلوه پرتاب منجنیق (0.46.0) + جرقه نبرد (ب-۲، 0.63.0): گذرا و نمایشی —
// نه در هش (stateHash در mp.js فیلد fx را نمی‌خواند)، نه در ذخیره (serialize
// در persist.js فیلدبه‌فیلد است و fx جا می‌ماند)؛ رندر از همین می‌کشد.
// سقف مشترک ۴۰ تا (نبردهای شلوغ قوس‌ها را بیرون نکنند).
const FX_CAP = 40;
function pushFx(state, u, t) {
  if (!Array.isArray(state.fx)) state.fx = [];
  const p = targetPoint(t);
  state.fx.push({ x0: u.x, r0: u.r, x1: p.x, r1: p.r, tick: state.tick });
  if (state.fx.length > FX_CAP) state.fx.splice(0, state.fx.length - FX_CAP);
}

// جرقه نبرد تن‌به‌تن (ب-۲): برد ≤۲ (شمشیر/نیزه/گرز/...) = جرقه برخورد در
// میانه دو مبارز؛ دوربرد (کمان/زوبین/...) = خط شلیک سریع. شلیک برج/گاریسون
// عمداً بیرون‌اند (ساختمان‌اند، نه «کاراکتر») — فقط فلش اصابت دارند.
function pushClash(state, u, t, def) {
  if (!Array.isArray(state.fx)) state.fx = [];
  const p = targetPoint(t);
  state.fx.push({
    kind: (def.range || 0) > 2 ? "shot" : "clash",
    x0: u.x, r0: u.r, x1: p.x, r1: p.r, tick: state.tick,
  });
  if (state.fx.length > FX_CAP) state.fx.splice(0, state.fx.length - FX_CAP);
}

// گام نگهبانی (0.15.0): نزدیک‌ترین دشمنِ در شعاع پاسگاه هدف است (تعقیب فقط
// تا یک خانه بیرون شعاع — افسار)؛ وگرنه بازگشت به خانه. پاسگاه از دست رفته
// → بازگشت به engage. دستور صریحِ فعال هرگز به اینجا نمی‌رسد (ارجح است).
function guardStep(state, terrain, W, H, u, def) {
  const post = guardPost(state, u);
  if (!post) {
    u.stance = STANCES.ENGAGE;
    u.guardBld = null;
    pushEvent(state, tr("game.ev.guardLost", { id: u.id }));
    const t = resolveTarget(state, u);
    if (t) fightTarget(state, terrain, W, H, u, def, t);
    return;
  }
  const c = bldCenter(post);
  if (def.siege) {
    // محاصره در نگهبانی هم فقط ساختمان می‌زند (0.46.0).
    const t = resolveTarget(state, u);
    if (t) {
      fightTarget(state, terrain, W, H, u, def, t);
    } else {
      u.targetKind = null;
      u.targetId = null;
      if (dist(u.x, u.r, c.x, c.r) > GUARD_HOME) {
        moveSlide(state, terrain, W, H, u, c.x, c.r, def.speed / HZ);
      }
    }
    return;
  }
  let best = null, bd = GUARD_RADIUS;
  const mpG = state.mp && state.mp.enabled;
  const uowG = u.owner == null ? 0 : u.owner;
  for (const e of state.units) {
    if (e.dead || e.garrisonTower != null) continue; // مستقر قابل‌هدف نیست (0.45.0)
    if (e.side === u.side && (!mpG || (e.owner == null ? 0 : e.owner) === uowG)) continue;
    if (mpG && e.side === "player" && (e.owner == null ? 0 : e.owner) === uowG) continue;
    const d = dist(e.x, e.r, c.x, c.r);
    if (d <= bd) { bd = d; best = e; }
  }
  if (best) {
    u.targetKind = "unit";
    u.targetId = best.id;
    // افسار: بیرون شعاع+۱ قدم برنمی‌دارد (می‌ایستد و اگر در برد است می‌زند).
    if (dist(u.x, u.r, c.x, c.r) <= GUARD_RADIUS + 1) {
      fightTarget(state, terrain, W, H, u, def, { kind: "unit", u: best });
    } else if (inRange(u, def, { kind: "unit", u: best }) && u.cooldown <= 0) {
      strike(state, def.dmg, { kind: "unit", u: best });
      u.cooldown = def.cd;
    }
    return;
  }
  u.targetKind = null;
  u.targetId = null;
  if (dist(u.x, u.r, c.x, c.r) > GUARD_HOME) {
    moveSlide(state, terrain, W, H, u, c.x, c.r, def.speed / HZ);
  }
  // وگرنه سر پست می‌ایستد (مأموریت idle می‌ماند — نگهبانی وضعیت است، نه مأموریت).
}

export function stepCombat(state, terrain) {
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const mp = state.mp && state.mp.enabled;

  // ۱. برج‌ها (ساختمان‌های مسلح) — نیمه‌کاره شلیک نمی‌کند (0.39.0).
  for (const b of state.buildings) {
    if (b.destroyed || underConstruction(b)) continue;
    const w = CONFIG.BUILDINGS[b.type].weapon;
    if (!w) continue;
    b.cooldown = (b.cooldown || 0);
    if (b.cooldown > 0) b.cooldown--;
    const p = bldCenter(b);
    const bow = b.owner == null ? 0 : b.owner;
    let tgt = b.targetId != null ? findUnit(state, b.targetId) : null;
    const tgtOk = tgt && !tgt.dead && tgt.garrisonTower == null && dist(p.x, p.r, tgt.x, tgt.r) <= w.range &&
      (mp ? (tgt.side !== "player" || (tgt.owner == null ? 0 : tgt.owner) !== bow) : tgt.side === "enemy");
    if (!tgtOk) {
      tgt = null;
      let bd = w.range;
      for (const e of state.units) {
        if (e.dead || e.garrisonTower != null) continue; // مستقر قابل‌هدف نیست (0.45.0)
        if (mp) {
          if (e.side === "player" && (e.owner == null ? 0 : e.owner) === bow) continue;
          if (e.side !== "player" && e.side !== "enemy") continue;
        } else if (e.side !== "enemy") continue;
        const d = dist(p.x, p.r, e.x, e.r);
        if (d <= bd) { bd = d; tgt = e; }
      }
      b.targetId = tgt ? tgt.id : null;
    }
    if (tgt && b.cooldown <= 0) {
      strike(state, w.dmg, { kind: "unit", u: tgt });
      b.cooldown = w.cd;
    }
    // شلیک گاریسون (0.45.0): هر مدافع زنده با cooldown خودش از مرکز برج با
    // برد+۲ و خسارت خودش می‌زند (زره هدف در strike). شلیک پایه سر جایش است
    // (t_combat_tower نباید بشکند — گاریسون فقط اضافه می‌کند).
    if (Array.isArray(b.garrison) && b.garrison.length) {
      const kept = [];
      for (const gid of b.garrison) {
        const gu = state.units.find((x) => x.id === gid && !x.dead);
        if (!gu || gu.garrisonTower !== b.id) continue; // مرده/ناهمگام = هرس
        kept.push(gid);
        const gdef = UNITS[gu.type];
        if (!gdef) continue;
        if (gu.cooldown > 0) gu.cooldown--;
        let gt = null, bd = gdef.range + 2;
        for (const e of state.units) {
          if (e.dead || e.garrisonTower != null) continue;
          if (mp) {
            if (e.side === "player" && (e.owner == null ? 0 : e.owner) === bow) continue;
            if (e.side !== "player" && e.side !== "enemy") continue;
          } else if (e.side !== "enemy") continue;
          const d = dist(p.x, p.r, e.x, e.r);
          if (d <= bd) { bd = d; gt = e; }
        }
        if (gt && gu.cooldown <= 0) {
          strike(state, gdef.dmg, { kind: "unit", u: gt });
          gu.cooldown = gdef.cd;
        }
      }
      b.garrison = kept;
    }
  }

  // ۲. واحدها به ترتیب id
  for (const u of state.units) {
    if (u.dead) continue;
    if (u.garrisonTower != null) {
      // مستقرها نوبت جدا (شاخه ۱ب) دارند؛ نگهبانِ برجِ ازدست‌رفته = آزادِ درجا.
      if (!state.buildings.some((x) => x.id === u.garrisonTower && !x.destroyed)) {
        u.garrisonTower = null;
      } else continue;
    }
    const def = UNITS[u.type];
    if (u.cooldown > 0) u.cooldown--;
    if (u.order && u.order.status === "active") {
      if (u.order.kind === "retreat") {
        followRetreat(state, terrain, W, H, u, def); // بی‌درگیری، فقط فرار
        continue;
      }
      if (u.order.kind === "attackmove") {
        const t = resolveTarget(state, u);
        if (t) { fightTarget(state, terrain, W, H, u, def, t); continue; }
      }
      followOrder(state, terrain, W, H, u, def); // مأموریت صریح بر کسب خودکار مقدم است
      continue;
    }
    if (u.stance === STANCES.GUARD) {
      guardStep(state, terrain, W, H, u, def);
      continue;
    }
    const t = resolveTarget(state, u);
    if (!t) continue;
    fightTarget(state, terrain, W, H, u, def, t);
  }

  // ۳. جارو: مرده‌ها حذف، ارجاع‌های کهنه پاک
  if (state.units.some((u) => u.dead)) {
    state.units = state.units.filter((u) => !u.dead);
  }
  // پیروزی (0.22.0): پس از آخرین موج، هیچ دشمن زنده‌ای نمانده — بازی متوقف می‌شود.
  // در MP شرط برد جداست (updateMpAlive در mp.js).
  if (!mp && !state.defeated && !state.victorious && state.wave >= FINAL_WAVE &&
      !state.units.some((u) => u.side === "enemy" && !u.dead)) {
    state.victorious = true;
    state.paused = true;
    pushEvent(state, tr("game.ev.lastWave"));
  }
  for (const u of state.units) {
    if (u.targetKind === "unit" && !findUnit(state, u.targetId)) {
      u.targetKind = null; u.targetId = null;
    } else if (u.targetKind === "bld" && !findBld(state, u.targetId)) {
      u.targetKind = null; u.targetId = null;
    }
  }
  if (state.buildings.some((b) => b.destroyed)) {
    state.buildings = state.buildings.filter((b) => !b.destroyed);
    for (const b of state.buildings) {
      if (b.targetId != null && !findUnit(state, b.targetId)) b.targetId = null;
    }
  }
}
