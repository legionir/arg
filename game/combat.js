// نبرد پایه (MIL-001) + مسیریابی A* (CORE-001، برش ششم).
// حرکت: A* چهارجهته قطعی روی گرید؛ لغزش خطی فقط fallback است وقتی
// هدف هیچ همسایه walkable ندارد یا مسیر ناممکن است. برخورد واحد-واحد نداریم.
import { t as tr } from "./i18n.js";
import { lazyTable } from "./lazytext.js";
import { CONFIG } from "./config.js";
import { UNITS, TUNING } from "./data.js";
import { T_GRASS, T_OASIS } from "./terrain.js";
import { underConstruction, hasLiveKeep } from "./construction.js";
import { capFor, fearAttackMult, takeCow, FIRE, housingCap, atPopCap } from "./economy.js";
import { findPath, nearestWalkable, isCellWalkable } from "./pathfind.js";
import { statelessRand } from "./rng.js";

// گام منطق بر ثانیه — تنها منبع حقیقت CONFIG.TICK_HZ است (فاز ۰ بند ۱ و ۷:
// بدون عدد hard-code؛ تغییر TICK_HZ همه سرعت‌ها را مقیاس می‌کند چون همه
// تقسیم‌ها از همین تابع می‌آیند). مقدار فعلی ۱۰ است؛ پیشنهاد ۲۰Hz دفترچه
// نیاز به بازتوازن همه everyTicks/cd/trainTicks دارد و بیرون بند ۱ است.
const simHz = () => CONFIG.TICK_HZ;
// نرخ تیک منطق برای تست‌ها (فاز ۰ بند ۱): تنها خوانش مجاز گام منطق.
export function simTickHz() { return CONFIG.TICK_HZ; }

// جدول اعداد — سرعت/HP/هزینه واحدهای مرجع‌دار از Stronghold Wiki پذیرفته شد
// (0.14.0)؛ بقیه guess تا استخراج. ترتیب سرعت مرجع: شمشیرزن زرهی کندِ تانک،
// کماندارها تندِ شکننده، سرباز مزدور میانه.
// زره رسمی (0.41.0 — #۵ از FEATURES): هر واحد `armor` دارد؛ خسارت وارده =
// max(1, حمله − زره) در strike. همه armorها guess اند (زره‌پوش‌ها ۳،
// پیاده متوسط ۱، سبک/دوربرد ۰؛ شمشیرزن دشمن ۱ تا TTK برج سر جایش بماند).
// کاتالوگ واحدها (فاز ۰ بند ۴): تنها منبع حقیقت `data/units.json` است
// (لودر game/data.js) — توازن را همان‌جا ویرایش کنید، نه اینجا.
// سرعت/HP/هزینه مرجع‌دار از Stronghold Wiki پذیرفته شد (0.14.0)؛ بقیه guess.
// زره رسمی (0.41.0): خسارت = max(1، حمله − زره).
export { UNITS };

// آخرین موج (0.22.0): نابودی همه دشمنان موج FINAL_WAVE به بعد = پیروزی.
export const FINAL_WAVE = 5;

// صلح اولیه No Rush (0.149.0 — §۱۴.۲/بند ۷۳۰): مدت صلح تایمردار از آغاز
// بازی که در آن حمله و ساخت نیرو ممنوع است. دفترچه عدد نمی‌دهد — guess:
// ۱۸۰۰ تیک = ۳ دقیقه با HZ=۱۰ (ثبت در numbers-registry).
export const PEACE_TICKS = 1800;

// صلح فعال؟ فقط اتاق noRush و پیش از پایان peaceUntil. خالص و MP-aware
// (پرچم/شمارنده در rules/state؛ هر دو در هش/ذخیره‌اند).
export function peaceActive(state) {
  return !!(state && state.rules && state.rules.noRush && (state.tick || 0) < (state.peaceUntil || 0));
}

export const HIRE_FA = lazyTable("game.hire", ["OK", "OUT_OF_BOUNDS", "TERRAIN", "OCCUPIED", "NO_BARRACKS", "NO_CATHEDRAL", "NO_ENG_GUILD", "NO_TUN_GUILD", "NO_STABLE", "NO_HORSE", "NEEDS_WEAPON", "INSUFFICIENT", "QUEUE_FULL"]);

// پیش‌نیاز استخدام (0.29.0): ساختمانِ requires سالمِ همان مالک.
// در سولو همه ساختمان‌ها خودی‌اند (owner ۰)؛ در MP فقط خودی شمرده می‌شود.
export function hasBarracks(state, owner) {
  owner = owner == null ? 0 : owner;
  // سربازخانه نیمه‌کاره استخدام نمی‌دهد (0.39.0).
  return state.buildings.some((b) => b.type === "barracks" && !b.destroyed && !underConstruction(b) && (b.owner == null ? 0 : b.owner) === owner);
}
// پیش‌نیاز راهب جنگجو (فاز ۱ بند ۷۶): کلیسای جامع سالمِ همان مالک.
export function hasCathedral(state, owner) {
  owner = owner == null ? 0 : owner;
  return state.buildings.some((b) => b.type === "cathedral" && !b.destroyed && !underConstruction(b) && (b.owner == null ? 0 : b.owner) === owner);
}

// پست مزدور زنده همان مالک (0.166.0 — §9.1/بند 169): میزبان استخدام طلایی مزدورها.
export function mercpostOf(state, owner) {
  owner = owner == null ? 0 : owner;
  let best = null;
  for (const b of state.buildings) {
    if (b.type !== "mercpost" || b.destroyed) continue;
    if (typeof b.buildLeft === "number" && b.buildLeft > 0) continue; // نیمه‌کاره صف ندارد (الگوی barracksOf)
    if ((b.owner == null ? 0 : b.owner) !== owner) continue;
    if (!best || b.id < best.id) best = b;
  }
  return best;
}

// بناهای انجمن (0.167.0 — §9.3/بندهای 172-174 + §8.1/ردیف‌های 129-130):
// engineerguild (مهندس/نردبان‌بر) و tunnelerguild (حفار) — میزبان استخدام طلایی.
export const GUILD_BUILDINGS = ["engineerguild", "tunnelerguild"];
export function guildKindOf(def) {
  if (!def || typeof def.requires !== "string") return null;
  return GUILD_BUILDINGS.includes(def.requires) ? def.requires : null;
}
export function isGuildUnit(type) { return guildKindOf(UNITS[type]) !== null; }
export function guildOf(state, owner, kind) {
  owner = owner == null ? 0 : owner;
  let best = null;
  for (const b of state.buildings) {
    if (b.type !== kind || b.destroyed) continue;
    if (typeof b.buildLeft === "number" && b.buildLeft > 0) continue; // نیمه‌کاره صف ندارد (الگوی barracksOf)
    if ((b.owner == null ? 0 : b.owner) !== owner) continue;
    if (!best || b.id < best.id) best = b;
  }
  return best;
}
// اصطبل و اسب (0.168.0 — §8.1/ردیف 419 + §18.1/ردیف 870):
// هر اصطبل سالمِ تکمیل‌شده تا 4 اسب نگه می‌دارد (HORSES_PER_STABLE)؛ هر شوالیه
// (requiresHorse) در لحظه سفارش 1 اسب از اصطبل همان مالک برمی‌دارد؛ هر اسب
// مصرف‌شده با شمارش 600تیکه (60 ثانیه) یک‌به‌یک برمی‌گردد (stepStables).
// قطعی و MP-امن: موجودی/شمارش در هش/ذخیره‌اند (الگوی dogcage/dairy).
export const HORSES_PER_STABLE = 4;
export const HORSE_REFILL_TICKS = 600; // 60 ثانیه (10 تیک = 1 ثانیه)
export function stableHorses(b) {
  if (!b) return HORSES_PER_STABLE;
  return Number.isInteger(b.horses) && b.horses >= 0 ? Math.min(b.horses, HORSES_PER_STABLE) : HORSES_PER_STABLE;
}
export function hasStable(state, owner) {
  owner = owner == null ? 0 : owner;
  for (const b of state.buildings) {
    if (b.type !== "stable" || b.destroyed) continue;
    if (typeof b.buildLeft === "number" && b.buildLeft > 0) continue;
    if ((b.owner == null ? 0 : b.owner) !== owner) continue;
    return true;
  }
  return false;
}
// نخستین اصطبل اسب‌دار همان مالک (الگوی mercpostOf/guildOf: کمترین id).
export function stableWithHorse(state, owner) {
  owner = owner == null ? 0 : owner;
  let best = null;
  for (const b of state.buildings) {
    if (b.type !== "stable" || b.destroyed) continue;
    if (typeof b.buildLeft === "number" && b.buildLeft > 0) continue;
    if ((b.owner == null ? 0 : b.owner) !== owner) continue;
    if (stableHorses(b) <= 0) continue;
    if (!best || b.id < best.id) best = b;
  }
  return best;
}
// برگرداندن 1 اسب به نخستین اصطبلِ جا‌دار همان مالک (لغو/ویرانی/undo)؛
// بی‌اصطبل/پر = سوختن (تصمیم ثبت‌شده).
export function restoreHorse(state, owner) {
  owner = owner == null ? 0 : owner;
  let best = null;
  for (const b of state.buildings) {
    if (b.type !== "stable" || b.destroyed) continue;
    if (typeof b.buildLeft === "number" && b.buildLeft > 0) continue;
    if ((b.owner == null ? 0 : b.owner) !== owner) continue;
    if (stableHorses(b) >= HORSES_PER_STABLE) continue;
    if (!best || b.id < best.id) best = b;
  }
  if (!best) return false;
  best.horses = stableHorses(best) + 1;
  return true;
}
// شارژمجدد اسب‌ها (0.168.0): شمارش هر اصطبل ناقص هر تیک یکی کم می‌شود؛
// صفر = 1 اسب + شروع شمارش بعدی تا پرشدن (الگوی stepKennels ولی شمارش‌محور).
export function stepStables(state) {
  if (!state) return 0;
  let n = 0;
  for (const b of state.buildings) {
    if (!b || b.destroyed || b.type !== "stable" || underConstruction(b)) continue;
    const h = stableHorses(b);
    if (h >= HORSES_PER_STABLE) { b.horseLeft = 0; continue; }
    if (b.horses === undefined) b.horses = h;
    if (!(b.horseLeft > 0)) b.horseLeft = HORSE_REFILL_TICKS;
    b.horseLeft--;
    if (b.horseLeft <= 0) {
      b.horses = h + 1;
      b.horseLeft = (h + 1) < HORSES_PER_STABLE ? HORSE_REFILL_TICKS : 0;
      n++;
    }
  }
  return n;
}
// بهای طلایی مزدور (0.166.0 — §9.1/بند 169): طلا+غذا با نرخ ۱:۱، بی‌سلاح.
// guess (دفترچه عدد نمی‌دهد)؛ در research/numbers-registry ثبت است.
export function mercGoldOf(type) {
  const def = UNITS[type];
  if (!def) return 0;
  if (Number.isInteger(def.mercGold) && def.mercGold >= 0) return def.mercGold;
  const c = def.cost || { food: 0, gold: 0 };
  return (c.food || 0) + (c.gold || 0);
}

// درِ ستاد (0.166.0 — §9.1/بند 168): campfire موتور همان ستاد است — دهقانان
// آنجا منتظرند (campGauge). نزدیک‌ترین خانه چمنِ آزاد دور ردپا (شعاع تا ۶؛
// ترتیب قطعی: شعاع، بعد سطر، بعد ستون) یا null اگر ستاد/جا نیست.
export const KEEP_DOOR_R = 6;
export function keepDoorOf(state, terrain, W, H, owner) {
  owner = owner == null ? 0 : owner;
  let keep = null;
  for (const b of state.buildings) {
    if (b.type !== "keep" || b.destroyed) continue;
    if (typeof b.buildLeft === "number" && b.buildLeft > 0) continue;
    if ((b.owner == null ? 0 : b.owner) !== owner) continue;
    if (!keep || b.id < keep.id) keep = b;
  }
  if (!keep) return null;
  for (let k = 1; k <= KEEP_DOOR_R; k++) {
    for (let r = keep.r - k; r <= keep.r + keep.h - 1 + k; r++) {
      for (let c = keep.c - k; c <= keep.c + keep.w - 1 + k; c++) {
        const edge = c === keep.c - k || c === keep.c + keep.w - 1 + k || r === keep.r - k || r === keep.r + keep.h - 1 + k;
        if (edge && isCellWalkable(terrain, state.occ, W, H, c, r)) return [c, r];
      }
    }
  }
  return null;
}

export const RALLY_FA = lazyTable("game.rally", ["OK", "INVALID"]);

// کلید پرچم تجمع (0.166.0 — §9.1/بند 170): به‌ازای مالک و نوع — یک
// state.rally سراسری، سریال‌شدنی و هش‌شدنی (مشروط، مثل train).
export function rallyKey(owner, type) {
  return (owner == null ? 0 : owner) + ":" + type;
}

// نقطه تجمع نوع (در-bounds) یا null. خالص و MP-امن.
export function rallyPoint(state, owner, type) {
  const v = state.rally && state.rally[rallyKey(owner, type)];
  if (!v || typeof v !== "object") return null;
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  if (!Number.isInteger(v.c) || !Number.isInteger(v.r)) return null;
  if (v.c < 0 || v.r < 0 || v.c >= W || v.r >= H) return null;
  return [v.c, v.r];
}

// گذاشتن پرچم تجمع (0.166.0 — §9.1/بند 170): فقط نوع قابل‌استخدام خودی؛
// فرمان rally از صف sim/ورودی MP می‌آید (آینه disband). خالص و قطعی.
export function setRally(state, type, c, r, owner) {
  owner = owner == null ? 0 : owner;
  const def = UNITS[type];
  if (!def || def.side !== "player" || def.noHire || !def.cost) return { ok: false, reason: "INVALID" };
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  if (!Number.isInteger(c) || !Number.isInteger(r) || c < 0 || r < 0 || c >= W || r >= H) {
    return { ok: false, reason: "INVALID" };
  }
  if (!state.rally || typeof state.rally !== "object") state.rally = {};
  state.rally[rallyKey(owner, type)] = { c, r };
  return { ok: true, reason: "OK" };
}

export function spawnUnit(state, type, x, r, owner) {
  const def = UNITS[type];
  const qx = qpos(x), qr = qpos(r); // ناوردای Q6 از بدو تولد (فاز ۰ بند ۲)
  const u = {
    id: state.nextUnitId++, type, side: def.side,
    x: qx, r: qr, px: qx, pr: qr, hp: def.hp, maxHp: def.hp, cooldown: 0,
    homeX: qx, homeR: qr, // پست تدافعی (0.153.0): آغاز = جای ظهور
    huntId: null, // شکار تلافی‌جویانه (0.154.0 — بند 568): null یعنی نیست
    owner: owner == null ? 0 : owner,
    targetKind: null, targetId: null, flashTick: -99,
    // وضعیت مسیر (CORE-001): path آرایه [c,r] از findPath است؛ ذخیره نمی‌شود
    // و پس از load بازمحاسبه می‌شود (persist.js را ببین).
    // موقعیت رندر قبلی برای درون‌یابی نمایشی بین دو تیک (فاز ۰ بند ۱):
    // کاملاً نمایشی — خارج sim/هش/ذخیره (مثل path)؛ sim هر تیک آن را تازه می‌کند.
    path: null, pathGoal: null, pathIdx: 0, pathTick: -999, noPath: false,
    // مأموریت صریح (لایه ۱ قرارداد): order فعال یا null؛ mission آخرین وضعیت
    // ('idle' | 'active' | 'done' | 'failed') — همیشه قابل پرس‌وجوست.
    order: null, mission: "idle",
    stance: STANCES.ENGAGE, // موضع: engage (تعقیب) / hold (پابرجا) / defend (تدافعی با homeX/homeR) / guard (نگهبانی با guardBld)
    guardBld: null, // شناسه پاسگاه در موضع guard (وگرنه null)
    garrisonTower: null, // برج میزبان گاریسون (0.45.0) — null یعنی آزاد
    deployed: false, // استقرار منجنیق (0.46.0) — مستقر = سرعت ۰ + شلیک آزاد
    // مهمات منجنیق (0.149.0 — §۱۲.۲/بند ۵۷۸): سنگ‌های آماده؛ فقط نوع‌های
    // ammoCapدار (منجنیق) این فیلد را دارند (غایب = بی‌مهمات/نامحدود قدیمی).
    // پر با سقف در spawn؛ هر شلیک ۱ کم می‌کند؛ صفر = بی‌شلیک تا تأمین مجدد.
    ...(def && def.ammoCap ? { ammo: def.ammoCap } : {}),
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
  // مسیر مزدور طلایی (0.166.0 — §9.1/بند 169): با پست مزدور زنده همان مالک،
  // مزدورِ mercدار فقط طلا می‌خواهد (mercGold = طلا+غذا، بی‌سلاح) و پیش‌نیاز
  // ساختمانی ندارد؛ وگرنه مسیر سربازخانه قدیمی (غذا+طلا+سلاح) برقرار است.
  const useMerc = def.merc === true && !!mercpostOf(state, owner);
  const gKind = guildKindOf(def);
  const useGuild = gKind !== null && !!guildOf(state, owner, gKind);
  if (!useMerc && !useGuild) {
    // پیش‌نیاز ساختمانی (0.29.0 سرباز، 0.30.0 سرباز و کماندار): بدون سربازخانه سالم خودی نه.
    if (def.requires === "barracks" && !hasBarracks(state, owner)) {
      return { ok: false, reason: "NO_BARRACKS" };
    }
    // پیش‌نیاز راهب جنگجو (فاز ۱ بند ۷۶): بدون کلیسای جامع سالم خودی نه.
    if (def.requires === "cathedral" && !hasCathedral(state, owner)) {
      return { ok: false, reason: "NO_CATHEDRAL" };
    }
    // پیش‌نیاز انجمن (0.167.0 — §9.3): بدون بنای انجمن سالم خودی نه (راه‌برگشت legacy نیست).
    if (gKind === "engineerguild") return { ok: false, reason: "NO_ENG_GUILD" };
    if (gKind === "tunnelerguild") return { ok: false, reason: "NO_TUN_GUILD" };
    // پیش‌نیاز اسب شوالیه (0.168.0 — §18.1/ردیف 870): بی‌اصطبل سالم خودی نه؛
    // اصطبل خالی هم نه (اسب‌ها 60ثانیه‌ای برمی‌گردند).
    if (def.requiresHorse && !useMerc && !useGuild) {
      if (!hasStable(state, owner)) {
        return { ok: false, reason: "NO_STABLE" };
      }
      if (!stableWithHorse(state, owner)) {
        return { ok: false, reason: "NO_HORSE" };
      }
    }
  }
  const cost = def.cost || { food: 0, gold: 0 };
  // کانتینر هزینه: MP جدا، سولو خودی از state و AI از state.ai (0.42.0).
  const res = mp ? state.mpres[owner].resources
    : (owner === CONFIG.AI.owner && state.ai ? state.ai.resources : state.resources);
  if (useMerc) {
    if ((res.gold || 0) < mercGoldOf(type)) {
      return { ok: false, reason: "INSUFFICIENT" };
    }
    return { ok: true, reason: "OK" };
  }
  // مسیر طلایی انجمن (0.167.0 — §9.3): فقط cost.gold مرجع (غذا ۰، بی‌سلاح).
  if (useGuild) {
    if ((res.gold || 0) < (((def.cost && def.cost.gold) || 0))) {
      return { ok: false, reason: "INSUFFICIENT" };
    }
    return { ok: true, reason: "OK" };
  }
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
  if (UNITS[type].requiresHorse) { const sh = stableWithHorse(state, owner); if (sh) sh.horses = stableHorses(sh) - 1; } // 1 اسب (0.168.0)
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

// خط زمانی موج‌ها (0.149.0 — §۱۹.۴/بند ۱۱۷۴، نیمه timeline؛ نیمه signpost در
// 0.146.0 آمد): نمای خالص وضعیت ۱..FINAL_WAVE + نشان پایان آخرین موج.
// خالص و فقط‌خواندنی (UI از همین می‌کشد)؛ موج دستی است پس شمارش‌معکوس نداریم.
export function waveTimeline(state) {
  const wave = state ? state.wave || 0 : 0;
  const won = !!(state && state.victorious);
  const lost = !!(state && state.defeated);
  const rows = [];
  for (let n = 1; n <= FINAL_WAVE; n++) {
    let status = "upcoming";
    if (won || n < wave) status = "done";
    else if (n === wave) status = "current";
    rows.push({ n, status });
  }
  const end = won ? "victory" : (lost ? "defeat" : (wave >= FINAL_WAVE ? "final" : "locked"));
  return { rows, end, wave };
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

// هویت آغازین (0.153.0 — بند 104): Crusader/Arab Lord فقط نیروهای اولیه
// را تعیین می‌کند (بر ساخت واحدها اثر ندارد)؛ پرتره از پروفایل است (29 پرتره —
// روی هاور ستاد و چندنفره). none = رفتار امروز (بی‌نیرو) تا ری‌پلی/ذخیره قدیمی
// و بالانس موجود بی‌تغییر بمانند.
export const IDENTITIES = {
  none: { troops: [] },
  crusader: { troops: [["bowman", 5], ["soldier", 7]] }, // معادل archer/spearman مرجع
  arab: { troops: [["arabianBow", 5], ["slave", 7]] }, // معادل عربی مرجع (بند 1106)
};
export function validIdentity(id) {
  return IDENTITIES[id] ? id : null;
}
// ارتش اولیه: رایگان و بی‌نیاز از سربازخانه (مثل ارباب)؛ مارپیچ قطعی دور ستاد
// از حلقه 1 (الگوی spawnLord) — جای هر اجرا یکسان. نوع ناشناخته نادیده (تحمل
// کاتالوگ آینده)؛ فقط چمنِ بی‌بنا.
export function spawnStartingForce(state, terrain, W, H, identity, owner) {
  owner = owner == null ? 0 : owner;
  const ident = IDENTITIES[identity] || IDENTITIES.none;
  if (!ident.troops.length) return { ok: true, reason: "OK", placed: 0 };
  const mp = state.mp && state.mp.enabled;
  const keep = mp
    ? state.buildings.find((b) => b.type === "keep" && !b.destroyed && (b.owner == null ? 0 : b.owner) === owner)
    : state.buildings.find((b) => b.type === "keep" && !b.destroyed);
  const cx = keep ? keep.c + keep.w / 2 : W / 2;
  const cr = keep ? keep.r + keep.h / 2 : H / 2;
  const queue = [];
  for (const [type, n] of ident.troops) {
    if (!UNITS[type]) continue;
    for (let i = 0; i < n; i++) queue.push(type);
  }
  let placed = 0, qi = 0;
  for (let ring = 1; ring < Math.max(W, H) && qi < queue.length; ring++) {
    for (let dr = -ring; dr <= ring && qi < queue.length; dr++) {
      for (let dc = -ring; dc <= ring && qi < queue.length; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== ring) continue;
        const c = Math.round(cx - 0.5) + dc, r = Math.round(cr - 0.5) + dr;
        if (c < 0 || r < 0 || c >= W || r >= H) continue;
        if (terrain[r * W + c] !== T_GRASS || state.occ[r * W + c] === 1) continue;
        spawnUnit(state, queue[qi], c + 0.5, r + 0.5, owner);
        qi++; placed++;
      }
    }
  }
  return { ok: true, reason: "OK", placed };
}

export const ORDER_FA = lazyTable("game.order", ["OK", "OUT_OF_BOUNDS", "NO_PATH", "LORD_KEEP", "FULL"]);

const ARRIVE_DIST = 0.4; // رسیدن به مرکز خانه هدف
const ORDER_RETRIES = 1; // یک تلاش جایگزین، بعد ثبت شکست

// موضع یگان (0.12.0): engage = تهاجمی (0.154.0 — بند 568: کسب لنگرِ پست با دید aggro، افسار 40/42، بازگشت به پست، شکار تلافی‌جویانه تیرِ از بیرون دید)؛ hold = پابرجا
// (0.153.0 — بند 566: کسب خودکار سقف 8، بی‌حرکت داوطلبانه)؛ defend =
// تدافعی (0.153.0 — بند 567: درگیری در شعاع 20 پست + بازگشت به خانه)؛
// guard = نگهبانی از ساختمان (0.15.0). دستور صریح در هر چهار موضع ارجح است.
export const STANCES = { ENGAGE: "engage", HOLD: "hold", DEFEND: "defend", GUARD: "guard" };
export const STANCE_FA = lazyTable("game.stance", ["engage", "hold", "defend", "guard"]);
export const ORDER_KINDS = ["move", "attackmove", "retreat", "patrol", "attackpos"];
export const ORDER_KIND_FA = lazyTable("game.orderKind", ["move", "attackmove", "retreat", "patrol", "attackpos"]);
// عقب‌نشینی: دور شدن از نزدیک‌ترین دشمن تا ۱۲ خانه یا ۶۰ تیک؛ با ضریب سرعت
// فرار ۱٫۲۵ (سپر انداخته، سریع‌تر از تعقیب‌کننده پیاده). همه guess تا مرجع.
const RETREAT_SIGHT = 12, RETREAT_TICKS = 60, RETREAT_MULT = 1.25;

export function setStance(unit, stance) {
  if (!unit || unit.dead) return { ok: false, reason: "INVALID" };
  if (stance !== STANCES.ENGAGE && stance !== STANCES.HOLD && stance !== STANCES.DEFEND && stance !== STANCES.GUARD) {
    return { ok: false, reason: "INVALID" };
  }
  unit.stance = stance;
  if (stance !== STANCES.GUARD) unit.guardBld = null; // ترک پاسگاه
  unit.homeX = unit.x;
  unit.homeR = unit.r;
  unit.huntId = null; // موضع تازه = پایان شکار
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
  { const pc0 = bldCenter(post); unit.homeX = pc0.x; unit.homeR = pc0.r; } // پست = مرکز پاسگاه
  unit.wp = null; // نگهبانی = پاک‌شدن صف (0.162.0 — بند 238)
  unit.order = null;
  unit.mission = "idle";
  unit.targetKind = null;
  unit.targetId = null;
  unit.path = null;
  unit.huntId = null; // پاسگاه تازه = پایان شکار
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
// پاسگاه‌های گاریسون (0.155.0 — §8.1/بندهای 123-125): برج + ۳ برج تازه. + برج مربع/گرد (0.159.0 — بند 268)
// سقف هر نوع از داده (garrisonCap) وگرنه سقف قدیمی ۴ (برج همان ۴ می‌ماند).
export const GARRISON_POSTS = ["tower", "lookout", "perimeter", "defence", "squaretower", "roundtower"];
export function isGarrisonPost(type) { return GARRISON_POSTS.includes(type); }
export function garrisonCapFor(type) {
  const def = CONFIG.BUILDINGS[type];
  const c = def && def.garrisonCap;
  return Number.isInteger(c) && c > 0 ? c : GARRISON_CAP;
}
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
  if (!post || !isGarrisonPost(post.type)) return { ok: false, reason: "NOT_TOWER" };
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
  if (post.garrison.length >= garrisonCapFor(post.type)) return { ok: false, reason: "FULL" };
  if (unit.garrisonTower != null) ungarrisonUnit(state, unit); // جابه‌جایی به برج تازه
  const c = bldCenter(post);
  unit.x = c.x;
  unit.r = c.r;
  unit.garrisonTower = post.id;
  unit.wp = null; // استقرار = پاک‌شدن صف (0.162.0 — بند 238)
  unit.order = null;
  unit.mission = "idle";
  unit.targetKind = null;
  unit.targetId = null;
  unit.path = null;
  post.garrison.push(unit.id);
  pushEvent(state, tr("game.ev.garrison", { id: unit.id, cur: post.garrison.length, cap: garrisonCapFor(post.type) }));
  return { ok: true, reason: "OK" };
}

// انتخاب مستقرشونده‌ها برای کلیک مستقیم fortify (0.161.0 — §10.2/بند 559):
// برج خودیِ سالمِ تکمیل‌شده + یگان‌های دوربرد خودیِ زنده از میان ids؛
// خالص و MP-امن (فقط خوانش) — اجرا با فرمان garrison موجود (بی‌تغییر sim).
export function fortifyPick(state, ids, bldId, owner) {
  const b = state.buildings.find((x) => x.id === bldId && !x.destroyed);
  if (!b || !isGarrisonPost(b.type)) return { ok: false, reason: "NOT_TOWER" };
  if ((b.owner == null ? 0 : b.owner) !== owner) return { ok: false, reason: "NOT_OWNED" };
  if (underConstruction(b)) return { ok: false, reason: "UNDER_CONSTRUCTION" };
  const ours = [];
  for (const id of ids || []) {
    const u = state.units.find((x) => x.id === id && !x.dead);
    if (u && u.side === "player" && (u.owner == null ? 0 : u.owner) === owner) ours.push(u);
  }
  if (!ours.length) return { ok: false, reason: "INVALID" };
  const elig = ours.filter((u) => canGarrisonType(u.type));
  if (!elig.length) return { ok: false, reason: "NOT_RANGED" };
  if ((b.garrison || []).length >= garrisonCapFor(b.type)) return { ok: false, reason: "FULL" };
  return { ok: true, reason: "OK", bld: b.id, ids: elig.map((u) => u.id) };
}

// گزینش حمله کلیکی به ساختمان دشمن (0.162.0 — §10.4/بند 225):
// ساختمانِ دشمنِ قابل‌حمله + یگان‌های خودیِ زنده از میان ids؛ خالص و
// MP-امن (فقط خوانش) — اجرا با فرمان attackmove موجود (بی‌تغییر sim/هش).
// سولو: فقط بنای حریف AI دشمن است و دروازه هدف نیست (acquire سولو دروازه
// را نادیده می‌گیرد — 0.158.0/بند 263)؛ MP: بنای هر مالک دیگر دشمن است.
export const ATTACK_FA = lazyTable("game.attack", ["OK", "INVALID", "NOT_OWNED", "NOT_TARGET"]);
export function attackPick(state, ids, bldId, owner) {
  const b = state.buildings.find((x) => x.id === bldId && !x.destroyed);
  if (!b) return { ok: false, reason: "INVALID" };
  const bow = b.owner == null ? 0 : b.owner;
  if (bow === owner) return { ok: false, reason: "NOT_OWNED" };
  const mp = state.mp && state.mp.enabled;
  if (!mp && bow !== CONFIG.AI.owner) return { ok: false, reason: "NOT_OWNED" };
  if (!mp && b.type === "gate") return { ok: false, reason: "NOT_TARGET" };
  const ours = [];
  for (const id of ids || []) {
    const u = state.units.find((x) => x.id === id && !x.dead);
    if (u && u.side === "player" && (u.owner == null ? 0 : u.owner) === owner) ours.push(u);
  }
  if (!ours.length) return { ok: false, reason: "INVALID" };
  return { ok: true, reason: "OK", bld: b.id, ids: ours.map((u) => u.id), c: b.c, r: b.r };
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
  unit.homeX = unit.x; // خروج از برج = پست تازه
  unit.homeR = unit.r;
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
    u.homeX = u.x; // آزادی از برج ویران = پست تازه
    u.homeR = u.r;
    u.wp = null; // آزادی از برج = بی‌صف (0.162.0 — بند 238)
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
  unit.wp = null; // استقرار/جمع‌کردن = پاک‌شدن صف (0.162.0 — بند 238)
  unit.order = null;
  unit.mission = "idle";
  unit.targetKind = null;
  unit.targetId = null;
  unit.path = null;
  pushEvent(state, tr(unit.deployed ? "game.ev.deployOn" : "game.ev.deployOff"));
  return { ok: true, reason: "OK", deployed: unit.deployed };
}

// پرتاب گاو بیمار با منجنیق (0.142.0 — فاز ۱ بند ۹۲، §۱۲.۴): هر منجنیقِ
// مستقرِ واجد (سردشده) ۱ گاو از گله خودی می‌خورد (takeCow — رقابت با پنیر و
// چرم) و روی خانه هدف ۱ ابر بیماری می‌نشیند (پارامترها از TUNING.disease).
// قوس پرتاب نمایشی و خارج sim است (pushFx). دلایل: NOT_DEPLOYED (هیچ مستقر
// واجدی نیست)، NO_COW (گله خالی)، OUT_OF_RANGE (بیرون برد منجنیق اول)،
// NOCOW (گزینه اتاق «No Cow Throwing» — 0.147.0، §۱۲.۴)، NORUSH (صلح
// «No Rush» — 0.149.0، §۱۴.۲/بند ۷۳۰).
// NORUSH (صلح «No Rush» — 0.149.0، §۱۴.۲/بند ۷۳۰).
// گاوافکن واجد شرایط UI (0.164.0 — §10.4/بند 244): محاصره مستقرشونده
// (منجنیق/تربوشه) — استقرار/سردی/برد در fireCow و دکمه آزموده می‌شود.
export function isCowSiege(u) {
  if (!u || u.dead) return false;
  const d = UNITS[u.type];
  return !!(d && d.siege && d.needsDeploy);
}
export const FIRECOW_FA = lazyTable("game.firecow", ["OK", "INVALID", "NOT_SIEGE", "NOT_DEPLOYED", "COOLDOWN", "NO_COW", "OUT_OF_RANGE", "NOCOW", "NORUSH"]);

export function fireCow(state, ids, c, r, owner) {
  // گزینه اتاق مقدم بر همه اعتبارسنجی‌هاست (قطعی و یکسان همه کلاینت‌ها).
  if (state && state.rules && state.rules.noCow) return { ok: false, reason: "NOCOW" };
  // صلح No Rush (0.149.0): پرتاب گاو حمله است — در صلح بسته.
  if (peaceActive(state)) return { ok: false, reason: "NORUSH" };
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const ow = owner == null ? 0 : owner;
  if (!Array.isArray(ids) || !ids.length) return { ok: false, reason: "INVALID" };
  if (!Number.isInteger(c) || !Number.isInteger(r) || c < 0 || r < 0 || c >= W || r >= H) {
    return { ok: false, reason: "INVALID" };
  }
  const sieges = [];
  for (const id of ids) {
    const u = (state.units || []).find((x) => x.id === id && !x.dead);
    if (!u || (u.owner == null ? 0 : u.owner) !== ow) continue;
    const def = UNITS[u.type];
    if (!def || !def.siege) continue;
    sieges.push({ u, def });
  }
  if (!sieges.length) return { ok: false, reason: "INVALID" };
  if (!sieges.some((s) => s.def.needsDeploy)) return { ok: false, reason: "NOT_SIEGE" };
  const deployedOnes = sieges.filter((s) => s.def.needsDeploy && s.u.deployed);
  if (!deployedOnes.length) return { ok: false, reason: "NOT_DEPLOYED" };
  const ready = deployedOnes.filter((s) => (s.u.cowCd || 0) <= 0);
  if (!ready.length) return { ok: false, reason: "COOLDOWN" };
  const first = ready[0];
  const d = Math.hypot(c + 0.5 - first.u.x, r + 0.5 - first.u.r);
  const range = first.def.range || 10, minRange = first.def.minRange || 0;
  if (d > range || d < minRange) return { ok: false, reason: "OUT_OF_RANGE" };
  let fired = 0;
  for (const s of ready) {
    if (!takeCow(state, ow)) break;
    s.u.cowCd = s.def.cowCd || 150;
    fired++;
  }
  if (!fired) return { ok: false, reason: "NO_COW" };
  const dz = TUNING.disease;
  if (!Array.isArray(state.clouds)) state.clouds = [];
  state.clouds.push({ c, r, left: dz.ticks });
  // قوس نمایشی پرتاب (الگوی pushFx — خارج sim/هش/ذخیره؛ رندر همان سنگ ۸تیکی را می‌کشد).
  if (!Array.isArray(state.fx)) state.fx = [];
  state.fx.push({ kind: "cow", x0: first.u.x, r0: first.u.r, x1: c + 0.5, r1: r + 0.5, tick: state.tick });
  if (state.fx.length > FX_CAP) state.fx.splice(0, state.fx.length - FX_CAP);
  pushEvent(state, tr("game.ev.fireCow", { n: fired }));
  return { ok: true, reason: "OK", fired };
}

// تأمین مهمات منجنیق (0.149.0 — §۱۲.۲/بند ۵۷۸: «۱۰ stone = ۲۰ rocks»):
// هر منجنیق خودیِ ناپر (ammo < cap) با ۱۰ سنگ انبار، تا سقف پر می‌شود (+۲۰،
// با سقف). دلایل: NOT_OWNED (هیچ منجنیق خودی نیست)، FULL (همه پرند)،
// NO_STONE (سنگ ناکافی). قطعی و MP-aware (کیسه مالک)؛ آینه MP در main.js.
export const AMMO_RESUPPLY_STONE = 10;
export const AMMO_RESUPPLY_ROCKS = 20;
export const RESUPPLY_FA = lazyTable("game.resupply", ["OK", "INVALID", "NOT_OWNED", "NO_STONE", "FULL"]);

export function resupplyAmmo(state, ids, owner) {
  const ow = owner == null ? 0 : owner;
  if (!Array.isArray(ids) || !ids.length) return { ok: false, reason: "INVALID" };
  const cats = [];
  let foundCat = false; // منجنیق زنده‌ای دیده شد (هر مالکی)؟
  for (const id of ids) {
    const u = (state.units || []).find((x) => x.id === id && !x.dead);
    if (!u) continue;
    const def = UNITS[u.type];
    if (!def || !def.ammoCap) continue;
    foundCat = true;
    if ((u.owner == null ? 0 : u.owner) !== ow) continue;
    cats.push({ u, def });
  }
  // منجنیق بیگانه = مالکیت؛ بقیه (مرده/ناشناخته/غیرمنجنیق) = نامعتبر.
  if (!cats.length) return { ok: false, reason: foundCat ? "NOT_OWNED" : "INVALID" };
  const needy = cats.filter((s) => (s.u.ammo === undefined ? s.def.ammoCap : s.u.ammo) < s.def.ammoCap);
  if (!needy.length) return { ok: false, reason: "FULL" };
  const mp = state.mp && state.mp.enabled;
  let res = null;
  if (mp) { if (state.mpres && state.mpres[ow]) res = state.mpres[ow].resources; }
  else if (ow === CONFIG.AI.owner && state.ai) res = state.ai.resources;
  else res = state.resources;
  if (!res || (res.stone || 0) < AMMO_RESUPPLY_STONE) return { ok: false, reason: "NO_STONE" };
  res.stone -= AMMO_RESUPPLY_STONE;
  let n = 0;
  for (const s of needy) {
    s.u.ammo = Math.min(s.def.ammoCap, (s.u.ammo === undefined ? s.def.ammoCap : s.u.ammo) + AMMO_RESUPPLY_ROCKS);
    n++;
  }
  pushEvent(state, tr("game.ev.resupply", { n }));
  return { ok: true, reason: "OK", supplied: n };
}

// چهار نقطه میانی لبه‌های نقشه (0.146.0 — §۸.۷): ترتیب [شمال، جنوب، غرب،
// شرق]؛ مختصات خانه‌ای (شناور — مرکز لبه). خالص؛ چرخه دوربین با کلید S.
export function signEdge(W, H) {
  return [
    { c: W / 2, r: 0 },
    { c: W / 2, r: H - 1 },
    { c: 0, r: H / 2 },
    { c: W - 1, r: H / 2 },
  ];
}

// نزدیک‌ترین لبه به مرکز بنا (0.146.0 — §۸.۷): جهت واحد {dx,dr}؛ تساوی به
// ترتیب شمال/جنوب/غرب/شرق می‌شکند. خالص؛ پیکان تابلوی راهنما.
export function signDir(b, W, H) {
  const cx = (b ? b.c : 0) + ((b && b.w) || 1) / 2;
  const cy = (b ? b.r : 0) + ((b && b.h) || 1) / 2;
  const dN = cy, dS = H - 1 - cy, dW = cx, dE = W - 1 - cx;
  const m = Math.min(dN, dS, dW, dE);
  if (m === dN) return { dx: 0, dr: -1 };
  if (m === dS) return { dx: 0, dr: 1 };
  if (m === dW) return { dx: -1, dr: 0 };
  return { dx: 1, dr: 0 };
}

// عطاری سالم مالک (0.146.0 — فاز ۱ بند ۱۴۲، §۸.۵): تکمیل‌شده + ناویران +
// خودی + کارگر دارد (الگوی hasOxTether). خالص و MP-aware؛ حریف AI عطاری
// نمی‌سازد (۰ می‌گیرد).
export function healthyApoth(state, owner) {
  const ow = owner == null ? 0 : owner;
  let n = 0;
  for (const b of state.buildings || []) {
    if (!b || b.type !== "apothecary" || b.destroyed) continue;
    if ((b.owner == null ? 0 : b.owner) !== ow) continue;
    if (underConstruction(b)) continue;
    if (b.staffed === false) continue;
    n++;
  }
  return n;
}

// شفادهنده‌ها (0.146.0 — بند ۳۰۲/۱۴۲): هر عطاری سالم حداکثر ۱ شفادهنده
// زنده دارد (کمبود = spawn کنار عطاری با homeBld)؛ شفادهنده به نزدیک‌ترین
// ابر بیماری می‌رود و left را به‌اندازه healDrain تندتر کم می‌کند
// (پراکنده‌کردن)؛ بی‌ابر به خانه برمی‌گردد. هرگز نمی‌جنگد (aggro صفر →
// acquire خالی). قطعی و MP-aware؛ حریف AI شفا ندارد (0.42.0 ساده‌سازی).
export function stepHealers(state, terrain) {
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const dz = TUNING.disease;
  const hd = UNITS.healer;
  if (!hd) return;
  // ۱. نگه‌داشت سقف ۱ شفادهنده به‌ازای هر عطاری سالم.
  for (const b of state.buildings || []) {
    if (!b || b.type !== "apothecary" || b.destroyed || underConstruction(b)) continue;
    if (b.staffed === false) continue;
    const ow = b.owner == null ? 0 : b.owner;
    if (ow === CONFIG.AI.owner) continue;
    const has = state.units.some((u) => !u.dead && u.type === "healer" && u.homeBld === b.id);
    if (has) continue;
    const s = nearestWalkable(terrain, state.occ, W, H, b.c + (b.w >> 1), b.r + b.h, 4);
    if (!s) continue;
    const u = spawnUnit(state, "healer", s[0] + 0.5, s[1] + 0.5, ow);
    u.homeBld = b.id;
  }
  // ۲. حرکت/پراکنده‌کردن.
  const R = dz.radius || 4, drain = dz.healDrain || 15;
  const step = (hd.speed || 3) / simHz();
  if (!Array.isArray(state.clouds) || !state.clouds.length) {
    for (const u of state.units) {
      if (u.dead || u.type !== "healer") continue;
      const home = state.buildings.find((x) => x.id === u.homeBld && !x.destroyed);
      if (!home) continue;
      const hx = home.c + home.w / 2, hr = home.r + home.h / 2;
      if (Math.hypot(hx - u.x, hr - u.r) > 1.5) moveSlide(state, terrain, W, H, u, hx, hr, step);
    }
    return;
  }
  for (const u of state.units) {
    if (u.dead || u.type !== "healer") continue;
    let best = null, bd = Infinity;
    for (const cl of state.clouds) {
      const d = Math.hypot(cl.c + 0.5 - u.x, cl.r + 0.5 - u.r);
      if (d < bd) { bd = d; best = cl; }
    }
    if (!best) continue;
    if (bd <= R + 0.5) best.left = Math.max(0, best.left - drain);
    else moveSlide(state, terrain, W, H, u, best.c + 0.5, best.r + 0.5, step);
  }
}

// گام ابرهای بیماری (0.142.0 — بند ۲۱۴، §۱۲.۴ با اعداد TUNING.disease): هر
// ابر left را کم می‌کند و هر dmgEvery تیک dmg جانِ مستقیم (بدون زره — بیماری)
// به همه یگان‌های زنده غیرمستقر در شعاع می‌زند؛ در left<=۰ پاک می‌شود.
// (0.146.0 — بند ۱۴۲): هر عطاری سالم مالک ۱ واحد از آسیب یگان‌های خودی کم
// می‌کند (کف صفر)؛ یگان دشمن/بی‌طرف کامل می‌خورد (موج‌ها owner=۰ ولی side
// دشمن‌اند — بیرون حمایت‌اند).
// (0.146.0 — بند ۱۴۲: خنثی‌سازی آمد — عطاری سالم + شفادهنده؛ وضعیت بند ۲۱۴: کامل).
export function stepClouds(state) {
  const clouds = state.clouds;
  if (!Array.isArray(clouds) || !clouds.length) return;
  const dz = TUNING.disease;
  const R2 = (dz.radius || 4) * (dz.radius || 4);
  const every = dz.dmgEvery || 6, dmg = dz.dmg || 1;
  const apoth = new Map(); // مالک → شمار عطاری سالم (تنبل؛ هر تیک حداکثر چند مالک)
  const apothOf = (ow) => {
    if (!apoth.has(ow)) apoth.set(ow, healthyApoth(state, ow));
    return apoth.get(ow);
  };
  for (const cl of clouds) {
    cl.left--;
    if (cl.left < 0) cl.left = 0;
    if (cl.left > 0 && ((dz.ticks - cl.left) % every === 0)) {
      const px = cl.c + 0.5, pr = cl.r + 0.5;
      for (const u of state.units) {
        if (u.dead || u.garrisonTower != null) continue;
        const dx = u.x - px, dr = u.r - pr;
        if (dx * dx + dr * dr > R2) continue;
        const ow = u.owner == null ? 0 : u.owner;
        const eff = u.side === "player" ? Math.max(0, dmg - apothOf(ow)) : dmg;
        if (eff <= 0) continue;
        u.hp -= eff;
        u.flashTick = state.tick;
        if (u.hp <= 0) {
          u.hp = 0;
          u.dead = true;
          const mp = state.mp && state.mp.enabled;
          if (u.type === "lord" && u.side === "player" && !mp && !state.defeated) {
            state.defeated = true;
            state.paused = true;
            pushEvent(state, tr("game.ev.lordDead"));
          } else if (mp && u.type === "lord") {
            pushEvent(state, tr("game.ev.lordDeadMp", { p: ((u.owner == null ? 0 : u.owner) + 1) }));
          }
        }
      }
    }
  }
  state.clouds = clouds.filter((cl) => cl.left > 0);
}

// گام آتش (0.148.0 — §۱۸.۴/#۲۱۵ با اعداد TUNING.fire): هر ۱۰ تیک (= ۱ ثانیه،
// TICK_HZ) روی بناهای در حال سوختن: ۱) خاموشی — چاه/حوض سالمِ تکمیل‌شدهِ
// کارگردارِ خودی در شعاع extinguish کاتالوگ آتش را می‌خواباند؛ ۲) سوختن —
// dmgPct٪ِ maxHp (کف ۱) کم می‌شود، صفر = ویرانی جنگی؛ ۳) گسترش — به هر بنای
// چوبیِ سالمِ تکمیل‌شدهِ نسوخته همسایه تا spreadRadius با شانس spreadChance.
// همه drawها بی‌حالت از (mapSeed,tick,id)‌اند — جریان rng جلو نمی‌رود.
// بنای در حال سوختن همچنان کار می‌کند (دفترچه ساکت است؛ حدس ثبت‌شده).
export function stepFire(state) {
  if ((state.tick % 10) !== 0) return;
  const dmgPct = FIRE.dmgPct, spreadR = FIRE.spreadRadius, spreadP = FIRE.spreadChance;
  const seed = state.mapSeed || 0, tick = state.tick || 0;
  const burning = [];
  for (const b of state.buildings || []) {
    if (!b || b.destroyed || !(b.fire > 0)) continue;
    burning.push(b);
  }
  if (!burning.length) return;
  // خاموش‌کن‌های آماده: بنای extinguishدارِ سالمِ تکمیل‌شدهِ کارگردار.
  const quenchers = [];
  for (const q of state.buildings || []) {
    if (!q || q.destroyed || underConstruction(q) || q.staffed === false) continue;
    const qd = CONFIG.BUILDINGS[q.type];
    if (!qd || !(qd.extinguish > 0)) continue;
    const qp = bldCenter(q);
    quenchers.push({ x: qp.x, r: qp.r, rad: qd.extinguish, owner: q.owner == null ? 0 : q.owner });
  }
  const still = [];
  for (const b of burning) {
    if (b.destroyed) continue;
    const p = bldCenter(b);
    const bow = b.owner == null ? 0 : b.owner;
    let out = false;
    for (const q of quenchers) {
      if (q.owner !== bow) continue;
      if (dist(p.x, p.r, q.x, q.r) <= q.rad) { out = true; break; }
    }
    if (out) {
      b.fire = 0;
      pushEvent(state, tr("game.ev.fireOut", { building: CONFIG.BUILDINGS[b.type].name }));
      continue;
    }
    still.push(b);
  }
  // سوختن.
  for (const b of still) {
    if (b.destroyed) continue;
    const dmg = Math.max(1, Math.round(((b.maxHp || b.hp || 1) * dmgPct) / 100));
    b.hp -= dmg;
    if (b.hp <= 0) {
      b.hp = 0;
      destroyBuilding(state, b);
    }
  }
  // گسترش از بازمانده‌های در حال سوختن.
  for (const b of still) {
    if (b.destroyed || !(b.fire > 0)) continue;
    const p = bldCenter(b);
    const bow = b.owner == null ? 0 : b.owner;
    for (const n of state.buildings || []) {
      if (!n || n.destroyed || n.fire > 0 || n.id === b.id) continue;
      if ((n.owner == null ? 0 : n.owner) !== bow) continue;
      if (!isFlammable(n) || underConstruction(n)) continue;
      const np = bldCenter(n);
      if (dist(p.x, p.r, np.x, np.r) > spreadR) continue;
      const salt = ((b.id | 0) * 31 + (n.id | 0) * 101) | 0;
      if (spreadP > 0 && statelessRand(seed, tick, salt) < spreadP) {
        n.fire = 1;
        pushEvent(state, tr("game.ev.ignite", { building: CONFIG.BUILDINGS[n.type].name }));
      }
    }
  }
}

// دستور حرکت صریح به خانه (c,r). مقصد روی آب/اشغال به نزدیک‌ترین همسایه باز
// حل می‌شود (آن‌وقت رسیدن به ساحل = done)؛ فقط خارج نقشه رد می‌شود.
export function orderMove(state, unit, c, r) {
  if (isSoloLord(state, unit) && !lordKeepGate(state, c, r)) return { ok: false, reason: "LORD_KEEP" };
  return issueOrder(state, unit, "move", c, r);
}

// حرکت تهاجمی (تعقیب): مثل move ولی در راه دشمنِ در aggro را می‌زند.
export function orderAttackMove(state, unit, c, r) {
  return issueOrder(state, unit, "attackmove", c, r);
}

// گشت رفت‌وبرگشتی (0.162.0 — §10.2/بند 236): A = جای فعلی یگان، B = کلیک؛
// فرمان صریح تازه است (صف پاک، برج ترک، منجنیق جمع — الگوی issueOrder).
export function orderPatrol(state, unit, c, r) {
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  if (!unit || unit.dead) return { ok: false, reason: "INVALID" };
  if (unit.garrisonTower != null) ungarrisonUnit(state, unit);
  if (UNITS[unit.type].needsDeploy && unit.deployed) unit.deployed = false;
  if (!Number.isInteger(c) || !Number.isInteger(r) || c < 0 || r < 0 || c >= W || r >= H) {
    return { ok: false, reason: "OUT_OF_BOUNDS" };
  }
  if (isSoloLord(state, unit) && !lordKeepGate(state, c, r)) return { ok: false, reason: "LORD_KEEP" };
  const ax = Math.max(0, Math.min(W - 1, Math.floor(unit.x)));
  const ar = Math.max(0, Math.min(H - 1, Math.floor(unit.r)));
  unit.order = {
    kind: "patrol", c, r,
    pc: ax, pr: ar,
    pts: [{ c: ax, r: ar }, { c, r }], // حلقه گشت (0.164.0 - بند 237): تا ۱۰ نقطه
    pi: 1, // نمایه هدف جاری در حلقه
    status: "active", retries: 0, elapsed: 0,
  };
  unit.wp = null; // فرمان صریح = پاک‌شدن صف وی‌پوینت (0.162.0 — بند 238)
  unit.mission = "active";
  unit.huntId = null;
  unit.path = null;
  return { ok: true, reason: "OK" };
}

// سقف نشانگرهای گشت پیشرفته (دفترچه §10.2: «تا ۱۰ نقطه»).
export const PATROL_MAX = 10;

// افزودن نشانگر به حلقه گشت فعال (0.164.0 — §10.2/بند 237): شیفت‌کلیک با
// گشتِ مسلح روی یگانِ در حال گشت = ته حلقه (ترتیب قرار دادن = ترتیب گشت).
// فرمان جاری/سرها دست نمی‌خورند؛ حلقه از همان‌جا ادامه می‌دهد. سقف پر =
// FULL؛ ذخیره قدیمی بی‌pts = مهاجرت از pc/pr. خالص و MP-امن.
export function orderPatrolAppend(state, unit, c, r) {
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  if (!unit || unit.dead) return { ok: false, reason: "INVALID" };
  if (!unit.order || unit.order.status !== "active" || unit.order.kind !== "patrol") {
    return orderPatrol(state, unit, c, r);
  }
  if (!Number.isInteger(c) || !Number.isInteger(r) || c < 0 || r < 0 || c >= W || r >= H) {
    return { ok: false, reason: "OUT_OF_BOUNDS" };
  }
  if (isSoloLord(state, unit) && !lordKeepGate(state, c, r)) return { ok: false, reason: "LORD_KEEP" };
  const o = unit.order;
  if (!Array.isArray(o.pts) || !o.pts.every((p) => p && Number.isInteger(p.c) && Number.isInteger(p.r))) {
    const pc = Number.isInteger(o.pc) ? o.pc : Math.max(0, Math.min(W - 1, Math.floor(unit.x)));
    const pr = Number.isInteger(o.pr) ? o.pr : Math.max(0, Math.min(H - 1, Math.floor(unit.r)));
    o.pts = [{ c: pc, r: pr }, { c: o.c, r: o.r }];
    o.pi = 1;
  }
  if (o.pts.length >= PATROL_MAX) return { ok: false, reason: "FULL" };
  o.pts.push({ c, r });
  unit.path = null; // بازمحاسبه اجباری برای پای تازه
  return { ok: true, reason: "OK", queued: true };
}

// گونه‌های مجاز در صف وی‌پوینت (0.162.0 — بند 238).
// قانون Keep ارباب در تک‌نفره (0.163.0 — §10.5/بند 247): حرکت Lord فقط به
// Keep است (مگر دستور حمله). خالص و قطعی؛ فقط سولو (MP «کنترل کامل» دارد).
export function isSoloLord(state, unit) {
  if (!unit || unit.dead || unit.type !== "lord" || unit.side !== "player") return false;
  if (state && state.mp && state.mp.enabled) return false;
  return (unit.owner == null ? 0 : unit.owner) === 0;
}
// ستاد خودی زنده (لنگر Keep) — سولو.
export function lordKeepOf(state) {
  if (!state) return null;
  return state.buildings.find((b) => b && !b.destroyed && b.type === "keep" && (b.owner == null ? 0 : b.owner) === 0) || null;
}
// حاشیه مجاز مقصد: ردپای Keep + ۱ حلقه (پیاده‌شدن کنار دروازه).
export const LORD_KEEP_MARGIN = 1;
export function lordKeepGate(state, c, r) {
  const k = lordKeepOf(state);
  if (!k) return true; // بی‌ستاد = بی‌قید (بازی عملاً تمام است)
  return c >= k.c - LORD_KEEP_MARGIN && c < k.c + k.w + LORD_KEEP_MARGIN &&
    r >= k.r - LORD_KEEP_MARGIN && r < k.r + k.h + LORD_KEEP_MARGIN;
}
// شعاع بازگشت خودکار ارباب: دشمن زنده غیرمستقر در این فاصله = بازگشت به Keep.
export const LORD_FLEE_RADIUS = 8;
// بازگشت خودکار ارباب به Keep در حضور دشمن (0.163.0 — §10.5/بند 247، بخش دوم):
// فقط سولو و بدون rng (مرکز Keep ثابت) پس قطعی و MP-امن؛ سفارش حمله صریح
// بازیکن (attackmove/attackpos/retreat) مقدم است و لمس نمی‌شود؛ حرکتِ در راه
// Keep هم دوباره صادر نمی‌شود تا مسیر بازمحاسبه نشود.
export function lordReturnStep(state) {
  const mp = state && state.mp && state.mp.enabled;
  if (mp || !state || state.defeated || state.victorious) return 0;
  const k = lordKeepOf(state);
  if (!k) return 0;
  const kx = k.c + Math.floor(k.w / 2), kr = k.r + Math.floor(k.h / 2);
  let n = 0;
  for (const u of state.units) {
    if (!isSoloLord(state, u) || u.garrisonTower != null) continue;
    const kind = u.order && u.order.status === "active" ? u.order.kind : null;
    if (kind === "attackmove" || kind === "attackpos" || kind === "retreat") continue;
    if (kind === "move" && u.order && lordKeepGate(state, u.order.c, u.order.r)) continue;
    if (lordKeepGate(state, Math.floor(u.x), Math.floor(u.r))) continue;
    let foe = false;
    for (const e of state.units) {
      if (e.dead || e.side !== "enemy" || e.garrisonTower != null) continue;
      const dx = e.x - u.x, dr = e.r - u.r;
      if (dx * dx + dr * dr <= LORD_FLEE_RADIUS * LORD_FLEE_RADIUS) { foe = true; break; }
    }
    if (!foe) continue;
    if (orderMove(state, u, kx, kr).ok) n++;
  }
  return n;
}
// شعاع پاشش بمباران: دشمنان در این فاصله از نقطه اصابت می‌خورند.
export const ATTACKPOS_SPLASH = 1.5;
// حمله به موضع (0.163.0 — §10.4/بند 240): فرمان صریح تازه برای بمباران
// نقطه (دوربرد) یا یورش به نقطه (میلی، رفتار attackmove). صف پاک می‌شود،
// برج ترک و منجنیق جمع می‌شود (الگوی issueOrder)؛ ذخیره/هش فقط kind/c/r است.
export function orderAttackPos(state, unit, c, r) {
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  if (!unit || unit.dead) return { ok: false, reason: "INVALID" };
  if (unit.garrisonTower != null) ungarrisonUnit(state, unit);
  if (UNITS[unit.type].needsDeploy && unit.deployed) unit.deployed = false;
  if (!Number.isInteger(c) || !Number.isInteger(r) || c < 0 || r < 0 || c >= W || r >= H) {
    return { ok: false, reason: "OUT_OF_BOUNDS" };
  }
  unit.order = { kind: "attackpos", c, r, status: "active", retries: 0, elapsed: 0 };
  unit.wp = null;
  unit.mission = "active";
  unit.huntId = null;
  unit.path = null;
  return { ok: true, reason: "OK" };
}
// بمباران نقطه: فقط دوربردِ در برد (حداقل برد منجنیق لحاظ)؛ فقط وقتی دشمنی
// در پاشش هست شلیک می‌شود (مهمات/صلح/استقرار رعایت)؛ قربانی مثل ضربه
// مستقیم تلافی می‌کند. موتور پرتابه LoS ندارد (آنی) پس پشت دیوار هم می‌خورد.
function bombardPos(state, u, def, px, pr) {
  if (u.cooldown > 0) return false;
  if (def.ammoCap && (u.ammo || 0) <= 0) return false;
  if (def.needsDeploy && !u.deployed) return false;
  const mp = state.mp && state.mp.enabled;
  const uow = u.owner == null ? 0 : u.owner;
  const dmg = dmgVs(def, "unit") * fearAttackMult(state, u && u.owner);
  let hit = false;
  for (const e of state.units) {
    if (e.dead || e.garrisonTower != null) continue;
    let foe;
    if (u.side === "enemy") foe = e.side === "player";
    else if (mp) foe = e.side === "player" && ((e.owner == null ? 0 : e.owner) !== uow);
    else foe = e.side === "enemy";
    if (!foe) continue;
    const dx = e.x - px, dr = e.r - pr;
    if (dx * dx + dr * dr > ATTACKPOS_SPLASH * ATTACKPOS_SPLASH) continue;
    strike(state, dmg, { kind: "unit", u: e });
    provokeRetaliation(state, e, { kind: "unit", u });
    hit = true;
  }
  if (!hit) return false;
  pushClash(state, u, { kind: "unit", u: { x: px, r: pr } }, def);
  if (def.ammoCap) u.ammo = Math.max(0, (u.ammo || 0) - 1);
  u.cooldown = def.cd;
  return true;
}
// گام حمله‌به‌اینجا: نزدیک‌شو با followOrder؛ فرمان ماندگار است (تکمیل =
// بازمسلح‌سازی همان نقطه، نه پایان؛ شکست = رها مثل بقیه).
function attackposStep(state, terrain, W, H, u, def) {
  const oc = u.order.c, orr = u.order.r;
  followOrder(state, terrain, W, H, u, def);
  if ((!u.order || u.order.kind !== "attackpos") && u.mission !== "failed") {
    u.order = { kind: "attackpos", c: oc, r: orr, status: "active", retries: 0, elapsed: 0 };
    u.mission = "active";
    u.path = null;
  }
}

const WP_KINDS = ["move", "attackmove", "patrol", "attackpos"];
// صف وی‌پوینت: یگانِ دارای فرمان فعال = نقطه ته صف؛ وگرنه همان فرمان صریح.
// خالصِ اجرا (بدون rng) و MP-امن — ترتیب قطعى id در فراخواننده حفظ می‌شود.
export function queueOrder(state, unit, kind, c, r) {
  if (!unit || unit.dead) return { ok: false, reason: "INVALID" };
  if (!WP_KINDS.includes(kind)) return { ok: false, reason: "INVALID" };
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  if (!Number.isInteger(c) || !Number.isInteger(r) || c < 0 || c >= W || r < 0 || r >= H) {
    return { ok: false, reason: "OUT_OF_BOUNDS" };
  }
  if ((kind === "move" || kind === "patrol") && isSoloLord(state, unit) && !lordKeepGate(state, c, r)) return { ok: false, reason: "LORD_KEEP" };
  if (unit.garrisonTower != null) ungarrisonUnit(state, unit);
  if (UNITS[unit.type].needsDeploy && unit.deployed) unit.deployed = false;
  if (kind === "patrol" && unit.order && unit.order.status === "active" && unit.order.kind === "patrol") {
    return orderPatrolAppend(state, unit, c, r); // حلقه فعال = ته حلقه (0.164.0 — بند 237)
  }
  if ((unit.order && unit.order.status === "active") || (Array.isArray(unit.wp) && unit.wp.length)) {
    if (!Array.isArray(unit.wp)) unit.wp = [];
    unit.wp.push({ kind, c, r });
    return { ok: true, reason: "OK", queued: true };
  }
  unit.wp = null;
  if (kind === "patrol") return orderPatrol(state, unit, c, r);
  return issueOrder(state, unit, kind, c, r);
}
// برداشتن وی‌پوینت بعدی پس از رسیدن: ته‌صف فعال می‌شود (A گشت = جای
// فعلی)؛ صف تهی = false تا فراخواننده مأموریت را ببندد. ورودی بد = پرش تحمل‌پذیر.
export function shiftQueue(state, unit) {
  const q = Array.isArray(unit.wp) ? unit.wp : [];
  const nxt = q.shift();
  unit.wp = q.length ? q : null;
  if (!nxt || !WP_KINDS.includes(nxt.kind)) return q.length ? shiftQueue(state, unit) : false;
  const r = nxt.kind === "patrol" && unit.order && unit.order.status === "active" && unit.order.kind === "patrol"
    ? orderPatrolAppend(state, unit, nxt.c, nxt.r) // گشت روی گشت = ته حلقه (0.164.0 — بند 237)
    : nxt.kind === "patrol"
      ? orderPatrol(state, unit, nxt.c, nxt.r)
      : issueOrder(state, unit, nxt.kind, nxt.c, nxt.r);
  if (!r.ok) {
    if (r.reason === "FULL") { unit.wp = q.length ? q : null; return true; } // حلقه پر = رد نشانگر، گشت می‌ماند
    return shiftQueue(state, unit); // نقطه خراب = پرش به بعدی
  }
  unit.wp = q.length ? q : null; // بازگردانی پس از پاک‌شدن در issueOrder/orderPatrol
  return true;
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
  unit.huntId = null; // فرمان صریح = پایان شکار
  unit.wp = null; // فرمان صریح = پاک‌شدن صف وی‌پوینت (0.162.0 — بند 238)
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
  unit.huntId = null; // عقب‌نشینی = پایان شکار
  unit.wp = null; // عقب‌نشینی = پاک‌شدن صف (0.162.0 — بند 238)
  unit.path = null;
  return { ok: true, reason: "OK" };
}

// لغو همیشه واحد را به idle قابل تشخیص برمی‌گرداند (رفتار مورد انتظار CORE-001).
export function cancelOrder(unit) {
  if (!unit) return { ok: false, reason: "INVALID" };
  unit.wp = null; // لغو = پاک‌شدن صف (0.162.0 — بند 238)
  unit.order = null;
  unit.mission = "idle";
  unit.path = null;
  return { ok: true, reason: "OK" };
}

export const DISBAND_FA = lazyTable("game.disband", ["OK", "INVALID", "NOT_OWNED", "LORD"]);

// انحلال یگان (0.164.0 — §10.4/بند 246 + §9.1/خط 486): یگان خودیِ زنده
// (نه Lord) حذف می‌شود و دهقان به campfire/ستاد برمی‌گردد: workers+۱.
// ناپدیدشدن (بی‌ستاد زنده، مسکن پر، سقف جمعیت) هم موفق است ولی workers
// نمی‌گیرد (دفترچه: «ناپدید می‌شوند» + «قبلش مسکن بسازید»). گاریسون/فرمان
// با حذف پاک می‌شود. MP-aware (کیسه مالک)؛ خالص و قطعی.
export function disbandUnit(state, ids, owner) {
  const ow = owner == null ? 0 : owner;
  if (!Array.isArray(ids) || !ids.length) return { ok: false, reason: "INVALID" };
  const mp = state.mp && state.mp.enabled;
  const res = mp ? state.mpres[ow]
    : (ow === CONFIG.AI.owner && state.ai ? state.ai : state);
  if (!res) return { ok: false, reason: "INVALID" };
  let n = 0, vanished = 0, lord = 0;
  for (const id of ids) {
    const u = (state.units || []).find((x) => x.id === id && !x.dead);
    if (!u || (u.owner == null ? 0 : u.owner) !== ow) continue;
    if (u.type === "lord") { lord++; continue; }
    if (u.garrisonTower != null) ungarrisonUnit(state, u);
    u.wp = null; u.order = null; u.mission = "idle"; u.path = null;
    u.dead = true; // حذف منطقی (پاک‌سازی سراسری مثل کشته‌ها)
    const housed = hasLiveKeep(state, ow) && (res.workers || 0) < housingCap(state, ow) && !atPopCap(state, ow);
    if (housed) res.workers = (res.workers || 0) + 1;
    else vanished++;
    n++;
  }
  if (!n) return { ok: false, reason: lord ? "LORD" : "NOT_OWNED" };
  pushEvent(state, tr("game.ev.disband", { n, v: vanished }));
  return { ok: true, reason: "OK", n, vanished };
}

export function pushEvent(state, msg) {
  state.events.push(msg);
  if (state.events.length > 20) state.events.splice(0, state.events.length - 20);
}

function failOrder(state, u, reason) {
  const o = u.order; // مقصد برای نشان ناکامی — پیش از پاک‌شدن (0.165.0 — بند 230)
  u.wp = null; // شکست = پاک‌شدن صف (0.162.0 — بند 238)
  u.order = null;
  u.mission = "failed";
  u.path = null;
  if (reason === "NO_PATH" && o && Number.isInteger(o.c) && Number.isInteger(o.r)) {
    // «ضربدر قرمز» روی مقصد (0.165.0 — §19.2/بند 230): نشان نمایشیِ گذرا —
    // نه در هش (stateHash در mp.js فیلد fx را نمی‌خواند)، نه در ذخیره (serialize
    // در persist.js فیلدبه‌فیلد است و fx جا می‌ماند)؛ رندر از همین می‌کشد
    // (drawNoPath در render.js). سقف مشترک FX_CAP؛ قطعی و MP-امن.
    if (!Array.isArray(state.fx)) state.fx = [];
    state.fx.push({ kind: "nopath", x: o.c + 0.5, r: o.r + 0.5, tick: state.tick });
    if (state.fx.length > FX_CAP) state.fx.splice(0, state.fx.length - FX_CAP);
  }
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

// تصرف دروازه (0.158.0 - S11.1/بند 263): مركز يگان زنده غيرمستقر بيگانه
// روي ردپاي دروازه سالم تكميلشده («به بالاي آن برسد» دفترچه) = تصرف:
// مالكيت + باز شدن + پرچم/رويداد. مجاورت مهاجم = حمله عادي است نه تصرف
// (وگرنه نبرد دروازه ميخوابيد — ثبتشده). سولو:
// دشمن -> 9 (حريف AI) / خودي -> 0؛ MP: اسلات مهاجم. تقدم ترتيب id
// (ترتيب آرايه) است. پيش از نبرد اجرا ميشود تا هدفگيري/مسير تازه شود.
// قطعي و MP-امن (بدون rng)؛ owner/open از قبل در هش/ذخيرهاند.
// Capture methods (0.159.0 item 296): only foot units claim; siege engines never do.
export function stepGateCapture(state) {
  const mp = state.mp && state.mp.enabled;
  for (const b of state.buildings) {
    if (!b || b.destroyed || b.type !== "gate" || underConstruction(b)) continue;
    const bow = b.owner == null ? 0 : b.owner;
    let claimant = null;
    for (const u of state.units) {
      if (u.dead || u.garrisonTower != null) continue;
      const udef = UNITS[u.type];
      if (udef && udef.siege) continue; // siege engines do not capture gates (0.159.0 item 296)
      if (u.x < b.c || u.x >= b.c + b.w || u.r < b.r || u.r >= b.r + b.h) continue; // فقط ردپا
      if (mp) {
        if (u.side !== "player") { claimant = CONFIG.AI.owner; break; }
        const uow = u.owner == null ? 0 : u.owner;
        if (uow !== bow) { claimant = uow; break; }
      } else {
        if (u.side === "enemy") { claimant = CONFIG.AI.owner; break; }
        if (bow === CONFIG.AI.owner) { claimant = 0; break; }
      }
    }
    if (claimant == null || claimant === bow) continue;
    b.owner = claimant;
    b.open = true;
    for (const u of state.units) {
      if (u.targetKind === "bld" && u.targetId === b.id) { u.targetKind = null; u.targetId = null; }
    }
    if (mp) {
      for (const u of state.units) {
        if (u.side === "player" && !u.dead) {
          const uow = u.owner == null ? 0 : u.owner;
          if (uow === claimant || uow === bow) u.path = null;
        }
      }
    } else {
      for (const u of state.units) if (!u.dead) u.path = null;
    }
    pushEvent(state, tr("game.ev.gateCapture"));
  }
}

// نمای اشغال برای یک جناح: خودی دروازه‌های باز را باز می‌بیند، بقیه عین occ.
// کپی فقط وقتی دروازه بازِ سالمی هست (وگرنه همان مرجع — بدون هزینه).
// در MP فقط دروازه‌های هم‌مالک گذرگاه‌اند.
export function occForSide(state, side, owner) {
  const mp = state.mp && state.mp.enabled;
  if (side !== "player") {
    // 0.158.0 - بند 263: سولو = دشمن از دروازه باز تصرفشده (owner-9) ميگذرد؛ MP = مثل قبل سد.
    if (mp) return state.occ;
    owner = CONFIG.AI.owner;
  } else {
    owner = owner == null ? 0 : owner;
  }
  let copy = null;
  for (const b of state.buildings) {
    if (b.destroyed || b.type !== "gate" || b.open === false) continue;
    if (mp) {
      if (side !== "player" || (b.owner == null ? 0 : b.owner) !== owner) continue;
    } else if (side === "player") {
      // سولو خودي: همه دروازههاي باز گذرگاهاند (مثل قبل - بياثر بر بازپسگيري).
    } else if ((b.owner == null ? 0 : b.owner) !== owner) continue;
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
    if (shiftQueue(state, u)) return; // وی‌پوینت بعدی (0.162.0 — بند 238)
    u.order = null;
    u.mission = "done";
    u.path = null;
    return;
  }
  let dx = u.x - ne.x, dr = u.r - ne.r;
  const d = Math.sqrt(dx * dx + dr * dr) || 1;
  moveSlide(state, terrain, W, H, u,
    u.x + (dx / d) * 3, u.r + (dr / d) * 3, (def.speed * RETREAT_MULT) / simHz());
}

// گام گشت (0.162.0 — §10.2/بند 236): مثل followOrder ولی رسیدن به سرِ جاری =
// تعویض سرها (c/r با pc/pr) نه پایان؛ فرمان تا دستور صریح/شکست می‌ماند.
function patrolStep(state, terrain, W, H, u, def) {
  const o = u.order;
  // مهاجرت حلقه (0.164.0 — بند 237): ذخیره قدیمی بی‌pts از pc/pr ساخته می‌شود.
  if (!Array.isArray(o.pts) || o.pts.length < 2 || !o.pts.every((p) => p && Number.isInteger(p.c) && Number.isInteger(p.r))) {
    const pc = Number.isInteger(o.pc) ? o.pc : Math.max(0, Math.min(W - 1, Math.floor(u.x)));
    const pr = Number.isInteger(o.pr) ? o.pr : Math.max(0, Math.min(H - 1, Math.floor(u.r)));
    o.pts = [{ c: pc, r: pr }, { c: o.c, r: o.r }];
    o.pi = 1;
  }
  if (!Number.isInteger(o.pi) || o.pi < 0 || o.pi >= o.pts.length) o.pi = 1 % o.pts.length;
  const g = nearestWalkable(terrain, occForSide(state, u.side, u.owner), W, H, o.c, o.r, 8);
  if (!g) {
    failOrder(state, u, "NO_PATH");
    return;
  }
  const tx = g[0] + 0.5, tr = g[1] + 0.5;
  if (Math.sqrt((u.x - tx) * (u.x - tx) + (u.r - tr) * (u.r - tr)) <= ARRIVE_DIST) {
    u.x = tx; u.r = tr;
    u.homeX = tx; // سرِ تازه = پست تازه
    u.homeR = tr;
    u.huntId = null;
    const npi = (o.pi + 1) % o.pts.length; // نشانگر بعدی حلقه
    o.pi = npi;
    o.c = o.pts[npi].c; o.r = o.pts[npi].r;
    o.pc = o.pts[(npi + 1) % o.pts.length].c; // سرِ دیگر = بعدیِ هدف (سازگار با تعویض دویی)
    o.pr = o.pts[(npi + 1) % o.pts.length].r;
    o.retries = 0;
    u.path = null;
    return;
  }
  const path = ensurePath(state, terrain, W, H, u, g[0], g[1]);
  if (path && u.pathIdx < path.length) {
    o.retries = 0;
    followPath(u, def.speed / simHz());
  } else {
    o.retries = (o.retries || 0) + 1;
    if (o.retries > ORDER_RETRIES) {
      failOrder(state, u, "NO_PATH");
    } else {
      moveSlide(state, terrain, W, H, u, tx, tr, def.speed / simHz()); // تلاش جایگزین
    }
  }
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
    u.homeX = tx; // رسیدن به مقصد صریح = پست تازه
    u.homeR = tr;
    u.huntId = null; // رسیدن به مقصد = پایان شکار
    if (shiftQueue(state, u)) return; // وی‌پوینت بعدی (0.162.0 — بند 238)
    u.order = null;
    u.mission = "done";
    u.path = null;
    return;
  }
  const path = ensurePath(state, terrain, W, H, u, g[0], g[1]);
  if (path && u.pathIdx < path.length) {
    o.retries = 0;
    followPath(u, def.speed / simHz());
  } else {
    o.retries = (o.retries || 0) + 1;
    if (o.retries > ORDER_RETRIES) {
      failOrder(state, u, "NO_PATH");
    } else {
      moveSlide(state, terrain, W, H, u, tx, tr, def.speed / simHz()); // تلاش جایگزین
    }
  }
}

// --- موتور گام نبرد (قطعی: ترتیب id، بدون RNG) ---

// نقطه‌ثابت موقعیت (فاز ۰ بند ۲): همه مختصات منطقی yگان‌ها روی شبکه ۱/۶۴
// تایل کوانتیزه می‌شوند (Q6 — دقیقاً نمایش‌پذیر در باینری و JSON، پس
// save/load بی‌نهایت دقیق و هش `*64|0` دقیق است). منابع/HP/خسارت/کول‌داون/
// تیک‌ها از ابتدا صحیح‌اند؛ فاصله‌ها روی همین ورودی‌های کوانتیزه با ترتیب
// عملیات ثابت (IEEE754 قطعی) حساب می‌شوند. هر نوشتنی به u.x/u.r در حرکت
// باید از qpos بگذرد (ظهور/گاریسون/اسنپ مقصد از قبل مضرب ۰٫۵ هستند).
export const POS_Q = 64;
export function qpos(v) {
  return Math.round(v * POS_Q) / POS_Q;
}

const dist = (ax, ar, bx, br) => Math.sqrt((ax - bx) * (ax - bx) + (ar - br) * (ar - br));
const bldCenter = (b) => ({ x: b.c + b.w / 2, r: b.r + b.h / 2 });

export function walkable(state, terrain, W, H, x, r, side, owner) {
  const c = Math.floor(x), rr = Math.floor(r);
  if (c < 0 || rr < 0 || c >= W || rr >= H) return false;
  if (terrain[rr * W + c] !== T_GRASS && terrain[rr * W + c] !== T_OASIS) return false; // واحه قابل‌عبور است (0.154.0 — بند 107)
  if (state.occ[rr * W + c] === 1) {
    if (side !== "player") {
      // 0.158.0 - بند 263: سولو = دشمن از دروازه باز تصرفشده (owner-9) ميگذرد.
      if (state.mp && state.mp.enabled) return false;
      const g = gateAt(state, c, rr);
      if (!g || !gateOpen(g) || (g.owner == null ? 0 : g.owner) !== CONFIG.AI.owner) return false;
      return true;
    }
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

function acquire(u, state, ox, oy, capOver) {
  const def = UNITS[u.type];
  const mp = state.mp && state.mp.enabled;
  const uow = u.owner == null ? 0 : u.owner;
  // مبدأ و سقف موضع (0.153.0 — بندهای 566-567): پیش‌فرض جای یگان و بی‌سقف
  // (رفتار امروز)؛ hold سقف 8، defend سقف 20؛ defendStep/engageStep مبدأ=پست می‌دهند (engage سقف 40 ولی دید aggro می‌ماند).
  const px = ox != null ? ox : u.x, pr = oy != null ? oy : u.r;
  let cap = capOver != null ? capOver : Infinity;
  if (capOver == null) {
    if (u.stance === STANCES.HOLD) cap = 8;
    else if (u.stance === STANCES.DEFEND) cap = 20;
  }
  if (u.side === "enemy") {
    // نزدیک‌ترین میان ساختمان‌ها و سربازان بازیکن — ساختمان‌های AI (owner=9)
    // هدف موج نیستند (0.42.0: موج با حریف هم‌جبهه است).
    let best = null, bd = cap;
    for (const b of state.buildings) {
      if (b.destroyed) continue; // ویران‌شده قابل هدف نیست (وگرنه resolveTarget بی‌نهایت لوپ می‌زد)
      if ((b.owner == null ? 0 : b.owner) === CONFIG.AI.owner) continue;
      const p = bldCenter(b);
      const d = dist(px, pr, p.x, p.r);
      if (d < bd) { bd = d; best = { kind: "bld", id: b.id }; }
    }
    for (const e of state.units) {
      if (e.dead || e.side !== "player" || e.garrisonTower != null) continue; // مستقر قابل‌هدف نیست (0.45.0)
      const d = dist(px, pr, e.x, e.r);
      if (d < bd) { bd = d; best = { kind: "unit", id: e.id }; }
    }
    return best;
  }
  if (mp) {
    // رقابتی: نزدیک‌ترین بنای/یگانِ مالکِ دیگر در برد aggro (موج خنثی نداریم).
    // (0.70.2: قبلاً بی‌حد بود — هر یگان، از جمله ارباب، از لحظه اول تا آن سر نقشه به سمت نزدیک‌ترین
    // دشمن می‌دوید و بازی ۴نفره بدون هیچ ورودی تا تیک ~۹۰۰ تمام می‌شد. حالا مثل سولو فقط دشمنِ نزدیک.)
    let best = null, bd = Math.min(def.aggro, cap);
    for (const b of state.buildings) {
      if (b.destroyed) continue;
      if ((b.owner == null ? 0 : b.owner) === uow) continue;
      const p = bldCenter(b);
      const d = dist(px, pr, p.x, p.r);
      if (d < bd) { bd = d; best = { kind: "bld", id: b.id }; }
    }
    if (!def.siege) { // محاصره فقط ساختمان می‌زند (0.46.0)
      for (const e of state.units) {
        if (e.dead || e.side !== "player" || e.garrisonTower != null) continue; // مستقر قابل‌هدف نیست (0.45.0)
        if ((e.owner == null ? 0 : e.owner) === uow) continue;
        const d = dist(px, pr, e.x, e.r);
        if (d < bd) { bd = d; best = { kind: "unit", id: e.id }; }
      }
    }
    return best;
  }
  if (def.siege) {
    // محاصره (0.46.0): فقط ساختمان دشمن — در سولو بنای حریف AI (موج ساختمانی ندارد).
    let sbest = null, sbd = Math.min(def.aggro, cap);
    for (const b of state.buildings) {
      // (0.158.0 - بند 263: دروازه ناديده — AI دروازه نميسازد؛ تنها دروازه بيگانه
      // سولو ممكن تصرفشده خودي است كه بايد بازپس گرفته شود نه كوبيده.)
      if (b.destroyed || b.type === "gate" || (b.owner == null ? 0 : b.owner) !== CONFIG.AI.owner) continue;
      const p = bldCenter(b);
      const d = dist(px, pr, p.x, p.r);
      if (d <= sbd) { sbd = d; sbest = { kind: "bld", id: b.id }; }
    }
    return sbest;
  }
  let best = null, bd = Math.min(def.aggro, cap);
  for (const e of state.units) {
    if (e.dead || e.side !== "enemy") continue;
    const d = dist(px, pr, e.x, e.r);
    if (d <= bd) { bd = d; best = { kind: "unit", id: e.id }; }
  }
  // بنای حریف AI هم هدف است (0.42.0: وگرنه ستاد حریف هرگز نمی‌افتاد) —
  // در همان برد aggro، نزدیک‌ترین می‌برد (یگان یا بنا).
  if (!mp) {
    for (const b of state.buildings) {
      // (0.158.0 - بند 263: دروازه ناديده — دليل در بلوك محاصره بالا.)
      if (b.destroyed || b.type === "gate" || (b.owner == null ? 0 : b.owner) !== CONFIG.AI.owner) continue;
      const p = bldCenter(b);
      const d = dist(px, pr, p.x, p.r);
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
// (0.151.0 — §۱۹.۳/بند ۱۱۵۴): ×weakVsBld اختیاری (پیش‌فرض ۱) — ضعف شمشیرزن عرب ضد ساختمان.
export function dmgVs(def, targetKind) {
  const base = (def && def.dmg) || 0;
  if (targetKind === "bld") return base * ((def && def.bonusVsBld) || 1) * ((def && def.weakVsBld) || 1);
  return (def && def.halfVsUnit) ? base / 2 : base;
}

// دیوارهای مستحکم (0.148.0 — §۱۴.۲/بند ۳۷۰ + §۱۹.۳/بند ۲۵۱): در اتاق
// strongWalls، ضربه نیروهای غیرمحاصره به سازه‌های مستحکم (پرچم fortified
// کاتالوگ: دیوار/برج/دروازه) صفر می‌شود؛ فقط ماشین محاصره (def.siege)
// آسیب می‌زند. خالص و MP-aware (پرچم در rules)؛ سولو همیشه خاموش است.
export function strongWallDmg(state, def, t, dmg) {
  if (!state || !state.rules || !state.rules.strongWalls) return dmg;
  if (!t || t.kind !== "bld" || !t.b || t.b.destroyed) return dmg;
  if (def && def.siege) return dmg;
  const bd = CONFIG.BUILDINGS[t.b.type];
  if (bd && bd.fortified) return 0;
  return dmg;
}

// بالیستای آتشین (0.152.0 — §۱۹.۳/بند ۱۱۵۵): به سازه مستحکم (پرچم
// fortified کاتالوگ: دیوار/برج/دروازه) آسیب نمی‌زند، به بنای دیگر
// می‌زند. خالص و قطعی (پرچم کاتالوگ noVsFort؛ پیش‌فرض = همه‌چیز).
export function noFortDmg(def, t, dmg) {
  if (!def || !def.noVsFort) return dmg;
  if (!t || t.kind !== "bld" || !t.b || t.b.destroyed) return dmg;
  const bd = CONFIG.BUILDINGS[t.b.type];
  if (bd && bd.fortified) return 0;
  return dmg;
}

// برتری دفاعی برج‌ها (0.156.0 — §11.3/بند 261): assassin ضد خانواده‌برج صفر + تیر دوربرد غیرمحاصره ضد برج نصف (guess). نردبان در موتور نیست (vacuous ثبت‌شده)؛ بونوس برد گاریسون (+2) از 0.45.0 هست. خالص و قطعی.
export const TOWER_FAMILY = ["tower", "lookout", "perimeter", "defence", "squaretower", "roundtower"];
export function isTowerFamily(type) { return TOWER_FAMILY.includes(type); }
export function towerGuardDmg(atk, def, t, dmg) {
  if (!t || t.kind !== "bld" || !t.b || t.b.destroyed) return dmg;
  if (!isTowerFamily(t.b.type)) return dmg;
  if (atk === "assassin") return 0;
  if (def && !def.siege && (def.range || 0) > 2) return dmg / 2;
  return dmg;
}
// قدرت Ram (0.156.0 — §18.3/بند 262): یک ضربه = یک خانه دیوار تک‌لایه (wall/lowwall/crenwall؛ دروازه/برج = همان ×3). خالص.
export const RAM_ONESHOT_WALLS = ["wall", "lowwall", "crenwall"];
export function ramStrikeDmg(atk, def, t, dmg) {
  if (atk !== "ram") return dmg;
  if (!t || t.kind !== "bld" || !t.b || t.b.destroyed) return dmg;
  if (!RAM_ONESHOT_WALLS.includes(t.b.type)) return dmg;
  return Math.max(dmg, t.b.maxHp || dmg);
}
// مقاومت Ram (0.156.0 — بند 262): تیر دوربرد غیرمحاصره یک‌چهارم (کف 1) + ballista ×2 + ضربه نزدیک ×2. آتش موتور فقط ساختمان می‌سوزاند (vacuous ثبت‌شده)؛ پاشش آتش‌افکن خام می‌ماند. خالص.
export function ramResistDmg(atk, def, t, dmg) {
  if (!t || t.kind !== "unit" || !t.u || t.u.dead || t.u.type !== "ram") return dmg;
  if (atk === "ballista") return dmg * 2;
  if (def && !def.siege && (def.range || 0) > 2) return Math.max(1, dmg / 4);
  if (def && (def.range || 0) <= 2) return dmg * 2;
  return dmg;
}

// گودال کشتار (0.155.0 - S11.5/بند 273؛ اعداد 0.158.0 - S18.3/بند 290):
// تله 1×1 با 3 شارژ (guess)؛ دشمن روي ردپاي تکميلشده بهاندازه هزينه نوعش
// شارژ ميخورد: سبک 1، شواليه/شمشيرزن 2،
// نيزهدار/سنگين/ارباب 3 (مرجع بند 290)؛
// محاصره سبک (catapult/trebuchet/ballista) هزينه 1 (مرجع: Catapult 1؛
// بقيه guess همرده)؛ رم 17 آسيب/گودال + مصرف کامل (9 گودال = 153 بیشتر از جان 150
// مرجع Ram 9)؛ siege tower در موتور نيست (vacuous). شارژ ناکافي = عبور
// بيآسيب؛ صفر = مصرف گودال (ويراني جنگي +
// آزادي زمين، بيغرامت). دوست هرگز
// (سولو: فقط side دشمن؛ MP: فقط يگان بيگانه). در صلح No Rush خاموش
// (تکگلوگاه strike). مستقرهاي برج ماشه نميخورند. قطعي و MP-امن (بدون rng)؛
// شارژ در هش/ذخيره شرطي (فقط killpit).
export const KILLPIT_CHARGES = 3;
// آسيب هر گودال به رم (0.158.0 - بند 290): 9 * 17 = 153 >= جان 150 رم.
export const PIT_RAM_DMG = 17;
export const PIT_COST = { knight: 2, swordsman: 2, pikeman: 3, lord: 3 };
export function pitCostFor(type) {
  if (Object.prototype.hasOwnProperty.call(PIT_COST, type)) return PIT_COST[type];
  const def = UNITS[type];
  if (def && def.siege) return type === "ram" ? KILLPIT_CHARGES : 1; // (0.158.0 - بند 290: سبك 1؛ رم = كل گودال + آسيب)
  return 1;
}
export function pitVictim(state, u, pitOwner) {
  if (!u || u.dead || u.garrisonTower != null) return false;
  const mp = state.mp && state.mp.enabled;
  if (mp) {
    if (u.side !== "player") return false;
    return (u.owner == null ? 0 : u.owner) !== (pitOwner == null ? 0 : pitOwner);
  }
  return u.side === "enemy";
}
// مرگ گودالی: آینه بلوک مرگ strike (ارباب خودی سولو = شکست؛ ارباب MP = رویداد).
function pitKill(state, u) {
  const mp = state.mp && state.mp.enabled;
  u.hp = 0;
  u.dead = true;
  if (u.type === "lord" && u.side === "player" && !mp && !state.defeated) {
    state.defeated = true;
    state.paused = true;
    pushEvent(state, tr("game.ev.lordDead"));
  } else if (mp && u.type === "lord") {
    pushEvent(state, tr("game.ev.lordDeadMp", { p: ((u.owner == null ? 0 : u.owner) + 1) }));
  }
}
function pitCharges(b) {
  return Number.isInteger(b.charges) && b.charges >= 0 ? b.charges : KILLPIT_CHARGES;
}
// گام گودال‌ها: پس از حرکت/نبرد، پیش از جارو تا کشته‌ها همان تیک جارو شوند.
export function stepKillpits(state) {
  if (peaceActive(state)) return 0;
  let kills = 0;
  for (const b of state.buildings) {
    if (!b || b.destroyed || b.type !== "killpit" || underConstruction(b)) continue;
    const ow = b.owner == null ? 0 : b.owner;
    let ch = pitCharges(b);
    for (const u of state.units) {
      if (u.dead || !pitVictim(state, u, ow)) continue;
      if (u.x < b.c || u.x >= b.c + b.w || u.r < b.r || u.r >= b.r + b.h) continue;
      if (u.type === "ram") {
        // (0.158.0 - بند 290: رم 9 گودال ميخواهد — هر گودال 17 آسيب + مصرف كامل.)
        ch = 0;
        b.charges = 0;
        u.hp -= PIT_RAM_DMG;
        if (u.hp <= 0) { u.hp = 0; u.dead = true; pitKill(state, u); kills++; }
        break;
      }
      const cost = pitCostFor(u.type);
      if (ch < cost) continue; // گودال کم‌جان: عبور بی‌آسیب (الگوی مرجع)
      ch -= cost;
      b.charges = ch;
      pitKill(state, u);
      kills++;
      if (ch <= 0) break;
    }
    if (ch <= 0 && !b.destroyed) {
      b.hp = 0;
      destroyBuilding(state, b); // مصرف کامل = ویرانی جنگی (آزادی زمین + رویداد)
      pushEvent(state, tr("game.ev.pitspent"));
    }
  }
  if (kills > 0) pushEvent(state, tr("game.ev.pitkill", { count: kills }));
  return kills;
}
// سگ‌های جنگی در قفس (0.156.0 — §11.9/بندهای 288-289): قفس 2×2 (۱۰چوب+۱۰۰طلا مرجع) با 4 سگ (guess)؛ فرمان release همه سگ‌های مانده را روی حلقه آزاد دور ردپا می‌پراکند (قطعی: حلقه ثابت)؛ سگ (wardog: جان25/آسیب5/سرعت4.6/agro14 — guess، فقط از قفس، noHire) درنده است (engage) و نزدیک‌ترین یگان دشمن را می‌گیرد (کارگرها در موتور انتزاعی‌اند — انحراف ثبت‌شده). شارژمجدد 1 سگ هر 900 تیک (guess) در stepKennels. گزینه اتاق No Dogs (بیت o+24) جای‌گذاری (NODOGS در validate) و رهاسازی (NODOGS) را می‌بندد؛ سولو همیشه مجاز. قطعی و MP-امن.
export const DOGS_PER_CAGE = 4;
export const DOG_REFILL_TICKS = 900;
export const RELEASE_FA = lazyTable("game.release", ["OK", "INVALID", "NOT_OWNED", "UNDER_CONSTRUCTION", "NODOGS", "EMPTY", "NOROOM"]);
export function cageDogs(b) {
  if (!b) return DOGS_PER_CAGE;
  return Number.isInteger(b.dogs) && b.dogs >= 0 ? Math.min(b.dogs, DOGS_PER_CAGE) : DOGS_PER_CAGE;
}
export function validateRelease(state, b, owner) {
  const ow = owner == null ? 0 : owner;
  if (!b || b.destroyed || b.type !== "dogcage") return { ok: false, reason: "INVALID" };
  if ((b.owner == null ? 0 : b.owner) !== ow) return { ok: false, reason: "NOT_OWNED" };
  if (underConstruction(b)) return { ok: false, reason: "UNDER_CONSTRUCTION" };
  if (state && state.rules && state.rules.noDogs) return { ok: false, reason: "NODOGS" };
  if (cageDogs(b) <= 0) return { ok: false, reason: "EMPTY" };
  return { ok: true, reason: "OK" };
}
export function releaseDogs(state, terrain, W, H, b, owner) {
  const v = validateRelease(state, b, owner);
  if (!v.ok) return v;
  const ow = owner == null ? 0 : owner;
  const want = cageDogs(b);
  const used = new Set();
  const outs = [];
  for (let ring = 1; ring <= 6 && outs.length < want; ring++) {
    for (let dr = -ring; dr <= ring && outs.length < want; dr++) {
      for (let dc = -ring; dc <= ring && outs.length < want; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== ring) continue;
        const c = b.c + dc, r = b.r + dr;
        if (c < b.c || c >= b.c + b.w || r < b.r || r >= b.r + b.h) {
          if (c < 0 || r < 0 || c >= W || r >= H) continue;
          const k = c + "," + r;
          if (used.has(k)) continue;
          if (!walkable(state, terrain, W, H, c + 0.5, r + 0.5, "player", ow)) continue;
          used.add(k);
          outs.push(spawnUnit(state, "wardog", c + 0.5, r + 0.5, ow));
        }
      }
    }
  }
  if (!outs.length) return { ok: false, reason: "NOROOM" };
  b.dogs = want - outs.length;
  pushEvent(state, tr("game.ev.release", { n: outs.length }));
  return { ok: true, reason: "OK", released: outs.length };
}
// لانه سگ‌ها (0.156.0): هر 900 تیک 1 سگ به هر قفس سالم ناقص برمی‌گردد (قطعی: مادولوی تیک سراسری).
export function stepKennels(state) {
  if (!state || (state.tick % DOG_REFILL_TICKS) !== 0) return 0;
  let n = 0;
  for (const b of state.buildings) {
    if (!b || b.destroyed || b.type !== "dogcage" || underConstruction(b)) continue;
    if (cageDogs(b) < DOGS_PER_CAGE) { b.dogs = cageDogs(b) + 1; n++; }
  }
  return n;
}
// ضربه جنگی — تک‌گلوگاه آسیب (0.187.0: export برای آزمون‌پذیری شکست ارباب؛ رفتار بی‌تغییر).
export function strike(state, dmg, t) {
  // صلح No Rush (0.149.0 — §۱۴.۲/بند ۷۳۰): در صلح هیچ ضربه‌ای خسارت
  // نمی‌زند — تک‌گلوگاه همه مسیرهای آسیب (یگان/برج/گاریسون). بیماریِ ابرِ
  // در پرواز حمله نیست و می‌ماند (دامنه صادقانه: فقط حمله و تولید).
  if (peaceActive(state)) return;
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
    return;
  }
  // اشتعال (0.148.0 — §۱۸.۴/#۲۱۵): بنای چوبیِ تکمیل‌شده با هر ضربه جنگی
  // ممکن است آتش بگیرد (شانس TUNING.fire.ignite)؛ سنگی (بی‌پرچم flammable)
  // هرگز. draw بی‌حالت از (mapSeed,tick,id) است — جریان rng جلو نمی‌رود،
  // پس هش/ری‌پلی/MP همان می‌ماند و فقط سوختن واقعی هش را عوض می‌کند.
  if (dmg > 0 && !(t.b.fire > 0) && isFlammable(t.b) && !underConstruction(t.b)) {
    if (FIRE.ignite > 0 && statelessRand(state.mapSeed || 0, state.tick || 0, t.b.id | 0) < FIRE.ignite) {
      t.b.fire = 1;
      pushEvent(state, tr("game.ev.ignite", { building: CONFIG.BUILDINGS[t.b.type].name }));
    }
  }
}

// بنای چوبی‌قابل‌سوختن (0.148.0 — §۱۸.۴): پرچم flammable کاتالوگ (چاه/حوض
// سنگی‌اند و عمداً بی‌پرچم‌اند تا خاموش‌کن مطمئن بمانند).
export function isFlammable(b) {
  if (!b || b.destroyed) return false;
  const def = CONFIG.BUILDINGS[b.type];
  return !!(def && def.flammable);
}

function destroyBuilding(state, b) {
  const mp = state.mp && state.mp.enabled;
  b.destroyed = true;
  b.fire = 0; // ویرانه نمی‌سوزد (0.148.0 — آتش با ویرانی می‌میرد)
  b.served = false; // ویرانه سرو نمی‌کند (بند ۶ — هش/popTarget یکسان؛ innServed ویرانه را نادیده می‌گیرد)
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
export const UNDO_FA = lazyTable("game.undo", ["OK", "INVALID", "NOT_OWNED"]);

// غرامت تخریب (ب-۱، خالص و تست‌پذیر): نصف هزینه ساخت هر منبع، کف.
// هزینه ۲ (دیوار) → ۱چ؛ کلبه (۶چ) → ۳چ؛ برج (۲۰چ+۱۰ط+۱۰سنگ) → ۱۰چ+۵ط+۵سنگ.
export function demolishRefund(type) {
  const def = CONFIG.BUILDINGS[type];
  const out = {};
  if (!def || !def.cost) return out;
  for (const k of Object.keys(def.cost)) {
    const v = Math.floor((def.cost[k] || 0) / 2);
    if (v > 0) out[k] = v;
  }
  return out;
}
// اطلاعات پنل ساختمان (0.174.0 — §3.3/بند 150): خالص و تست‌پذیر.
// buildPct = درصدِ ماندهٔ ساخت (null وقتی کامل است)؛ destroyed از روی پرچم.
export function buildingInfo(b, def) {
  if (!b) return null;
  const total = def && typeof def.buildTime === 'number' && def.buildTime > 0 ? def.buildTime : 0;
  const left = typeof b.buildLeft === 'number' ? b.buildLeft : 0;
  return {
    type: b.type,
    name: (def && def.name) || b.type,
    hp: b.hp == null ? null : b.hp,
    maxHp: b.maxHp == null ? ((def && def.hp) || null) : b.maxHp,
    buildPct: total > 0 && left > 0 ? Math.max(0, Math.min(100, Math.round((left * 100) / total))) : null,
    destroyed: !!b.destroyed,
  };
}
// کالاهای لازم استخدام (0.175.0 — §9.3/بند 482): فهرست نمایشی هایلایت هاور.
// مزدور mercدار فقط طلا (mercGold)؛ وگرنه غذا/طلا + سلاح لازم. خالص.
export function hireGoodsFor(type) {
  const def = UNITS[type];
  if (!def || def.side !== 'player' || def.noHire || !def.cost) return [];
  if (def.merc === true) {
    const g = mercGoldOf(type);
    return g > 0 ? [{ res: 'gold', n: g }] : [];
  }
  const out = [];
  const c = def.cost;
  if ((c.food || 0) > 0) out.push({ res: 'food', n: c.food });
  if ((c.gold || 0) > 0) out.push({ res: 'gold', n: c.gold });
  if (def.requiresWeapon) out.push({ res: def.requiresWeapon, n: 1 });
  return out;
}

// ارزش یک سرباز برای ارزیابی (0.178.0 — بند 869/§18.6):
// جمع طلا + ارزش بازاری تجهیزات (ستون خرید نرخ‌های پیاده‌شده بازار).
// نگاشت زره (guess — ثبت در numbers-registry): none=۰، leather=چرم،
// mail/plate=آهن (در بازار کالای زره آهنی جدا نیست). خالص و UI-side؛
// مثال مرجع (crossbowman = ۳ چوب + ⅓ گاو + ۲۰ طلا) با اعداد پیاده‌شده ما
// ۳۰ + ۲۰ + ۱۲ = ۶۲ می‌شود (goldCost ما ۳۰ است، نه ۲۰).
const SOLDIER_ARMOR_GOOD = { none: null, leather: "leather", mail: "iron", plate: "iron" };
export function soldierValue(type) {
  const def = UNITS[type];
  if (!def) return null;
  const rates = (CONFIG.MARKET && CONFIG.MARKET.rates) || {};
  // مزدور با طلای مزدوری (mercGold) استخدام می‌شود نه goldCost.
  let v = (def.merc === true && def.mercGold) ? def.mercGold : (def.goldCost || 0);
  for (const g of (def.equip || [])) {
    const r = rates[g];
    if (r) v += r.buy;
  }
  const ag = SOLDIER_ARMOR_GOOD[def.armorClass];
  if (ag && rates[ag]) v += rates[ag].buy;
  return v;
}

// ارزش سپاه برای AI/ارزیابی (0.180.0 — بند 1112/§18.7): جمع ستون خرید
// (soldierValue) یگان‌های زنده فهرست؛ مرده/ناشناخته = ۰ (ارباب هم فقط
// ارزش زرهش را دارد: mail→آهن). خالص؛ مصرف در نمایش قدرت merit (بند 745) — sim بی‌خبر.
export function armyValue(list) {
  if (!Array.isArray(list)) return 0;
  let v = 0;
  for (const u of list) {
    if (!u || u.dead) continue;
    const sv = soldierValue(u.type);
    if (typeof sv === "number") v += sv;
  }
  return v;
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
  b.fire = 0; // تخریب آتش را می‌خواباند (0.148.0 — مثل ویرانی جنگی)
  b.hp = 0; // ویرانه hp صفر دارد (بند ۶ — مثل destroyBuilding؛ پایداری هش/ذخیره)
  b.served = false; // ویرانه سرو نمی‌کند (بند ۶ — مثل destroyBuilding)
  const W = CONFIG.GRID_W;
  for (let j = 0; j < b.h; j++) {
    for (let i = 0; i < b.w; i++) state.occ[(b.r + j) * W + (b.c + i)] = 0;
  }
  releaseGarrison(state, b); // تخریب برج هم گاریسون را آزاد می‌کند (0.45.0)
  // غرامت ب-۱: نصف هزینه به همان کیسه‌ای که پرداخت کرده (سولو/MP/AI)،
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

// برگرداندن آخرین ساخت (0.146.0 — §۳.۱ Undo): حذف کامل بنا (نه ویرانه) +
// بازپرداخت کامل هزینه به کیسه پرداخت‌کننده (سولو/MP/AI، با سقف جاری) +
// بازپرداخت کامل سفارش‌های مانده صف + رویداد؛ تک‌سطحی (پس از اجرا pending
// پاک می‌شود). ستاد هرگز pending نمی‌شود (مسیر جدا) ولی guard هست.
// تعمیر (0.155.0 — §18.3/بند 210، از Crusader 2؛ در Crusader اصلی نیست):
// بنای آسیب‌دیده خودیِ تکمیل‌شده با هزینه متناسب با آسیب — مستحکم با سنگ
// (۱ سنگ هر ۱۰۰ HP، مرجع)، بقیه با چوب (۱ چوب هر ۵۰ HP، guess)؛ دست‌کم ۱.
// آنی است (نه به‌مرور)؛ ویرانه/نیمه‌کاره/سالم/بیگانه/بی‌بودجه = رد تمیز.
// فقط ریاضی صحیح؛ هش جدا نمی‌خواهد (hp از قبل در stateHash است)؛ ذخیره جدا
// نمی‌خواهد (میدان تازه‌ای نیست)؛ از صف سولو و MP با فرمان repair.
export const REPAIR_STONE_PER_HP = 100;
export const REPAIR_WOOD_PER_HP = 50;
export const REPAIR_FA = lazyTable("game.repair", ["OK", "INVALID", "NOT_OWNED", "FULL", "UNDER_CONSTRUCTION", "INSUFFICIENT"]);
// هزینه خالص و تست‌پذیر: {res, n} یا null (نوع ناشناخته).
export function repairCost(type, missing) {
  const def = CONFIG.BUILDINGS[type];
  if (!def || !(missing > 0)) return null;
  if (def.fortified) return { res: "stone", n: Math.max(1, Math.ceil(missing / REPAIR_STONE_PER_HP)) };
  return { res: "wood", n: Math.max(1, Math.ceil(missing / REPAIR_WOOD_PER_HP)) };
}
function repairBag(state, owner) {
  const ow = owner == null ? 0 : owner;
  const mp = state.mp && state.mp.enabled;
  if (mp) return state.mpres && state.mpres[ow] ? state.mpres[ow].resources : null;
  if (ow === CONFIG.AI.owner && state.ai) return state.ai.resources;
  return state.resources;
}
export function validateRepair(state, bldId, owner) {
  const ow = owner == null ? 0 : owner;
  const b = state.buildings.find((x) => x.id === bldId && !x.destroyed);
  if (!b) return { ok: false, reason: "INVALID" };
  if ((b.owner == null ? 0 : b.owner) !== ow) return { ok: false, reason: "NOT_OWNED" };
  if (underConstruction(b)) return { ok: false, reason: "UNDER_CONSTRUCTION" };
  if ((b.hp | 0) >= (b.maxHp | 0)) return { ok: false, reason: "FULL" };
  const cost = repairCost(b.type, (b.maxHp | 0) - (b.hp | 0));
  if (!cost) return { ok: false, reason: "INVALID" };
  const bag = repairBag(state, ow);
  if (!bag || (bag[cost.res] || 0) < cost.n) return { ok: false, reason: "INSUFFICIENT" };
  return { ok: true, reason: "OK", building: b, cost };
}
export function repairBuilding(state, b, owner) {
  const ow = owner == null ? (b.owner == null ? 0 : b.owner) : owner;
  const v = b && !b.destroyed ? validateRepair(state, b.id, ow) : { ok: false, reason: "INVALID" };
  if (!v.ok) return v;
  const bag = repairBag(state, ow);
  bag[v.cost.res] -= v.cost.n;
  b.hp = b.maxHp;
  pushEvent(state, tr("game.ev.repaired", { building: CONFIG.BUILDINGS[b.type].name }));
  return { ok: true, reason: "OK", cost: v.cost };
}
export function undoLastBuild(state, owner) {
  owner = owner == null ? 0 : owner;
  const pend = state.undo;
  if (!pend || !Number.isInteger(pend.bld)) return { ok: false, reason: "INVALID" };
  if ((pend.owner == null ? 0 : pend.owner) !== owner) return { ok: false, reason: "NOT_OWNED" };
  const bi = state.buildings.findIndex((x) => x.id === pend.bld && !x.destroyed);
  if (bi < 0) { state.undo = null; return { ok: false, reason: "INVALID" }; }
  const b = state.buildings[bi];
  if (b.type === "keep") { state.undo = null; return { ok: false, reason: "INVALID" }; }
  if ((b.owner == null ? 0 : b.owner) !== owner) return { ok: false, reason: "NOT_OWNED" };
  const def = CONFIG.BUILDINGS[b.type];
  const mp = state.mp && state.mp.enabled;
  let res = null;
  if (mp) { if (state.mpres && state.mpres[owner]) res = state.mpres[owner].resources; }
  else if (owner === CONFIG.AI.owner && state.ai) res = state.ai.resources;
  else res = state.resources;
  const refund = (cost) => {
    if (!res || !cost) return;
    const pseudo = mp ? { buildings: state.buildings, mp: { enabled: true } } : state;
    for (const k of Object.keys(cost)) {
      res[k] = Math.min(capFor(pseudo, k, mp ? owner : undefined), (res[k] || 0) + (cost[k] || 0));
    }
  };
  // سفارش‌های مانده صف: بازپرداخت کامل غذا/طلا/سلاح (الگوی cancelTrain).
  if (Array.isArray(b.train)) {
    for (const e of b.train) {
      const udef = UNITS[e.type];
      if (!udef || !udef.cost) continue;
      refund({ food: udef.cost.food, gold: udef.cost.gold });
      if (udef.requiresWeapon && res) {
        const pseudo = mp ? { buildings: state.buildings, mp: { enabled: true } } : state;
        res[udef.requiresWeapon] = Math.min(
          capFor(pseudo, udef.requiresWeapon, mp ? owner : undefined),
          (res[udef.requiresWeapon] || 0) + 1);
      }
            if (udef.requiresHorse) restoreHorse(state, owner); // 1 اسب برمی‌گردد (0.168.0)
    }
  }
  state.buildings.splice(bi, 1);
  const W = CONFIG.GRID_W;
  for (let j = 0; j < b.h; j++) {
    for (let i = 0; i < b.w; i++) state.occ[(b.r + j) * W + (b.c + i)] = 0;
  }
  refund(def && def.cost);
  pushEvent(state, tr("game.ev.undone", { building: def ? def.name : b.type }));
  state.undo = null;
  return { ok: true, reason: "OK" };
}

function moveSlide(state, terrain, W, H, u, tx, tr, step) {
  const dx = tx - u.x, dr = tr - u.r;
  const d = Math.sqrt(dx * dx + dr * dr);
  if (d < 1e-6) return;
  const vx = (dx / d) * step, vr = (dr / d) * step;
  if (walkable(state, terrain, W, H, u.x + vx, u.r + vr, u.side, u.owner)) {
    u.x = qpos(u.x + vx); u.r = qpos(u.r + vr);
  } else if (walkable(state, terrain, W, H, u.x + vx, u.r, u.side, u.owner)) {
    u.x = qpos(u.x + vx);
  } else if (walkable(state, terrain, W, H, u.x, u.r + vr, u.side, u.owner)) {
    u.r = qpos(u.r + vr);
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
  u.x = qpos(u.x + (dx / d) * step);
  u.r = qpos(u.r + (dr / d) * step);
}

function moveToward(state, terrain, W, H, u, def, t) {
  const p = targetPoint(t);
  const g = goalCell(state, terrain, W, H, t, u.side, u.owner);
  const step = def.speed / simHz();
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

// پاشش آتش (0.150.0 — §۱۹.۳/بند ۲۵۴ + §۱۲.۲/بند ۵۱۵): پس از ضربه مستقیم
// به یگان، همه یگان‌های دشمنِ زنده و غیرمستقر در شعاع splash از نقطه اصابت
// همان خسارت را می‌خورند (بی‌زنجیره — strike مستقیم است، نه fightTarget).
// دشمن‌شناسی مثل acquire (سولو: جبهه مخالف؛ MP: مالک دیگر)؛ صلح از خود
// strike می‌آید (گیت peaceActive) پس اینجا گیت جدا ندارد.
function splashHit(state, u, def, t, dmg) {
  if (!(def.splash > 0) || !t || t.kind !== "unit" || !t.u || t.u.dead) return;
  const mp = state.mp && state.mp.enabled;
  const uow = u.owner == null ? 0 : u.owner;
  const px = t.u.x, pr = t.u.r;
  for (const e of state.units) {
    if (e.dead || e.id === t.u.id || e.garrisonTower != null) continue;
    let foe;
    if (u.side === "enemy") foe = e.side === "player";
    else if (mp) foe = e.side === "player" && ((e.owner == null ? 0 : e.owner) !== uow);
    else foe = e.side === "enemy";
    if (!foe) continue;
    if (dist(px, pr, e.x, e.r) > def.splash) continue;
    strike(state, dmg, { kind: "unit", u: e });
  }
}

export function fightTarget(state, terrain, W, H, u, def, t) {
  if (def.needsDeploy && !u.deployed) {
    // منجنیق سیار: نزدیک می‌شود ولی شلیک نمی‌کند (0.46.0).
    if (!inRange(u, def, t)) moveToward(state, terrain, W, H, u, def, t);
    return;
  }
  if (inRange(u, def, t)) {
    if (u.cooldown <= 0) {
      // مهمات (0.149.0 — §۱۲.۲/بند ۵۷۸): منجنیق بی‌سنگ شلیک نمی‌کند (نزدیک
      // می‌ماند/می‌ایستد؛ سردی هم نمی‌نشیند تا با تأمین، فوری بزند).
      if (def.ammoCap && (u.ammo || 0) <= 0) return;
      const atk = u && u.type;
      const dealt = ramResistDmg(atk, def, t, noFortDmg(def, t, strongWallDmg(state, def, t, ramStrikeDmg(atk, def, t, towerGuardDmg(atk, def, t, dmgVs(def, t.kind) * fearAttackMult(state, u && u.owner))))));
      strike(state, dealt, t);
      splashHit(state, u, def, t, dealt);
      // واکنش به پرتابی (0.154.0 — §10.3/بند 568): ضربه دوربرد یگان به
      // قربانی تهاجمیِ بی‌هدف = شکار ضارب (یا برجِ ضارب مستقر).
      if (t.kind === "unit") provokeRetaliation(state, t.u, { kind: "unit", u });
      // مشعل برده (0.149.0 — §۱۲.۲/بند ۱۷۷): ضربه مشعل‌دار به بنای چوبیِ
      // تکمیل‌شده همیشه آتش می‌زند (بی‌شانس — مشعل یعنی آتش)؛ سنگی هرگز.
      // قطعی و MP-امن (پرچم کاتالوگ + وضعیت sim)؛ در صلح No Rush خاموش است.
      if (def.torch && !peaceActive(state) && t.kind === "bld" && t.b && !t.b.destroyed &&
          !(t.b.fire > 0) && isFlammable(t.b) && !underConstruction(t.b)) {
        t.b.fire = 1;
        pushEvent(state, tr("game.ev.ignite", { building: CONFIG.BUILDINGS[t.b.type].name }));
      }
      if (def.ammoCap) u.ammo = Math.max(0, (u.ammo || 0) - 1); // هر شلیک ۱ سنگ
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
        moveSlide(state, terrain, W, H, u, c.x, c.r, def.speed / simHz());
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
      strike(state, ramResistDmg(u && u.type, def, { kind: "unit", u: best }, def.dmg), { kind: "unit", u: best });
      u.cooldown = def.cd;
    }
    return;
  }
  u.targetKind = null;
  u.targetId = null;
  if (dist(u.x, u.r, c.x, c.r) > GUARD_HOME) {
    moveSlide(state, terrain, W, H, u, c.x, c.r, def.speed / simHz());
  }
  // وگرنه سر پست می‌ایستد (مأموریت idle می‌ماند — نگهبانی وضعیت است، نه مأموریت).
}

// موضع تهاجمی (0.154.0 — §10.3/بند 568): شکار از دور (افسار 40/42 از پست)،
// زنجیره هدف پس از نابودی (کسب تازه)، بازگشت به پست در بی‌هدفی، و واکنش فعال
// به حملات پرتابی (شکار ضارب). دید = aggro (مثل تدافعی — بی‌churn)؛ 40 فقط افسار
// است. محاصره و موج دشمن (side=enemy) مسیر قدیمی (resolveTarget) را می‌روند.
// همه guess/تصمیم تا مرجع.
export const ENGAGE_RADIUS = 40, ENGAGE_DROP = ENGAGE_RADIUS + 2;

// واکنش به حمله پرتابی (0.154.0 — بند 568): قربانیِ تهاجمیِ بی‌هدف که از
// بیرون دیدش تیر می‌خورد، ضارب را شکار می‌کند (بی‌افسار تا نابودی)؛ ضارب
// مستقر/برج = شکارِ خودِ برج. قربانی موج (side=enemy)، محاصره، بی‌برد،
// درگیرِ هدف زنده، یا در صلح = بی‌واکنش (پین‌های برج/موج سبز می‌مانند).
// خالصِ قطعی روی sim (بدون RNG) — MP-امن؛ true یعنی شکار ثبت شد.
export function provokeRetaliation(state, victim, shooter) {
  if (!victim || victim.dead || victim.stance !== STANCES.ENGAGE) return false;
  if (victim.side === "enemy") return false;
  const vdef = UNITS[victim.type];
  if (!vdef || !(vdef.range > 0) || vdef.siege) return false;
  if (peaceActive(state)) return false;
  const cur = victim.targetKind === "unit" ? findUnit(state, victim.targetId)
    : victim.targetKind === "bld" ? findBld(state, victim.targetId) : null;
  if (cur) return false;
  if (!shooter) return false;
  if (shooter.kind === "bld") {
    const b = shooter.b ? findBld(state, shooter.b.id) : null;
    if (!b) return false;
    victim.targetKind = "bld"; victim.targetId = b.id; victim.huntId = b.id;
    return true;
  }
  const s = shooter.u;
  if (!s || s.dead) return false;
  const sdef = UNITS[s.type];
  if (!sdef || !(sdef.range > 2)) return false;
  if (s.garrisonTower != null) {
    const tw = findBld(state, s.garrisonTower);
    if (!tw) return false;
    victim.targetKind = "bld"; victim.targetId = tw.id; victim.huntId = tw.id;
    return true;
  }
  if (dist(victim.x, victim.r, s.x, s.r) <= (vdef.aggro || 0)) return false;
  victim.targetKind = "unit"; victim.targetId = s.id; victim.huntId = s.id;
  return true;
}

// گام تهاجمی (0.154.0 — بند 568): شکار زنده بی‌افسار می‌ماند؛ هدف زنده در
// افسار 42 پست چسبنده است؛ وگرنه کسب تازه لنگرِ پست (سقف 40، دید aggro)؛
// بی‌هدفِ دور از پست برمی‌گردد (آستانه GUARD_HOME، مثل نگهبانی/تدافعی).
function engageStep(state, terrain, W, H, u, def) {
  const hx = u.homeX != null ? u.homeX : u.x, hr = u.homeR != null ? u.homeR : u.r;
  if (u.huntId != null) {
    const ht = u.targetKind === "unit" ? findUnit(state, u.targetId)
      : u.targetKind === "bld" ? findBld(state, u.targetId) : null;
    if (ht && u.targetId === u.huntId) {
      fightTarget(state, terrain, W, H, u, def, u.targetKind === "unit" ? { kind: "unit", u: ht } : { kind: "bld", b: ht });
      return;
    }
    u.huntId = null;
  }
  const cur = u.targetKind === "unit" ? findUnit(state, u.targetId)
    : u.targetKind === "bld" ? findBld(state, u.targetId) : null;
  if (cur) {
    const p = u.targetKind === "unit" ? { x: cur.x, r: cur.r } : bldCenter(cur);
    if (dist(hx, hr, p.x, p.r) <= ENGAGE_DROP) {
      fightTarget(state, terrain, W, H, u, def, u.targetKind === "unit" ? { kind: "unit", u: cur } : { kind: "bld", b: cur });
      return;
    }
    u.targetKind = null;
    u.targetId = null;
  }
  const a = acquire(u, state, hx, hr, ENGAGE_RADIUS);
  if (!a) {
    u.targetKind = null;
    u.targetId = null;
    if (dist(u.x, u.r, hx, hr) > GUARD_HOME) {
      moveSlide(state, terrain, W, H, u, hx, hr, def.speed / simHz());
    }
    return;
  }
  u.targetKind = a.kind;
  u.targetId = a.id;
  let t = null;
  if (a.kind === "unit") { const eu = findUnit(state, a.id); if (eu) t = { kind: "unit", u: eu }; }
  else { const eb = findBld(state, a.id); if (eb) t = { kind: "bld", b: eb }; }
  if (!t) {
    u.targetKind = null;
    u.targetId = null;
    return;
  }
  fightTarget(state, terrain, W, H, u, def, t);
}

// موضع تدافعی (0.153.0 — بند 567): درگیری فقط با مزاحمِ در شعاع 20 خانه از
// پست (homeX/homeR)؛ بیرون افسار (22) هدف رها و به پست برگشته می‌شود؛ بی‌هدفِ
// دور از پست هم برمی‌گردد (آستانه 2، هم‌ارز نگهبانی). محاصره مثل نگهبانی فقط
// ساختمان می‌زند؛ مستقرِ بی‌هدف جابه‌جا نمی‌شود. دشمن‌شناسی همان acquire ولی
// لنگرِ پست است. همه guess/تصمیم تا مرجع.
export const DEFEND_RADIUS = 20, DEFEND_DROP = DEFEND_RADIUS + 2;
function defendStep(state, terrain, W, H, u, def) {
  const hx = u.homeX != null ? u.homeX : u.x, hr = u.homeR != null ? u.homeR : u.r;
  if (def.siege) {
    // محاصره در تدافعی هم فقط ساختمان می‌زند (الگوی نگهبانی 0.46.0).
    const t = resolveTarget(state, u);
    if (t) {
      fightTarget(state, terrain, W, H, u, def, t);
    } else {
      u.targetKind = null;
      u.targetId = null;
      if (!(def.needsDeploy && u.deployed) && dist(u.x, u.r, hx, hr) > GUARD_HOME) {
        moveSlide(state, terrain, W, H, u, hx, hr, def.speed / simHz());
      }
    }
    return;
  }
  const a = acquire(u, state, hx, hr, DEFEND_RADIUS);
  if (!a) {
    u.targetKind = null;
    u.targetId = null;
    if (!(def.needsDeploy && u.deployed) && dist(u.x, u.r, hx, hr) > GUARD_HOME) {
      moveSlide(state, terrain, W, H, u, hx, hr, def.speed / simHz());
    }
    return;
  }
  u.targetKind = a.kind;
  u.targetId = a.id;
  let t = null;
  if (a.kind === "unit") { const eu = findUnit(state, a.id); if (eu) t = { kind: "unit", u: eu }; }
  else { const eb = findBld(state, a.id); if (eb) t = { kind: "bld", b: eb }; }
  if (!t) {
    u.targetKind = null;
    u.targetId = null;
    return;
  }
  // افسار: بیرون 22 از پست قدم برنمی‌دارد — برمی‌گردد (الگوی نگهبانی ولی با
  // بازگشت؛ «مسافت کوتاه + بازگشت» بند 567).
  if (dist(u.x, u.r, hx, hr) > DEFEND_DROP) {
    if (!(def.needsDeploy && u.deployed)) {
      moveSlide(state, terrain, W, H, u, hx, hr, def.speed / simHz());
    }
    return;
  }
  fightTarget(state, terrain, W, H, u, def, t);
}

export function stepCombat(state, terrain) {
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  const mp = state.mp && state.mp.enabled;

  // 0. تصرف دروازه (0.158.0 - بند 263): پيش از نبرد تا پاكسازي هدف/مسير اثر كند.
  stepGateCapture(state);

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
      strike(state, ramResistDmg("tower", { range: w.range }, { kind: "unit", u: tgt }, w.dmg), { kind: "unit", u: tgt });
      provokeRetaliation(state, tgt, { kind: "bld", b }); // واکنش به شلیک برج (0.154.0 — بند 568)
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
          strike(state, ramResistDmg(gu && gu.type, gdef, { kind: "unit", u: gt }, gdef.dmg), { kind: "unit", u: gt });
          provokeRetaliation(state, gt, { kind: "bld", b }); // واکنش به شلیک گاریسون (0.154.0 — بند 568)
          gu.cooldown = gdef.cd;
        }
      }
      b.garrison = kept;
    }
  }

  // بازگشت خودکار ارباب به Keep (0.163.0 — §10.5/بند 247): فقط سولو، پیش از حرکت واحدها.
  lordReturnStep(state);

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
    if (u.cowCd > 0) u.cowCd--; // سردشدن پرتاب گاو (0.142.0)
    if (u.order && u.order.status === "active") {
      if (u.order.kind === "retreat") {
        followRetreat(state, terrain, W, H, u, def); // بی‌درگیری، فقط فرار
        continue;
      }
      if (u.order.kind === "attackmove") {
        const t = resolveTarget(state, u);
        if (t) { fightTarget(state, terrain, W, H, u, def, t); continue; }
      }
      if (u.order.kind === "patrol") { // گشت (0.162.0 — بند 236): درگیری attackmoveوار، وگرنه گام گشت
        const t = resolveTarget(state, u);
        if (t) { fightTarget(state, terrain, W, H, u, def, t); continue; }
        patrolStep(state, terrain, W, H, u, def);
        continue;
      }
      if (u.order.kind === "attackpos") { // حمله به موضع (0.163.0 — بند 240)
        const px = u.order.c + 0.5, pr = u.order.r + 0.5;
        const dd = Math.sqrt((u.x - px) * (u.x - px) + (u.r - pr) * (u.r - pr));
        const rng = def.range || 0;
        if (dd <= Math.max(rng, 1) && !(def.minRange && dd < def.minRange) && rng > 2) {
          bombardPos(state, u, def, px, pr);
          continue;
        }
        const t = resolveTarget(state, u);
        if (t) { fightTarget(state, terrain, W, H, u, def, t); continue; }
        attackposStep(state, terrain, W, H, u, def);
        continue;
      }
      // شلیک حین حرکت (0.151.0 — §۹.۵/بند ۵۱۳): کماندار سواره با فرمان
      // «move» هم می‌زند — فقط هدفِ در برد (بی‌تعقیب)، بعد به راهش ادامه
      // می‌دهد. قطعی و MP-امن (پرچم کاتالوگ fireOnMove؛ بدون rng).
      if (def.fireOnMove && u.order.kind === "move" && u.cooldown <= 0) {
        const ft = resolveTarget(state, u);
        if (ft && inRange(u, def, ft)) fightTarget(state, terrain, W, H, u, def, ft);
      }
      followOrder(state, terrain, W, H, u, def); // مأموریت صریح بر کسب خودکار مقدم است
      continue;
    }
    if (u.stance === STANCES.GUARD) {
      guardStep(state, terrain, W, H, u, def);
      continue;
    }
    if (u.stance === STANCES.DEFEND) {
      defendStep(state, terrain, W, H, u, def);
      continue;
    }
    // موضع تهاجمی خودی (0.154.0 — بند 568): گام لنگرِ پست (افسار 40/42 +
    // بازگشت + شکار)؛ موج دشمن و محاصره مسیر قدیمی بی‌افسار را می‌روند.
    if (u.stance === STANCES.ENGAGE && u.side !== "enemy" && !def.siege) {
      engageStep(state, terrain, W, H, u, def);
      continue;
    }
    const t = resolveTarget(state, u);
    if (!t) continue;
    fightTarget(state, terrain, W, H, u, def, t);
  }

  // ۲الف. شفادهنده‌های عطاری (0.146.0 — بند ۳۰۲/۱۴۲): spawn/حرکت/پراکنده‌کردن، پیش از ابرها.
  stepHealers(state, terrain);

  // ۲ب. ابرهای بیماری (0.142.0 — بند ۲۱۴): خسارت مستقیم محیطی، پیش از جارو تا
  // کشته‌های همین تیک در همان جارو پاک شوند.
  stepClouds(state);

  // ۲پ. آتش (0.148.0 — §۱۸.۴/#۲۱۵): خاموشی/سوختن/گسترش، پیش از جارو تا
  // ویران‌شده‌های همین تیک در همان جارو پاک شوند.
  stepFire(state);

  // ۲ت. گودال‌های کشتار (0.155.0 — بند 273): پس از حرکت/نبرد، پیش از جارو تا
  // کشته‌های همین تیک در همان جارو پاک شوند.
  stepKillpits(state);
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
