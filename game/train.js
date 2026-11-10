// صف آموزش سربازخانه (0.65.0 — انتخاب ۱-الف کاربر).
//
// قرارداد:
// - استخدام بازیکن (سولو/MP) دیگر فوری نیست: فرمان `hire` هزینه را اتمی
//   (غذا/طلا/سلاح، همان چهار شرط validateHire) همان لحظه می‌پردازد و سفارش
//   را ته صفِ سربازخانه خودی می‌گذارد؛ تحویل پس از trainTicks تیک.
// - `hireUnit` فوری می‌ماند و فقط مصرف داخلی دارد (یورش AI، تست‌های رزمی،
//   رگرسیون، firsttenِ Smoke؟ نه — firstten از صف می‌گذرد). توازن یورش‌ها
//   دست‌نخورده می‌ماند؛ این تصمیم در CHANGELOG ثبت است.
// - لغو با `cancelTrain` = بازپرداخت کامل با سقف جاری (الگوی demolishRefund).
// - ویرانی سربازخانه با صف مانده = بازپرداخت خودکار همه سفارش‌ها + رویداد
//   (در stepTraining، پس قطعی و سازگار با MP/ری‌پلی).
// - قطعیت: بدون RNG؛ ترتیب = id سربازخانه، بعد ترتیب صف. هش MP فقط صف‌های
//   غیرخالی را mix می‌کند تا هش‌های پین رگرسیون ۸تایی دست‌نخورده بمانند.
// - ذخیره: `train` اختیاری روی بنا (قدیمی = [])؛ ری‌پلی: خودکار (فرمان‌ها).
import { t } from "./i18n.js";
import { lazyTable } from "./lazytext.js";
import { CONFIG } from "./config.js";
import { UNITS, validateHire, spawnUnit, peaceActive, mercpostOf, mercGoldOf, keepDoorOf, rallyPoint, orderMove, guildOf, guildKindOf, isGuildUnit, GUILD_BUILDINGS, stableWithHorse, stableHorses, restoreHorse } from "./combat.js";
import { capFor, atPopCap } from "./economy.js";
import { T_GRASS } from "./terrain.js";
import { nearestWalkable } from "./pathfind.js";

export const TRAIN_FA = lazyTable("game.train", ["OK", "QUEUE_FULL", "NOT_OWNED", "BAD_QUEUE", "NO_BARRACKS", "NORUSH"]);

// مدت آموزش یک نوع (تیک). پیش‌فرض امن برای نوع‌های بی‌فیلد (دشمن/ارباب).
export function trainTimeOf(type) {
  const def = UNITS[type];
  const t = def && def.trainTicks;
  return Number.isInteger(t) && t > 0 ? t : 40;
}

// سربازخانه سالمِ تکمیل‌شده همان مالک (نخستین id) — میزبان صف.
export function barracksOf(state, owner) {
  owner = owner == null ? 0 : owner;
  let best = null;
  for (const b of state.buildings) {
    if (b.type !== "barracks" || b.destroyed) continue;
    if (b.buildLeft > 0) continue; // نیمه‌کاره صف ندارد (0.39.0)
    if ((b.owner == null ? 0 : b.owner) !== owner) continue;
    if (!best || b.id < best.id) best = b;
  }
  return best;
}
// میزبان صف راهب جنگجو (فاز ۱ بند ۷۶): کلیسای جامع سالمِ همان مالک.
export function cathedralOf(state, owner) {
  owner = owner == null ? 0 : owner;
  let best = null;
  for (const b of state.buildings) {
    if (b.type !== "cathedral" || b.destroyed) continue;
    if (b.buildLeft > 0) continue;
    if ((b.owner == null ? 0 : b.owner) !== owner) continue;
    if (!best || b.id < best.id) best = b;
  }
  return best;
}
// میزبان صف (0.166.0 — §9.1/بند 169؛ انجمن از 0.167.0 — §9.3): مزدور mercدار با پست زنده،
// یگان انجمن روی بنای انجمن همان مالک؛ وگرنه از requires: سربازخانه/جامع.
export function trainHostOf(state, owner, type) {
  const def = UNITS[type];
  if (def && def.merc === true && mercpostOf(state, owner)) return mercpostOf(state, owner);
  const gk = guildKindOf(def);
  if (gk && guildOf(state, owner, gk)) return guildOf(state, owner, gk);
  if (def && def.requires === "cathedral") return cathedralOf(state, owner);
  return barracksOf(state, owner);
}

// هزینه واقعی کسرشده یک سفارش (0.166.0 — §9.1/بند 169؛ انجمن از 0.167.0): مسیر طلایی/انجمن فقط طلا،
// وگرنه غذا+طلا+سلاح. خالص؛ روی پرچم ورودی صف (e.merc) یا نوع یگان (انجمن راه‌برگشت ندارد) سوار است.
export function chargedCost(type, useMerc) {
  const def = UNITS[type];
  if (useMerc && def) {
    const gold = def.merc === true ? mercGoldOf(type) : ((def.cost && def.cost.gold) || 0);
    return { food: 0, gold, weapon: null };
  }
  if (!def || !def.cost) return { food: 0, gold: 0, weapon: null };
  return { food: def.cost.food || 0, gold: def.cost.gold || 0, weapon: def.requiresWeapon || null };
}

// بازپرداخت کامل یک ورودی صف با سقف جاری (الگوی cancelTrain؛ مشترک لغو/ویرانی/بی‌جا).
function refundEntry(state, owner, e) {
  const ch = chargedCost(e.type, e.merc === true || isGuildUnit(e.type)); // انجمن راه‌برگشت legacy ندارد (0.167.0)
  const res = resOf(state, owner);
  const mp = state.mp && state.mp.enabled;
  const pseudo = mp ? { buildings: state.buildings, mp: { enabled: true } } : state;
  res.food = Math.min(capFor(pseudo, "food", mp ? owner : undefined), res.food + ch.food);
  res.gold = Math.min(capFor(pseudo, "gold", mp ? owner : undefined), res.gold + ch.gold);
  if (ch.weapon) {
    res[ch.weapon] = Math.min(capFor(pseudo, ch.weapon, mp ? owner : undefined), (res[ch.weapon] || 0) + 1);
  }
  if (UNITS[e.type] && UNITS[e.type].requiresHorse) restoreHorse(state, owner);
}

// کانتینر منابع همان منطق hireUnit (MP جدا، سولو خودی/AI جدا).
function resOf(state, owner) {
  const mp = state.mp && state.mp.enabled;
  if (mp) return state.mpres[owner].resources;
  if (owner === CONFIG.AI.owner && state.ai) return state.ai.resources;
  return state.resources;
}

// سفارش آموزش: اعتبارسنجی خشک + کسر اتمی + push. c/r = نقطه تحویل خواسته‌شده.
export function queueHire(state, terrain, W, H, c, r, type, owner) {
  owner = owner == null ? 0 : owner;
  // صلح No Rush (0.149.0 — §۱۴.۲/بند ۷۳۰): سفارش تازه در صلح ممنوع.
  if (peaceActive(state)) {
    state.rejected++;
    return { ok: false, reason: "NORUSH" };
  }
  const v = validateHire(state, terrain, W, H, c, r, type, owner);
  if (!v.ok) {
    state.rejected++;
    return v;
  }
  const b = trainHostOf(state, owner, type);
  if (!b) {
    state.rejected++;
    return { ok: false, reason: "NO_BARRACKS" };
  }
  if (!Array.isArray(b.train)) b.train = [];
  const cap = CONFIG.TRAIN && CONFIG.TRAIN.queueCap > 0 ? CONFIG.TRAIN.queueCap : 5;
  if (b.train.length >= cap) {
    state.rejected++;
    return { ok: false, reason: "QUEUE_FULL" };
  }
  const def = UNITS[type];
  const useMerc = (def.merc === true && b.type === "mercpost") || GUILD_BUILDINGS.includes(b.type);
  const ch = chargedCost(type, useMerc);
  const res = resOf(state, owner);
  res.food -= ch.food;
  res.gold -= ch.gold;
  if (ch.weapon) res[ch.weapon]--;
  if (def.requiresHorse) {
    const sh = stableWithHorse(state, owner);
    if (!sh) {
      state.rejected++;
      return { ok: false, reason: "NO_HORSE" };
    }
    sh.horses = stableHorses(sh) - 1;
  }
  const total = trainTimeOf(type);
  b.train.push({ type, c, r, left: total, total, ...(useMerc ? { merc: true } : {}) });
  state.placed++;
  return { ok: true, reason: "OK", bld: b.id, idx: b.train.length - 1 };
}

// لغو سفارش idx از صف بنای bldId + بازپرداخت کامل با سقف جاری.
export function cancelTrain(state, bldId, idx, owner) {
  owner = owner == null ? 0 : owner;
  const b = state.buildings.find((x) => x.id === bldId && !x.destroyed);
  if (!b || (b.type !== "barracks" && b.type !== "cathedral" && b.type !== "mercpost" && !GUILD_BUILDINGS.includes(b.type))) {
    state.rejected++;
    return { ok: false, reason: "BAD_QUEUE" };
  }
  if ((b.owner == null ? 0 : b.owner) !== owner) {
    state.rejected++;
    return { ok: false, reason: "NOT_OWNED" };
  }
  if (!Array.isArray(b.train) || !Number.isInteger(idx) || idx < 0 || idx >= b.train.length) {
    state.rejected++;
    return { ok: false, reason: "BAD_QUEUE" };
  }
  const [e] = b.train.splice(idx, 1);
  refundEntry(state, owner, e);
  return { ok: true, reason: "OK", type: e.type };
}

// نقطه تحویل: همان (c,r) اگر چمنِ آزاد، وگرنه نزدیک‌ترین قابل‌پیمایش.
function deliverySpot(state, terrain, W, H, c, r) {
  if (Number.isInteger(c) && Number.isInteger(r) && c >= 0 && r >= 0 && c < W && r < H &&
      terrain[r * W + c] === T_GRASS && state.occ[r * W + c] !== 1) {
    return [c, r];
  }
  const s = nearestWalkable(terrain, state.occ, W, H, c | 0, r | 0, 8);
  return s || null;
}

// پیشرفت یک تیک همه صف‌ها + تحویل سررسیده‌ها. از stepSim (سولو) و حلقه MP
// (main.js) صدا زده می‌شود — تنها نقطه جهش صف.
export function stepTraining(state, terrain) {
  const W = CONFIG.GRID_W, H = CONFIG.GRID_H;
  for (const b of state.buildings) {
    if ((b.type !== "barracks" && b.type !== "cathedral" && b.type !== "mercpost" && !GUILD_BUILDINGS.includes(b.type)) || !Array.isArray(b.train) || !b.train.length) continue;
    const owner = b.owner == null ? 0 : b.owner;
    if (b.destroyed) {
      // ویرانی با صف مانده = بازپرداخت خودکار همه (قطعی، با سقف؛ مسیر طلایی همان طلا را).
      let n = 0;
      for (const e of b.train) {
        if (UNITS[e.type]) { refundEntry(state, owner, e); n++; }
      }
      b.train.length = 0;
      if (n > 0) state.events.push(t("game.ev.trainRefund", { count: n }));
      continue;
    }
    if (b.buildLeft > 0) continue; // نیمه‌کاره پیش نمی‌رود
    // صلح No Rush (0.149.0): صفِ در جریان یخ می‌زند (پیش نمی‌رود) ولی
    // بازپرداخت ویرانی بالا دست‌نخورده است — تولید تازه‌ای بیرون نمی‌آید.
    if (peaceActive(state)) continue;
    const head = b.train[0];
    head.left--;
    if (head.left > 0) continue;
    if (atPopCap(state, owner)) continue; // سقف جمعیت (بند ۱۰۱): سررسیده در صف می‌ماند تا جا باز شود
    b.train.shift();
    // تحویل (0.166.0 — §9.1/بندهای 168/170): نیرو در درِ ستاد (campfire) ظاهر
    // می‌شود و تا مقصد راه می‌رود: پرچم تجمع نوع اگر هست، وگرنه نقطه کلیک‌شده.
    // بی‌ستاد = رفتار قدیمی (ظهور در نقطه تحویل). همه قطعی و MP-امن.
    const door = keepDoorOf(state, terrain, W, H, owner);
    const spot = door || deliverySpot(state, terrain, W, H, head.c, head.r);
    if (!spot) {
      // جایی برای تحویل نیست — هزینه برمی‌گردد تا پول نسوزد.
      refundEntry(state, owner, head);
      state.events.push(t("game.ev.trainFail", { unit: UNITS[head.type] ? UNITS[head.type].name : head.type }));
      continue;
    }
    const unit = spawnUnit(state, head.type, spot[0] + 0.5, spot[1] + 0.5, owner);
    if (door) {
      const rp = rallyPoint(state, owner, head.type);
      if (rp) orderMove(state, unit, rp[0], rp[1]);
      else if (Number.isInteger(head.c) && Number.isInteger(head.r)) orderMove(state, unit, head.c, head.r);
    }
  }
}
